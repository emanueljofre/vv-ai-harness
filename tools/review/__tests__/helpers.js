/**
 * Test helpers for the standards-review tool suite.
 *
 * Provides:
 *   - loadFixture()      — parse an XML fixture into a review context
 *   - buildContext()      — build a context from inline field/script/group data
 *   - runRule()           — run a single rule by ID against a context
 *   - findingMatchers     — custom Jest matchers for asserting on findings
 */

const path = require('path');
const { parseTemplate } = require('../lib/parse-template');
const allRules = require('../rules/index');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

/**
 * Parse a named XML fixture into a review context.
 * @param {string} name - Fixture filename (with or without .xml extension)
 * @returns {Object} Parsed context object (fields, scripts, groups, etc.)
 */
function loadFixture(name) {
    const filename = name.endsWith('.xml') ? name : `${name}.xml`;
    return parseTemplate(path.join(FIXTURES_DIR, filename));
}

// ---------------------------------------------------------------------------
// Inline context builder
// ---------------------------------------------------------------------------

/**
 * Build a minimal review context from inline data.
 * Useful when you need a context with specific field configurations
 * without creating a full XML fixture.
 *
 * @param {Object} opts
 * @param {Array}  [opts.fields]       - Array of field objects
 * @param {Array}  [opts.scripts]      - Array of script objects
 * @param {Array}  [opts.assignments]  - Array of assignment objects
 * @param {Array}  [opts.groups]       - Array of group objects
 * @param {Array}  [opts.pages]        - Array of page objects
 * @param {string} [opts.templateName] - Template name (default: 'test-template')
 * @returns {Object} Context object matching parseTemplate() output shape
 */
function buildContext(opts = {}) {
    const pages = opts.pages || [{ index: 0, id: 'page1', name: 'Page 1', width: 800, height: 600 }];

    const fields = (opts.fields || []).map((f, i) => ({
        name: f.name ?? '',
        id: f.id ?? `field${i + 1}`,
        type: f.type ?? 'FieldTextbox3',
        pageIndex: f.pageIndex ?? 0,
        pageName: f.pageName ?? pages[0].name,
        containerId: f.containerId ?? '',
        layoutLeft: f.layoutLeft ?? 100,
        layoutTop: f.layoutTop ?? 50 + i * 50,
        width: f.width ?? 200,
        tabOrder: f.tabOrder ?? i + 1,
        accessibilityLabel: f.accessibilityLabel ?? '',
        text: f.text ?? '',
        zOrder: f.zOrder ?? i + 1,
        enableTime: f.enableTime ?? false,
        ignoreTimezone: f.ignoreTimezone ?? false,
        useLegacy: f.useLegacy ?? false,
        responsiveFlow: f.responsiveFlow ?? '',
        displayUploadedFiles: f.displayUploadedFiles ?? '',
        _raw: f._raw ?? {},
    }));

    const controlMap = new Map();
    for (const f of fields) {
        controlMap.set(f.id, { name: f.name, type: f.type, pageIndex: f.pageIndex });
    }

    return {
        doc: {},
        fields,
        pages,
        scripts: opts.scripts || [],
        assignments: opts.assignments || [],
        groups: opts.groups || [],
        controlMap,
        templateName: opts.templateName || 'test-template',
    };
}

// ---------------------------------------------------------------------------
// Rule runner
// ---------------------------------------------------------------------------

/**
 * Run a single rule by ID against a context and return its findings.
 * Throws if the rule ID is not found in the registry.
 *
 * @param {string} ruleId  - Rule ID (e.g., 'title-case', 'accessibility-label')
 * @param {Object} context - Review context from loadFixture() or buildContext()
 * @returns {Array} Array of finding objects
 */
function runRule(ruleId, context) {
    const rule = allRules.find((r) => r.id === ruleId);
    if (!rule) {
        throw new Error(`Rule "${ruleId}" not found. Available: ${allRules.map((r) => r.id).join(', ')}`);
    }
    return rule.check(context);
}

/**
 * Run all rules against a context and return findings grouped by rule ID.
 *
 * @param {Object} context - Review context
 * @returns {Object} Map of ruleId → findings array
 */
function runAllRules(context) {
    const result = {};
    for (const rule of allRules) {
        result[rule.id] = rule.check(context);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Custom Jest matchers
// ---------------------------------------------------------------------------

/**
 * Register custom matchers. Call once in a test file or in a setup file:
 *   expect.extend(findingMatchers);
 */
const findingMatchers = {
    /**
     * Assert that findings contain at least one finding for a given rule ID.
     * Usage: expect(findings).toContainFinding('title-case')
     */
    toContainFinding(received, ruleId) {
        const match = received.some((f) => f.ruleId === ruleId);
        return {
            pass: match,
            message: () =>
                match
                    ? `Expected findings NOT to contain rule "${ruleId}", but it was found`
                    : `Expected findings to contain rule "${ruleId}", but it was not found.\nFound rules: ${[...new Set(received.map((f) => f.ruleId))].join(', ') || '(none)'}`,
        };
    },

    /**
     * Assert that findings contain a finding matching a partial object.
     * Usage: expect(findings).toContainFindingMatch({ ruleId: 'title-case', field: 'firstName' })
     */
    toContainFindingMatch(received, partial) {
        const match = received.some((f) => Object.entries(partial).every(([k, v]) => f[k] === v));
        return {
            pass: match,
            message: () =>
                match
                    ? `Expected findings NOT to contain a match for ${JSON.stringify(partial)}`
                    : `Expected findings to contain a match for ${JSON.stringify(partial)}.\nActual findings:\n${received.map((f) => `  ${JSON.stringify(f)}`).join('\n') || '  (none)'}`,
        };
    },

    /**
     * Assert the exact count of findings for a given rule ID.
     * Usage: expect(findings).toHaveFindingCount('title-case', 3)
     */
    toHaveFindingCount(received, ruleId, expectedCount) {
        const actual = received.filter((f) => f.ruleId === ruleId).length;
        return {
            pass: actual === expectedCount,
            message: () => `Expected ${expectedCount} finding(s) for rule "${ruleId}", but found ${actual}`,
        };
    },
};

module.exports = {
    loadFixture,
    buildContext,
    runRule,
    runAllRules,
    findingMatchers,
    FIXTURES_DIR,
};
