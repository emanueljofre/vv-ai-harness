/**
 * Custom Playwright reporter that captures regression test results
 * with actual values for artifact generation.
 *
 * For PASSED tests: actual values = expected values (by definition).
 * For FAILED tests: parses "Received:" from assertion errors.
 * For SKIPPED tests: recorded but excluded from artifact generation.
 *
 * Output: testing/tmp/regression-results-{timestamp}.json
 *
 * Usage in playwright.config.js or CLI:
 *   --reporter=./testing/reporters/regression-reporter.js,list
 */
const fs = require('fs');
const path = require('path');
const { fingerprint } = require('../../tools/helpers/build-fingerprint');

const BUILD_CONTEXT_PATH = path.join(__dirname, '..', 'config', 'build-context.json');

class RegressionReporter {
    constructor(options = {}) {
        this.results = [];
        this.outputDir = options.outputDir || path.join(__dirname, '..', 'tmp');
        this.startTime = null;
        this.buildContext = null;
    }

    onBegin(config, suite) {
        this.startTime = new Date().toISOString();
        fs.mkdirSync(this.outputDir, { recursive: true });

        // Load build context captured by global-setup
        try {
            if (fs.existsSync(BUILD_CONTEXT_PATH)) {
                this.buildContext = JSON.parse(fs.readFileSync(BUILD_CONTEXT_PATH, 'utf8'));
                // Attach a short fingerprint derived from behavior-relevant fields
                // so this run can be correlated with other runs/extracts on the same build.
                this.buildContext.fingerprint = fingerprint(this.buildContext);
            }
        } catch {
            // Non-fatal — report works without build context
        }
    }

    onTestEnd(test, result) {
        // Parse TC ID from test title chain: "TC-{id}: Category, Config X > action"
        const tcId = this._extractTcId(test);
        if (!tcId) return; // Skip tests without TC ID pattern

        const projectName = test.parent?.project()?.name || 'unknown';
        const [tz, browser] = projectName.includes('-') ? projectName.split('-') : [projectName, 'unknown'];

        const entry = {
            tcId,
            project: projectName,
            browser,
            tz,
            status: result.status, // 'passed', 'failed', 'skipped', 'timedOut'
            duration: result.duration,
            actualRaw: null,
            actualApi: null,
            errors: [],
        };

        if (result.status === 'passed') {
            // For passed tests, actual = expected. We'll look up expected from test-data.js
            // in the artifact generator. Mark as "from-pass" so generator knows.
            entry.actualRaw = '__PASS__';
            entry.actualApi = '__PASS__';
        } else if (result.status === 'failed') {
            // Parse actual values from assertion errors
            const parsed = this._parseAssertionErrors(result.errors || []);
            entry.actualRaw = parsed.raw;
            entry.actualApi = parsed.api;
            entry.errors = (result.errors || []).map((e) => e.message?.substring(0, 500));
        }

        // Check for annotations (if spec files add them)
        const annotations = result.annotations || [];
        for (const ann of annotations) {
            if (ann.type === 'actualRaw' && ann.description) {
                entry.actualRaw = ann.description;
            }
            if (ann.type === 'actualApi' && ann.description) {
                entry.actualApi = ann.description;
            }
        }

        this.results.push(entry);
    }

    onEnd(result) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const outputPath = path.join(this.outputDir, `regression-results-${timestamp}.json`);
        // Also write to a stable "latest" path for easy access
        const latestPath = path.join(this.outputDir, 'regression-results-latest.json');

        const output = {
            timestamp: this.startTime,
            completed: new Date().toISOString(),
            duration: result.duration,
            status: result.status,
            buildContext: this.buildContext,
            summary: {
                total: this.results.length,
                passed: this.results.filter((r) => r.status === 'passed').length,
                failed: this.results.filter((r) => r.status === 'failed').length,
                skipped: this.results.filter((r) => r.status === 'skipped').length,
                timedOut: this.results.filter((r) => r.status === 'timedOut').length,
            },
            results: this.results,
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
    }

    /**
     * Extract a slot ID from the test's describe chain + own title.
     *
     * Supported patterns (checked in order — finer-grained wins):
     *   1. Fine-grained slot in test title:           db-5-exact: ..., doc-1-iso-date: ..., wf-1-brt-midday: ..., sp-2-now-brt: ..., ws-1-...
     *   2. Forms TC ID (walk up parent chain):        TC-1-A-BRT: ..., TC-12-empty-value: ...
     *   3. Category-level ID (walk up parent chain):  DB-5: ..., DOC-1: ..., WF-2: ..., SP-3: ..., WS-4: ...
     *
     * Returns the matched slot ID (lowercased for consistency with matrix IDs where applicable).
     */
    _extractTcId(test) {
        // (1) Fine-grained slot in the leaf test title (preferred — most specific)
        const fineGrained = test.title?.match(/^((?:db|doc|wf|sp|ws)-\d+[A-Za-z0-9-]*):/i);
        if (fineGrained) return fineGrained[1].toLowerCase();

        // (2) Forms TC ID walking up the parent chain
        let current = test.parent;
        while (current) {
            const m = current.title?.match(/^TC-(.+?):/);
            if (m) return m[1];
            current = current.parent;
        }

        // (3) Category-level ID (DB-*, DOC-*, WF-*, SP-*, WS-*) walking up the parent chain
        current = test.parent;
        while (current) {
            const cat = current.title?.match(/^((?:DB|DOC|WF|SP|WS)-\d+[A-Za-z0-9-]*):/);
            if (cat) return cat[1];
            current = current.parent;
        }

        // (4) Fallback: forms TC ID embedded in the leaf title itself
        const titleMatch = test.title?.match(/TC-(.+?)[\s:]/);
        return titleMatch ? titleMatch[1] : null;
    }

    /**
     * Parse assertion errors to extract actual ("Received") values.
     *
     * Playwright's expect().toBe() produces errors like:
     *   Expected: "2026-03-15T00:00:00"
     *   Received: "2026-03-15T03:00:00.000Z"
     *
     * The first assertion in each spec is typically `expect(values.raw).toBe(tc.expectedRaw)`,
     * the second is `expect(values.api).toBe(tc.expectedApi)`.
     */
    _parseAssertionErrors(errors) {
        const result = { raw: null, api: null };
        if (!errors.length) return result;

        // Collect all "Received:" values from all errors
        const receivedValues = [];
        for (const err of errors) {
            const msg = err.message || '';
            // Clean ANSI codes first
            // eslint-disable-next-line no-control-regex
            const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, '');
            // Match Received: "value" (with or without quotes)
            const matches = cleanMsg.match(/Received:\s*"(.*?)"\s*$/m);
            if (matches) {
                receivedValues.push(matches[1]);
            } else {
                // Fallback: unquoted value
                const fallback = cleanMsg.match(/Received:\s*(.+?)\s*$/m);
                if (fallback) receivedValues.push(fallback[1].trim());
            }
        }

        // First received value is typically raw, second is api
        if (receivedValues.length >= 1) result.raw = receivedValues[0];
        if (receivedValues.length >= 2) result.api = receivedValues[1];

        // If only one error (test stopped at first assertion), raw failed but api unknown
        // The artifact generator handles this case
        return result;
    }
}

module.exports = RegressionReporter;
