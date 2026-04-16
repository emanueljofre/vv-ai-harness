#!/usr/bin/env node
/**
 * JSON Template Date Validation — targeted validation of date field behavior
 * on JSON-based VV form templates.
 *
 * Tests all 8 configs (A-H) across key categories:
 *   Cat 3:  Save/reload (timezone drift)
 *   Cat 5:  Preset date auto-population
 *   Cat 6:  Current date auto-population
 *   Cat 7:  SetFieldValue input
 *   Cat 8:  GetFieldValue output (fake Z detection)
 *   Cat 9:  GFV roundtrip (progressive drift)
 *   Cat 11: Cross-TZ reload (save in BRT, read in IST)
 *
 * Runs in BRT (primary) and IST (FORM-BUG-7 surface).
 *
 * Usage:
 *   node testing/scripts/json-template-date-validation.js
 *   node testing/scripts/json-template-date-validation.js --headed
 *   node testing/scripts/json-template-date-validation.js --tz BRT     # BRT only
 *   node testing/scripts/json-template-date-validation.js --config A,B  # specific configs
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../../tools/helpers/vv-admin');
const {
    gotoAndWaitForVVForm,
    waitForVVForm,
    setFieldValue,
    captureFieldValues,
    getFieldValue,
    saveFormOnly,
    saveFormAndReload,
    verifyField,
    getCodePath,
    getBrowserTimezone,
    captureDisplayValue,
    roundTripCycle,
} = require('../helpers/vv-form');

// --- Configuration ---

const REVISION_ID = '1b6fa291-c139-f111-aafa-947a24228ff3'; // rev 4
const TEST_DATE = '03/15/2026';
const TEST_DATE_ISO = '2026-03-15';
const TEST_DATE_DATETIME = '03/15/2026 12:00 AM';

const HEADED = process.argv.includes('--headed');
const TZ_FILTER = (() => {
    const idx = process.argv.indexOf('--tz');
    return idx >= 0 ? process.argv[idx + 1].split(',') : null;
})();
const CONFIG_FILTER = (() => {
    const idx = process.argv.indexOf('--config');
    return idx >= 0 ? process.argv[idx + 1].split(',') : null;
})();

// JSON template field map — configs A-H plus initial-value variants
const JSON_FIELD_MAP = {
    A: { field: 'DateNoIgnoreTZ', enableTime: false, ignoreTimezone: false, useLegacy: false },
    B: { field: 'DateOnly', enableTime: false, ignoreTimezone: true, useLegacy: false },
    C: { field: 'DateTimeNoIgnoreTZ', enableTime: true, ignoreTimezone: false, useLegacy: false },
    D: { field: 'DateTime', enableTime: true, ignoreTimezone: true, useLegacy: false },
    E: { field: 'DateNoIgnoreTZLegacy', enableTime: false, ignoreTimezone: false, useLegacy: true },
    F: { field: 'DateLegacy', enableTime: false, ignoreTimezone: true, useLegacy: true },
    G: { field: 'DateTimeNoIgnoreTZLegacy', enableTime: true, ignoreTimezone: false, useLegacy: true },
    H: { field: 'DateTimeLegacy', enableTime: true, ignoreTimezone: true, useLegacy: true },
};

const INITIAL_VALUE_FIELDS = {
    preset: { field: 'DatePreset', config: 'A', mode: 'preset' },
    currentDate: { field: 'DataField7', config: 'A', mode: 'currentDate' },
};

const TIMEZONES = [
    { id: 'America/Sao_Paulo', label: 'BRT', offset: -3 },
    { id: 'Asia/Kolkata', label: 'IST', offset: 5.5 },
];

// --- Expected values (derived from XML baseline) ---

function expectedRawAfterSFV(config) {
    return config.enableTime ? `${TEST_DATE_ISO}T00:00:00` : TEST_DATE_ISO;
}

function expectedGFV(config) {
    // Bug #5: DateTime + ignoreTZ fields append fake Z
    if (config.enableTime && config.ignoreTimezone) {
        return `${TEST_DATE_ISO}T00:00:00.000Z`; // fake Z — FORM-BUG-5
    }
    return config.enableTime ? `${TEST_DATE_ISO}T00:00:00` : TEST_DATE_ISO;
}

// --- Main ---

(async () => {
    const match = vvAdmin.findCustomer('wadnr');
    const envConfig = vvAdmin.loadEnvConfig(match.server, match.customer);

    const browser = await chromium.launch({ headless: !HEADED });
    const formUrl =
        envConfig.baseUrl + '/FormViewer/app?hidemenu=true&formid=' + REVISION_ID + '&xcid=WADNR&xcdid=fpOnline';

    const results = [];
    const savedRecords = {}; // config -> { dataId, url } for Cat 11

    const activeTimezones = TZ_FILTER ? TIMEZONES.filter((tz) => TZ_FILTER.includes(tz.label)) : TIMEZONES;
    const activeConfigs = CONFIG_FILTER
        ? Object.fromEntries(Object.entries(JSON_FIELD_MAP).filter(([k]) => CONFIG_FILTER.includes(k)))
        : JSON_FIELD_MAP;

    for (const tz of activeTimezones) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`TIMEZONE: ${tz.label} (${tz.id})`);
        console.log('='.repeat(60));

        const context = await browser.newContext({ timezoneId: tz.id });
        const page = await context.newPage();

        await vvAdmin.login(page, envConfig);
        const tzString = await getBrowserTimezone(page);
        console.log('Browser TZ:', tzString.split('(')[1]?.replace(')', '') || tzString);

        for (const [configKey, config] of Object.entries(activeConfigs)) {
            console.log(`\n--- Config ${configKey}: ${config.field} ---`);
            console.log(
                `    enableTime=${config.enableTime}, ignoreTZ=${config.ignoreTimezone}, useLegacy=${config.useLegacy}`
            );

            const configResult = {
                config: configKey,
                field: config.field,
                tz: tz.label,
                flags: {
                    enableTime: config.enableTime,
                    ignoreTimezone: config.ignoreTimezone,
                    useLegacy: config.useLegacy,
                },
                tests: {},
            };

            try {
                // --- Navigate to fresh form ---
                await gotoAndWaitForVVForm(page, formUrl);

                // Verify field config matches expectations
                const fieldName = await verifyField(page, {
                    enableTime: config.enableTime,
                    ignoreTimezone: config.ignoreTimezone,
                    useLegacy: config.useLegacy,
                    enableInitialValue: false,
                });
                if (fieldName !== config.field) {
                    console.log(`    WARN: verifyField returned ${fieldName}, expected ${config.field}`);
                }

                const codePath = await getCodePath(page);
                configResult.codePath = codePath ? 'V2' : 'V1';

                // --- Cat 7: SetFieldValue ---
                const sfvInput = config.enableTime ? TEST_DATE_DATETIME : TEST_DATE;
                await setFieldValue(page, config.field, sfvInput);
                const afterSFV = await captureFieldValues(page, config.field);

                const expectedRaw = expectedRawAfterSFV(config);
                const expectedApi = expectedGFV(config);

                configResult.tests.cat7 = {
                    input: sfvInput,
                    raw: afterSFV.raw,
                    api: afterSFV.api,
                    expectedRaw,
                    expectedApi,
                    rawMatch: afterSFV.raw === expectedRaw,
                    apiMatch: afterSFV.api === expectedApi,
                    status: afterSFV.raw === expectedRaw ? 'PASS' : 'FAIL',
                };
                console.log(
                    `    Cat 7 (SFV): raw=${afterSFV.raw} ${configResult.tests.cat7.rawMatch ? 'OK' : 'MISMATCH'}`
                );

                // --- Cat 8: GetFieldValue ---
                configResult.tests.cat8 = {
                    api: afterSFV.api,
                    expectedApi,
                    hasFakeZ: afterSFV.api.endsWith('Z') && config.ignoreTimezone,
                    match: afterSFV.api === expectedApi,
                    status: afterSFV.api === expectedApi ? 'PASS' : 'FAIL',
                };
                console.log(
                    `    Cat 8 (GFV): api=${afterSFV.api} ${configResult.tests.cat8.match ? 'OK' : 'MISMATCH'}${configResult.tests.cat8.hasFakeZ ? ' [FAKE Z]' : ''}`
                );

                // --- Cat 3: Save and Reload ---
                const { dataId, url: savedUrl } = await saveFormOnly(page);
                const fullSavedUrl = envConfig.baseUrl + savedUrl;

                // Stash for Cat 11
                if (tz.label === 'BRT') {
                    savedRecords[configKey] = { dataId, url: fullSavedUrl };
                }

                await gotoAndWaitForVVForm(page, fullSavedUrl);
                const afterReload = await captureFieldValues(page, config.field);

                configResult.tests.cat3 = {
                    raw: afterReload.raw,
                    api: afterReload.api,
                    expectedRaw,
                    drift: afterReload.raw !== expectedRaw,
                    status: afterReload.raw === expectedRaw ? 'PASS' : 'FAIL',
                };
                console.log(
                    `    Cat 3 (reload): raw=${afterReload.raw} ${configResult.tests.cat3.drift ? '*** DRIFT ***' : 'OK'}`
                );

                // --- Cat 9: GFV Roundtrip ---
                const trips = await roundTripCycle(page, config.field, 3);
                const lastTrip = trips[trips.length - 1];
                const firstTrip = trips[0];
                const driftDetected = lastTrip.raw !== firstTrip.raw;

                configResult.tests.cat9 = {
                    trips,
                    drift: driftDetected,
                    status: driftDetected ? 'FAIL' : 'PASS',
                };
                console.log(
                    `    Cat 9 (roundtrip): ${trips.map((t) => t.raw).join(' → ')} ${driftDetected ? '*** DRIFT ***' : 'OK'}`
                );
            } catch (err) {
                configResult.error = err.message;
                console.log(`    ERROR: ${err.message}`);
            }

            results.push(configResult);
        }

        // --- Cat 5/6: Preset + Current Date (first TZ only) ---
        if (tz.label === 'BRT') {
            for (const [mode, ivField] of Object.entries(INITIAL_VALUE_FIELDS)) {
                console.log(`\n--- Initial Value: ${mode} (${ivField.field}) ---`);
                try {
                    await gotoAndWaitForVVForm(page, formUrl);
                    const vals = await captureFieldValues(page, ivField.field);
                    const display = await captureDisplayValue(page, ivField.field).catch(() => '(capture failed)');

                    const ivResult = {
                        config: ivField.config + '+' + mode,
                        field: ivField.field,
                        tz: tz.label,
                        tests: {
                            ['cat' + (mode === 'preset' ? '5' : '6')]: {
                                raw: vals.raw,
                                api: vals.api,
                                display,
                                populated: vals.raw !== '' && vals.raw !== null,
                                status: vals.raw !== '' && vals.raw !== null ? 'PASS' : 'FAIL',
                            },
                        },
                    };
                    console.log(`    raw=${vals.raw}, api=${vals.api}, display=${display}`);
                    results.push(ivResult);
                } catch (err) {
                    console.log(`    ERROR: ${err.message}`);
                }
            }
        }

        await context.close();
    }

    // --- Cat 11: Cross-TZ reload (BRT records opened in IST) ---
    if (Object.keys(savedRecords).length > 0 && (!TZ_FILTER || TZ_FILTER.includes('IST'))) {
        console.log(`\n${'='.repeat(60)}`);
        console.log('CAT 11: CROSS-TZ RELOAD (BRT → IST)');
        console.log('='.repeat(60));

        const istContext = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
        const istPage = await istContext.newPage();
        await vvAdmin.login(istPage, envConfig);

        for (const [configKey, record] of Object.entries(savedRecords)) {
            const config = JSON_FIELD_MAP[configKey];
            if (CONFIG_FILTER && !CONFIG_FILTER.includes(configKey)) continue;

            try {
                await gotoAndWaitForVVForm(istPage, record.url);
                const vals = await captureFieldValues(istPage, config.field);
                const expectedRaw = expectedRawAfterSFV(config);
                const drift = vals.raw !== expectedRaw;

                const cat11Result = results.find((r) => r.config === configKey && r.tz === 'BRT');
                if (cat11Result) {
                    cat11Result.tests.cat11 = {
                        readTZ: 'IST',
                        raw: vals.raw,
                        api: vals.api,
                        expectedRaw,
                        drift,
                        status: drift ? 'FAIL' : 'PASS',
                    };
                }
                console.log(
                    `    Config ${configKey} (${config.field}): raw=${vals.raw} ${drift ? '*** CROSS-TZ DRIFT ***' : 'OK'}`
                );
            } catch (err) {
                console.log(`    Config ${configKey}: ERROR - ${err.message}`);
            }
        }

        await istContext.close();
    }

    await browser.close();

    // --- Summary ---
    console.log(`\n${'='.repeat(80)}`);
    console.log('RESULTS SUMMARY — JSON Template Date Validation');
    console.log('='.repeat(80));
    console.log(
        `${'Config'.padEnd(8)}${'Field'.padEnd(28)}${'TZ'.padEnd(6)}${'Cat3'.padEnd(8)}${'Cat7'.padEnd(8)}${'Cat8'.padEnd(8)}${'Cat9'.padEnd(8)}${'Cat11'.padEnd(8)}${'Notes'}`
    );
    console.log('-'.repeat(90));

    for (const r of results) {
        if (!r.tests) continue;
        const notes = [];
        if (r.tests.cat8?.hasFakeZ) notes.push('FORM-BUG-5');
        if (r.tests.cat9?.drift) notes.push('Cat9-drift');
        if (r.tests.cat11?.drift) notes.push('Cat11-drift');
        if (r.error) notes.push('ERROR');

        console.log(
            `${(r.config || '').padEnd(8)}${(r.field || '').padEnd(28)}${(r.tz || '').padEnd(6)}` +
                `${(r.tests.cat3?.status || '-').padEnd(8)}` +
                `${(r.tests.cat7?.status || '-').padEnd(8)}` +
                `${(r.tests.cat8?.status || '-').padEnd(8)}` +
                `${(r.tests.cat9?.status || '-').padEnd(8)}` +
                `${(r.tests.cat11?.status || '-').padEnd(8)}` +
                `${notes.join(', ')}`
        );
    }

    // Save structured results
    const outputPath = path.join(__dirname, '..', 'tmp', 'json-validation-results.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
        outputPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                template: 'zzzDateJsonTest',
                revisionId: REVISION_ID,
                revision: 4,
                testDate: TEST_DATE,
                results,
            },
            null,
            2
        )
    );
    console.log(`\nResults saved to: ${outputPath}`);

    // Exit summary
    const total = results.filter((r) => r.tests).length;
    const errors = results.filter((r) => r.error).length;
    console.log(`\nTotal: ${total} config×TZ combinations tested, ${errors} errors`);
})().catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
});
