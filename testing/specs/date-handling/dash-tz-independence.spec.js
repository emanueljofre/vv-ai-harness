/**
 * DB-8 — Dashboard Timezone Independence
 *
 * Server-rendered grids must produce identical values regardless of browser TZ.
 * This spec spins up three parallel browser contexts (BRT, IST, UTC0), loads the
 * same FormDataDetails dashboard in each, captures every date-field cell for the
 * first page, and asserts byte-identical values across all three contexts.
 *
 * Runs once (BRT-chromium project) — the comparison is intra-test.
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const { customerTemplates, FIELD_MAP } = require('../../fixtures/vv-config');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
const DASHBOARD_URL = customerTemplates.dashboardDateTest;

const DATE_FIELDS = Object.values(FIELD_MAP).map((c) => c.field);

const TZ_MATRIX = [
    { label: 'BRT', iana: 'America/Sao_Paulo' },
    { label: 'IST', iana: 'Asia/Calcutta' },
    { label: 'UTC0', iana: 'Etc/UTC' },
];

async function captureGridSnapshot(page) {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    return await page.evaluate((fields) => {
        const headerCells = [];
        document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
            const link = th.querySelector('a');
            headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
        });
        const fidIdx = headerCells.indexOf('Form ID');
        const rows = [];
        document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').forEach((tr) => {
            const tds = tr.querySelectorAll('td');
            const formId = tds[fidIdx]?.textContent?.trim() || '';
            if (!formId) return;
            const cells = {};
            fields.forEach((f) => {
                const colIdx = headerCells.indexOf(f);
                cells[f] = colIdx >= 0 ? tds[colIdx]?.textContent?.trim() || '' : '';
            });
            rows.push({ formId, cells });
        });
        return rows;
    }, DATE_FIELDS);
}

test.describe('DB-8: Dashboard TZ Independence', () => {
    test('db-8-tz: dashboard grid identical across BRT, IST, UTC0', async ({ browserName }, testInfo) => {
        // Gate: this test internally spins up 3 TZ contexts, so it should only run once per regression.
        // Pin to BRT-chromium — other project runs skip.
        test.skip(
            !(testInfo.project.name === 'BRT-chromium' && browserName === 'chromium'),
            'DB-8 runs once on BRT-chromium; internal contexts cover IST and UTC0'
        );

        const browser = await chromium.launch({ headless: true, channel: 'chrome' });
        try {
            const snapshots = {};
            for (const tz of TZ_MATRIX) {
                const context = await browser.newContext({
                    storageState: AUTH_STATE_PATH,
                    timezoneId: tz.iana,
                });
                const page = await context.newPage();
                const rows = await captureGridSnapshot(page);
                snapshots[tz.label] = rows;
                await context.close();
                console.log(`  ${tz.label}: ${rows.length} rows captured`);
            }

            // Build a stable key-set — intersection of Form IDs present in all three TZ captures.
            const idSets = Object.values(snapshots).map((rows) => new Set(rows.map((r) => r.formId)));
            const commonIds = [...idSets[0]].filter((id) => idSets.every((s) => s.has(id)));
            console.log(`  Common Form IDs across all 3 TZs: ${commonIds.length}`);
            expect(commonIds.length).toBeGreaterThan(0);

            const mismatches = [];
            for (const id of commonIds) {
                const byTz = {};
                for (const tz of TZ_MATRIX) {
                    const row = snapshots[tz.label].find((r) => r.formId === id);
                    byTz[tz.label] = row?.cells || {};
                }
                for (const field of DATE_FIELDS) {
                    const values = TZ_MATRIX.map((tz) => byTz[tz.label][field] ?? '');
                    const unique = new Set(values);
                    if (unique.size > 1) {
                        mismatches.push({
                            formId: id,
                            field,
                            BRT: values[0],
                            IST: values[1],
                            UTC0: values[2],
                        });
                    }
                }
            }

            if (mismatches.length > 0) {
                console.log(`  ${mismatches.length} mismatches detected:`);
                for (const m of mismatches.slice(0, 10)) {
                    console.log(`    ${m.formId} ${m.field}: BRT="${m.BRT}" IST="${m.IST}" UTC0="${m.UTC0}"`);
                }
            }
            expect(mismatches).toEqual([]);
        } finally {
            await browser.close();
        }
    });
});
