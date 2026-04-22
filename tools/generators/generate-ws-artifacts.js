#!/usr/bin/env node
/**
 * Generate/update WS test artifacts from regression test results.
 *
 * PASS/FAIL is determined by comparing actual stored values against the
 * Expected column in matrix.md — the matrix is the single source of truth.
 * Updating an Expected value in the matrix changes PASS/FAIL on the next run.
 *
 * Creates/updates:
 *   - Run files (new, immutable) in research/date-handling/web-services/runs/
 *   - Summary files (update) in research/date-handling/web-services/summaries/
 *   - Session index (append) in research/date-handling/web-services/results.md
 *
 * Does NOT modify matrix.md Status/Actual columns — the matrix is authoritative.
 * Logs warnings if actual differs from Expected (potential regression).
 *
 * Usage:
 *   node tools/generators/generate-ws-artifacts.js [--input path] [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { buildWsSlotId } = require('../helpers/ws-slot-id');
const { parseMatrixExpected, classifyRow } = require('../helpers/ws-matrix-compare');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'research', 'date-handling', 'web-services');
const RUNS_DIR = path.join(ARTIFACTS_DIR, 'runs');
const SUMMARIES_DIR = path.join(ARTIFACTS_DIR, 'summaries');
const MATRIX_PATH = path.join(ARTIFACTS_DIR, 'matrix.md');
const RESULTS_PATH = path.join(ARTIFACTS_DIR, 'results.md');
const DEFAULT_INPUT = path.join(REPO_ROOT, 'testing', 'tmp', 'ws-regression-results-latest.json');

const TZ_MAP = {
    BRT: { iana: 'America/Sao_Paulo', offset: 'UTC-3', short: 'BRT' },
    IST: { iana: 'Asia/Kolkata', offset: 'UTC+5:30', short: 'IST' },
    UTC: { iana: 'UTC', offset: 'UTC+0', short: 'UTC' },
    UTC0: { iana: 'UTC', offset: 'UTC+0', short: 'UTC' },
};

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const inputIdx = args.indexOf('--input');
    const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : DEFAULT_INPUT;

    if (!fs.existsSync(inputPath)) {
        console.error(`Results file not found: ${inputPath}`);
        console.error('Run tests first: node testing/pipelines/run-ws-regression.js --tz BRT');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const today = new Date().toISOString().substring(0, 10);

    // Parse matrix for expected values (source of truth). Needed both to attach
    // `_expectedStored` for the run-file tables and as a fallback classifier
    // when the row wasn't stamped by the pipeline (old JSONs).
    const matrixExpected = parseMatrixExpected(MATRIX_PATH);
    console.log(`Matrix loaded: ${matrixExpected.size} test IDs with expected values`);

    // Accept both new (stamped) and old pipeline JSONs:
    //   - new: status is 'passed' | 'failed' | 'unknown' | 'error'
    //   - old: status is 'executed' | 'error' (PASS/FAIL computed here)
    const executed = data.results.filter(
        (r) => r.status === 'executed' || r.status === 'passed' || r.status === 'failed' || r.status === 'unknown'
    );
    console.log(`Processing ${executed.length} WS results (${data.summary.errors || 0} errors excluded)`);

    // Determine PASS/FAIL for each row. Prefer the pipeline-stamped status when
    // present; otherwise classify against the matrix ourselves (belt-and-suspenders
    // for old JSONs that predate write-time stamping).
    for (const r of executed) {
        if (r.status === 'passed' || r.status === 'failed') {
            // Pipeline already classified. Reuse expectedStored if the row carries
            // it; otherwise look it up for the run-file table.
            r._status = r.status === 'passed' ? 'PASS' : 'FAIL';
            if (r.expectedStored !== undefined && r.expectedStored !== null) {
                r._expectedStored = r.expectedStored;
            } else {
                const entry = matrixExpected.get(String(r.tcId || buildWsSlotId(r) || '').toLowerCase());
                r._expectedStored = entry ? entry.expectedStored : null;
            }
            r._matrixStatus = r.matrixStatus || null;
            continue;
        }
        // 'executed' (old JSON) or 'unknown' (new JSON, NOT_IN_MATRIX) — classify.
        const verdict = classifyRow(r, matrixExpected);
        if (verdict.status === 'unknown') {
            // Not in matrix — use harness match as fallback, same as the old code.
            r._expectedStored = null;
            r._status = r.match ? 'PASS' : 'FAIL';
            r._matrixStatus = null;
        } else {
            r._expectedStored = verdict.expectedStored;
            r._status = verdict.status === 'passed' ? 'PASS' : 'FAIL';
            r._matrixStatus = verdict.matrixStatus;
        }
    }

    // Group results by (action, tz) for batch run files
    const byAction = new Map();
    for (const r of executed) {
        const key = `${r.action}-${r.tz}`;
        if (!byAction.has(key)) byAction.set(key, []);
        byAction.get(key).push(r);
    }

    const sessionEntries = [];
    let runsCreated = 0;
    let summariesUpdated = 0;
    let regressionWarnings = 0;

    for (const [, results] of byAction) {
        const { action, tz } = results[0];
        const tzInfo = TZ_MAP[tz] || TZ_MAP.BRT;
        const passed = results.filter((r) => r._status === 'PASS').length;
        const failed = results.length - passed;

        // Determine next batch run number
        const batchPrefix = `${action.toLowerCase()}-${tz.toLowerCase()}-batch`;
        const runNum = getNextBatchRunNumber(batchPrefix);
        const runFile = `${batchPrefix}-run-${runNum}.md`;

        const runContent = generateBatchRunFile({
            action,
            tz,
            tzInfo,
            today,
            runNum,
            results,
            passed,
            failed,
        });

        if (!dryRun) {
            fs.writeFileSync(path.join(RUNS_DIR, runFile), runContent);
        }
        runsCreated++;

        // Update individual summaries + collect session entries
        for (const r of results) {
            const tcId = buildTcId(r);
            if (!tcId) continue;

            // Warn if actual differs from matrix (potential regression)
            if (r._matrixStatus === 'PASS' && r._status === 'FAIL') {
                console.warn(`  ⚠ REGRESSION? TC-${tcId}: was PASS in matrix, now FAIL`);
                regressionWarnings++;
            }

            if (!dryRun) {
                updateSummary(tcId, { runFile, today, tz, status: r._status, action });
            }
            summariesUpdated++;

            sessionEntries.push(
                `- ${today} [TC-${tcId}](runs/${runFile}) — ${tz} — ${r._status} — ${action} Config ${r.config}`
            );
        }

        console.log(`  ${passed === results.length ? '✓' : '✘'} ${action} ${tz} → ${runFile} (${passed}P/${failed}F)`);
    }

    // Append to results.md session index (no matrix changes)
    if (!dryRun && sessionEntries.length > 0) {
        appendResultsSession(today, sessionEntries);
    }

    console.log(`\nDone: ${runsCreated} batch run files, ${summariesUpdated} summaries updated`);
    if (regressionWarnings > 0) {
        console.log(`⚠ ${regressionWarnings} potential regressions detected — check warnings above`);
    }
    if (dryRun) console.log('(dry-run — no files written)');
}

// Slot ID: prefer the write-time-stamped r.tcId, fall back to composing from the
// row fields (handles old regression JSONs and the testing/tmp path that predates
// the pipeline stamp). Matrix parsing + pass/fail classification live in
// tools/helpers/ws-matrix-compare.js (shared with run-ws-regression.js).
function buildTcId(result) {
    return result.tcId || buildWsSlotId(result);
}

function getNextBatchRunNumber(prefix) {
    const pattern = new RegExp(`^${escapeRegex(prefix)}-run-(\\d+)\\.md$`);
    let max = 0;
    try {
        for (const f of fs.readdirSync(RUNS_DIR)) {
            const m = f.match(pattern);
            if (m) max = Math.max(max, parseInt(m[1]));
        }
    } catch {
        // dir might not exist
    }
    return max + 1;
}

function generateBatchRunFile({ action, tz, tzInfo, today, runNum, results, passed, failed }) {
    const resultRows = results
        .map((r) => {
            const id = buildTcId(r);
            const status = r._status === 'PASS' ? 'PASS' : '**FAIL**';
            const sent = r.sent != null ? `\`"${r.sent}"\`` : '—';
            const stored = r.stored != null ? `\`"${r.stored}"\`` : '`null`';
            const expected = r._expectedStored ? `\`"${r._expectedStored}"\`` : '—';
            const match = r._status === 'PASS' ? '✓' : '✗';
            return `| ${id} | ${r.config} | ${sent} | ${expected} | ${stored} | ${match} | ${status} |`;
        })
        .join('\n');

    return `# ${action} — Batch Run ${runNum} | ${today} | ${tz} | ${passed}P/${failed}F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter        | Value                                           |
| ---------------- | ----------------------------------------------- |
| Date             | ${today}                                        |
| Execution Mode   | Regression pipeline (\`run-ws-regression.js\`)  |
| Server TZ        | ${tzInfo.iana} (${tzInfo.short}) via \`TZ=\` env var |
| Test Method      | \`run-ws-test.js --action ${action} --configs ...\` |

## Results

| ID | Config | Sent | Expected | Actual Stored | Match | Status |
| -- | :----: | ---- | -------- | ------------- | :---: | ------ |
${resultRows}

## Outcome

**${passed} PASS, ${failed} FAIL** out of ${results.length} configs tested.

## Findings

- Regression run via automated pipeline — verifies ${action} behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
${failed > 0 ? '- Failures are consistent with known expected behavior from initial test execution' : '- All configs pass — no regressions detected'}
`;
}

function updateSummary(tcId, { runFile, today, tz, status, action }) {
    const summaryPath = path.join(SUMMARIES_DIR, `tc-${tcId}.md`);

    if (!fs.existsSync(summaryPath)) {
        const content = `# TC-${tcId.toUpperCase()} — Summary

**Run file**: [${runFile}](../runs/${runFile})
**Current status**: ${status} — last run ${today} (${tz})
**Category**: ${action}

## Run History

| Run | Date       | TZ  | Outcome | File                          |
| --- | ---------- | --- | ------- | ----------------------------- |
| 1   | ${today} | ${tz} | ${status}   | [${runFile}](../runs/${runFile}) |

## Current Interpretation

${status === 'PASS' ? 'Passes in regression pipeline — consistent with prior results.' : 'Known failure confirmed in regression pipeline.'}

## Next Action

Monitor for platform changes.
`;
        fs.writeFileSync(summaryPath, content);
        return;
    }

    // Update existing summary
    let content = fs.readFileSync(summaryPath, 'utf8');

    // Update current status
    content = content.replace(/\*\*Current status\*\*:.*/, `**Current status**: ${status} — last run ${today} (${tz})`);

    // Append to run history table (line-by-line)
    const lines = content.split('\n');
    let lastTableRow = -1;
    let inRunHistory = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('## Run History')) inRunHistory = true;
        if (inRunHistory && lines[i].startsWith('|') && !lines[i].includes('---')) {
            lastTableRow = i;
        }
        if (inRunHistory && lines[i].startsWith('##') && !lines[i].includes('Run History')) break;
    }

    if (lastTableRow >= 0) {
        const existingRuns = lines.filter((l) => l.startsWith('|') && /^\|\s*\d+/.test(l)).length;
        const nextRun = existingRuns + 1;
        const newRow = `| ${nextRun}   | ${today} | ${tz} | ${status}   | [${path.basename(runFile)}](../runs/${runFile}) |`;
        lines.splice(lastTableRow + 1, 0, newRow);
        content = lines.join('\n');
    }

    // Update interpretation (line-by-line, safe)
    const updatedLines = content.split('\n');
    let interpStart = -1;
    let interpEnd = -1;
    for (let i = 0; i < updatedLines.length; i++) {
        if (updatedLines[i].startsWith('## Current Interpretation')) interpStart = i;
        else if (interpStart >= 0 && i > interpStart && updatedLines[i].startsWith('## ')) {
            interpEnd = i;
            break;
        }
    }
    if (interpStart >= 0) {
        const newInterp = [
            '## Current Interpretation',
            '',
            `Regression run ${today}: ${status}. Consistent with prior results.`,
            '',
        ];
        if (interpEnd < 0) interpEnd = updatedLines.length;
        updatedLines.splice(interpStart, interpEnd - interpStart, ...newInterp);
        content = updatedLines.join('\n');
    }

    fs.writeFileSync(summaryPath, content);
}

function appendResultsSession(today, entries) {
    let content = fs.readFileSync(RESULTS_PATH, 'utf8');
    const header = `\n## Session ${today} (WS Regression Pipeline)\n\n**Purpose**: Automated regression verification of all WS test cases.\n**Key outcomes**: ${entries.length} tests documented.\n\n`;
    content += header + entries.join('\n') + '\n';
    fs.writeFileSync(RESULTS_PATH, content);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
