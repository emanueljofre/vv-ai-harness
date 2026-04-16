/**
 * Unit tests for rules/default-text.js
 *
 * Tests 1 rule: default-text
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('default-text rules', () => {
    describe('default-text', () => {
        it('flags FieldCheckbox with default text "Checkbox"', () => {
            const ctx = buildContext({
                fields: [{ name: 'Accept Terms', type: 'FieldCheckbox', text: 'Checkbox' }],
            });
            const findings = runRule('default-text', ctx);
            expect(findings).toHaveFindingCount('default-text', 1);
            expect(findings[0].message).toContain('Checkbox');
        });

        it('flags FieldCheckbox with text starting with "Checkbox" (e.g., "Checkbox1")', () => {
            const ctx = buildContext({
                fields: [{ name: 'CB', type: 'FieldCheckbox', text: 'Checkbox1' }],
            });
            expect(runRule('default-text', ctx)).toHaveFindingCount('default-text', 1);
        });

        it('passes for FieldCheckbox with custom text', () => {
            const ctx = buildContext({
                fields: [{ name: 'Accept Terms', type: 'FieldCheckbox', text: 'I agree to the terms' }],
            });
            expect(runRule('default-text', ctx)).toEqual([]);
        });

        it('flags UserIDStamp with default text "Signature Stamp"', () => {
            const ctx = buildContext({
                fields: [{ name: 'Approver Sig', type: 'UserIDStamp', text: 'Signature Stamp' }],
            });
            const findings = runRule('default-text', ctx);
            expect(findings).toHaveFindingCount('default-text', 1);
        });

        it('passes for UserIDStamp with custom text', () => {
            const ctx = buildContext({
                fields: [{ name: 'Approver Sig', type: 'UserIDStamp', text: 'Approver Signature' }],
            });
            expect(runRule('default-text', ctx)).toEqual([]);
        });

        it('flags FormButton with default text "Next"', () => {
            const ctx = buildContext({
                fields: [{ name: 'btnSave', type: 'FormButton', text: 'Next' }],
            });
            const findings = runRule('default-text', ctx);
            expect(findings).toHaveFindingCount('default-text', 1);
        });

        it('passes for FormButton with text "Next Step" (not exact match)', () => {
            const ctx = buildContext({
                fields: [{ name: 'btnNext', type: 'FormButton', text: 'Next Step' }],
            });
            // The pattern is /^Next$/ — exact match only
            expect(runRule('default-text', ctx)).toEqual([]);
        });

        it('passes for FormButton with custom text', () => {
            const ctx = buildContext({
                fields: [{ name: 'btnSave', type: 'FormButton', text: 'Save & Close' }],
            });
            expect(runRule('default-text', ctx)).toEqual([]);
        });

        it('skips non-applicable field types', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', text: 'Checkbox' }],
            });
            expect(runRule('default-text', ctx)).toEqual([]);
        });

        it('handles empty text gracefully', () => {
            const ctx = buildContext({
                fields: [{ name: 'CB', type: 'FieldCheckbox', text: '' }],
            });
            expect(runRule('default-text', ctx)).toEqual([]);
        });
    });
});
