/**
 * Category 10 — Web Service Input
 *
 * Simulates a scheduled script, form button event, or REST API call setting a
 * date field via `postForms`, then opens the resulting record in the browser
 * to capture what Forms V1 actually presents to the user.
 *
 * Per-test pipeline (action: 'wsApiCreateAndLoad'):
 *   1. POST /api/v1/{customer}/{db}/formtemplates/{templateId}/forms with the
 *      target field set to tc.inputDateStr  →  record created, DataID returned
 *   2. (Optional) GET the record back via OData query to verify expectedApiStored
 *   3. Navigate the browser to /FormViewer/app?DataID=... and wait for VV.Form
 *   4. Capture getValueObjectValue + GetFieldValue + display input
 *   5. Assert expectedRaw / expectedApi / expectedDisplay
 *
 * Fresh records per run — no reliance on pre-existing fixture records. Old
 * records may have been saved under a different build.
 *
 * Expected values reflect OBSERVED (current buggy) behavior so the regression
 * detects drift. Source: ws-4-batch-run-1.md + cat10-gaps-run-1.md (2026-04-02).
 *
 * V1 only — spec skips on V2 until re-baselined (see projects/emanueljofre-vv5dev).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, vvConfig } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const { gotoAndWaitForVVForm, getCodePath, captureFieldValues, captureDisplayValue } = require('../../helpers/vv-form');
const { guardedPost } = require('../../helpers/vv-request');

const categoryTests = TEST_DATA.filter((t) => t.category === 10);

const API_BASE = `/api/v1/${vvConfig.customerAlias}/${vvConfig.databaseAlias}`;

function parseTemplateIdFromUrl(url) {
    const match = /[?&]formid=([^&]+)/i.exec(url);
    if (!match) throw new Error(`Cannot extract formid from FORM_TEMPLATE_URL: ${url}`);
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
    return { instanceName: created.instanceName, revisionId: created.revisionId, id: created.id };
}

async function apiGetFormById(request, dataId) {
    const t = await getToken(request);
    const resp = await request.get(`${vvConfig.baseUrl}${API_BASE}/formtemplates/${TEMPLATE_ID}/forms`, {
        headers: { Authorization: `Bearer ${t}` },
        params: { q: `[id] eq '${dataId}'`, expand: 'true' },
    });
    expect(resp.ok()).toBeTruthy();
    const rows = (await resp.json()).data || [];
    return rows[0];
}

function caseInsensitiveField(record, fieldName) {
    if (!record) return undefined;
    const target = fieldName.toLowerCase();
    const key = Object.keys(record).find((k) => k.toLowerCase() === target);
    return key ? record[key] : undefined;
}

function buildRecordUrl(dataId) {
    // FORM_TEMPLATE_URL has `formid=...&xcid=...&xcdid=...` — replace formid with DataID.
    return FORM_TEMPLATE_URL.replace(/([?&])formid=[^&]+/i, `$1DataID=${dataId}`);
}

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.action} via ${tc.inputDateStr || '(empty)'}`, async ({ page, request }, testInfo) => {
            // Only run in the matching TZ project, chromium only (storage path, not engine-sensitive).
            test.skip(
                !testInfo.project.name.startsWith(tc.tz) || !testInfo.project.name.endsWith('chromium'),
                `Skipping — test is for ${tc.tz}-chromium`
            );

            const fieldCfg = FIELD_MAP[tc.config];
            const fieldName = fieldCfg.field;

            // 1) Create record via API
            const created = await apiPostForm(request, { [fieldName]: tc.inputDateStr });

            // 2) (Optional) sanity-check what the API layer stored before browser load
            if (tc.expectedApiStored !== undefined) {
                const record = await apiGetFormById(request, created.id);
                const stored = caseInsensitiveField(record, fieldName) ?? '';
                expect(stored, `API-stored value for ${fieldName}`).toBe(tc.expectedApiStored);
            }

            // 3) Navigate browser to the saved record
            const recordUrl = buildRecordUrl(created.id);
            await gotoAndWaitForVVForm(page, recordUrl);

            // V1 expected values only — skip on V2 until re-baselined
            const isV2 = await getCodePath(page);
            test.skip(isV2 === true, 'V2 expected values not yet baselined for Cat 10');

            // Small settling delay — Forms init is async
            await page.waitForTimeout(500);

            // 4) Capture observables
            const values = await captureFieldValues(page, fieldName);
            const display = await captureDisplayValue(page, fieldName);

            // 5) Assert
            expect(values.raw ?? '', `rawValue for ${fieldName}`).toBe(tc.expectedRaw);
            expect(values.api ?? '', `GetFieldValue for ${fieldName}`).toBe(tc.expectedApi);
            if (tc.expectedDisplay !== undefined) {
                expect(display ?? '', `display for ${fieldName}`).toBe(tc.expectedDisplay);
            }
        });
    });
}
