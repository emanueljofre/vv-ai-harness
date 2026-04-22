/**
 * Category 18 — Customer Culture (locale) Tests
 *
 * Exercises how the Kendo datepicker parses typed input under different
 * Customer Culture settings (Central Admin → Customer Details → Culture).
 * Default is `English (United States)` (MM/DD/YYYY); slots with scope
 * `.ptBR` expect `Portuguese (Brazil)` (DD/MM/YYYY) — the Culture must be
 * toggled in Central Admin before those run.
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
    captureFieldValues,
    getBrowserTimezone,
} = require('../../helpers/vv-form');
const { typeDateInField } = require('../../helpers/vv-calendar');

const NON_EXECUTABLE_ACTIONS = new Set(['umbrella', 'skip', 'theoretical']);
const categoryTests = TEST_DATA.filter((t) => t.category === 18 && !NON_EXECUTABLE_ACTIONS.has(t.action));

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.id} — type "${tc.inputDateStr}" under Culture=${tc.culture || 'enUS'}`, async ({
            page,
        }, testInfo) => {
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            const isV2 = await getCodePath(page);
            const envScope = isV2 ? 'V2' : 'V1';
            const entryScope = tc.scope || 'V1';
            test.skip(envScope !== entryScope, `Entry scope=${entryScope} but active env is ${envScope}`);

            const fieldCfg = FIELD_MAP[tc.config];
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Kendo rejects culture-mismatch / invalid strings silently — the field stays
            // empty. waitForValue:false skips the 5s raw-value poll in those cases.
            const expectsEmpty = tc.expectedRaw === '' || tc.expectedApi === '';
            await typeDateInField(page, fieldCfg.field, tc.inputDateStr, { waitForValue: !expectsEmpty });

            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
