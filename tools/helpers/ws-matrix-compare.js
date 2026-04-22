/**
 * Shared matrix-compare logic for WS regression pipelines and tools.
 *
 * Consumed by:
 *   - testing/pipelines/run-ws-regression.js   (stamps status: passed/failed at write time)
 *   - tools/generators/generate-ws-artifacts.js (reuses stamped status, falls back for old JSONs)
 *
 * The WS matrix (research/date-handling/web-services/matrix.md) is the single source of truth
 * for expected stored values. This module:
 *   (a) parses that matrix into a Map<tcId, { expectedStored, status, bugs }>, and
 *   (b) classifies a regression-result row against that map into 'passed'/'failed'/'unknown'.
 *
 * Keys are lowercased to match buildWsSlotId() output (see tools/helpers/ws-slot-id.js).
 */
const fs = require('fs');
const { buildWsSlotId } = require('./ws-slot-id');

/**
 * Strip markdown backtick wrapping and wrapping quotes:
 *   `"value"` → "value" → value
 * Returns the input unchanged if falsy.
 */
function stripBackticks(s) {
    if (!s) return s;
    let clean = String(s)
        .replace(/^`+|`+$/g, '')
        .trim();
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    return clean;
}

/**
 * Parse the `Bugs` column into an array of bug tokens.
 * Matrix uses `#7` shorthand or `WS-BUG-N` / `FORM-BUG-N`.
 */
function parseBugs(s) {
    if (!s || s === '—' || s === '-') return [];
    const tokens = String(s).match(/(?:WS-BUG-\d+|FORM-BUG-\d+|#\d+)/gi) || [];
    return tokens.map((t) => t.toUpperCase());
}

/**
 * Parse matrix.md and return Map<tcId, { expectedStored, status, bugs }>.
 *
 * Strategy: walk each markdown table, find a header column matching one of
 * COLUMN_MATCHERS (in preference order), then extract that column's value for
 * every data row. TC ID is column 1.
 *
 * Column preference: WS tables are inconsistent —
 *   WS-1  → "Expected Stored"
 *   WS-2  → "Expected API Return"     (beats "Forms Stored Value")
 *   WS-3  → "Cycle 2 Read"
 *   WS-9  → plain "Stored"
 * Try in order so the more specific column wins.
 *
 * Keys are lowercased to match buildWsSlotId() output.
 */
function parseMatrixExpected(matrixPath) {
    const content = fs.readFileSync(matrixPath, 'utf8');
    const lines = content.split('\n');
    const out = new Map();

    const COLUMN_MATCHERS = [/expected/i, /cycle\s*2/i, /^stored$/i];

    let expectedColIdx = -1;
    let statusColIdx = -1;
    let bugsColIdx = -1;
    let inTable = false;

    for (const line of lines) {
        // Detect header row when not inside a table
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

        // Skip separator rows
        if (inTable && line.startsWith('|') && line.includes('---')) continue;

        // Parse data rows
        if (inTable && line.startsWith('|')) {
            const cols = line.split('|').map((c) => c.trim());
            const testId = stripBackticks(cols[1]);
            if (!testId || /^-+$/.test(testId) || /^ID$/i.test(testId)) continue;

            const expectedRaw = expectedColIdx >= 0 ? cols[expectedColIdx] : null;
            const statusRaw = statusColIdx >= 0 ? cols[statusColIdx] : null;
            const bugsRaw = bugsColIdx >= 0 ? cols[bugsColIdx] : null;

            if (expectedRaw && testId) {
                out.set(testId.toLowerCase(), {
                    expectedStored: stripBackticks(expectedRaw),
                    status: (statusRaw || 'PENDING').trim(),
                    bugs: parseBugs(bugsRaw),
                });
            }
        }

        // Exit the table on any non-table line so we don't mis-parse the next
        // table's header as a data row under stale column indices.
        if (inTable && !line.startsWith('|') && line.trim() !== '') {
            inTable = false;
            expectedColIdx = -1;
            statusColIdx = -1;
            bugsColIdx = -1;
        }
    }

    return out;
}

/**
 * Per-action comparators. Each takes `(row, expectedStored)` and returns a
 * boolean pass verdict. The default (used by WS-1/2/3/5/7/9/10) is plain
 * string equality of `stored` against the matrix Expected — same behavior as
 * before the per-action dispatch was introduced.
 *
 * Extending: add a new entry here keyed by action name. Keep the default as
 * the fallback so existing actions keep working.
 *
 * WS-6 (empty/null handling): success is semantic — "the field came back
 * empty after the write". The matrix Expected is free-form (`"" or null`,
 * `Cleared`), so we tolerate any phrasing containing `cleared`, `null`, or
 * `empty` and compare against the harness `cleared` boolean.
 *
 * WS-8 (query filtering): success is semantic — "the query returned the
 * expected number of matches". The matrix Expected is `Match` or `No match`.
 * Harness emits a `matched` boolean; we compare against that.
 */
const ACTION_COMPARATORS = {
    'WS-6': (row, expectedStored) => {
        // Matrix Expected is one of: `"" or null`, `Cleared`, `"undefined"` (lit).
        // Any phrasing implying "empty" → expect `cleared === true`.
        const exp = String(expectedStored || '').toLowerCase();
        const expectsCleared = /cleared|null|^""\s*or\s*null|empty/.test(exp) || exp === '""' || exp === '';
        // `"undefined"` (literal-string) slots expect the field to NOT be
        // stored as a literal string — the record comes back null, i.e.
        // cleared. Treat it the same as the other "should be empty" variants.
        const expectsUndefinedLiteral = /undefined/.test(exp);
        const shouldBeCleared = expectsCleared || expectsUndefinedLiteral;
        return shouldBeCleared ? row.cleared === true : false;
    },
    'WS-8': (row, expectedStored) => {
        const exp = String(expectedStored || '').toLowerCase();
        if (/^no\s*match/.test(exp)) return row.matched === false;
        if (/^match/.test(exp)) return row.matched === true;
        // Format-mismatch rows use `"undefined"` — the matrix flags them as
        // "record the result, don't judge". Treat as unknown by returning
        // null so the caller can downgrade to `unknown` rather than `failed`.
        return null;
    },
};

/**
 * Classify a regression-result row against the matrix.
 *
 * Returns `{ status, expectedStored, matrixStatus }`:
 *   - 'passed'  — row meets matrix Expected (per-action comparator)
 *   - 'failed'  — row differs from matrix Expected
 *   - 'unknown' — row's tcId isn't in the matrix (NOT_IN_MATRIX),
 *                 or the action's comparator declined to judge (e.g. WS-8
 *                 format-mismatch slots)
 *
 * Per-action dispatch on `row.action`. Falls back to the default `stored`
 * string-equality for actions with no entry in ACTION_COMPARATORS.
 */
function classifyRow(row, expectedMap) {
    const tcId = row.tcId || buildWsSlotId(row);
    if (!tcId) return { status: 'unknown', expectedStored: null, matrixStatus: null };
    const expected = expectedMap.get(String(tcId).toLowerCase());
    if (!expected) {
        return { status: 'unknown', expectedStored: null, matrixStatus: null };
    }

    const comparator = ACTION_COMPARATORS[row.action];
    let passed;
    if (comparator) {
        passed = comparator(row, expected.expectedStored);
        if (passed === null) {
            return {
                status: 'unknown',
                expectedStored: expected.expectedStored,
                matrixStatus: expected.status,
            };
        }
    } else {
        // Default: straight string equality of `stored` against matrix Expected.
        // Matches the pre-dispatch behavior used by WS-1/2/3/5/7/9/10.
        const actualStored = stripBackticks(String(row.stored ?? 'null'));
        passed = actualStored === expected.expectedStored;
    }

    return {
        status: passed ? 'passed' : 'failed',
        expectedStored: expected.expectedStored,
        matrixStatus: expected.status,
    };
}

module.exports = {
    parseMatrixExpected,
    classifyRow,
    stripBackticks,
    parseBugs,
    ACTION_COMPARATORS,
};
