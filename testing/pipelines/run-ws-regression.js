#!/usr/bin/env node
/**
 * Run WS date-handling regression tests and generate/update test artifacts.
 *
 * Executes all (or scoped) WS test cases via run-ws-test.js, grouped by
 * (action, TZ) to minimize runner invocations. Captures structured JSON
 * results and generates artifacts (run files, summaries, matrix updates).
 *
 * Usage:
 *   node testing/pipelines/run-ws-regression.js --tz BRT
 *   node testing/pipelines/run-ws-regression.js --action WS-1
 *   node testing/pipelines/run-ws-regression.js --action WS-1 --tz IST
 *   node testing/pipelines/run-ws-regression.js --artifacts-only
 *   node testing/pipelines/run-ws-regression.js --skip-artifacts --tz BRT
 *
 * npm script: npm run test:ws:regression -- --tz BRT
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { captureBuildContext } = require('../../tools/helpers/build-context');
const { fingerprint } = require('../../tools/helpers/build-fingerprint');
const { buildWsSlotId } = require('../../tools/helpers/ws-slot-id');
const { parseMatrixExpected, classifyRow } = require('../../tools/helpers/ws-matrix-compare');
const { WS_TEMPLATE_NAME } = require('../fixtures/ws-config');
const { resolveResultsPath } = require('../../tools/helpers/ws-results-path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNNER_PATH = path.join(REPO_ROOT, 'tools', 'runners', 'run-ws-test.js');
const GENERATOR_PATH = path.join(REPO_ROOT, 'tools', 'generators', 'generate-ws-artifacts.js');
const MATRIX_PATH = path.join(REPO_ROOT, 'research', 'date-handling', 'web-services', 'matrix.md');

const RESULTS_PATH = resolveResultsPath();
const RESULTS_DIR = path.dirname(RESULTS_PATH);

// TZ mapping
const TZ_ENV = {
    BRT: 'America/Sao_Paulo',
    IST: 'Asia/Calcutta',
    UTC: 'UTC',
    UTC0: 'UTC',
};

/**
 * Define all regression test invocations.
 * Each entry is one call to run-ws-test.js with specific args.
 * Multiple test slots may be covered by one invocation (--configs ALL).
 */
const TEST_INVOCATIONS = [
    // ═══════════════════════════════════════════════════════════════
    // WS-1: API Write Path (Create) — 16 slots
    // Date-only configs (A,B,E,F) use date string, DateTime (C,D,G,H) use datetime
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-1', tz: 'BRT', configs: 'A,B,E,F', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'BRT', configs: 'C,D,G,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-SETUP-BASELINE: create a single record with ALL 8 configs (A-H)
    // populated so WS-2 below can read a deterministic all-configs baseline.
    // Without this, WS-2 reads whichever WS-1 record was written last in
    // the loop, which only has a subset of configs set. See the audit note
    // in projects/emanueljofre-vv5dev/.../v2-baseline-audit.md.
    // These invocations do NOT produce matrix-tracked rows (no tcId stamping).
    //
    // Currently gated to BRT only — IST WS-2 matrix rows are still calibrated
    // against the last-WS-1 record state.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-SETUP-BASELINE', tz: 'BRT', configs: '', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-SETUP-BASELINE', tz: 'IST', configs: '', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-2: API Read + Cross-Layer — 16 slots
    // Reads the baseline record created by WS-SETUP-BASELINE above (preferred),
    // falling back to the last WS-1 record for the TZ if the baseline failed.
    // If neither is available, WS-2 is skipped.
    // Record IDs are injected dynamically — see resolveRecordIds().
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-2', tz: 'BRT', configs: 'ALL', inputDate: '', extraArgs: '', needsRecordId: true },
    { action: 'WS-2', tz: 'IST', configs: 'ALL', inputDate: '', extraArgs: '', needsRecordId: true },

    // ═══════════════════════════════════════════════════════════════
    // WS-3: API Round-Trip — 4 slots
    // Write, read back, write read-back, read again. BRT only (TZ independent).
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-3', tz: 'BRT', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-3', tz: 'BRT', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-4: API→Forms Cross-Layer — 10 slots — SKIPPED
    // Requires browser verification (Playwright/Chrome MCP). Not runnable
    // via run-ws-test.js alone. Use /@-test-ws-date-pw for these.
    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    // WS-5: Input Format Tolerance — 35 slots
    // Harness iterates format variants internally. Configs A and C.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-5', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },
    // Config D tested separately for .NET and epoch formats
    { action: 'WS-5', tz: 'BRT', configs: 'D', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-6: Empty/Null Handling — 12 slots
    // Tests empty, null, "null", "Invalid Date", field omission, clear-via-update.
    // Configs A and D.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-6', tz: 'BRT', configs: 'A,D', inputDate: '', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-7: API Update Path — 12 slots
    // Change, preserve, and add scenarios. Configs A,C,D,H.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-7', tz: 'BRT', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-7', tz: 'BRT', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-8: Query Date Filtering — 10 slots
    // OData q= parameter tests. Requires WS-1 records to exist.
    // Configs A and C.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-8', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-9: Date Computation in Scripts — 23 slots
    // Tests JS Date patterns across server TZs. Config A primary + one C.
    // Harness iterates computation patterns internally per TZ.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-9', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'IST', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'UTC', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-14: Custom Query Read Path — 4 slots (A, C × filter, param)
    // Prerequisites (Central Admin — create manually):
    //   - "DateTest - All Records"      — SELECT TOP 1000 * FROM [DateTest]
    //   - "DateTest - By Instance Name" — SELECT TOP 100 * FROM [DateTest] WHERE DhDocID = @instanceName
    // Matrix slot IDs are TZ-agnostic (`ws-14-<config>-<variant>`); BRT-only
    // run suffices — TZ-independent by hypothesis. Expand if divergent.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-14', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },
];

async function main() {
    const args = process.argv.slice(2);
    const artifactsOnly = args.includes('--artifacts-only');
    const skipArtifacts = args.includes('--skip-artifacts');

    // Scope filters
    const actionIdx = args.indexOf('--action');
    const actionFilter = actionIdx >= 0 ? args[actionIdx + 1] : null;
    const tzIdx = args.indexOf('--tz');
    const tzFilter = tzIdx >= 0 ? args[tzIdx + 1]?.toUpperCase() : null;

    if (!artifactsOnly) {
        // Filter invocations by scope
        let invocations = TEST_INVOCATIONS;
        if (actionFilter) {
            // Keep WS-SETUP-BASELINE alongside WS-2 so scoping to --action WS-2
            // still produces a readable record. BASELINE is pipeline plumbing,
            // not a standalone action.
            const keepBaseline = actionFilter === 'WS-2';
            invocations = invocations.filter(
                (i) => i.action === actionFilter || (keepBaseline && i.action === 'WS-SETUP-BASELINE')
            );
        }
        if (tzFilter) {
            invocations = invocations.filter((i) => i.tz === tzFilter || i.tz === tzFilter.replace('0', ''));
        }

        if (invocations.length === 0) {
            console.error('No matching test invocations. Check --action and --tz filters.');
            console.error('Available actions: WS-1 through WS-9, WS-14');
            console.error('Available TZs: BRT, IST, UTC');
            process.exit(1);
        }

        console.log(`\n=== Phase 1: Running ${invocations.length} WS test invocations ===\n`);

        // Load matrix once up-front so each captured row can be classified into
        // passed/failed at write time (see ws-matrix-compare.js). Rows whose tcId
        // isn't in the matrix fall back to 'unknown'.
        const matrixExpected = parseMatrixExpected(MATRIX_PATH);
        console.log(`Matrix loaded: ${matrixExpected.size} expected values for pass/fail stamping\n`);

        const allResults = [];
        // Track record IDs created by WS-1 for use by WS-2 (dynamic, no hardcoded IDs)
        const createdRecords = {}; // { BRT: 'DateTest-NNNNNN', IST: '...', UTC: '...' }
        // Track baseline records (all 8 configs populated) for use by WS-2. Preferred
        // over createdRecords for WS-2 so every config reads back deterministically.
        const baselineRecords = {}; // { BRT: 'DateTest-NNNNNN', IST: '...' }
        // If WS-2 is not in scope for a TZ, skip the corresponding baseline invocation.
        const ws2Scoped = new Set(invocations.filter((i) => i.action === 'WS-2').map((i) => i.tz));
        fs.mkdirSync(RESULTS_DIR, { recursive: true });

        for (const inv of invocations) {
            // Skip baseline invocations whose TZ has no WS-2 in scope (avoids
            // creating a record we'll never read).
            if (inv.action === 'WS-SETUP-BASELINE' && !ws2Scoped.has(inv.tz)) {
                console.log(`  SKIP WS-SETUP-BASELINE ${inv.tz} — WS-2 not in scope for ${inv.tz}\n`);
                continue;
            }

            // WS-2 needs a record ID. Prefer baseline (all 8 configs populated)
            // over the last WS-1 record (only the last batch's configs populated).
            if (inv.needsRecordId) {
                const recordId = baselineRecords[inv.tz] || createdRecords[inv.tz];
                if (!recordId) {
                    console.log(
                        `  SKIP ${inv.action} ${inv.tz} — no record ID available (neither WS-SETUP-BASELINE nor WS-1 for ${inv.tz} ran or succeeded)\n`
                    );
                    continue;
                }
                inv.extraArgs = `--record-id "${recordId}"`;
            }

            const tzEnv = TZ_ENV[inv.tz] || 'UTC';
            const cmdParts = [`TZ=${tzEnv}`, 'node', RUNNER_PATH, `--action ${inv.action}`];
            if (inv.configs) cmdParts.push(`--configs ${inv.configs}`);
            if (inv.inputDate) cmdParts.push(`--input-date ${inv.inputDate}`);
            if (WS_TEMPLATE_NAME && WS_TEMPLATE_NAME !== 'DateTest') {
                cmdParts.push(`--template-name "${WS_TEMPLATE_NAME}"`);
            }
            if (inv.extraArgs) cmdParts.push(inv.extraArgs);

            const cmd = cmdParts.join(' ');
            console.log(`> ${cmd}`);

            try {
                // Timeout scales with the largest action — WS-5 iterates ~20 format
                // variants per config × ~3s per createForm+readForm round-trip.
                // 240s absorbs that plus network slack without masking real hangs.
                const output = execSync(cmd, {
                    cwd: REPO_ROOT,
                    encoding: 'utf8',
                    timeout: 240_000,
                    env: { ...process.env, TZ: tzEnv },
                });

                // Extract JSON from output (runner prints auth logs before JSON)
                // Find the outermost { ... } that starts a valid JSON object
                const firstBrace = output.indexOf('\n{');
                if (firstBrace < 0) {
                    console.error(`  No JSON found in output: ${output.substring(0, 200)}`);
                    allResults.push({
                        action: inv.action,
                        tz: inv.tz,
                        config: 'ALL',
                        status: 'error',
                        error: 'No JSON in output',
                    });
                    continue;
                }
                const jsonStr = output.substring(firstBrace).trim();
                const result = JSON.parse(jsonStr);

                // Baseline invocations are pipeline plumbing — they create a record
                // for WS-2 to read but don't correspond to matrix slots. Capture
                // the recordID and move on without emitting result rows.
                if (inv.action === 'WS-SETUP-BASELINE') {
                    if (result.data?.recordID) {
                        baselineRecords[inv.tz] = result.data.recordID;
                        console.log(`  → baseline record for ${inv.tz}: ${result.data.recordID}\n`);
                    } else {
                        console.log(`  → WS-SETUP-BASELINE ${inv.tz} produced no recordID\n`);
                    }
                    continue;
                }

                const entries = (result.data?.results || []).map((r) => {
                    // Slot ID composed at write-time so downstream tools (task-status,
                    // audit-ws-v2, generate-ws-artifacts) read `r.tcId` uniformly.
                    const tcId = buildWsSlotId({
                        action: inv.action,
                        tz: inv.tz,
                        config: r.config,
                        format: r.format,
                        variant: r.variant || r.pattern,
                    });
                    // Normalize each action's "observed final value" into `stored`
                    // so downstream tooling has one field to compare against V1:
                    //   WS-1/5/7: `stored`    (read-back after write)
                    //   WS-2:     `apiReturn` (read-only)
                    //   WS-3:     `finalRead` → `cycle2Read` → `cycle1Read`
                    //   WS-6:     `stored`    (post-empty-write read-back)
                    const stored = r.stored ?? r.apiReturn ?? r.finalRead ?? r.cycle2Read ?? r.cycle1Read;

                    // Stamp pass/fail at write time by comparing the observed stored
                    // value against matrix Expected. Rows whose tcId isn't in the
                    // matrix land as status='unknown' (NOT_IN_MATRIX). This replaces
                    // the old uniform 'executed' marker so task-status can report
                    // real passed/failed counts without re-running the generator.
                    //
                    // Per-action discriminators (see ws-matrix-compare.js):
                    //   WS-6: `cleared` — post-write read-back was null/empty.
                    //   WS-8: `matched` — the query returned any records.
                    // Default actions fall back to `stored` string equality.
                    const verdict = classifyRow(
                        {
                            tcId,
                            action: inv.action,
                            stored,
                            cleared: r.cleared,
                            matched: r.matched,
                        },
                        matrixExpected
                    );

                    return {
                        tcId,
                        action: inv.action,
                        tz: inv.tz,
                        config: r.config,
                        fieldName: r.fieldName,
                        sent: r.sent,
                        stored,
                        returned: r.returned ?? r.apiReturn,
                        // Preserve WS-3 cycle details for round-trip drift analysis
                        cycle1Read: r.cycle1Read,
                        cycle2Read: r.cycle2Read,
                        finalRead: r.finalRead,
                        drift: r.drift,
                        match: r.match,
                        // WS-6 empty-handling discriminator: post-write read-back.
                        cleared: r.cleared,
                        // WS-8 query-filter discriminators: did the query match?
                        matched: r.matched,
                        matchCount: r.matchCount,
                        expectedMatch: r.expectedMatch,
                        queryType: r.queryType,
                        scenario: r.scenario,
                        // Write-time pass/fail stamp (previously just 'executed').
                        status: verdict.status,
                        expectedStored: verdict.expectedStored,
                        matrixStatus: verdict.matrixStatus,
                        serverTime: result.data?.serverTime,
                        serverTimezone: result.data?.serverTimezone,
                        // WS-5/9 may have extra fields
                        format: r.format,
                        variant: r.variant || r.pattern,
                        error: r.error,
                    };
                });

                allResults.push(...entries);

                // Track record IDs created by WS-1 for downstream WS-2 use
                if (inv.action === 'WS-1' && result.data?.recordID) {
                    createdRecords[inv.tz] = result.data.recordID;
                    console.log(`  → ${entries.length} results captured (record: ${result.data.recordID})\n`);
                } else {
                    console.log(`  → ${entries.length} results captured\n`);
                }
            } catch (err) {
                console.error(`  ERROR: ${err.message?.substring(0, 200)}\n`);
                allResults.push({
                    action: inv.action,
                    tz: inv.tz,
                    config: 'ALL',
                    status: 'error',
                    error: err.message?.substring(0, 500),
                });
            }
        }

        // Capture build context so the timeline tool can correlate this run with a platform build
        const buildContext = await captureBuildContext().catch(() => null);
        if (buildContext) buildContext.fingerprint = fingerprint(buildContext);

        // Save results. `executed` now counts rows with a matrix-classified or
        // unknown status (anything that isn't a runner error) — matching the
        // filter downstream artifact generators apply.
        const isExecuted = (r) => r.status === 'passed' || r.status === 'failed' || r.status === 'unknown';
        const output = {
            timestamp: new Date().toISOString(),
            buildContext,
            summary: {
                total: allResults.length,
                executed: allResults.filter(isExecuted).length,
                passed: allResults.filter((r) => r.status === 'passed').length,
                failed: allResults.filter((r) => r.status === 'failed').length,
                unknown: allResults.filter((r) => r.status === 'unknown').length,
                errors: allResults.filter((r) => r.status === 'error').length,
            },
            results: allResults,
        };

        // Write a timestamped sibling alongside the stable latest pointer so
        // scoped invocations (e.g. --action WS-8) don't clobber prior batches'
        // status stamps for the task:status rollup, which aggregates every
        // regression-results JSON under projects/{customer}/. Mirrors the
        // forms regression-reporter convention.
        const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const timestampedPath = path.join(RESULTS_DIR, `ws-regression-results-${fileTimestamp}.json`);
        const serialized = JSON.stringify(output, null, 2);
        fs.writeFileSync(timestampedPath, serialized);
        fs.writeFileSync(RESULTS_PATH, serialized);
        console.log(`Results saved: ${RESULTS_PATH}`);
        console.log(`  + timestamped: ${timestampedPath}`);
        console.log(
            `Summary: ${output.summary.total} total — ${output.summary.passed} passed / ${output.summary.failed} failed / ${output.summary.unknown} unknown / ${output.summary.errors} errors`
        );
    }

    if (skipArtifacts) {
        console.log('\n--skip-artifacts: skipping artifact generation');
        return;
    }

    // Phase 2: Generate artifacts
    console.log('\n=== Phase 2: Generating artifacts ===\n');

    try {
        execSync(`node ${GENERATOR_PATH} --input ${RESULTS_PATH}`, {
            cwd: REPO_ROOT,
            stdio: 'inherit',
        });
    } catch (err) {
        console.error('Artifact generation failed:', err.message);
        process.exit(1);
    }

    console.log('\n=== Done ===');
}

main();
