#!/usr/bin/env node
/**
 * Per-customer execution status: cross-reference matrix-defined slots vs actual
 * regression runs, producing an executed-vs-pending rollup.
 *
 * Why: the regression-results JSON tells us what *was attempted*, but not what
 * *should exist*. The matrix.md files are the source of truth for planned slots.
 * Diffing the two surfaces (a) tests never executed on this customer and (b) per-TC
 * execution history. Pairs with build-timeline.js to answer "which TCs drifted
 * across which build".
 *
 * Usage:
 *   npm run task:status -- --project EmanuelJofre-vv5dev
 *   npm run task:status -- --project EmanuelJofre-vv5dev --component forms-calendar
 *   npm run task:status -- --project EmanuelJofre-vv5dev --pending-only
 *   npm run task:status -- --project EmanuelJofre-vv5dev --json
 *   npm run task:status -- --project EmanuelJofre-vv5dev --write    # write status.md files under projects/{name}/testing/date-handling/
 *
 * Scope (v1): forms-calendar component. Other components (web-services, dashboards,
 * document-library) have different matrix ID conventions and are not parsed yet.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROJECTS_DIR = path.join(REPO_ROOT, 'projects');

// Per-component matrix configuration.
//   matrixPath : where to read TC IDs from
//   slotRegex  : captures fine-grained slot IDs from the first column of markdown rows
// IDs are normalized to lowercase for matrix-vs-execution comparison.
const COMPONENTS = {
    'forms-calendar': {
        matrixPath: 'research/date-handling/forms-calendar/matrix.md',
        // forms IDs are bare digits: 1-A-BRT, 8B-D-empty, 9-GDOC-D-BRT-1, 12-empty-value
        slotRegex: /^\|\s+([0-9][0-9]?[A-Z]?-[A-Za-z0-9][A-Za-z0-9-]*?)\s+\|/,
    },
    'web-services': {
        matrixPath: 'research/date-handling/web-services/matrix.md',
        // ws-1-..., ws-10a-..., ws-12-ambiguous
        slotRegex: /^\|\s+(ws-[0-9]+[a-z]?-[a-z0-9][-a-z0-9]*?)\s+\|/i,
    },
    dashboards: {
        matrixPath: 'research/date-handling/dashboards/matrix.md',
        // db-1-iso-date, db-4-f6-asc, db-5-dt-exact
        slotRegex: /^\|\s+(db-[0-9]+-[a-z0-9][-a-z0-9]*?)\s+\|/i,
    },
    'document-library': {
        matrixPath: 'research/date-handling/document-library/matrix.md',
        // doc-1-iso-date, doc-1-ambiguous, doc-10-...
        slotRegex: /^\|\s+(doc-[0-9]+-[a-z0-9][-a-z0-9]*?)\s+\|/i,
    },
    workflows: {
        matrixPath: 'research/date-handling/workflows/matrix.md',
        // wf-1-brt-midday, wf-2-fri-5days
        slotRegex: /^\|\s+(wf-[0-9]+-[a-z0-9][-a-z0-9]*?)\s+\|/i,
    },
    'scheduled-processes': {
        matrixPath: 'research/date-handling/scheduled-processes/matrix.md',
        // sp-1-daily-brt, sp-2-now-utc
        slotRegex: /^\|\s+(sp-[0-9]+-[a-z0-9][-a-z0-9]*?)\s+\|/i,
    },
};

// --- CLI ---
const args = process.argv.slice(2);
function getArg(flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}
const PROJECT = getArg('--project');
const COMPONENT_ARG = getArg('--component'); // null = all
const PENDING_ONLY = args.includes('--pending-only');
const JSON_OUTPUT = args.includes('--json');
const WRITE_FILE = args.includes('--write');

if (!PROJECT) {
    console.error(
        'Usage: npm run task:status -- --project <name> [--component <name>|all] [--pending-only] [--json] [--write]'
    );
    console.error(`Components: ${Object.keys(COMPONENTS).join(', ')}, or omit for all + rollup`);
    process.exit(1);
}

const componentsToRun = COMPONENT_ARG && COMPONENT_ARG !== 'all' ? [COMPONENT_ARG] : Object.keys(COMPONENTS);
for (const c of componentsToRun) {
    if (!COMPONENTS[c]) {
        console.error(`Unknown component: ${c}. Available: ${Object.keys(COMPONENTS).join(', ')}`);
        process.exit(1);
    }
}

// Parse fine-grained TC slot IDs from a matrix markdown file using the
// component-specific regex. Returns sorted unique lowercase IDs.
function parseMatrixSlots(matrixPath, slotRegex) {
    const abs = path.isAbsolute(matrixPath) ? matrixPath : path.join(REPO_ROOT, matrixPath);
    if (!fs.existsSync(abs)) return [];
    const txt = fs.readFileSync(abs, 'utf8');
    const slots = new Set();
    for (const line of txt.split('\n')) {
        const m = line.match(slotRegex);
        if (!m) continue;
        const id = m[1].trim();
        if (id.length < 3 || id.length > 60) continue;
        slots.add(id);
    }
    // Normalize to lowercase for all components — regression-reporter lowercases the
    // same prefixes, so matching is case-insensitive by convention.
    return [...slots].map((s) => s.toLowerCase()).sort();
}

// --- Gather execution records from regression JSONs under the project ---
function findExecutions(projectDir) {
    if (!fs.existsSync(projectDir)) return [];
    const out = [];
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (entry.isFile() && entry.name.endsWith('.json')) out.push(p);
        }
    }
    walk(projectDir);
    return out;
}

function readRuns(jsonFiles) {
    const runs = [];
    for (const f of jsonFiles) {
        let data;
        try {
            data = JSON.parse(fs.readFileSync(f, 'utf8'));
        } catch {
            continue;
        }
        // Regression-results shape: has `results` array + `buildContext`
        if (Array.isArray(data.results) && data.buildContext) {
            runs.push({
                path: path.relative(REPO_ROOT, f),
                timestamp: data.timestamp || data.completed || null,
                fingerprint: data.buildContext.fingerprint || null,
                results: data.results,
                summary: data.summary,
            });
        }
    }
    runs.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return runs;
}

// --- Build per-TC execution history ---
function perTcHistory(runs) {
    const history = new Map();
    for (const run of runs) {
        for (const r of run.results) {
            const tc = r.tcId;
            if (!tc) continue;
            if (!history.has(tc)) history.set(tc, []);
            history.get(tc).push({
                timestamp: run.timestamp,
                fingerprint: run.fingerprint,
                project: r.project,
                status: r.status,
                actualRaw: r.actualRaw,
                actualApi: r.actualApi,
            });
        }
    }
    return history;
}

// --- Main ---
const projectDir = path.join(PROJECTS_DIR, PROJECT.toLowerCase());
if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
}

function fmtTs(ts) {
    if (!ts) return '?';
    return ts
        .replace('T', ' ')
        .replace(/\.\d+Z$/, 'Z')
        .slice(0, 19);
}

function lastStatusOf(history, tc) {
    const h = history.get(tc) || [];
    if (!h.length) return null;
    const recent = [...h].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    const nonSkipped = recent.filter((e) => e.status !== 'skipped');
    return nonSkipped[0] || recent[0] || null;
}

// Single scan of the project's JSON files — shared across all components
const jsonFiles = findExecutions(projectDir);
const runs = readRuns(jsonFiles);
const history = perTcHistory(runs);

// Normalize history keys to lowercase for matching. Preserve original case for display.
const historyLc = new Map();
for (const [tc, entries] of history) historyLc.set(String(tc).toLowerCase(), entries);

const allComponents = {};
for (const comp of componentsToRun) {
    const { matrixPath, slotRegex } = COMPONENTS[comp];
    const slots = parseMatrixSlots(matrixPath, slotRegex);

    const executed = slots.filter((s) => historyLc.has(s));
    const pending = slots.filter((s) => !historyLc.has(s));

    // Extras specific to this component's ID format — so we only claim "extra" when
    // the observed ID clearly belongs to this component's namespace.
    const nsRegex = new RegExp(
        `^(${slotRegex.source.match(/\(\?:([^)]+)\)|\(([a-z]+)/)?.[1] || comp.split('-')[0]})-`,
        'i'
    );
    const extraTcs = [...historyLc.keys()].filter((tc) => nsRegex.test(tc) && !slots.includes(tc));

    const perTc = executed.map((tc) => {
        const entries = historyLc.get(tc);
        const last = lastStatusOf(historyLc, tc);
        const pStatus = { passed: 0, failed: 0, timedOut: 0, skipped: 0 };
        for (const e of entries) pStatus[e.status] = (pStatus[e.status] || 0) + 1;
        return {
            tcId: tc,
            runs: entries.length,
            lastStatus: last?.status || null,
            lastTimestamp: last?.timestamp || null,
            lastFingerprint: last?.fingerprint || null,
            lastProject: last?.project || null,
            lastActualRaw: last?.actualRaw || null,
            perStatus: pStatus,
        };
    });

    const counts = { total: slots.length, executed: executed.length, pending: pending.length };
    const byLastStatus = { passed: 0, failed: 0, timedOut: 0, skipped: 0, unknown: 0 };
    for (const t of perTc) {
        const key = t.lastStatus && byLastStatus[t.lastStatus] !== undefined ? t.lastStatus : 'unknown';
        byLastStatus[key]++;
    }

    allComponents[comp] = { counts, byLastStatus, perTc, pending, extraTcs };
}

// --- Output ---
if (JSON_OUTPUT) {
    console.log(JSON.stringify({ project: PROJECT, runsScanned: runs.length, components: allComponents }, null, 2));
    process.exit(0);
}

function renderComponent(comp, data) {
    const { counts, byLastStatus, perTc, pending, extraTcs } = data;
    const lines = [];
    lines.push(`# Task Status — ${PROJECT} / ${comp}`);
    lines.push('');
    lines.push(`**Matrix source**: [\`${COMPONENTS[comp].matrixPath}\`](../../../../${COMPONENTS[comp].matrixPath})`);
    lines.push(`**Runs scanned**: ${runs.length} (under \`projects/${PROJECT.toLowerCase()}/\`)`);
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Rollup');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('| --- | --- |');
    lines.push(`| Matrix slots | **${counts.total}** |`);
    lines.push(`| Executed (≥1 non-skip run) | **${counts.executed}** |`);
    lines.push(`| Pending (in matrix, never executed) | **${counts.pending}** |`);
    lines.push(`| Extras (executed but not in matrix) | ${extraTcs.length} |`);
    lines.push('');
    lines.push('### Executed — last-run status breakdown');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('| --- | --- |');
    lines.push(`| Passed | ${byLastStatus.passed} |`);
    lines.push(`| Failed | ${byLastStatus.failed} |`);
    lines.push(`| TimedOut | ${byLastStatus.timedOut} |`);
    lines.push(`| Skipped only (no non-skip run) | ${byLastStatus.skipped} |`);
    lines.push(`| Unknown | ${byLastStatus.unknown} |`);
    lines.push('');

    if (!PENDING_ONLY && perTc.length) {
        lines.push('## Executed — per-TC last status');
        lines.push('');
        lines.push('| TC | Runs | Last status | Last run | Build | Project | Last actualRaw |');
        lines.push('| -- | ---- | ----------- | -------- | ----- | ------- | -------------- |');
        for (const t of perTc.sort((a, b) => a.tcId.localeCompare(b.tcId, undefined, { numeric: true }))) {
            const raw = String(t.lastActualRaw ?? '')
                .slice(0, 40)
                .replace(/\|/g, '\\|');
            lines.push(
                `| ${t.tcId} | ${t.runs} | ${t.lastStatus || '?'} | ${fmtTs(t.lastTimestamp)} | ${t.lastFingerprint || '?'} | ${t.lastProject || '?'} | \`${raw}\` |`
            );
        }
        lines.push('');
    }

    lines.push(`## Pending — ${pending.length} slots never executed on this customer`);
    lines.push('');
    if (pending.length === 0) {
        lines.push('_All matrix slots have at least one run._');
    } else {
        lines.push('<details><summary>Expand</summary>');
        lines.push('');
        for (const p of pending) lines.push(`- \`${p}\``);
        lines.push('');
        lines.push('</details>');
    }
    lines.push('');

    if (extraTcs.length) {
        lines.push(`## Extras — executed but not in matrix (${extraTcs.length})`);
        lines.push('');
        lines.push(
            'These TCs appear in regression runs but are not present in the matrix — either newly added specs not yet documented, or ID-format mismatches.'
        );
        lines.push('');
        for (const e of extraTcs.sort()) lines.push(`- \`${e}\``);
        lines.push('');
    }
    return lines.join('\n');
}

// Top-level rollup (when scanning all components)
if (componentsToRun.length > 1) {
    const total = Object.values(allComponents).reduce(
        (acc, d) => {
            acc.slots += d.counts.total;
            acc.executed += d.counts.executed;
            acc.pending += d.counts.pending;
            acc.passed += d.byLastStatus.passed;
            acc.failed += d.byLastStatus.failed;
            acc.timedOut += d.byLastStatus.timedOut;
            return acc;
        },
        { slots: 0, executed: 0, pending: 0, passed: 0, failed: 0, timedOut: 0 }
    );

    const rollup = [];
    rollup.push(`# Date-Handling Task Status — ${PROJECT}`);
    rollup.push('');
    rollup.push(`**Runs scanned**: ${runs.length} · **Generated**: ${new Date().toISOString()}`);
    rollup.push('');
    rollup.push('## Cross-Component Rollup');
    rollup.push('');
    rollup.push('| Component | Slots | Executed | Pending | Passed | Failed | TimedOut | Per-component status |');
    rollup.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
    for (const comp of componentsToRun) {
        const d = allComponents[comp];
        rollup.push(
            `| ${comp} | ${d.counts.total} | ${d.counts.executed} | ${d.counts.pending} | ${d.byLastStatus.passed} | ${d.byLastStatus.failed} | ${d.byLastStatus.timedOut} | [\`${comp}/status.md\`](${comp}/status.md) |`
        );
    }
    rollup.push(
        `| **TOTAL** | **${total.slots}** | **${total.executed}** | **${total.pending}** | **${total.passed}** | **${total.failed}** | **${total.timedOut}** | |`
    );
    rollup.push('');
    rollup.push('Regenerate with: `npm run task:status -- --project ' + PROJECT + ' --write`');
    rollup.push('');

    const rollupMd = rollup.join('\n');
    console.log(rollupMd);

    if (WRITE_FILE) {
        const outDir = path.join(projectDir, 'testing', 'date-handling');
        fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, 'status-rollup.md');
        fs.writeFileSync(outPath, rollupMd);
        console.error(`\nWrote rollup: ${path.relative(REPO_ROOT, outPath)}`);
    }
}

// Per-component renders
for (const comp of componentsToRun) {
    const md = renderComponent(comp, allComponents[comp]);
    if (componentsToRun.length === 1) console.log(md);

    if (WRITE_FILE) {
        const outDir = path.join(projectDir, 'testing', 'date-handling', comp);
        fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, 'status.md');
        fs.writeFileSync(outPath, md);
        console.error(`Wrote: ${path.relative(REPO_ROOT, outPath)}`);
    }
}
