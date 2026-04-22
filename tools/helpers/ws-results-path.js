/**
 * Single source of truth for resolving where WS regression results land.
 *
 * Consumed by:
 *   - testing/pipelines/run-ws-regression.js  (writes here)
 *   - tools/generators/generate-ws-artifacts.js (reads from here by default)
 *
 * Routes raw results to the active customer's project folder (personal/env-bound
 * data). Falls back to testing/tmp/ if no projects/{customer}/ folder exists.
 */
const fs = require('fs');
const path = require('path');
const { vvConfig } = require('../../testing/fixtures/vv-config');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function resolveResultsPath() {
    const customerKey = vvConfig.customerKey || vvConfig.customerAlias;
    const projectSlug = customerKey ? customerKey.toLowerCase() : null;
    const projectDir = projectSlug ? path.join(REPO_ROOT, 'projects', projectSlug) : null;
    if (projectDir && fs.existsSync(projectDir)) {
        return path.join(projectDir, 'testing', 'date-handling', 'web-services', 'ws-regression-results-latest.json');
    }
    return path.join(REPO_ROOT, 'testing', 'tmp', 'ws-regression-results-latest.json');
}

module.exports = { resolveResultsPath };
