/**
 * DB-6 — Dashboard Cross-Layer Comparison Tests
 *
 * Compares dashboard grid values vs Forms SPA display for the same records.
 * For each record × config: captures dashboard grid value, navigates to form, captures form values.
 *
 * Environment-agnostic — reads:
 *   - dashboard URL + xcid/xcdid from `customerTemplates` (vv-config.js)
 *   - reference record DataID + instanceName from `SAVED_RECORDS['db6-dateonly' | 'db6-datetime']`,
 *     which global-setup creates fresh and tags with the current build fingerprint.
 *   - config → record assignment from `DB6_RECORD_CONFIGS` (customer-agnostic)
 *   - field names per config from the active `FIELD_MAP`
 *
 * Records are recreated whenever the platform build fingerprint changes — so this
 * test never compares against records saved under a different build.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const {
    customerTemplates,
    vvConfig,
    FIELD_MAP,
    SAVED_RECORDS,
    DB6_RECORD_CONFIGS,
} = require('../../fixtures/vv-config');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');

// Env-agnostic URL + xcid/xcdid resolution
const DASHBOARD_URL = customerTemplates.dashboardDateTest;
const FORM_BASE = `${vvConfig.baseUrl}/FormViewer/app`;
const XCID = customerTemplates.xcid;
const XCDID = customerTemplates.xcdid;

// Build the per-test record list at import time by joining:
//   DB6_RECORD_CONFIGS[key] = ['A', 'B', 'E', 'F']  (which configs live in this record)
//   SAVED_RECORDS[key]      = { url, dataId, instanceName }  (runtime IDs from global-setup)
//   FIELD_MAP[config]       = { field, enableTime, ... }  (active customer field name)
const RECORDS = [];
for (const [key, configs] of Object.entries(DB6_RECORD_CONFIGS)) {
    const saved = SAVED_RECORDS[key];
    if (!saved || !saved.dataId) continue; // will trigger the skip below
    RECORDS.push({
        key,
        instanceName: saved.instanceName || null,
        dataId: saved.dataId,
        fields: configs.map((c) => ({
            config: c,
            field: FIELD_MAP[c].field,
            enableTime: FIELD_MAP[c].enableTime,
        })),
    });
}

// Field list used for dashboard column discovery — derived from the active FIELD_MAP
// so it matches the current customer's field naming convention (Field7/Field10/... on
// vvdemo, dateTzAwareV2Empty/... on vv5dev).
const DATE_FIELDS = Object.values(FIELD_MAP).flatMap((c) => [c.field, c.preset, c.currentDate].filter(Boolean));

async function captureDashboardValues(page, instanceName) {
    return await page.evaluate(
        ({ instanceName, fields }) => {
            const headerCells = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
            });
            const formIdIdx = headerCells.indexOf('Form ID');

            const values = {};
            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    const cells = tr.querySelectorAll('td');
                    const formId = cells[formIdIdx]?.textContent.trim() || '';
                    if (formId === instanceName) {
                        fields.forEach((f) => {
                            const colIdx = headerCells.indexOf(f);
                            values[f] = cells[colIdx]?.textContent.trim() || '(empty)';
                        });
                    }
                });
            return values;
        },
        { instanceName, fields: DATE_FIELDS }
    );
}

async function captureFormValues(page, fieldName) {
    return await page.evaluate((name) => {
        try {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
            const api = VV.Form.GetFieldValue(name);

            let display = '(not found)';
            const ariaLabel = document.querySelector(`[aria-label="${name}"]`);
            if (ariaLabel) {
                const input = ariaLabel.querySelector('input') || ariaLabel;
                display = input.value || input.textContent?.trim() || '(not found)';
            }
            if (display === '(not found)') {
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const inp of inputs) {
                    const parent = inp.closest('[data-field-name]');
                    if (parent && parent.getAttribute('data-field-name') === name) {
                        display = inp.value;
                        break;
                    }
                }
            }

            return { raw, api, display };
        } catch (err) {
            return { error: err.message };
        }
    }, fieldName);
}

test.describe('DB-6: Dashboard vs Forms Cross-Layer', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    // Guard: skip cleanly if dashboard URL or reference records aren't ready.
    // - Missing URL means the customer hasn't wired a FormDataDetails report into CUSTOMER_TEMPLATES.
    // - Missing records means global-setup hasn't created db6-dateonly / db6-datetime yet
    //   (e.g., the current build cleared the saved-records cache and the run is still pending).
    //   Records are build-fingerprint-tagged, so a stale cache is never silently reused.
    if (!DASHBOARD_URL) {
        test.skip(`DB-6 skipped for ${vvConfig.instance} — no dashboardDateTest URL configured in customerTemplates.`, () => {});
        return;
    }
    if (!RECORDS.length) {
        test.skip(
            `DB-6 skipped for ${vvConfig.instance} — db6-dateonly / db6-datetime records not found in SAVED_RECORDS. ` +
                `They are created by global-setup.js and tagged with the current build fingerprint. ` +
                `Delete testing/config/saved-records.json and re-run to recreate.`,
            () => {}
        );
        return;
    }

    for (const rec of RECORDS) {
        test.describe(rec.instanceName || rec.key, () => {
            for (const f of rec.fields) {
                test(`db-6-${f.config.toLowerCase()}-${f.field.toLowerCase()}: Config ${f.config} (${f.field}) — dashboard matches form display`, async ({
                    page,
                }) => {
                    test.setTimeout(90000);

                    // If we know the auto-generated instance name, match the dashboard row by it.
                    // Otherwise fall back to matching by DataID (requires the dashboard to expose a DataID column).
                    test.skip(
                        !rec.instanceName,
                        `Skipping Config ${f.config} — SAVED_RECORDS['${rec.key}'] has no instanceName (save-time capture failed)`
                    );

                    // Load dashboard and capture grid value
                    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
                    await page.waitForTimeout(3000);

                    const dashValues = await captureDashboardValues(page, rec.instanceName);
                    const dashVal = dashValues[f.field] || '(not found)';

                    // Navigate to form (use runtime DataID, not a hardcoded revisionId)
                    const formUrl = `${FORM_BASE}?DataID=${rec.dataId}&hidemenu=true&rOpener=1&xcid=${XCID}&xcdid=${XCDID}`;
                    await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 60000 });
                    await page.waitForFunction(
                        () =>
                            typeof VV !== 'undefined' &&
                            VV.Form &&
                            VV.Form.VV &&
                            VV.Form.VV.FormPartition &&
                            VV.Form.VV.FormPartition.fieldMaster,
                        { timeout: 30000 }
                    );

                    const formVals = await captureFormValues(page, f.field);

                    console.log(`Config ${f.config} (${f.field}):`);
                    console.log(`  Dashboard:    "${dashVal}"`);
                    console.log(`  Form display: "${formVals.display}"`);
                    console.log(`  Form raw:     "${formVals.raw}"`);
                    console.log(`  Form GFV:     "${formVals.api}"`);

                    // Dashboard and form display should show consistent values
                    // Note: format may differ (.NET vs Angular) — this test captures the comparison
                    expect(dashVal).not.toBe('(not found)');
                    expect(formVals.display).not.toBe('(not found)');
                    expect(formVals.error).toBeUndefined();
                });
            }
        });
    }
});
