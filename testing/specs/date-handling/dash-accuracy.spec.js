/**
 * DB-2 — Dashboard Date Accuracy Tests
 *
 * For each of the 8 configs (A-H), verifies that records with a known stored value
 * (`2026-03-15 00:00:00` for date-only, `2026-03-15 14:30:00` for datetime) render
 * correctly in the dashboard grid:
 *   - date-only configs → `3/15/2026`
 *   - datetime configs  → `3/15/2026 2:30 PM`
 *
 * WS-1 regression creates records with these exact stored values on the shared
 * test-harness form. DB-2 applies a SQL filter scoped to the expected stored value
 * for each config, then asserts the grid renders the expected display text.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const { customerTemplates, FIELD_MAP } = require('../../fixtures/vv-config');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
const DASHBOARD_URL = customerTemplates.dashboardDateTest;

const EXPECTED_DATE_ONLY = '3/15/2026';
const EXPECTED_DATETIME = '3/15/2026 2:30 PM';

function isDateTime(config) {
    return FIELD_MAP[config].enableTime === true;
}

const DB2_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((config) => ({
    id: `db-2-${config.toLowerCase()}`,
    config,
    field: FIELD_MAP[config].field,
    expected: isDateTime(config) ? EXPECTED_DATETIME : EXPECTED_DATE_ONLY,
}));

async function applySQLFilter(page, sql) {
    const postbackArg = 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockDetail1$C$btnUpdateSQLFilter';
    await page.addScriptTag({
        content: `
            (function() {
                var ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
                if (ta) {
                    ta.value = ${JSON.stringify(sql)};
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                }
                __doPostBack('${postbackArg}', '');
            })();
        `,
    });
    try {
        await page.waitForResponse((resp) => resp.url().includes('FormDataDetails') && resp.status() === 200, {
            timeout: 15000,
        });
    } catch {
        // DOM update may finish without a distinct response
    }
    await page.waitForTimeout(4000);
}

async function captureFieldColumn(page, fieldName) {
    return await page.evaluate((field) => {
        const headerCells = [];
        document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
            const link = th.querySelector('a');
            headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
        });
        const colIdx = headerCells.indexOf(field);
        const fidIdx = headerCells.indexOf('Form ID');
        if (colIdx === -1) return [];
        const values = [];
        document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').forEach((tr) => {
            const tds = tr.querySelectorAll('td');
            const formId = tds[fidIdx]?.textContent?.trim() || '';
            const val = tds[colIdx]?.textContent?.trim() || '';
            if (formId) values.push({ formId, value: val });
        });
        return values;
    }, fieldName);
}

test.describe('DB-2: Dashboard Date Accuracy', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    // Gate to a single TZ-project — dashboards are server-rendered, browser TZ is irrelevant
    // (DB-8 confirms TZ independence). Running in every project would fan out 12×.
    test.beforeEach(async ({ browserName }, testInfo) => {
        test.skip(
            !(testInfo.project.name === 'BRT-chromium' && browserName === 'chromium'),
            'DB-2 is TZ-independent; runs once on BRT-chromium'
        );
    });

    for (const slot of DB2_SLOTS) {
        test(`${slot.id}: Config ${slot.config} (${slot.field}) displays ${slot.expected}`, async ({ page }) => {
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            // Narrow the SQL filter to the exact expected literal so we isolate WS-1 records
            // (14:30 for datetime) from form-save records (00:00) that also land on 3/15.
            const sql = `${slot.field} = '${slot.expected}'`;
            await applySQLFilter(page, sql);

            const rows = await captureFieldColumn(page, slot.field);
            const populated = rows.filter((r) => r.value && r.value.trim() !== '');

            console.log(
                `  ${slot.id}: filter="${sql}" → ${rows.length} rows, ${populated.length} populated for ${slot.field}`
            );

            if (populated.length === 0) {
                throw new Error(
                    `Config ${slot.config}: no records found via filter "${sql}". ` +
                        `WS-1 regression may not have created records for this config on this env.`
                );
            }

            const match = populated.find((r) => r.value === slot.expected);
            if (match) {
                console.log(`    matched on ${match.formId}: "${match.value}"`);
            } else {
                console.log(
                    `    no row matches expected "${slot.expected}". Samples: ${populated
                        .slice(0, 5)
                        .map((r) => `${r.formId}="${r.value}"`)
                        .join(', ')}`
                );
            }

            expect(populated.map((r) => r.value)).toContain(slot.expected);
        });
    }
});
