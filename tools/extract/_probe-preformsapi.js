/**
 * Phase 0 probe: capture full JSON responses from preformsapi.visualvault.com.
 *
 * Fetches all 4 preformsapi endpoints for a failing template (Note) and a
 * working template (Access Code), saving complete JSON to disk for analysis.
 *
 * Also tests whether the Controls endpoint works without a formInstanceId.
 *
 * Output: projects/wadnr/analysis/preformsapi-probe/{templateName}/{endpoint}.json
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../helpers/vv-admin');
const vvTemplates = require('../helpers/vv-templates');

const match = vvAdmin.findCustomer('wadnr');
const config = vvAdmin.loadEnvConfig(match.server, match.customer);
const baseApi = `${config.baseUrl}/api/v1/${config.customerAlias}/${config.databaseAlias}`;

const outputDir = path.join(__dirname, '..', '..', 'projects', 'wadnr', 'analysis', 'preformsapi-probe');
fs.mkdirSync(outputDir, { recursive: true });

// Known preformsapi audience (captured from FormViewer SPA config)
const PREFORMS_AUDIENCE = 'e98f5a306fed4a279a2837dee47751b6';

(async () => {
    const allTemplates = await vvTemplates.getTemplates(config, { excludePrefix: null });
    const templateMap = new Map(allTemplates.map((t) => [t.name, t]));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Logging in...');
    await vvAdmin.login(page, config);
    console.log('Logged in.\n');

    /** Fetch JSON from a URL using the browser session cookies. */
    async function apiFetch(url) {
        return page.evaluate(async (u) => {
            const r = await fetch(u, { credentials: 'include' });
            if (!r.ok) return { _error: `${r.status} ${r.statusText}`, _url: u };
            const text = await r.text();
            try {
                return JSON.parse(text);
            } catch {
                return { _raw: text, _url: u };
            }
        }, url);
    }

    /** Fetch from preformsapi with JWT Bearer auth. */
    async function preformsFetch(url, jwt) {
        return page.evaluate(
            async ({ u, token }) => {
                const r = await fetch(u, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!r.ok) return { _error: `${r.status} ${r.statusText}`, _url: u };
                const text = await r.text();
                try {
                    return JSON.parse(text);
                } catch {
                    return { _raw: text, _url: u };
                }
            },
            { u: url, token: jwt }
        );
    }

    // ── Step 1: Discover preformsapi base URL from configuration endpoint ──
    console.log('='.repeat(70));
    console.log('STEP 1: Discover formsapi base URL');
    console.log('='.repeat(70));

    const formsApiConfig = await apiFetch(`${baseApi}/configuration/formsapi`);
    const formsApiUrl = formsApiConfig?.data?.apiUrl || 'https://preformsapi.visualvault.com/api/v1';
    console.log(`  configuration/formsapi response: ${JSON.stringify(formsApiConfig?.data)}`);
    console.log(`  Using preformsapi base: ${formsApiUrl}\n`);

    // ── Step 2: Get JWT ──
    console.log('='.repeat(70));
    console.log('STEP 2: Fetch JWT');
    console.log('='.repeat(70));

    const jwtResp = await apiFetch(`${baseApi}/Users/getJWT?audience=${PREFORMS_AUDIENCE}`);
    const jwt = jwtResp?.data?.token;
    if (!jwt) {
        console.error('  FAILED to get JWT:', JSON.stringify(jwtResp));
        await browser.close();
        process.exit(1);
    }
    console.log(`  JWT obtained: ${jwt.substring(0, 40)}...`);
    console.log(`  JWT length: ${jwt.length}\n`);

    // ── Step 3: Probe templates ──
    const templateNames = ['Note', 'Access Code'];

    for (const tmplName of templateNames) {
        const tmpl = templateMap.get(tmplName);
        if (!tmpl) {
            console.log(`\nTemplate "${tmplName}" not found, skipping.`);
            continue;
        }

        console.log('='.repeat(70));
        console.log(`TEMPLATE: ${tmplName} (revisionId=${tmpl.revisionId}, id=${tmpl.id})`);
        console.log('='.repeat(70));

        const tmplDir = path.join(outputDir, tmplName.replace(/\s+/g, '-').toLowerCase());
        fs.mkdirSync(tmplDir, { recursive: true });

        // Get a form instance for this template (needed for Controls endpoint)
        const formsResp = await apiFetch(`${baseApi}/formtemplates/${tmpl.id}/forms?limit=1`);
        const formInstance = formsResp?.data?.[0];
        const formInstanceId = formInstance?.revisionId || formInstance?.id;
        console.log(`  Form instance: ${formInstanceId || 'NONE'}\n`);

        // Endpoint 1: FormTemplate pages (revisionType=0 = template design)
        console.log('  [1] FormTemplate (pages) — revisionType=0');
        const pages = await preformsFetch(`${formsApiUrl}/FormTemplate/${tmpl.revisionId}?revisionType=0`, jwt);
        fs.writeFileSync(path.join(tmplDir, 'pages-rt0.json'), JSON.stringify(pages, null, 2));
        console.log(`      Saved. Keys: ${pages?.data ? Object.keys(pages.data).join(', ') : 'ERROR'}`);

        // Endpoint 1b: FormTemplate pages (revisionType=2 = with form instance context)
        if (formInstanceId) {
            console.log('  [1b] FormTemplate (pages) — revisionType=2 (form instance context)');
            const pagesRt2 = await preformsFetch(`${formsApiUrl}/FormTemplate/${formInstanceId}?revisionType=2`, jwt);
            fs.writeFileSync(path.join(tmplDir, 'pages-rt2.json'), JSON.stringify(pagesRt2, null, 2));
            console.log(`      Saved. Keys: ${pagesRt2?.data ? Object.keys(pagesRt2.data).join(', ') : 'ERROR'}`);
        }

        // Endpoint 2: Controls WITH formInstanceId
        if (formInstanceId) {
            console.log('  [2a] Controls — WITH formInstanceId');
            const controlsWithFI = await preformsFetch(
                `${formsApiUrl}/FormTemplate/Controls/${tmpl.revisionId}?formInstanceId=${formInstanceId}&revisionType=2&fieldList=&bypassCache=false`,
                jwt
            );
            fs.writeFileSync(
                path.join(tmplDir, 'controls-with-instance.json'),
                JSON.stringify(controlsWithFI, null, 2)
            );
            const fieldCount = controlsWithFI?.data?.pages
                ? controlsWithFI.data.pages.reduce((sum, p) => sum + (p.fields?.length || 0), 0)
                : '?';
            console.log(`      Saved. Field count: ${fieldCount}`);
        }

        // Endpoint 2b: Controls WITHOUT formInstanceId
        console.log('  [2b] Controls — WITHOUT formInstanceId');
        const controlsNoFI = await preformsFetch(
            `${formsApiUrl}/FormTemplate/Controls/${tmpl.revisionId}?revisionType=0&fieldList=&bypassCache=false`,
            jwt
        );
        fs.writeFileSync(path.join(tmplDir, 'controls-no-instance.json'), JSON.stringify(controlsNoFI, null, 2));
        if (controlsNoFI?._error) {
            console.log(`      ERROR: ${controlsNoFI._error}`);
        } else {
            const fieldCount = controlsNoFI?.data?.pages
                ? controlsNoFI.data.pages.reduce((sum, p) => sum + (p.fields?.length || 0), 0)
                : '?';
            console.log(`      Saved. Field count: ${fieldCount}`);
        }

        // Endpoint 3: Scripts
        console.log('  [3] Scripts');
        const scripts = await preformsFetch(
            `${formsApiUrl}/FormTemplate/${tmpl.revisionId}/scripts?revisionType=0&dataOnly=true`,
            jwt
        );
        fs.writeFileSync(path.join(tmplDir, 'scripts.json'), JSON.stringify(scripts, null, 2));
        const scriptCount = Array.isArray(scripts?.data) ? scripts.data.length : '?';
        console.log(`      Saved. Script count: ${scriptCount}`);

        // Endpoint 4: Conditions (groups)
        console.log('  [4] Conditions');
        const conditions = await preformsFetch(
            `${formsApiUrl}/FormTemplate/${tmpl.revisionId}/conditions?revisionType=0`,
            jwt
        );
        fs.writeFileSync(path.join(tmplDir, 'conditions.json'), JSON.stringify(conditions, null, 2));
        const groupCount = Array.isArray(conditions?.data) ? conditions.data.length : '?';
        console.log(`      Saved. Group count: ${groupCount}`);

        console.log('');
    }

    // ── Step 4: Summary — field property inventory from Controls ──
    console.log('='.repeat(70));
    console.log('STEP 4: Field property inventory from Controls');
    console.log('='.repeat(70));

    for (const tmplName of templateNames) {
        const tmplDir = path.join(outputDir, tmplName.replace(/\s+/g, '-').toLowerCase());
        const controlsFile = path.join(tmplDir, 'controls-with-instance.json');
        if (!fs.existsSync(controlsFile)) {
            const altFile = path.join(tmplDir, 'controls-no-instance.json');
            if (!fs.existsSync(altFile)) continue;
        }

        const filePath = fs.existsSync(path.join(tmplDir, 'controls-with-instance.json'))
            ? path.join(tmplDir, 'controls-with-instance.json')
            : path.join(tmplDir, 'controls-no-instance.json');

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data?.data?.pages) continue;

        console.log(`\n  ${tmplName}:`);

        // Collect all unique field property names
        const allKeys = new Set();
        const fieldTypes = new Set();
        let totalFields = 0;

        for (const pg of data.data.pages) {
            for (const field of pg.fields || []) {
                totalFields++;
                Object.keys(field).forEach((k) => allKeys.add(k));
                if (field.fieldType !== undefined) fieldTypes.add(field.fieldType);
            }
        }

        console.log(`    Total fields: ${totalFields}`);
        console.log(`    Field types found: ${[...fieldTypes].sort().join(', ')}`);
        console.log(`    All field properties (${allKeys.size}):`);

        const sortedKeys = [...allKeys].sort();
        // Print in columns for readability
        for (let i = 0; i < sortedKeys.length; i += 4) {
            const cols = sortedKeys.slice(i, i + 4).map((k) => k.padEnd(30));
            console.log(`      ${cols.join('')}`);
        }

        // Show one sample field for each field type
        console.log(`\n    Sample fields by type:`);
        const typeExamples = new Map();
        for (const pg of data.data.pages) {
            for (const field of pg.fields || []) {
                const ft = field.fieldType;
                if (!typeExamples.has(ft)) {
                    typeExamples.set(ft, { name: field.name || field.fieldName, fieldType: ft });
                }
            }
        }
        for (const [ft, ex] of [...typeExamples].sort((a, b) => a[0] - b[0])) {
            console.log(`      type=${ft}: ${ex.name}`);
        }
    }

    await browser.close();
    console.log('\nDone.');
})();
