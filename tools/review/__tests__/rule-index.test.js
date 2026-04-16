/**
 * Unit tests for rules/index.js
 *
 * Validates the rule registry: all rules load correctly, have required
 * metadata, and the query helpers (rulesForComponent, rulesForFieldType,
 * fieldTypeMatrix) work as expected.
 */

const allRules = require('../rules/index');
const { rulesForComponent, rulesForFieldType, fieldTypeMatrix } = require('../rules/index');

describe('rule registry', () => {
    it('loads all 49 rules', () => {
        expect(allRules).toHaveLength(49);
    });

    it('every rule has required metadata', () => {
        for (const rule of allRules) {
            expect(rule).toHaveProperty('id');
            expect(rule).toHaveProperty('name');
            expect(rule).toHaveProperty('component');
            expect(rule).toHaveProperty('severity');
            expect(rule).toHaveProperty('check');
            expect(typeof rule.id).toBe('string');
            expect(typeof rule.name).toBe('string');
            expect(typeof rule.check).toBe('function');
            expect(['error', 'warning', 'info']).toContain(rule.severity);
        }
    });

    it('every rule has a unique ID', () => {
        const ids = allRules.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every rule declares a component', () => {
        for (const rule of allRules) {
            expect(rule.component).toBe('form-templates');
        }
    });

    it('every rule declares appliesTo', () => {
        for (const rule of allRules) {
            expect(rule).toHaveProperty('appliesTo');
            const valid = rule.appliesTo === '*' || rule.appliesTo === 'template' || Array.isArray(rule.appliesTo);
            expect(valid).toBe(true);
        }
    });
});

describe('rulesForComponent', () => {
    it('returns all rules for form-templates', () => {
        const rules = rulesForComponent('form-templates');
        expect(rules.length).toBe(49);
    });

    it('returns empty for unknown component', () => {
        expect(rulesForComponent('dashboards')).toEqual([]);
    });
});

describe('rulesForFieldType', () => {
    it('returns rules applicable to FieldTextbox3', () => {
        const rules = rulesForFieldType('FieldTextbox3');
        expect(rules.length).toBeGreaterThan(0);

        const ids = rules.map((r) => r.id);
        expect(ids).toContain('title-case');
        expect(ids).toContain('accessibility-label');
    });

    it('excludes template-level rules', () => {
        const rules = rulesForFieldType('FieldTextbox3');
        const ids = rules.map((r) => r.id);
        // Template-level rules (like script-orphan-assignment) should not appear
        const templateRules = allRules.filter((r) => r.appliesTo === 'template');
        for (const tr of templateRules) {
            expect(ids).not.toContain(tr.id);
        }
    });

    it('includes wildcard rules', () => {
        const rules = rulesForFieldType('FieldTextbox3');
        const ids = rules.map((r) => r.id);
        const wildcardRules = allRules.filter((r) => r.appliesTo === '*');
        for (const wr of wildcardRules) {
            expect(ids).toContain(wr.id);
        }
    });
});

describe('fieldTypeMatrix', () => {
    it('returns an object mapping field types to rule IDs', () => {
        const matrix = fieldTypeMatrix();
        expect(typeof matrix).toBe('object');
        expect(Object.keys(matrix).length).toBeGreaterThan(0);
    });

    it('includes known field types', () => {
        const matrix = fieldTypeMatrix();
        expect(matrix).toHaveProperty('FieldTextbox3');
        expect(matrix).toHaveProperty('FieldCalendar3');
    });

    it('maps field types to arrays of rule IDs', () => {
        const matrix = fieldTypeMatrix();
        for (const [, ruleIds] of Object.entries(matrix)) {
            expect(Array.isArray(ruleIds)).toBe(true);
            expect(ruleIds.length).toBeGreaterThan(0);
            for (const id of ruleIds) {
                expect(typeof id).toBe('string');
            }
        }
    });

    it('excludes wildcard and template-level rules', () => {
        const matrix = fieldTypeMatrix();
        const wildcardIds = allRules.filter((r) => r.appliesTo === '*').map((r) => r.id);
        const templateIds = allRules.filter((r) => r.appliesTo === 'template').map((r) => r.id);
        for (const ruleIds of Object.values(matrix)) {
            for (const wId of wildcardIds) {
                expect(ruleIds).not.toContain(wId);
            }
            for (const tId of templateIds) {
                expect(ruleIds).not.toContain(tId);
            }
        }
    });
});
