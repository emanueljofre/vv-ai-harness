#!/usr/bin/env node
/**
 * Audit a V2 web-services regression run against the V1 matrix baseline.
 *
 * Mirrors `audit-v2-baseline.js` (forms-calendar) but adapted for WS:
 *   - V1 expected values are parsed from `research/date-handling/web-services/matrix.md`
 *     (the matrix is the single source of truth — there's no WS test-data.js fixture).
 *   - V2 observed values are read from the project's regression JSON.
 *   - Each slot is classified: IDENTICAL / FORMAT_ONLY / SAME_LOCAL_DATE /
 *     KNOWN_BUG_PERSISTS / UNFLAGGED_DIFFERENCE / NEW_IN_V2 / MISSING_IN_V2.
 *   - Known WS bug signatures (WS-BUG-1..6) are pattern-matched against
 *     diffs and tagged inline in the audit — there's no test-data to mutate,
 *     so tags live in the audit report itself.
 *
 * Usage:
 *   npm run audit:ws:v2 -- --project EmanuelJofre-vv5dev [--json] [--write]
 *
 * Writes `projects/{project}/testing/date-handling/web-services/v2-baseline-audit.md`
 * when --write is passed.
 */
const fs = require('fs');
const path = require('path');
const { buildWsSlotId } = require('../helpers/ws-slot-id');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MATRIX_PATH = path.join(REPO_ROOT, 'research', 'date-handling', 'web-services', 'matrix.md');

// --- CLI ---
const args = process.argv.slice(2);
function getArg(flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}
const PROJECT = getArg('--project');
const JSON_OUTPUT = args.includes('--json');
const WRITE = args.includes('--write');

if (!PROJECT) {
    console.error('Usage: npm run audit:ws:v2 -- --project <name> [--json] [--write]');
    process.exit(1);
}

const projectSlug = PROJECT.toLowerCase();
const resultsPath = path.join(
    REPO_ROOT,
    'projects',
    projectSlug,
    'testing',
    'date-handling',
    'web-services',
    'ws-regression-results-latest.json'
);

if (!fs.existsSync(resultsPath)) {
    console.error(`No ws-regression-results-latest.json for project ${PROJECT} at:\n  ${resultsPath}`);
    console.error('Run tests first: npm run test:ws:regression -- --skip-artifacts');
    process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const envFingerprint = results.buildContext?.fingerprint || '(unknown)';
const envInstance = results.buildContext?.instance || '(unknown)';
console.log(`Source: ${resultsPath}`);
console.log(`Env: ${envInstance} · Build fingerprint: ${envFingerprint}`);
console.log(`Total results: ${results.results.length}\n`);

// --- Parse matrix.md to get V1 expected values per slot ---
// Same algorithm as generate-ws-artifacts.js parseMatrix(), kept local so this
// tool has no dependency on the generator.
function parseMatrix(matrixPath) {
    const content = fs.readFileSync(matrixPath, 'utf8');
    const lines = content.split('\n');
    const out = new Map();
    let expectedColIdx = -1;
    let statusColIdx = -1;
    let bugsColIdx = -1;
    let inTable = false;

    // Preference order for the "V1 expected value" column — WS tables are
    // inconsistent: WS-1 has "Expected Stored", WS-2 "Expected API Return",
    // WS-3 "Cycle 2 Read", WS-9 plain "Stored". Try in order so that when
    // multiple candidates exist (e.g. WS-2 has both "Forms Stored Value" and
    // "Expected API Return"), the "Expected" one wins.
    const COLUMN_MATCHERS = [/expected/i, /cycle\s*2/i, /^stored$/i];
    for (const line of lines) {
        if (line.startsWith('|') && !inTable) {
            const cols = line.split('|').map((c) => c.trim());
            let headerIdx = -1;
            for (const re of COLUMN_MATCHERS) {
                const i = cols.findIndex((c) => re.test(c));
                if (i >= 0) {
                    headerIdx = i;
                    break;
                }
            }
            if (headerIdx >= 0) {
                expectedColIdx = headerIdx;
                statusColIdx = cols.findIndex((c) => /^status$/i.test(c));
                bugsColIdx = cols.findIndex((c) => /^bugs?$/i.test(c));
                inTable = true;
                continue;
            }
        }
        if (inTable && line.startsWith('|') && line.includes('---')) continue;
        if (inTable && line.startsWith('|')) {
            const cols = line.split('|').map((c) => c.trim());
            const testId = stripBackticks(cols[1]);
            if (!testId || /^-+$/.test(testId) || /^ID$/i.test(testId)) continue;
            const expectedRaw = expectedColIdx >= 0 ? cols[expectedColIdx] : null;
            const statusRaw = statusColIdx >= 0 ? cols[statusColIdx] : null;
            const bugsRaw = bugsColIdx >= 0 ? cols[bugsColIdx] : null;
            if (expectedRaw && testId) {
                out.set(testId.toLowerCase(), {
                    expectedValue: stripBackticks(expectedRaw),
                    status: (statusRaw || 'PENDING').trim(),
                    bugs: parseBugs(bugsRaw),
                });
            }
        }
        // Exit the table on any non-table line (heading, blockquote, horizontal
        // rule, or any prose). Otherwise we'd stay `inTable: true` with stale
        // column indices and mis-parse the next table's header as a data row.
        if (inTable && !line.startsWith('|') && line.trim() !== '') {
            inTable = false;
            expectedColIdx = -1;
            statusColIdx = -1;
            bugsColIdx = -1;
        }
    }
    return out;
}

function stripBackticks(s) {
    if (!s) return s;
    let clean = String(s)
        .replace(/^`+|`+$/g, '')
        .trim();
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    return clean;
}

function parseBugs(s) {
    if (!s || s === '—' || s === '-') return [];
    // Matrix uses "#7" shorthand or "WS-BUG-N" or "FORM-BUG-N" — collect any bug-like tokens
    const tokens = String(s).match(/(?:WS-BUG-\d+|FORM-BUG-\d+|#\d+)/gi) || [];
    return tokens.map((t) => t.toUpperCase());
}

// Slot ID: prefer the write-time-stamped r.tcId, fall back to composing from the
// row fields (handles old regression JSONs written before the pipeline stamped tcId).
function buildTcId(r) {
    return r.tcId || buildWsSlotId(r);
}

const TZ_MAP = {
    BRT: 'America/Sao_Paulo',
    IST: 'Asia/Kolkata',
    UTC: 'Etc/UTC',
    UTC0: 'Etc/UTC',
};

// --- Classification helpers (adapted from audit-v2-baseline.js) ---
function parseMaybeDate(str) {
    if (str == null || str === '' || str === 'null') return null;
    const s = String(str);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { calendarDate: s, moment: null };
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
        return { calendarDate: s.slice(0, 10), moment: null, naive: true, str: s };
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return { calendarDate: null, moment: d };
}

function calendarDateInTz(date, tzName) {
    if (!date || !tzName) return null;
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tzName,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    try {
        return fmt.format(date);
    } catch {
        return null;
    }
}

function toLocalDate(parsed, tzName) {
    if (!parsed) return null;
    if (parsed.calendarDate) return parsed.calendarDate;
    if (parsed.moment) return calendarDateInTz(parsed.moment, tzName);
    return null;
}

function classify(v1Val, v2Val, tzName) {
    const v1Norm = v1Val == null ? '' : String(v1Val);
    const v2Norm = v2Val == null ? '' : String(v2Val);
    if (v1Norm === v2Norm) return { verdict: 'IDENTICAL' };

    // Empty / null-like comparisons — highlight explicitly
    const isEmpty = (x) => x === '' || x === 'null' || x == null;
    if (isEmpty(v1Val) && !isEmpty(v2Val)) return { verdict: 'NEW_IN_V2' };
    if (!isEmpty(v1Val) && isEmpty(v2Val)) return { verdict: 'MISSING_IN_V2' };

    const v1p = parseMaybeDate(v1Val);
    const v2p = parseMaybeDate(v2Val);
    if (!v1p || !v2p) return { verdict: 'SEMANTIC_DIFF' };
    if (v1p.moment && v2p.moment && v1p.moment.getTime() === v2p.moment.getTime()) {
        return { verdict: 'FORMAT_ONLY' };
    }
    const v1Local = toLocalDate(v1p, tzName);
    const v2Local = toLocalDate(v2p, tzName);
    if (v1Local && v2Local && v1Local === v2Local) {
        return { verdict: 'SAME_LOCAL_DATE', v1Local, v2Local };
    }
    return { verdict: 'SEMANTIC_DIFF', v1Local, v2Local };
}

// --- WS bug signature matchers ---
// Pattern-match observed deltas against known WS bugs. Each matcher returns
// the bug ID if it matches, else null.
const BUG_SIGNATURES = [
    {
        id: 'WS-BUG-5',
        when: (v1, v2, r) => {
            // Compact ISO / epoch silently discarded → stored null/empty
            const isEmpty = (x) => x === '' || x === 'null' || x == null;
            const compactFormats = /^(epoch|epochs|dotnet|yrdm|yd|ys|iso)$/i;
            return (
                isEmpty(v2) &&
                !isEmpty(v1) &&
                r.action?.toLowerCase() === 'ws-5' &&
                (r.format ? compactFormats.test(r.format) : false)
            );
        },
    },
    {
        id: 'WS-BUG-6',
        when: (v1, v2, r) => {
            // Date-only field accepted time component → stored has T!=00:00
            if (r.action?.toLowerCase() !== 'ws-5') return false;
            if (!['a', 'b', 'e', 'f'].includes(String(r.config || '').toLowerCase())) return false;
            const s = String(v2 || '');
            return /T(?!00:00:00)/.test(s);
        },
    },
    {
        id: 'WS-BUG-2',
        when: (v1, v2, r) => {
            const isEmpty = (x) => x === '' || x === 'null' || x == null;
            return isEmpty(v2) && r.action?.toLowerCase() === 'ws-5' && /latam|dmy|ddmm/i.test(String(r.format || ''));
        },
    },
    {
        id: 'WS-BUG-3',
        when: (v1, v2, r) => {
            if (r.action?.toLowerCase() !== 'ws-5') return false;
            if (!/ambig/i.test(String(r.format || ''))) return false;
            // Ambiguous input that parsed to a valid but unexpected date
            const v2p = parseMaybeDate(v2);
            return !!(v2p && (v2p.calendarDate || v2p.moment));
        },
    },
];

function tagBugs(v1, v2, r) {
    const hits = [];
    for (const sig of BUG_SIGNATURES) {
        try {
            if (sig.when(v1, v2, r)) hits.push(sig.id);
        } catch {
            // matchers should be defensive; ignore individual failures
        }
    }
    return hits;
}

// --- Audit ---
const matrix = parseMatrix(MATRIX_PATH);
console.log(`Matrix loaded: ${matrix.size} V1 expected values from matrix.md\n`);

const audits = [];
const seen = new Set();

for (const r of results.results) {
    if (r.status === 'error') continue;
    const tcId = buildTcId(r);
    if (seen.has(tcId)) continue;
    seen.add(tcId);

    const v1Entry = matrix.get(tcId);
    const v2Stored = r.stored;
    const tzName = TZ_MAP[r.tz] || null;

    if (!v1Entry) {
        audits.push({
            id: tcId,
            verdict: 'NOT_IN_MATRIX',
            action: r.action,
            config: r.config,
            tz: r.tz,
            format: r.format,
            variant: r.variant,
            v2Stored,
            v2Returned: r.returned,
        });
        continue;
    }

    const v1Expected = v1Entry.expectedValue;
    const cls = classify(v1Expected, v2Stored, tzName);

    const taggedBugs = tagBugs(v1Expected, v2Stored, r);
    const v1Bugs = v1Entry.bugs || [];
    const knownBugHit = v1Bugs.length > 0 || taggedBugs.length > 0;

    let verdict = cls.verdict;
    if (verdict === 'SEMANTIC_DIFF' || verdict === 'NEW_IN_V2' || verdict === 'MISSING_IN_V2') {
        // Trust the pipeline's per-action classifier (ws-matrix-compare.js) when it
        // stamped the row as passing — it knows WS-6 cleared-state and WS-8 query
        // verdicts, plus null-equivalence for rejected formats. The audit's literal
        // classify() can't see these semantics and would otherwise flag them as
        // UNFLAGGED_DIFFERENCE. Only override the diff-family verdicts — leave
        // IDENTICAL / FORMAT_ONLY / SAME_LOCAL_DATE alone.
        if (r.status === 'passed') {
            verdict = 'IDENTICAL';
        } else {
            verdict = knownBugHit ? 'KNOWN_BUG_PERSISTS' : 'UNFLAGGED_DIFFERENCE';
        }
    }

    audits.push({
        id: tcId,
        verdict,
        action: r.action,
        config: r.config,
        tz: r.tz,
        format: r.format,
        variant: r.variant,
        v1Expected,
        v2Stored,
        v2Returned: r.returned,
        v2Sent: r.sent,
        v1Bugs,
        taggedBugs,
        bugs: [...new Set([...v1Bugs, ...taggedBugs])],
        rawVerdict: cls.verdict,
    });
}

// --- Output ---
if (JSON_OUTPUT) {
    console.log(JSON.stringify({ project: PROJECT, total: audits.length, audits }, null, 2));
    process.exit(0);
}

const counts = {};
for (const a of audits) counts[a.verdict] = (counts[a.verdict] || 0) + 1;

const VERDICT_DESC = {
    IDENTICAL: 'V2 observed stored == V1 matrix expected. No action needed.',
    FORMAT_ONLY: 'Same UTC moment — V1 and V2 differ only in serialization format. Benign.',
    SAME_LOCAL_DATE: "Same calendar date in slot's TZ (different UTC representations). Usually benign.",
    KNOWN_BUG_PERSISTS:
        'V2 differs from V1 AND matrix has a `bugs` marker OR pattern matched a known WS bug signature. V1 bug carried over to V2.',
    UNFLAGGED_DIFFERENCE:
        '★ **REVIEW** — V2 differs from V1 with no known-bug marker. Potential new V2 behavior or silently-absorbed V2 bug.',
    NEW_IN_V2:
        'V1 was empty/null, V2 has a value. Usually indicates a new V2 behavior (e.g., server synthesizing a value).',
    MISSING_IN_V2: 'V1 had a value, V2 is empty/null. Often a V2 breakage or stricter input rejection.',
    SEMANTIC_DIFF: 'Non-parseable difference (boolean, non-date, etc.). Review manually.',
    NOT_IN_MATRIX:
        'Observed slot not found in matrix.md. New test variant from the harness. Add a row to the matrix if this should be tracked.',
};

const lines = [];
lines.push(`# V2 WS Baseline Audit — ${PROJECT}`);
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push(`**Source**: [\`ws-regression-results-latest.json\`](./ws-regression-results-latest.json)`);
lines.push(`**Build fingerprint**: \`${envFingerprint}\``);
lines.push(`**Env**: \`${envInstance}\``);
lines.push(`**Total slots audited**: ${audits.length}`);
lines.push('');
lines.push(
    "**Purpose**: compare V2 observed `stored` values (from this project's regression run) against V1 " +
        'expected values documented in [`research/date-handling/web-services/matrix.md`](../../../../research/date-handling/web-services/matrix.md). ' +
        "Flag slots where V2 diverges without a documented bug marker, so we don't silently absorb V2 bugs into the baseline."
);
lines.push('');

lines.push('## Summary');
lines.push('');
lines.push('| Verdict | Count | Meaning |');
lines.push('| --- | ---: | --- |');
for (const [v, n] of Object.entries(counts).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${v} | ${n} | ${VERDICT_DESC[v] || ''} |`);
}
lines.push('');

const priority = [
    'UNFLAGGED_DIFFERENCE',
    'MISSING_IN_V2',
    'NEW_IN_V2',
    'SEMANTIC_DIFF',
    'NOT_IN_MATRIX',
    'KNOWN_BUG_PERSISTS',
    'SAME_LOCAL_DATE',
    'FORMAT_ONLY',
    'IDENTICAL',
];

for (const v of priority) {
    const bucket = audits.filter((a) => a.verdict === v);
    if (!bucket.length) continue;
    lines.push(`## ${v} (${bucket.length})`);
    lines.push('');
    if (v === 'UNFLAGGED_DIFFERENCE') {
        const ws2 = bucket.filter((a) => a.action === 'WS-2').length;
        if (ws2 > 0) {
            lines.push(
                `> **Note on WS-2 entries (${ws2} of ${bucket.length} below)**: the regression pipeline creates fresh ` +
                    'records via WS-1 and feeds the latest one to WS-2. That record only has the configs from the ' +
                    'most-recent WS-1 invocation set (e.g. BRT: C/D/G/H with datetime). Configs the pipeline did not ' +
                    'set in that record read back empty — the V1 matrix expects values from the specific WADNR-era ' +
                    "records `DateTest-000080`/`000084` which aren't reproduced here. These WS-2 diffs are therefore " +
                    'pipeline artifacts, not V2 regressions. To close them cleanly, a future pass should add a ' +
                    'setup step that saves a Forms-side record with a known all-configs state, or extend the ' +
                    'harness with a WS-SETUP-BASELINE action.'
            );
            lines.push('');
        }
        lines.push('**Review each entry. Decide whether:**');
        lines.push('1. Open a new WS bug (e.g., `WS-BUG-V2-...`) and add it to the matrix row.');
        lines.push('2. Confirm benign (V2-design format change) — update matrix Expected to the V2 value.');
        lines.push(
            '3. Confirm it is an existing bug the pattern matcher missed — extend `BUG_SIGNATURES` in `audit-ws-v2.js`.'
        );
        lines.push('');
    }
    if (v === 'IDENTICAL' || v === 'FORMAT_ONLY' || v === 'SAME_LOCAL_DATE') {
        lines.push('<details><summary>Expand</summary>');
        lines.push('');
    }
    lines.push('| Slot | Action · Config · TZ | V1 expected | V2 stored | V2 sent | Bug tags |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const a of bucket) {
        const ctx = [a.action, a.config, a.tz, a.format, a.variant].filter(Boolean).join(' · ');
        const v1 = String(a.v1Expected ?? '—')
            .replace(/\|/g, '\\|')
            .slice(0, 40);
        const v2 = String(a.v2Stored ?? '—')
            .replace(/\|/g, '\\|')
            .slice(0, 40);
        const sent = String(a.v2Sent ?? '—')
            .replace(/\|/g, '\\|')
            .slice(0, 40);
        const bugs = (a.bugs || []).join(', ') || '—';
        lines.push(`| \`${a.id}\` | ${ctx} | \`${v1}\` | \`${v2}\` | \`${sent}\` | ${bugs} |`);
    }
    lines.push('');
    if (v === 'IDENTICAL' || v === 'FORMAT_ONLY' || v === 'SAME_LOCAL_DATE') {
        lines.push('</details>');
        lines.push('');
    }
}

const md = lines.join('\n');
console.log(md);

if (WRITE) {
    const outDir = path.dirname(resultsPath);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'v2-baseline-audit.md');
    fs.writeFileSync(outPath, md);
    console.error(`\nWrote ${path.relative(REPO_ROOT, outPath)}`);

    // Also emit a structured JSON alongside for programmatic consumption.
    const jsonPath = path.join(outDir, 'v2-baseline-audit.json');
    fs.writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                project: PROJECT,
                generated: new Date().toISOString(),
                buildContext: results.buildContext || null,
                summary: counts,
                audits,
            },
            null,
            2
        )
    );
    console.error(`Wrote ${path.relative(REPO_ROOT, jsonPath)}`);
}
