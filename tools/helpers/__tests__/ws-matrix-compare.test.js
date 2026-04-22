/**
 * Unit tests for tools/helpers/ws-matrix-compare.js
 *
 * Covers:
 *   - Default per-action comparator (string-equality on `stored`).
 *   - WS-6 `cleared`-based comparator (empty/null handling).
 *   - WS-8 `matched`-based comparator (query filter verdict).
 *   - Unknown rows (tcId not in matrix) and comparators that decline to judge.
 */

const { classifyRow, ACTION_COMPARATORS, stripBackticks, parseBugs } = require('../ws-matrix-compare');

// Minimal in-memory Map that mirrors what parseMatrixExpected returns.
function buildExpected(entries) {
    const map = new Map();
    for (const [tcId, payload] of Object.entries(entries)) {
        map.set(tcId.toLowerCase(), {
            expectedStored: payload.expectedStored,
            status: payload.status || 'PASS',
            bugs: payload.bugs || [],
        });
    }
    return map;
}

describe('stripBackticks', () => {
    it('strips wrapping backticks and quotes', () => {
        expect(stripBackticks('`"2026-03-15"`')).toBe('2026-03-15');
        expect(stripBackticks('`null`')).toBe('null');
        expect(stripBackticks('plain')).toBe('plain');
    });

    it('returns falsy input unchanged', () => {
        expect(stripBackticks('')).toBe('');
        expect(stripBackticks(null)).toBe(null);
        expect(stripBackticks(undefined)).toBe(undefined);
    });
});

describe('parseBugs', () => {
    it('extracts WS-BUG, FORM-BUG, and #N tokens', () => {
        expect(parseBugs('WS-BUG-2, #7')).toEqual(['WS-BUG-2', '#7']);
        expect(parseBugs('FORM-BUG-5')).toEqual(['FORM-BUG-5']);
        expect(parseBugs('—')).toEqual([]);
        expect(parseBugs('')).toEqual([]);
    });
});

describe('classifyRow — default comparator (WS-1/2/3/5/7/9/10)', () => {
    const expected = buildExpected({
        'ws-1-a-iso': { expectedStored: '2026-03-15T00:00:00Z' },
    });

    it('passes when stored matches matrix Expected', () => {
        const verdict = classifyRow(
            { tcId: 'ws-1-a-iso', action: 'WS-1', stored: '2026-03-15T00:00:00Z' },
            expected
        );
        expect(verdict.status).toBe('passed');
        expect(verdict.expectedStored).toBe('2026-03-15T00:00:00Z');
    });

    it('fails when stored differs', () => {
        const verdict = classifyRow({ tcId: 'ws-1-a-iso', action: 'WS-1', stored: 'other' }, expected);
        expect(verdict.status).toBe('failed');
    });

    it('returns unknown when tcId absent from matrix', () => {
        const verdict = classifyRow({ tcId: 'ws-1-a-missing', action: 'WS-1', stored: 'x' }, expected);
        expect(verdict.status).toBe('unknown');
    });
});

describe('classifyRow — WS-6 comparator (empty/null handling)', () => {
    const expected = buildExpected({
        'ws-6-a-empty': { expectedStored: '"" or null' },
        'ws-6-a-null': { expectedStored: '"" or null' },
        'ws-6-a-strnull': { expectedStored: '"undefined"' },
        'ws-6-a-clearupd': { expectedStored: 'Cleared' },
    });

    it('passes when cleared=true and matrix expects empty/null', () => {
        const verdict = classifyRow(
            { tcId: 'ws-6-a-empty', action: 'WS-6', cleared: true, stored: null },
            expected
        );
        expect(verdict.status).toBe('passed');
        expect(verdict.expectedStored).toBe('"" or null');
    });

    it('passes when cleared=true and matrix says "Cleared"', () => {
        const verdict = classifyRow(
            { tcId: 'ws-6-a-clearupd', action: 'WS-6', cleared: true, stored: null },
            expected
        );
        expect(verdict.status).toBe('passed');
    });

    it('passes when cleared=true and matrix says `"undefined"` (literal-not-stored)', () => {
        const verdict = classifyRow(
            { tcId: 'ws-6-a-strnull', action: 'WS-6', cleared: true, stored: null },
            expected
        );
        expect(verdict.status).toBe('passed');
    });

    it('fails when cleared=false but matrix expected empty', () => {
        const verdict = classifyRow(
            { tcId: 'ws-6-a-empty', action: 'WS-6', cleared: false, stored: 'surprise' },
            expected
        );
        expect(verdict.status).toBe('failed');
    });

    it('fails when cleared is undefined (missing discriminator)', () => {
        const verdict = classifyRow({ tcId: 'ws-6-a-null', action: 'WS-6', stored: null }, expected);
        expect(verdict.status).toBe('failed');
    });
});

describe('classifyRow — WS-8 comparator (query verdict)', () => {
    const expected = buildExpected({
        'ws-8-a-eq': { expectedStored: 'Match' },
        'ws-8-a-nomatch': { expectedStored: 'No match' },
        'ws-8-a-fmtus': { expectedStored: '"undefined"' },
    });

    it('passes when matched=true and matrix expects Match', () => {
        const verdict = classifyRow(
            { tcId: 'ws-8-a-eq', action: 'WS-8', matched: true, matchCount: 1 },
            expected
        );
        expect(verdict.status).toBe('passed');
    });

    it('passes when matched=false and matrix expects No match', () => {
        const verdict = classifyRow(
            { tcId: 'ws-8-a-nomatch', action: 'WS-8', matched: false, matchCount: 0 },
            expected
        );
        expect(verdict.status).toBe('passed');
    });

    it('fails when matched contradicts matrix expected', () => {
        const verdict = classifyRow(
            { tcId: 'ws-8-a-eq', action: 'WS-8', matched: false },
            expected
        );
        expect(verdict.status).toBe('failed');
    });

    it('returns unknown for format-mismatch slots (matrix `"undefined"`)', () => {
        const verdict = classifyRow(
            { tcId: 'ws-8-a-fmtus', action: 'WS-8', matched: true },
            expected
        );
        expect(verdict.status).toBe('unknown');
        // Matrix metadata still surfaced so the caller can report it.
        expect(verdict.expectedStored).toBe('"undefined"');
    });
});

describe('ACTION_COMPARATORS registry', () => {
    it('exposes WS-6 and WS-8 entries', () => {
        expect(typeof ACTION_COMPARATORS['WS-6']).toBe('function');
        expect(typeof ACTION_COMPARATORS['WS-8']).toBe('function');
    });

    it('does NOT register default actions (they use the fallback)', () => {
        expect(ACTION_COMPARATORS['WS-1']).toBeUndefined();
        expect(ACTION_COMPARATORS['WS-7']).toBeUndefined();
    });
});
