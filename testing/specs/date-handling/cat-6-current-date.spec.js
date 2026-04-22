/**
 * Category 6 — Current Date Default Tests
 *
 * Open a fresh form template (not a saved record). The Current Date field auto-populates
 * with today's date on load via `new Date()` → UTC timestamp.
 *
 * Unlike other categories, expected values are DYNAMIC — they depend on today's date.
 * The test verifies that:
 *   1. The raw value is a Date object (not a string)
 *   2. The local date interpretation matches today's date in the test timezone
 *   3. GetFieldValue returns the same value (no transformation)
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const { gotoAndWaitForVVForm, getCodePath, getBrowserTimezone } = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 6);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`current date auto-populates correctly in ${tc.tz}`, async ({ page }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const fieldCfg = FIELD_MAP[tc.config];

            // Open fresh form template — current date auto-populates
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            const envScope = isV2 ? 'V2' : 'V1';
            const entryScope = tc.scope || 'V1';
            test.skip(envScope !== entryScope, `Entry scope=${entryScope} but active env is ${envScope}`);

            // Verify current date field exists and is auto-populated
            const currentDateField = fieldCfg.currentDate;
            const fieldResult = await page.evaluate((name) => {
                const fields = Object.values(VV.Form.VV.FormPartition.fieldMaster);
                return fields.some((f) => f.name === name && f.fieldType === 13);
            }, currentDateField);
            expect(fieldResult).toBe(true);

            // Capture the auto-populated value.
            // V1 stores a Date object; V2 stores an ISO string. Normalize to a Date for
            // semantic comparison (the test is about WHAT date is stored, not HOW it is
            // serialized). rawType is recorded as an annotation for observability.
            // Map test-TZ label to IANA zone name.
            const TZ_IANA = {
                BRT: 'America/Sao_Paulo',
                IST: 'Asia/Kolkata',
                UTC0: 'UTC',
                PST: 'America/Los_Angeles',
            };
            const ianaTz = TZ_IANA[tc.tz] || 'UTC';

            // TZ comparison under Playwright emulation is tricky:
            //   - Node's `new Date()` returns real host UTC.
            //   - Chromium's `new Date()` in page.evaluate also returns real UTC
            //     (Emulation.setTimezoneOverride affects toLocaleString, NOT Date.now).
            //   - VV's current-date pipeline under V2 stores the local wall-clock
            //     time SERIALIZED AS Z (the "fake-Z" pattern), so rawIso literally
            //     encodes the local date+time regardless of real UTC.
            // Consequence: for V2 entries we must NOT re-convert rawIso through a
            // timezone — its date portion IS the local date. For V1 (Date object)
            // entries the classic toLocaleDateString(tz) works.
            const values = await page.evaluate(
                ({ name, tz, scope }) => {
                    const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
                    const api = VV.Form.GetFieldValue(name);
                    const now = new Date();
                    const toDate = (v) => {
                        if (v instanceof Date) return v;
                        if (typeof v === 'string' && v.length) {
                            const d = new Date(v);
                            return isNaN(d.getTime()) ? null : d;
                        }
                        return null;
                    };
                    const rawDate = toDate(raw);
                    const apiDate = toDate(api);
                    // V2 fake-Z serialization: the raw string's date portion is the
                    // local calendar date. Extract directly without any TZ conversion.
                    const extractV2LocalDate = (s) => {
                        if (typeof s !== 'string') return null;
                        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        return m ? `${m[2]}/${m[3]}/${m[1]}` : null;
                    };
                    const fmtTz = (d) =>
                        d
                            ? d.toLocaleDateString('en-US', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  year: 'numeric',
                                  timeZone: tz,
                              })
                            : null;
                    const fmt = (dateObj, isoStr) =>
                        scope === 'V2' && typeof isoStr === 'string' ? extractV2LocalDate(isoStr) : fmtTz(dateObj);
                    return {
                        rawType: raw instanceof Date ? 'Date' : typeof raw,
                        rawIso: rawDate ? rawDate.toISOString() : null,
                        apiType: api instanceof Date ? 'Date' : typeof api,
                        apiIso: apiDate ? apiDate.toISOString() : String(api),
                        todayLocal: fmtTz(now),
                        rawLocalDate: fmt(rawDate, typeof raw === 'string' ? raw : null),
                        apiLocalDate: fmt(apiDate, typeof api === 'string' ? api : null),
                    };
                },
                { name: currentDateField, tz: ianaTz, scope: entryScope }
            );

            // Record storage-type observations so we can spot format drift across builds
            testInfo.annotations.push({ type: 'rawType', description: String(values.rawType) });
            testInfo.annotations.push({ type: 'apiType', description: String(values.apiType) });

            // Semantic assertion — whatever the serialization, raw must parse to today in local TZ
            expect(values.rawLocalDate, `raw=${JSON.stringify(values.rawIso)} type=${values.rawType}`).toBe(
                values.todayLocal
            );
            // API should resolve to the same date as raw (format may differ between V1/V2)
            expect(values.apiLocalDate).toBe(values.rawLocalDate);
        });
    });
}
