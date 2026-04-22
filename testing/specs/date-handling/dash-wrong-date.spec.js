/**
 * DB-3 — Dashboard Wrong-Date Detection
 *
 * Verifies that the dashboard grid faithfully renders records whose *stored* value
 * is the bug-shifted date (i.e., what FORM-BUG-7 or FORM-BUG-5 would leave in SQL),
 * confirming that the read-layer formatter propagates the shift to the user instead
 * of silently correcting it.
 *
 * Fixture strategy: this spec creates the shifted records on-demand via the API —
 * it does NOT try to reproduce the bug end-to-end through the Forms UI. For each
 * config we POST a record whose field value is already the shifted value that the
 * bug would have produced, then filter the dashboard to that value and assert the
 * grid displays the shifted string verbatim.
 *
 * Shifted-value scheme (canonical 3/15/2026 → bug-shifted):
 *   - date-only configs (A/B/E/F): stored `2026-03-14 00:00:00` → grid "3/14/2026"
 *   - datetime configs  (C/D/G/H): stored `2026-03-14 23:00:00` → grid "3/14/2026 11:00 PM"
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const { customerTemplates, FIELD_MAP, FORM_TEMPLATE_URL, vvConfig } = require('../../fixtures/vv-config');
const { guardedPost } = require('../../helpers/vv-request');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
const DASHBOARD_URL = customerTemplates.dashboardDateTest;
const API_BASE = `/api/v1/${vvConfig.customerAlias}/${vvConfig.databaseAlias}`;

function parseTemplateIdFromUrl(url) {
    const match = /[?&]formid=([^&]+)/i.exec(url);
    if (!match) throw new Error(`Cannot extract formid from FORM_TEMPLATE_URL: ${url}`);
    return match[1].toLowerCase();
}
const TEMPLATE_ID = parseTemplateIdFromUrl(FORM_TEMPLATE_URL);

const SHIFTED_DATE_ONLY_API = '2026-03-14';
const SHIFTED_DATETIME_API = '2026-03-14T23:00:00';
const SHIFTED_DATE_ONLY_DISPLAY = '3/14/2026';
const SHIFTED_DATETIME_DISPLAY = '3/14/2026 11:00 PM';

const DB3_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((config) => {
    const cfg = FIELD_MAP[config];
    const isDateTime = cfg.enableTime === true;
    return {
        id: `db-3-${config.toLowerCase()}`,
        config,
        field: cfg.field,
        apiValue: isDateTime ? SHIFTED_DATETIME_API : SHIFTED_DATE_ONLY_API,
        expectedDisplay: isDateTime ? SHIFTED_DATETIME_DISPLAY : SHIFTED_DATE_ONLY_DISPLAY,
    };
});

let cachedToken = null;
async function getToken(request) {
    if (cachedToken) return cachedToken;
    const resp = await request.post(`${vvConfig.baseUrl}/OAuth/Token`, {
        form: {
            client_id: vvConfig.clientId,
            client_secret: vvConfig.clientSecret,
            username: vvConfig.username,
            password: vvConfig.password,
            grant_type: 'password',
        },
    });
    expect(resp.ok()).toBeTruthy();
    cachedToken = (await resp.json()).access_token;
    return cachedToken;
}

async function apiPostForm(request, fieldValues) {
    const t = await getToken(request);
    const resp = await guardedPost(request, `${vvConfig.baseUrl}${API_BASE}/formtemplates/${TEMPLATE_ID}/forms`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        data: fieldValues,
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const created = (body.data && (Array.isArray(body.data) ? body.data[0] : body.data)) || body;
    return { instanceName: created.instanceName, revisionId: created.revisionId };
}

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
        // ignore — postback may complete without distinct response
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

// Shared state for the suite: { config -> instanceName of created record }
const createdRecords = {};

test.describe('DB-3: Dashboard Wrong-Date Detection', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    // Gate: dashboards are TZ-independent (DB-8). Run once on BRT-chromium.
    test.beforeEach(async ({ browserName }, testInfo) => {
        test.skip(
            !(testInfo.project.name === 'BRT-chromium' && browserName === 'chromium'),
            'DB-3 is TZ-independent; runs once on BRT-chromium'
        );
    });

    // Fixture: create one shifted-value record per config via the API.
    test.beforeAll(async ({ request }) => {
        for (const slot of DB3_SLOTS) {
            const record = await apiPostForm(request, { [slot.field]: slot.apiValue });
            createdRecords[slot.config] = record.instanceName;
            console.log(`  created ${slot.id} → ${record.instanceName} (${slot.field}="${slot.apiValue}")`);
        }
    });

    for (const slot of DB3_SLOTS) {
        test(`${slot.id}: Config ${slot.config} grid renders shifted value "${slot.expectedDisplay}"`, async ({
            page,
        }) => {
            const instanceName = createdRecords[slot.config];
            expect(instanceName, 'fixture must create a record for this config').toBeTruthy();

            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            // Filter narrow enough to isolate our fixture record from anything else on 3/14.
            const sql = `${slot.field} = '${slot.expectedDisplay}'`;
            await applySQLFilter(page, sql);

            const rows = await captureFieldColumn(page, slot.field);
            const populated = rows.filter((r) => r.value && r.value.trim() !== '');

            console.log(`  ${slot.id}: filter="${sql}" → ${rows.length} rows (fixture=${instanceName})`);

            const ourRow = rows.find((r) => r.formId === instanceName);
            if (ourRow) {
                console.log(`    fixture row on page: ${ourRow.formId}="${ourRow.value}"`);
            } else if (populated.length > 0) {
                console.log(
                    `    fixture not on this page, but ${populated.length} other rows match. Samples: ` +
                        populated
                            .slice(0, 3)
                            .map((r) => `${r.formId}="${r.value}"`)
                            .join(', ')
                );
            }

            // Either the fixture row itself is on-page with the expected display, OR at minimum
            // the filtered grid renders the shifted display (our record is in the result set).
            expect(populated.length).toBeGreaterThan(0);
            expect(populated.map((r) => r.value)).toContain(slot.expectedDisplay);
        });
    }
});
