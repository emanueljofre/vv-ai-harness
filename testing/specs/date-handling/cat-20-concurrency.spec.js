/**
 * Category 20 — Multi-User Concurrency
 *
 * Tests race conditions, stale writes, and cross-user pipelines that a
 * single-session suite cannot reveal. Each test spawns 2+ browser contexts
 * (each with its own timezoneId + auth state) and orchestrates interleaved
 * save/load/round-trip sequences.
 *
 * All writes go through the guarded `saveFormOnly`/`saveFormAndReload`
 * chokepoints (write-policy enforced). Every test creates a fresh record
 * inside the test — no mutation of pre-saved records.
 *
 * Test cases are defined in ../fixtures/test-data.js with category === 20.
 * The filter also skips non-executable entries (umbrella/skip/theoretical).
 *
 * Tests are single-entry-per-slot because they orchestrate browsers
 * themselves; the usual "run in matching timezone project" gate does not
 * apply. Instead, tests are pinned to a nominal project (BRT-chromium) and
 * spawn their own contexts.
 */
const { test, expect, chromium } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    setFieldValue,
    saveFormOnly,
    captureFieldValues,
} = require('../../helpers/vv-form');
const { loadConfig } = require('../../fixtures/env-config');

const NON_EXECUTABLE_ACTIONS = new Set(['umbrella', 'skip', 'theoretical']);
const categoryTests = TEST_DATA.filter((t) => t.category === 20 && !NON_EXECUTABLE_ACTIONS.has(t.action));

const envConfig = loadConfig();
const BASE_URL = envConfig.baseUrl || 'https://vv5dev.visualvault.com';
const AUTH_STATE = require('path').join(__dirname, '..', '..', 'config', 'auth-state-pw.json');

const TZ_IANA = {
    BRT: 'America/Sao_Paulo',
    IST: 'Asia/Kolkata',
    UTC0: 'Etc/UTC',
    PST: 'America/Los_Angeles',
};

/**
 * Open a fresh authenticated context + page at the given TZ, navigate to
 * FORM_TEMPLATE_URL (or a DataID URL), wait for VV.Form, assert V2 scope
 * matches entry, return `{ context, page }`.
 */
async function openUserContext(browser, { tz, url = FORM_TEMPLATE_URL, entryScope = 'V2' }) {
    const context = await browser.newContext({
        timezoneId: TZ_IANA[tz],
        storageState: AUTH_STATE,
    });
    const page = await context.newPage();
    await gotoAndWaitForVVForm(page, BASE_URL + url);
    const isV2 = await getCodePath(page);
    const envScope = isV2 ? 'V2' : 'V1';
    if (envScope !== entryScope) {
        await context.close();
        test.skip(true, `Entry scope=${entryScope} but env is ${envScope}`);
    }
    return { context, page };
}

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}`, () => {
        // Multi-context tests spawn 3-4 browser contexts, each loading VV.Form (~10-15s).
        // The default 60s timeout is too tight — allow 5 min per test.
        test.setTimeout(5 * 60 * 1000);
        // eslint-disable-next-line no-empty-pattern -- Playwright requires object destructuring even when no fixtures are used
        test(`${tc.id} — ${tc.notes?.substring(0, 60) || tc.scenario}`, async ({}, testInfo) => {
            // Pin to BRT-chromium only — the spec spawns its own contexts, so we don't
            // need to fan this test across the 4-TZ matrix.
            test.skip(testInfo.project.name !== 'BRT-chromium', 'Cat-20 orchestrates its own TZs');

            if (tc.scenario === 'race-same-tz') {
                await runRaceSameTz(tc);
            } else {
                test.skip(true, `Scenario ${tc.scenario} not yet implemented`);
            }
        });
    });
}

/**
 * Scenario: two browser contexts in the same TZ open the same record,
 * both set Config D to different values, both click Save within 500 ms,
 * then the test reloads the record via a third context and captures the
 * winning value. Expected: last-save-wins (no conflict detection).
 */
async function runRaceSameTz(tc) {
    const browser = await chromium.launch();
    try {
        // 1. Create a fresh record in an initial context so there's something to race against.
        const creator = await openUserContext(browser, { tz: tc.tz, entryScope: tc.scope || 'V2' });
        const fieldCfg = FIELD_MAP[tc.config];
        await setFieldValue(creator.page, fieldCfg.field, tc.initialInput);
        const saved = await saveFormOnly(creator.page);
        const recordUrl = saved.url;
        await creator.context.close();

        // 2. Open two competing contexts, both navigate to the saved record URL.
        const userA = await openUserContext(browser, { tz: tc.tz, url: recordUrl, entryScope: tc.scope || 'V2' });
        const userB = await openUserContext(browser, { tz: tc.tz, url: recordUrl, entryScope: tc.scope || 'V2' });

        // 3. Each user sets Config D to a different value.
        await setFieldValue(userA.page, fieldCfg.field, tc.userAInput);
        await setFieldValue(userB.page, fieldCfg.field, tc.userBInput);

        // 4. Fire both Saves as close to simultaneous as possible and collect results.
        const [resultA, resultB] = await Promise.allSettled([saveFormOnly(userA.page), saveFormOnly(userB.page)]);

        await userA.context.close();
        await userB.context.close();

        // 5. Reload the record in a fresh context to see the final server-side state.
        const verifier = await openUserContext(browser, { tz: tc.tz, url: recordUrl, entryScope: tc.scope || 'V2' });
        const finalValues = await captureFieldValues(verifier.page, fieldCfg.field);
        await verifier.context.close();

        // 6. Annotate observations (spec is exploratory; no strict expect on the first run).
        const annotate = (label, value) =>
            test
                .info()
                .annotations.push({
                    type: label,
                    description: typeof value === 'string' ? value : JSON.stringify(value),
                });
        annotate('raceResultA', resultA.status === 'fulfilled' ? resultA.value.dataId : resultA.reason?.message);
        annotate('raceResultB', resultB.status === 'fulfilled' ? resultB.value.dataId : resultB.reason?.message);
        annotate('finalRaw', finalValues.raw);
        annotate('finalApi', finalValues.api);

        // For the first run, just verify we got a valid-shape result (last-save-wins is the
        // expected baseline; refine to a strict match once the initial observation lands).
        expect(finalValues.raw).toBeTruthy();
    } finally {
        await browser.close();
    }
}
