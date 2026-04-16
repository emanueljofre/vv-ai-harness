/**
 * Unit tests for rules/accessibility.js
 *
 * Tests both accessibility rules:
 *   accessibility-label, accessibility-required
 */

const { loadFixture, buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('accessibility rules', () => {
    // ------------------------------------------------------------------
    // accessibility-label
    // ------------------------------------------------------------------
    describe('accessibility-label', () => {
        it('flags fields missing AccessibilityLabel', () => {
            const ctx = buildContext({
                fields: [{ name: 'Phone', type: 'FieldTextbox3', accessibilityLabel: '' }],
            });
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'accessibility-label', field: 'Phone' });
        });

        it('passes for fields with AccessibilityLabel', () => {
            const ctx = buildContext({
                fields: [{ name: 'Phone', type: 'FieldTextbox3', accessibilityLabel: 'Phone number' }],
            });
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toEqual([]);
        });

        it('skips field types that do not need accessibility labels', () => {
            const ctx = buildContext({
                fields: [{ name: 'My Label', type: 'FieldLabel', accessibilityLabel: '' }],
            });
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toEqual([]);
        });

        it('applies to FieldSlider', () => {
            const ctx = buildContext({
                fields: [{ name: 'Priority', type: 'FieldSlider', accessibilityLabel: '' }],
            });
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'accessibility-label', field: 'Priority' });
        });

        it('detects missing labels in the accessibility fixture', () => {
            const ctx = loadFixture('accessibility-violations');
            const findings = runRule('accessibility-label', ctx);
            // Phone (field2) has empty accessibility label
            expect(findings).toContainFindingMatch({ field: 'Phone' });
        });

        it('returns no findings for the minimal template (all have labels)', () => {
            const ctx = loadFixture('minimal-template');
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toEqual([]);
        });

        it('returns no findings for the empty template', () => {
            const ctx = loadFixture('empty-template');
            const findings = runRule('accessibility-label', ctx);
            expect(findings).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // accessibility-required
    // ------------------------------------------------------------------
    describe('accessibility-required', () => {
        it('flags required fields without "field Required" in label', () => {
            // Required field: nearby label has asterisk, but accessibility label missing "field Required"
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Label Email',
                        type: 'FieldLabel',
                        id: 'lbl1',
                        layoutLeft: 50,
                        layoutTop: 50,
                        width: 80,
                        text: 'Email *',
                    },
                    {
                        name: 'Email',
                        type: 'FieldTextbox3',
                        id: 'field1',
                        layoutLeft: 140,
                        layoutTop: 50,
                        width: 200,
                        accessibilityLabel: 'Email',
                    },
                ],
            });
            const findings = runRule('accessibility-required', ctx);
            expect(findings).toContainFindingMatch({
                ruleId: 'accessibility-required',
                field: 'Email',
            });
        });

        it('passes when accessibility label includes "field Required"', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Label Email',
                        type: 'FieldLabel',
                        id: 'lbl1',
                        layoutLeft: 50,
                        layoutTop: 50,
                        width: 80,
                        text: 'Email *',
                    },
                    {
                        name: 'Email',
                        type: 'FieldTextbox3',
                        id: 'field1',
                        layoutLeft: 140,
                        layoutTop: 50,
                        width: 200,
                        accessibilityLabel: 'Email field Required',
                    },
                ],
            });
            const findings = runRule('accessibility-required', ctx);
            expect(findings).toEqual([]);
        });

        it('skips fields without accessibility label (caught by other rule)', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Label',
                        type: 'FieldLabel',
                        layoutLeft: 50,
                        layoutTop: 50,
                        width: 80,
                        text: 'Name *',
                    },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 50,
                        accessibilityLabel: '',
                    },
                ],
            });
            const findings = runRule('accessibility-required', ctx);
            expect(findings).toEqual([]);
        });

        it('handles self-labeled checkbox with asterisk', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Agree',
                        type: 'FieldCheckbox',
                        text: 'I agree *',
                        accessibilityLabel: 'Agree to terms',
                    },
                ],
            });
            const findings = runRule('accessibility-required', ctx);
            expect(findings).toContainFindingMatch({
                ruleId: 'accessibility-required',
                field: 'Agree',
            });
        });

        it('detects violations in the accessibility fixture', () => {
            const ctx = loadFixture('accessibility-violations');
            const findings = runRule('accessibility-required', ctx);
            // Email has nearby label with asterisk but no "field Required"
            expect(findings).toContainFindingMatch({ field: 'Email' });
            // Checkbox has asterisk in own text
            expect(findings).toContainFindingMatch({ field: 'Agree to Terms' });
        });
    });
});
