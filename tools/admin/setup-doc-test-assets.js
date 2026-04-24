#!/usr/bin/env node
/**
 * Provision the document-library date-handling test assets on a VV customer.
 *
 * Idempotent — re-running is safe. Each step checks current state and skips
 * work already done. On success prints the CUSTOMER_DOC_CONFIG block to paste
 * into testing/fixtures/vv-config.js.
 *
 * What it does:
 *   1. Ensures a test folder exists (default: /zzz-date-tests)
 *   2. Confirms a global "Date" index field exists (must be pre-created in
 *      Index Field Admin — the REST API does not expose a create endpoint)
 *   3. Assigns the Date field to the folder (PUT /indexfields/{id}/folders/{folderId})
 *   4. Uploads a small test document into the folder
 *   5. Verifies read/write on the document's Date index field
 *
 * Usage:
 *   node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev
 *   node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev --folder /zzz-date-tests --field Date
 *   node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev --dry-run
 */
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');

const cliArgs = process.argv.slice(2);
function getArg(flag, fallback = null) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : fallback;
}

const PROJECT_NAME = getArg('--project');
const FOLDER_PATH = getArg('--folder', '/zzz-date-tests');
const FIELD_LABEL = getArg('--field', 'Date');
const PRESET_FIELD_LABEL = getArg('--preset-field', 'Date With Preset');
const DOC_NAME = getArg('--doc-name', 'zzz-date-test-doc');
const DRY_RUN = cliArgs.includes('--dry-run');

if (!PROJECT_NAME) {
    console.error(
        'Usage: node tools/admin/setup-doc-test-assets.js --project <name> [--folder <path>] [--field <label>] [--dry-run]'
    );
    process.exit(1);
}

function asObject(raw) {
    if (raw == null) return raw;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function firstRow(resp) {
    if (!resp) return null;
    const data = resp.data;
    if (Array.isArray(data)) return data[0] || null;
    if (data && typeof data === 'object') return data;
    return resp;
}

async function ensureFolder(vvClient, folderPath) {
    const name = folderPath.replace(/^\//, '');
    console.log(`\n[1/5] Locating folder "${folderPath}"...`);
    const all = asObject(await vvClient.library.getFolders(null));
    const rows = Array.isArray(all?.data) ? all.data : [];
    const match = rows.find((f) => (f.name || '').toLowerCase() === name.toLowerCase());
    if (match) {
        console.log(`      found: id=${match.id}  name=${match.name}`);
        return match;
    }

    if (DRY_RUN) {
        console.log(`      [dry-run] would POST /folders folderpath="${folderPath}"`);
        return { id: '<dry-run-folder-id>', name };
    }

    console.log(`      not found — creating...`);
    const created = asObject(
        await vvClient.library.postFolderByPath(null, { name, description: 'Date-handling test assets' }, folderPath)
    );
    const row = firstRow(created);
    if (!row?.id) throw new Error(`Folder create failed: ${JSON.stringify(created).slice(0, 500)}`);
    console.log(`      created: id=${row.id}`);
    return row;
}

async function findDateField(vvClient, label) {
    console.log(`\n[2/5] Locating global index field "${label}" (fieldType 4)...`);
    const resp = asObject(await vvClient.indexFields.getIndexFields(null));
    const rows = Array.isArray(resp?.data) ? resp.data : [];
    const field = rows.find(
        (r) => (r.name || r.label) === label && (r.fieldType === 4 || r.fieldTypeName === 'Date Time')
    );
    if (!field) {
        console.error(`      NOT FOUND among ${rows.length} global index fields:`);
        rows.forEach((r) => {
            console.error(`        - "${r.name || r.label}"  fieldType=${r.fieldType}  (${r.fieldTypeName || '?'})`);
        });
        console.error(`      Create a global index field named "${label}" (Date Time / fieldType 4)`);
        console.error(`      via the Admin UI → Index Field Admin, then rerun this script.`);
        console.error(`      (No REST endpoint exists to create global index fields.)`);
        process.exit(1);
    }
    console.log(`      found: id=${field.id}  fieldType=${field.fieldType}  name=${field.name}`);
    return field;
}

async function assignFieldToFolder(vvClient, fieldId, folder) {
    console.log(`\n[3/5] Assigning field ${fieldId} to folder ${folder.id}...`);
    const existing = asObject(await vvClient.library.getFolderIndexFields(null, folder.id));
    const rows = Array.isArray(existing?.data) ? existing.data : [];
    if (rows.find((r) => r.indexFieldId === fieldId || r.id === fieldId)) {
        console.log(`      already assigned (ok)`);
        return;
    }
    if (DRY_RUN) {
        console.log(`      [dry-run] would PUT /indexfields/${fieldId}/folders/${folder.id}`);
        return;
    }
    const raw = await vvClient.indexFields.putIndexFields(fieldId, folder.id);
    const resp = asObject(raw);
    const status = resp?.meta?.status || 'ok';
    console.log(`      status: ${status}`);
}

async function uploadTestDocument(vvClient, folder, docName) {
    console.log(`\n[4/5] Ensuring test document "${docName}" in ${folder.name}...`);
    const listResp = asObject(await vvClient.library.getDocuments(null, folder.id));
    const rows = Array.isArray(listResp?.data) ? listResp.data : [];
    const existing = rows.find((d) => (d.name || '').toLowerCase() === docName.toLowerCase());
    if (existing) {
        console.log(`      existing doc found: revisionId=${existing.id}  documentId=${existing.documentId}`);
        return existing;
    }
    if (DRY_RUN) {
        console.log(`      [dry-run] would POST /documents with 256-byte text buffer`);
        return { id: '<dry-run-doc-id>' };
    }

    const fileContents = Buffer.from(
        `Date-handling test document.\nProvisioned by tools/admin/setup-doc-test-assets.js\n` +
            `This document's "Date" index field is overwritten by the date-handling regression.\n`,
        'utf8'
    );
    const data = {
        name: docName,
        filename: `${docName}.txt`,
        folderId: folder.id,
        description: 'Date-handling test asset — safe to overwrite Date index field.',
        revision: '1',
        indexFields: JSON.stringify({}),
    };
    const raw = await vvClient.documents.postDocWithFile(data, fileContents);
    const resp = asObject(raw);
    const row = firstRow(resp);
    if (!row?.id) throw new Error(`Document create failed: ${JSON.stringify(resp).slice(0, 500)}`);

    // postDocWithFile returns { id: <revisionId> }. The /documents/{id}/indexfields
    // endpoint expects the stable documentId — resolve it by re-listing the folder.
    const listAfter = asObject(await vvClient.library.getDocuments(null, folder.id));
    const rowsAfter = Array.isArray(listAfter?.data) ? listAfter.data : [];
    const full = rowsAfter.find((d) => d.id === row.id);
    if (!full?.documentId) {
        throw new Error(`Created doc but could not resolve documentId. row=${JSON.stringify(row)}`);
    }
    console.log(`      created: revisionId=${full.id}  documentId=${full.documentId}`);
    return full;
}

async function verifyDateField(config, token, docId, fieldLabel) {
    console.log(`\n[5/5] Verifying Date index-field round-trip on doc ${docId}...`);
    if (DRY_RUN) {
        console.log('      [dry-run] would PUT + GET /documents/{id}/indexfields');
        return;
    }
    const apiBase = `${config.baseUrl}/api/v1/${config.customerAlias}/${config.databaseAlias}`;

    const putResp = await fetch(`${apiBase}/documents/${docId}/indexfields`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ indexFields: JSON.stringify({ [fieldLabel]: '2026-03-15T14:30:00' }) }),
    });
    console.log(`      PUT status: ${putResp.status} ${putResp.statusText}`);

    const getResp = await fetch(`${apiBase}/documents/${docId}/indexfields`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!getResp.ok) {
        console.error(`      GET failed: ${getResp.status} ${getResp.statusText}`);
        return;
    }
    const body = await getResp.json();
    const fields = body?.data || [];
    const dateField = fields.find((f) => f.label === fieldLabel || f.name === fieldLabel);
    if (!dateField) {
        console.error(`      WARN: "${fieldLabel}" not present on doc — field assignment may still be propagating.`);
        console.error(`      Present fields: ${fields.map((f) => f.label || f.name).join(', ') || '(none)'}`);
        return;
    }
    console.log(`      read-back value: "${dateField.value}"  (expected "2026-03-15T14:30:00")`);
}

async function getOAuthToken(config) {
    const resp = await fetch(`${config.baseUrl}/OAuth/Token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        }),
    });
    if (!resp.ok) throw new Error(`OAuth failed: ${resp.status} ${resp.statusText}`);
    return (await resp.json()).access_token;
}

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        console.error(`Available: ${vvAdmin.listCustomers().join(', ')}`);
        process.exit(1);
    }
    const config = vvAdmin.loadEnvConfig(match.server, match.customer);
    console.log(`Target: ${match.server}/${match.customer}  (${config.baseUrl})`);
    if (DRY_RUN) console.log('[dry-run] — no mutating writes will be performed');

    const clientLibrary = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const vvAuthorize = new clientLibrary.authorize();
    vvAuthorize.readOnly = config.readOnly || false;

    console.log('Authenticating...');
    const vvClient = await vvAuthorize.getVaultApi(
        config.clientId,
        config.clientSecret,
        config.username,
        config.password,
        config.audience,
        config.baseUrl,
        config.customerAlias,
        config.databaseAlias
    );

    const folder = await ensureFolder(vvClient, FOLDER_PATH);
    const field = await findDateField(vvClient, FIELD_LABEL);
    await assignFieldToFolder(vvClient, field.id, folder);
    const presetField = await findDateField(vvClient, PRESET_FIELD_LABEL);
    await assignFieldToFolder(vvClient, presetField.id, folder);
    const doc = await uploadTestDocument(vvClient, folder, DOC_NAME);

    const rawToken = await getOAuthToken(config);
    await verifyDateField(config, rawToken, doc.documentId, FIELD_LABEL);

    console.log(`\n=== Paste into testing/fixtures/vv-config.js CUSTOMER_DOC_CONFIG ===\n`);
    console.log(`    '${match.customer}': {`);
    console.log(`        testDocumentId: '${doc.documentId}',`);
    console.log(`        testDocumentRevisionId: '${doc.id}',`);
    console.log(`        testFolderId: '${folder.id}',`);
    console.log(`        dateFieldLabel: '${FIELD_LABEL}',`);
    console.log(`        presetDateFieldLabel: 'Date With Preset',`);
    console.log(`        testFolderPath: '${FOLDER_PATH}',`);
    console.log(`    },\n`);
}

main().catch((err) => {
    console.error('\nFAILED:', err?.stack || err);
    process.exit(1);
});
