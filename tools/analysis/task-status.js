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
const { buildWsSlotId } = require('../helpers/ws-slot-id');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROJECTS_DIR = path.join(REPO_ROOT, 'projects');
const TEST_DATA_PATH = path.join(REPO_ROOT, 'testing', 'fixtures', 'test-data.js');

// Actions in test-data.js that mark an entry as non-executable by design.
// These are intent-captured (the matrix row's purpose is documented) but won't
// run as a regression test — not the same as "pending".
const NON_EXECUTABLE_ACTIONS = new Set(['umbrella', 'skip', 'theoretical']);

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

// Extract `{ id, action }` tuples from testing/fixtures/test-data.js by scanning
// the source for `id: '...'` and `action: '...'` pairs. Cheap and robust enough
// for our conventions. Returns a Map keyed by lowercased id.
function parseTestDataActions() {
    const out = new Map();
    if (!fs.existsSync(TEST_DATA_PATH)) return out;
    const src = fs.readFileSync(TEST_DATA_PATH, 'utf8');
    // Match `{ id: '...', ... action: '...' }` blocks. Scan entry-by-entry
    // by splitting on `},\s*{` — brittle but works for the file's current style.
    const entries = src.split(/},\s*{/);
    for (const entry of entries) {
        const idMatch = entry.match(/\bid:\s*['"]([^'"]+)['"]/);
        const actionMatch = entry.match(/\baction:\s*['"]([^'"]+)['"]/);
        if (!idMatch) continue;
        out.set(idMatch[1].toLowerCase(), actionMatch ? actionMatch[1] : null);
    }
    return out;
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

// Parse non-executable section markers from a matrix markdown file.
//
// Markers are HTML comments of the form:
//   <!-- task-status: non-executable prefix="ws-4-" reason="browser-only" -->
//
// Any slot whose ID starts with the declared prefix gets routed to the
// `nonExecutable` bucket with `reason` as its action label. This lets a matrix
// document classes of slots that are intentionally out-of-scope for the current
// runner (e.g. WS-4 requires browser verification, not the WS regression runner)
// without needing a corresponding test-data.js entry per slot.
//
// Returns an array of `{ prefix, reason }` (prefixes lowercased).
function parseNonExecutableMarkers(matrixPath) {
    const abs = path.isAbsolute(matrixPath) ? matrixPath : path.join(REPO_ROOT, matrixPath);
    if (!fs.existsSync(abs)) return [];
    const txt = fs.readFileSync(abs, 'utf8');
    const markerRe = /<!--\s*task-status:\s*non-executable\s+prefix="([^"]+)"\s+reason="([^"]+)"\s*-->/gi;
    const out = [];
    let m;
    while ((m = markerRe.exec(txt)) !== null) {
        out.push({ prefix: m[1].toLowerCase(), reason: m[2] });
    }
    return out;
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
            // WS runs predating the pipeline tcId stamp lack r.tcId — compose from
            // (action, config, tz[, format|variant]) so the history map isn't empty.
            const tc = r.tcId || buildWsSlotId(r);
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

// Single scan of the project's JSON files — shared across all components
const jsonFiles = findExecutions(projectDir);
const runs = readRuns(jsonFiles);
const history = perTcHistory(runs);

// Normalize history keys to lowercase for matching. Preserve original case for display.
const historyLc = new Map();
for (const [tc, entries] of history) historyLc.set(String(tc).toLowerCase(), entries);

// Load test-data.js actions so we can flag intentionally-non-executable slots
// (umbrella/skip/theoretical) distinct from truly pending work.
const testDataActions = parseTestDataActions();

// A slot is "umbrella-covered" if it isn't directly in history but at least one
// fine-grained child TC (history key starting with `${slot}-`) is.
function umbrellaChildrenOf(slot, historyKeys) {
    const prefix = slot + '-';
    return [...historyKeys].filter((h) => h.startsWith(prefix));
}

const allComponents = {};
for (const comp of componentsToRun) {
    const { matrixPath, slotRegex } = COMPONENTS[comp];
    const slots = parseMatrixSlots(matrixPath, slotRegex);
    const nonExecutableMarkers = parseNonExecutableMarkers(matrixPath);

    // Partition matrix slots into executed / non-executable / umbrella-covered / pending.
    const executed = [];
    const nonExecutable = []; // test-data entry is umbrella/skip/theoretical, OR matrix has a non-executable section marker
    const umbrellaCovered = []; // no test-data entry OR test-data says runnable, but fine-grained children executed
    const pending = []; // actually needs work

    const historyKeysLc = [...historyLc.keys()];
    // A matrix slot is "executed" if either its base ID or any scope-suffixed
    // variant (`.v2`, etc.) is in history. We track the set of variants per slot
    // so per-TC rollup can surface the best (non-skipped) status across variants.
    const variantsOfSlot = (slot) => {
        const base = slot;
        const v2 = `${slot}.v2`;
        return [base, v2].filter((k) => historyLc.has(k));
    };
    // Match a slot against the matrix-declared non-executable prefixes. First match wins.
    const nonExecutableMarkerFor = (slot) => nonExecutableMarkers.find((m) => slot.startsWith(m.prefix)) || null;
    for (const slot of slots) {
        const variants = variantsOfSlot(slot);
        if (variants.length > 0) {
            executed.push({ slot, variants });
            continue;
        }
        const action = testDataActions.get(slot);
        if (action && NON_EXECUTABLE_ACTIONS.has(action)) {
            nonExecutable.push({ slot, action });
            continue;
        }
        const marker = nonExecutableMarkerFor(slot);
        if (marker) {
            nonExecutable.push({ slot, action: marker.reason });
            continue;
        }
        const children = umbrellaChildrenOf(slot, historyKeysLc);
        if (children.length > 0) {
            umbrellaCovered.push({ slot, children });
            continue;
        }
        pending.push(slot);
    }

    // Extras specific to this component's ID format — so we only claim "extra" when
    // the observed ID clearly belongs to this component's namespace.
    const nsRegex = new RegExp(
        `^(${slotRegex.source.match(/\(\?:([^)]+)\)|\(([a-z]+)/)?.[1] || comp.split('-')[0]})-`,
        'i'
    );
    const extraTcs = historyKeysLc.filter((tc) => nsRegex.test(tc) && !slots.includes(tc));

    const perTc = executed.map(({ slot, variants }) => {
        // Merge entries from every variant (base + .v2 etc.), then determine current status:
        //   - If the latest run has any non-skip entry for this slot → active (passed/failed/timedOut).
        //   - If the latest run skipped every project but prior runs have non-skip history → inactive
        //     (slot ran historically but is now dormant — usually a V1/V2 scope drift).
        //   - If the slot has never had a non-skip run → skipped (truly blocked).
        // `priorStatus`/`priorTimestamp` surface the last-known non-skip status when inactive, so
        // dormant-but-once-failing slots don't inflate the Failed count yet retain their history.
        const allEntries = variants.flatMap((v) => historyLc.get(v) || []);
        const byRun = new Map();
        for (const e of allEntries) {
            const key = e.timestamp || '?';
            if (!byRun.has(key)) byRun.set(key, []);
            byRun.get(key).push(e);
        }
        const runsDesc = [...byRun.keys()].sort((a, b) => new Date(b) - new Date(a));
        const latestRunEntries = runsDesc.length ? byRun.get(runsDesc[0]) : [];
        const latestNonSkip = latestRunEntries.filter((e) => e.status !== 'skipped');

        let lastStatus, lastTimestamp, lastFingerprint, lastProject, lastActualRaw;
        let priorStatus = null;
        let priorTimestamp = null;

        if (latestNonSkip.length > 0) {
            // Active — surface the attention-needed status if any project failed/timedOut.
            const worst =
                latestNonSkip.find((e) => e.status === 'failed' || e.status === 'timedOut') || latestNonSkip[0];
            lastStatus = worst.status;
            lastTimestamp = worst.timestamp;
            lastFingerprint = worst.fingerprint;
            lastProject = worst.project;
            lastActualRaw = worst.actualRaw;
        } else {
            const priorNonSkip = allEntries
                .filter((e) => e.status !== 'skipped')
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            const latest = latestRunEntries[0] || null;
            if (priorNonSkip.length > 0) {
                // Inactive: latest run skipped everything, but we have older non-skip history.
                lastStatus = 'inactive';
                lastTimestamp = latest?.timestamp || priorNonSkip[0].timestamp;
                lastFingerprint = latest?.fingerprint || priorNonSkip[0].fingerprint;
                lastProject = latest?.project || priorNonSkip[0].project;
                lastActualRaw = priorNonSkip[0].actualRaw;
                priorStatus = priorNonSkip[0].status;
                priorTimestamp = priorNonSkip[0].timestamp;
            } else {
                // Never non-skipped.
                lastStatus = 'skipped';
                lastTimestamp = latest?.timestamp || null;
                lastFingerprint = latest?.fingerprint || null;
                lastProject = latest?.project || null;
                lastActualRaw = null;
            }
        }

        const pStatus = { passed: 0, failed: 0, timedOut: 0, skipped: 0 };
        for (const e of allEntries) pStatus[e.status] = (pStatus[e.status] || 0) + 1;
        return {
            tcId: slot,
            variants,
            runs: allEntries.length,
            lastStatus,
            lastTimestamp,
            lastFingerprint,
            lastProject,
            lastActualRaw,
            priorStatus,
            priorTimestamp,
            perStatus: pStatus,
        };
    });

    const counts = {
        total: slots.length,
        executed: executed.length,
        nonExecutable: nonExecutable.length,
        umbrellaCovered: umbrellaCovered.length,
        pending: pending.length,
    };
    const byLastStatus = { passed: 0, failed: 0, timedOut: 0, inactive: 0, skipped: 0, unknown: 0 };
    for (const t of perTc) {
        const key = t.lastStatus && byLastStatus[t.lastStatus] !== undefined ? t.lastStatus : 'unknown';
        byLastStatus[key]++;
    }

    allComponents[comp] = { counts, byLastStatus, perTc, pending, nonExecutable, umbrellaCovered, extraTcs };
}

// --- Output ---
if (JSON_OUTPUT) {
    console.log(JSON.stringify({ project: PROJECT, runsScanned: runs.length, components: allComponents }, null, 2));
    process.exit(0);
}

function renderComponent(comp, data) {
    const { counts, byLastStatus, perTc, pending, nonExecutable, umbrellaCovered, extraTcs } = data;
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
    lines.push(`| Umbrella-covered (aggregate row — children executed) | ${counts.umbrellaCovered} |`);
    lines.push(
        `| Non-executable (test-data action = umbrella/skip/theoretical OR matrix non-executable marker) | ${counts.nonExecutable} |`
    );
    lines.push(`| **Actionable pending** (need work) | **${counts.pending}** |`);
    lines.push(`| Extras (executed but not in matrix) | ${extraTcs.length} |`);
    lines.push('');
    lines.push('### Executed — current-run status breakdown');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('| --- | --- |');
    lines.push(`| Passed (latest run) | ${byLastStatus.passed} |`);
    lines.push(`| Failed (latest run) | ${byLastStatus.failed} |`);
    lines.push(`| TimedOut (latest run) | ${byLastStatus.timedOut} |`);
    lines.push(
        `| Inactive (latest run skipped across all projects; prior non-skip exists) | ${byLastStatus.inactive} |`
    );
    lines.push(`| Skipped only (never a non-skip run) | ${byLastStatus.skipped} |`);
    lines.push(`| Unknown | ${byLastStatus.unknown} |`);
    lines.push('');

    if (!PENDING_ONLY && perTc.length) {
        lines.push('## Executed — per-TC last status');
        lines.push('');
        lines.push('| TC | Runs | Last status | Prior non-skip | Last run | Build | Project | Last actualRaw |');
        lines.push('| -- | ---- | ----------- | -------------- | -------- | ----- | ------- | -------------- |');
        for (const t of perTc.sort((a, b) => a.tcId.localeCompare(b.tcId, undefined, { numeric: true }))) {
            const raw = String(t.lastActualRaw ?? '')
                .slice(0, 40)
                .replace(/\|/g, '\\|');
            const prior = t.priorStatus ? `${t.priorStatus} (${fmtTs(t.priorTimestamp).slice(0, 10)})` : '—';
            lines.push(
                `| ${t.tcId} | ${t.runs} | ${t.lastStatus || '?'} | ${prior} | ${fmtTs(t.lastTimestamp)} | ${t.lastFingerprint || '?'} | ${t.lastProject || '?'} | \`${raw}\` |`
            );
        }
        lines.push('');
    }

    lines.push(`## Actionable pending — ${pending.length} slots need work`);
    lines.push('');
    if (pending.length === 0) {
        lines.push('_All executable matrix slots have at least one run._');
    } else {
        lines.push('<details><summary>Expand</summary>');
        lines.push('');
        for (const p of pending) lines.push(`- \`${p}\``);
        lines.push('');
        lines.push('</details>');
    }
    lines.push('');

    if (umbrellaCovered.length) {
        lines.push(`## Umbrella-covered — ${umbrellaCovered.length} aggregate matrix rows`);
        lines.push('');
        lines.push("These matrix IDs aren't directly in history but fine-grained children are executed.");
        lines.push('');
        lines.push('<details><summary>Expand</summary>');
        lines.push('');
        for (const u of umbrellaCovered) {
            const preview = u.children
                .slice(0, 3)
                .map((c) => `\`${c}\``)
                .join(', ');
            const more = u.children.length > 3 ? `, +${u.children.length - 3} more` : '';
            lines.push(`- \`${u.slot}\` → ${preview}${more}`);
        }
        lines.push('');
        lines.push('</details>');
        lines.push('');
    }

    if (nonExecutable.length) {
        lines.push(`## Non-executable — ${nonExecutable.length} intentionally-skipped matrix rows`);
        lines.push('');
        lines.push(
            'Either `test-data.js` marks them `action: umbrella|skip|theoretical`, or `matrix.md` declares a `<!-- task-status: non-executable prefix="..." reason="..." -->` section marker. Intent captured, won\'t run via this runner.'
        );
        lines.push('');
        lines.push('<details><summary>Expand</summary>');
        lines.push('');
        for (const n of nonExecutable) lines.push(`- \`${n.slot}\` (action: \`${n.action}\`)`);
        lines.push('');
        lines.push('</details>');
        lines.push('');
    }

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
            acc.umbrellaCovered += d.counts.umbrellaCovered;
            acc.nonExecutable += d.counts.nonExecutable;
            acc.pending += d.counts.pending;
            acc.passed += d.byLastStatus.passed;
            acc.failed += d.byLastStatus.failed;
            acc.timedOut += d.byLastStatus.timedOut;
            acc.inactive += d.byLastStatus.inactive || 0;
            return acc;
        },
        {
            slots: 0,
            executed: 0,
            umbrellaCovered: 0,
            nonExecutable: 0,
            pending: 0,
            passed: 0,
            failed: 0,
            timedOut: 0,
            inactive: 0,
        }
    );

    const rollup = [];
    rollup.push(`# Date-Handling Task Status — ${PROJECT}`);
    rollup.push('');
    rollup.push(`**Runs scanned**: ${runs.length} · **Generated**: ${new Date().toISOString()}`);
    rollup.push('');
    rollup.push('## Cross-Component Rollup');
    rollup.push('');
    rollup.push('`Pending` = actionable (not umbrella/skip/theoretical and not covered by a fine-grained child).');
    rollup.push('');
    rollup.push(
        '| Component | Slots | Executed | Umbrella | NonExec | Pending | Passed | Failed | TimedOut | Inactive | Status |'
    );
    rollup.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
    for (const comp of componentsToRun) {
        const d = allComponents[comp];
        rollup.push(
            `| ${comp} | ${d.counts.total} | ${d.counts.executed} | ${d.counts.umbrellaCovered} | ${d.counts.nonExecutable} | **${d.counts.pending}** | ${d.byLastStatus.passed} | ${d.byLastStatus.failed} | ${d.byLastStatus.timedOut} | ${d.byLastStatus.inactive || 0} | [\`${comp}/status.md\`](${comp}/status.md) |`
        );
    }
    rollup.push(
        `| **TOTAL** | **${total.slots}** | **${total.executed}** | **${total.umbrellaCovered}** | **${total.nonExecutable}** | **${total.pending}** | **${total.passed}** | **${total.failed}** | **${total.timedOut}** | **${total.inactive}** | |`
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
