/**
 * Category 13 — Database Storage Verification (via REST API)
 *
 * Verifies what VV actually stores in the database for date fields under
 * different write paths. Reads back via the REST getForms endpoint — the
 * server-returned value reflects the stored datetime (with a trailing "Z"
 * appended by the API layer, even for naive local times).
 *
 * Each test creates a FRESH record per run — never asserts on pre-existing
 * fixture records. Old records may have been saved under a different platform
 * build; fresh-record-per-run ensures the assertion exercises current code.
 *
 * Action branches (see fixtures/test-data.js for Cat 13 entries):
 *   - apiWriteRead           POST /formtemplates/{id}/forms  → GET by instanceName → assert per-field
 *   - saveAndApiRead         Open template → SFV → saveFormOnly → GET by dataId → assert per-field
 *   - roundtripSaveAndApiRead Open template → SFV → roundTripCycle N × → saveFormOnly → GET → assert
 *   - querySameLogicalDate   Save from current TZ + from IST (2nd browser context) → OData query →
 *                             assert BRT record found, IST record not found
 *
 * Assumptions:
 *   - Expected values are V1-baselined (vvdemo, WADNR run V1). Spec skips on V2 until
 *     re-baselined (see projects/emanueljofre-vv5dev/testing/date-handling/status.md).
 *   - Target environment must allow writes to the DateTest form template (vvdemo
 *     unrestricted OK; allowlist envs need the template in writePolicy.forms).
 *   - Expected API values carry a trailing "Z" even when the DB stores a naive
 *     datetime — the REST layer appends Z unconditionally on read.
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, vvConfig, AUTH_STATE_PATH } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    setFieldValue,
    saveFormOnly,
    roundTripCycle,
} = require('../../helpers/vv-form');
const { guardedPost } = require('../../helpers/vv-request');

const categoryTests = TEST_DATA.filter((t) => t.category === 13);

const API_BASE = `/api/v1/${vvConfig.customerAlias}/${vvConfig.databaseAlias}`;

function parseTemplateIdFromUrl(url) {
    const match = /[?&]formid=([^&]+)/i.exec(url);
    if (!match) {
        throw new Error(`Cannot extract formid from FORM_TEMPLATE_URL: ${url}`);
    }
    return match[1].toLowerCase();
}

const TEMPLATE_ID = parseTemplateIdFromUrl(FORM_TEMPLATE_URL);

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
    return { instanceName: created.instanceName, revisionId: created.revisionId, id: created.id, raw: body };
}

async function apiGetFormByQuery(request, query) {
    const t = await getToken(request);
    const url = `${vvConfig.baseUrl}${API_BASE}/formtemplates/${TEMPLATE_ID}/forms`;
    const resp = await request.get(url, {
        headers: { Authorization: `Bearer ${t}` },
        params: { q: query, expand: 'true' },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    return body.data || [];
}

function caseInsensitiveField(record, fieldName) {
    if (!record) return undefined;
    const target = fieldName.toLowerCase();
    const key = Object.keys(record).find((k) => k.toLowerCase() === target);
    return key ? record[key] : undefined;
}

async function captureInstanceName(page) {
    return page.evaluate(() => {
        const nameEl = document.querySelector('.formInstanceName, [data-field="instanceName"]');
        return nameEl ? nameEl.textContent.trim() : '';
    });
}

async function saveViaBrowser(page, inputs) {
    for (const { field, value } of inputs) {
        await setFieldValue(page, field, value);
    }
    await page.waitForTimeout(300);
    const { dataId } = await saveFormOnly(page);
    const instanceName = await captureInstanceName(page);
    return { dataId, instanceName };
}

async function readRecordByInstanceName(request, instanceName, dataId) {
    // Prefer instanceName (record name like "DateTest-000123"); fall back to dataId GUID.
    let rows = [];
    if (instanceName) {
        rows = await apiGetFormByQuery(request, `[instanceName] eq '${instanceName}'`);
    }
    if (!rows.length && dataId) {
        rows = await apiGetFormByQuery(request, `[id] eq '${dataId}'`);
    }
    expect(rows.length).toBeGreaterThan(0);
    return rows[0];
}

function resolveField(config, variant) {
    const cfg = FIELD_MAP[config];
    if (!cfg) throw new Error(`Unknown config: ${config}`);
    return variant === 'preset' ? cfg.preset : variant === 'currentDate' ? cfg.currentDate : cfg.field;
}

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}`, () => {
        test(`${tc.action} — ${tc.notes || ''}`.trim(), async ({ page, request, browser }, testInfo) => {
            // Run only in the matching timezone project (first browser engine only —
            // these tests exercise the server storage path, browser engine is not a variable).
            test.skip(
                !testInfo.project.name.startsWith(tc.tz) || !testInfo.project.name.endsWith('chromium'),
                `Skipping — test is for ${tc.tz}-chromium`
            );

            // V1 expected values only — skip on V2 until re-baselined
            if (tc.action !== 'apiWriteRead') {
                await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
                const isV2 = await getCodePath(page);
                test.skip(isV2 === true, 'V2 expected values not yet baselined for Cat 13');
            }

            if (tc.action === 'apiWriteRead') {
                // Pure API path — no browser. Build field values from tc.apiInput map.
                const fieldValues = {};
                for (const [config, value] of Object.entries(tc.apiInput)) {
                    const fieldName = resolveField(config, 'base');
                    fieldValues[fieldName] = value;
                }
                const created = await apiPostForm(request, fieldValues);
                const record = await readRecordByInstanceName(request, created.instanceName, created.id);
                for (const [config, expected] of Object.entries(tc.apiAssertions)) {
                    const fieldName = resolveField(config, 'base');
                    const actual = caseInsensitiveField(record, fieldName);
                    expect(actual, `Config ${config} (${fieldName})`).toBe(expected);
                }
                return;
            }

            if (tc.action === 'saveAndApiRead') {
                // Already on template (gotoAndWaitForVVForm was called for V1/V2 check).
                const inputs = (tc.browserInputs || []).map((b) => ({
                    field: resolveField(b.config, b.variant || 'base'),
                    value: b.value,
                }));
                const { dataId, instanceName } = await saveViaBrowser(page, inputs);
                const record = await readRecordByInstanceName(request, instanceName, dataId);
                for (const a of tc.apiAssertions) {
                    const fieldName = resolveField(a.config, a.variant || 'base');
                    const actual = caseInsensitiveField(record, fieldName);
                    expect(actual, `Config ${a.config} (${fieldName}, variant ${a.variant || 'base'})`).toBe(
                        a.expected
                    );
                }
                return;
            }

            if (tc.action === 'roundtripSaveAndApiRead') {
                const fieldName = resolveField(tc.config, 'base');
                await setFieldValue(page, fieldName, tc.sfvInput);
                await page.waitForTimeout(300);
                await roundTripCycle(page, fieldName, tc.roundTrips);
                await page.waitForTimeout(300);
                const { dataId } = await saveFormOnly(page);
                const instanceName = await captureInstanceName(page);
                const record = await readRecordByInstanceName(request, instanceName, dataId);
                const actual = caseInsensitiveField(record, fieldName);
                expect(actual, `Config ${tc.config} (${fieldName}) after ${tc.roundTrips} round-trip(s)`).toBe(
                    tc.expectedApi
                );
                return;
            }

            if (tc.action === 'querySameLogicalDate') {
                // 1) Save record in current (BRT) TZ using the already-loaded page
                const inputsA = (tc.browserInputs || []).map((b) => ({
                    field: resolveField(b.config, b.variant || 'base'),
                    value: b.value,
                }));
                const recA = await saveViaBrowser(page, inputsA);

                // 2) Save another record in a second TZ via a new browser context
                const ctxB = await browser.newContext({
                    timezoneId: tc.altTz.timezoneId,
                    storageState: AUTH_STATE_PATH,
                });
                const pageB = await ctxB.newPage();
                await gotoAndWaitForVVForm(pageB, FORM_TEMPLATE_URL);
                const recB = await saveViaBrowser(pageB, inputsA);
                await ctxB.close();

                // 3) Query by field value — expect only recA to match
                const queryField = resolveField(tc.queryConfig, 'base');
                const matches = await apiGetFormByQuery(request, `[${queryField}] eq '${tc.queryDate}'`);
                const names = matches.map((m) => m.instanceName);
                expect(names, `query for ${tc.queryDate} should find ${recA.instanceName}`).toContain(
                    recA.instanceName
                );
                expect(
                    names,
                    `query for ${tc.queryDate} should NOT find ${recB.instanceName} (FORM-BUG-7)`
                ).not.toContain(recB.instanceName);
                return;
            }

            throw new Error(`Unknown Cat 13 action: ${tc.action}`);
        });
    });
}
