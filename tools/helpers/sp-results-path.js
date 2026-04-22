/**
 * Single source of truth for resolving where SP regression artifacts land.
 *
 * Consumed by:
 *   - testing/pipelines/run-sp-regression.js  (writes results JSON)
 *   - tools/generators/generate-sp-artifacts.js (reads results JSON; writes
 *     per-run artifacts — runs/, summaries/, results.md — alongside it)
 *
 * Routes observed execution data to the active customer's project folder
 * (personal/env-bound). Falls back to testing/tmp/ when no projects/{customer}/
 * exists, so the pipeline still works on fresh checkouts. Shared platform
 * truth — matrix.md, analysis/, test-cases/ — stays in research/.
 */
const fs = require('fs');
const path = require('path');
const { vvConfig } = require('../../testing/fixtures/vv-config');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Directory that should hold all per-customer SP execution artifacts
 * (regression JSON, runs/, summaries/, results.md). Falls back to
 * testing/tmp/ when no project folder exists.
 */
function resolveArtifactsDir() {
    const customerKey = vvConfig.customerKey || vvConfig.customerAlias;
    const projectSlug = customerKey ? customerKey.toLowerCase() : null;
    const projectDir = projectSlug ? path.join(REPO_ROOT, 'projects', projectSlug) : null;
    if (projectDir && fs.existsSync(projectDir)) {
        return path.join(projectDir, 'testing', 'date-handling', 'scheduled-processes');
    }
    return path.join(REPO_ROOT, 'testing', 'tmp');
}

function resolveResultsPath() {
    return path.join(resolveArtifactsDir(), 'sp-regression-results-latest.json');
}

module.exports = { resolveResultsPath, resolveArtifactsDir };
