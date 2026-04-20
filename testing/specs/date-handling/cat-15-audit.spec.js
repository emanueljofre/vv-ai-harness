/* eslint-disable no-undef */
/**
 * Category 15 — Kendo Widget Comparison (parameterized)
 *
 * Data-driven version of the cross-env Kendo/VV-Form audit. Reads Cat 15 entries
 * from fixtures/test-data.js, dispatches each one to a named capture function,
 * and records the observed values as `audit-data` annotations. Runs once per
 * spec execution (BRT-chromium only — the audit is pure JS, no TZ or browser
 * engine dependency).
 *
 * Purpose:
 *   - Single source of truth for Cat 15 coverage (test-data.js entries with
 *     tcRef, expectedPerEnv)
 *   - Data collection only: no per-entry assertions on specific values
 *   - expectedPerEnv entries document observed v1/v2 values for drift detection
 *
 * Sibling: audit-kendo-version.spec.js — the original non-parameterized audit.
 *   Both can run; this file is intended to replace the original once all
 *   captures are covered. Until then, they complement each other.
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, vvConfig } = require('../../fixtures/vv-config');
const { gotoAndWaitForVVForm, setFieldValue } = require('../../helpers/vv-form');
const { TEST_DATA } = require('../../fixtures/test-data');

const CAT_15_ENTRIES = TEST_DATA.filter((e) => e.category === 15 && e.action === 'auditCapture');

// Capture functions — each runs in the Playwright test worker and uses page.evaluate()
// to execute inside the browser context. Register a new function here before adding a
// test-data.js entry that references it via `captureFn`.
const CAPTURE_FNS = {
    async vvCore(page) {
        return await page.evaluate(() => ({
            formId: VV.Form.formId,
            formIdType: typeof VV.Form.formId,
            useUpdatedCalendarValueLogic: VV.Form.calendarValueService.useUpdatedCalendarValueLogic,
            calendarValueServiceMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(VV.Form.calendarValueService))
                .filter((m) => m !== 'constructor')
                .sort(),
            hasLocalizationResources: 'LocalizationResources' in VV.Form,
            localizationResourcesType: typeof VV.Form.LocalizationResources,
            localizationResourcesKeys: VV.Form.LocalizationResources
                ? Object.keys(VV.Form.LocalizationResources).sort()
                : null,
            vvFormPropertyCount: Object.keys(VV.Form).length,
        }));
    },

    async fieldMasterByConfig(page, { configKey }) {
        const fieldName = FIELD_MAP[configKey].field;
        return await page.evaluate((fn) => {
            const field = Object.values(VV.Form.VV.FormPartition.fieldMaster).find((f) => f.name === fn);
            if (!field) return { error: 'field not found', fieldName: fn };
            const props = {};
            for (const key of Object.keys(field).sort()) {
                const val = field[key];
                if (typeof val === 'function' || val instanceof HTMLElement) continue;
                try {
                    JSON.stringify(val);
                    props[key] = val;
                } catch {
                    props[key] = `[${typeof val}]`;
                }
            }
            return props;
        }, fieldName);
    },

    async kendoGlobal(page) {
        return await page.evaluate(() => {
            const hasKendo = typeof kendo !== 'undefined';
            return {
                kendoDefined: hasKendo,
                kendoVersion: hasKendo ? kendo.version : null,
                hasCulture: hasKendo && !!kendo.culture,
                cultureName: hasKendo && kendo.culture ? kendo.culture().name : null,
                cultureCalendarPatterns:
                    hasKendo && kendo.culture ? kendo.culture().calendars?.standard?.patterns || null : null,
            };
        });
    },

    async widgetOptsByConfig(page, { configKey }) {
        const fieldName = FIELD_MAP[configKey].field;
        return await page.evaluate((fn) => {
            const input =
                document.querySelector(`[name="${fn}"]`) || document.querySelector(`input[aria-label="${fn}"]`);
            if (!input) return { error: 'input not found', fieldName: fn };
            const widget = $(input).data('kendoDateTimePicker') || $(input).data('kendoDatePicker');
            if (!widget) return { error: 'no kendo widget found', inputRole: input.getAttribute('role') };
            return {
                widgetType: widget.options.name,
                format: widget.options.format,
                parseFormats: widget.options.parseFormats,
                min: widget.options.min ? widget.options.min.toISOString() : null,
                max: widget.options.max ? widget.options.max.toISOString() : null,
                culture: widget.options.culture,
                dateInput: widget.options.dateInput,
                componentType: widget.options.componentType,
                inputRole: input.getAttribute('role'),
                inputType: input.getAttribute('type'),
            };
        }, fieldName);
    },

    async sfvWidget(page, { configKey, value }) {
        const fieldName = FIELD_MAP[configKey].field;
        await setFieldValue(page, fieldName, value);
        return await page.evaluate((fn) => {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(fn);
            const api = VV.Form.GetFieldValue(fn);
            const input =
                document.querySelector(`[name="${fn}"]`) || document.querySelector(`input[aria-label="${fn}"]`);
            const widget = input ? $(input).data('kendoDateTimePicker') || $(input).data('kendoDatePicker') : null;
            const widgetVal = widget ? widget.value() : null;
            return {
                vvRaw: raw,
                vvApi: api,
                widgetValue: widgetVal
                    ? {
                          toString: widgetVal.toString(),
                          toISOString: widgetVal.toISOString(),
                          getTime: widgetVal.getTime(),
                      }
                    : null,
                displayValue: input ? input.value : null,
            };
        }, fieldName);
    },

    async maskScan(page) {
        return await page.evaluate(() => {
            const fields = Object.values(VV.Form.VV.FormPartition.fieldMaster).filter((f) => f.fieldType === 13);
            return {
                totalCalendarFields: fields.length,
                fieldsWithMask: fields.filter((f) => f.mask && f.mask.length > 0).length,
                perField: fields.map((f) => ({
                    name: f.name,
                    enableTime: f.enableTime,
                    ignoreTimezone: f.ignoreTimezone,
                    useLegacy: f.useLegacy,
                    mask: f.mask || null,
                    placeholder: f.placeholder || null,
                    format: f.format || null,
                    displayFormat: f.displayFormat || null,
                })),
            };
        });
    },
};

test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('BRT'), 'Cat 15 audit runs in BRT only');
    test.skip(!testInfo.project.name.endsWith('-chromium'), 'Cat 15 audit runs on chromium only');
    await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
});

for (const entry of CAT_15_ENTRIES) {
    test(`${entry.id} — ${entry.categoryName}`, async ({ page }) => {
        const fn = CAPTURE_FNS[entry.captureFn];
        expect(fn, `No CAPTURE_FNS["${entry.captureFn}"] registered for entry ${entry.id}`).toBeDefined();

        const args = entry.captureArgs || {};
        const observed = await fn(page, args);
        const envKey = vvConfig.customerKey || vvConfig.customerAlias || 'unknown';
        const expected = entry.expectedPerEnv ? entry.expectedPerEnv[envKey] : null;

        test.info().annotations.push({
            type: 'audit-data',
            description: JSON.stringify(
                {
                    id: entry.id,
                    captureFn: entry.captureFn,
                    args,
                    env: envKey,
                    observed,
                    expectedPerEnv: entry.expectedPerEnv || null,
                    expectedForThisEnv: expected,
                },
                null,
                2
            ),
        });

        // Smoke assertion: capture function returned a non-null result.
        // Data-collection mode — an `error` key in the observed value (e.g. "input not found")
        // is recorded as an annotation, not treated as a test failure, because Kendo DOM
        // selector availability is itself a cross-env observation.
        expect(observed).not.toBeNull();
    });
}
