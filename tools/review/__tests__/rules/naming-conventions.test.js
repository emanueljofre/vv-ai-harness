/**
 * Unit tests for rules/naming-conventions.js
 *
 * Tests 1 rule: button-label-camelcase
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('naming-conventions rules', () => {
    describe('button-label-camelcase', () => {
        // --- FormButton ---

        it('passes for buttons with "btn" prefix', () => {
            const ctx = buildContext({
                fields: [{ name: 'btnSaveAndClose', type: 'FormButton' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });

        it('flags buttons without "btn" prefix', () => {
            const ctx = buildContext({
                fields: [{ name: 'Save Button', type: 'FormButton' }],
            });
            const findings = runRule('button-label-camelcase', ctx);
            expect(findings).toHaveFindingCount('button-label-camelcase', 1);
            expect(findings[0].message).toContain('btn');
            expect(findings[0].message).toContain('Button');
        });

        it('flags buttons named just "Submit"', () => {
            const ctx = buildContext({
                fields: [{ name: 'Submit', type: 'FormButton' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toHaveFindingCount('button-label-camelcase', 1);
        });

        // --- FieldLabel ---

        it('passes for labels with "lbl" prefix', () => {
            const ctx = buildContext({
                fields: [{ name: 'lblSectionHeader', type: 'FieldLabel' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });

        it('flags labels without "lbl" prefix', () => {
            const ctx = buildContext({
                fields: [{ name: 'Section Header', type: 'FieldLabel' }],
            });
            const findings = runRule('button-label-camelcase', ctx);
            expect(findings).toHaveFindingCount('button-label-camelcase', 1);
            expect(findings[0].message).toContain('lbl');
            expect(findings[0].message).toContain('Label');
        });

        // --- Skips ---

        it('skips default label names (Label1, Label2)', () => {
            const ctx = buildContext({
                fields: [{ name: 'Label1', type: 'FieldLabel' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });

        it('skips default DataField names on labels', () => {
            const ctx = buildContext({
                fields: [{ name: 'DataField1', type: 'FieldLabel' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });

        it('skips empty names', () => {
            const ctx = buildContext({
                fields: [{ name: '', type: 'FormButton' }],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });

        it('skips non-applicable field types', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Not A Button', type: 'FieldTextbox3' },
                    { name: 'Also Not', type: 'FieldCheckbox' },
                ],
            });
            expect(runRule('button-label-camelcase', ctx)).toEqual([]);
        });
    });
});
