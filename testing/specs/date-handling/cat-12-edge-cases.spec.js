/**
 * Category 12 — Edge Cases
 *
 * Boundary conditions, timezone controls, and special inputs that stress
 * date handling logic at extremes. Most tests are GFV round-trips at
 * specific boundary values (near midnight, year boundary, UTC+0 control).
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
const categoryTests = TEST_DATA.filter((t) => t.category === 12 && !NON_EXECUTABLE_ACTIONS.has(t.action));

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

            // Empty/null/invalid inputs on V1: SFV returns quickly; GFV hits FORM-BUG-6
            // ("Invalid Date" for Config D, RangeError for Config C), default 60s timeout is fine.
            // V2: SFV(empty|null) triggers FORM-BUG-8 (returned Promise never resolves). The
            // setFieldValue helper accepts sfvTimeoutMs to race the in-page SFV against a deadline
            // and return {sfvHung:true} instead of hanging the whole test — V2 siblings set
            // expectedRaw/expectedApi to `__FORM-BUG-8__` so the assertion becomes a deterministic
            // bug-confirmed PASS.
            const fieldCfg = FIELD_MAP[tc.config];

            // Verify field
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Set baseline value (skip wait for empty/invalid inputs that won't populate)
            const isEmptyOrNullInput = tc.inputDateStr === '' || tc.inputDateStr === null;
            const waitForValue = !isEmptyOrNullInput && tc.inputDateStr !== 'not-a-date';
            const sfvTimeoutMs = isEmptyOrNullInput ? 8000 : 0;
            const sfvResult = await setFieldValue(page, fieldCfg.field, tc.inputDateStr, {
                waitForValue,
                sfvTimeoutMs,
            });

            let values;
            if (sfvResult.sfvHung) {
                // FORM-BUG-8: V2 SFV(empty|null) Promise never resolves. Post-SFV state is
                // unreliable (side effects in flight), so skip the capture and assert the
                // sentinel — V2 sibling entries encode this expected outcome.
                values = { raw: '__FORM-BUG-8__', api: '__FORM-BUG-8__' };
            } else {
                // Execute round-trip(s) if specified
                if (tc.action === 'gfvRoundTrip' && tc.trips) {
                    await roundTripCycle(page, fieldCfg.field, tc.trips);
                }
                values = await captureFieldValues(page, fieldCfg.field);
            }

            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
