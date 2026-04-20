/**
 * Category 11 — Cross-Timezone
 *
 * Tests that validate behavior across timezone boundaries, multi-user
 * scenarios, and legacy config immunity to FORM-BUG-5 drift.
 *
 * Most Cat 11 tests are GFV round-trips on legacy configs to confirm
 * useLegacy=true prevents cumulative drift. Cross-TZ save/load tests
 * require saved records from specific timezones (use SAVED_RECORDS).
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    verifyField,
    setFieldValue,
    getBrowserTimezone,
    captureFieldValues,
    roundTripCycle,
} = require('../../helpers/vv-form');

// Skip non-executable entries: umbrella slots aggregate child TCs, skip/theoretical
// slots have no runnable scenario. They live in test-data.js for matrix linkage only.
const NON_EXECUTABLE_ACTIONS = new Set(['umbrella', 'skip', 'theoretical']);
const categoryTests = TEST_DATA.filter((t) => t.category === 11 && !NON_EXECUTABLE_ACTIONS.has(t.action));

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.id} — ${tc.notes.substring(0, 60)}`, async ({ page }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            // Navigate to fresh form and wait for VV.Form ready
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2) and skip if entry scope does not match.
            // Entries default to V1 scope; .V2 entries set `scope: 'V2'`. V1 and V2
            // coexist in TEST_DATA for the same category so we can track both
            // baselines; the live env picks the matching set at runtime.
            const isV2 = await getCodePath(page);
            const envScope = isV2 ? 'V2' : 'V1';
            const entryScope = tc.scope || 'V1';
            test.skip(envScope !== entryScope, `Entry scope=${entryScope} but active env is ${envScope}`);
            const fieldCfg = FIELD_MAP[tc.config];

            // Verify field
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Set baseline value
            await setFieldValue(page, fieldCfg.field, tc.inputDateStr);

            // Execute round-trip(s) if specified
            if (tc.action === 'gfvRoundTrip' && tc.trips) {
                await roundTripCycle(page, fieldCfg.field, tc.trips);
            }

            // Verify final values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
