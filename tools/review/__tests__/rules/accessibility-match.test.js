/**
 * Unit tests for rules/accessibility-match.js
 *
 * Tests 1 rule: accessibility-label-match
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('accessibility-match rules', () => {
    describe('accessibility-label-match', () => {
        // --- Label-based inputs ---

        it('passes when accessibility label matches the nearest label text', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl Name', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Name' },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Name',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('flags when accessibility label does not match label text', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'lbl Name',
                        type: 'FieldLabel',
                        layoutLeft: 50,
                        layoutTop: 100,
                        width: 80,
                        text: 'Full Name',
                    },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Name',
                    },
                ],
            });
            const findings = runRule('accessibility-label-match', ctx);
            expect(findings).toHaveFindingCount('accessibility-label-match', 1);
            expect(findings[0].message).toContain('Full Name');
        });

        it('is case-insensitive for matching', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Email' },
                    {
                        name: 'Email',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'email',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('strips trailing colon from label text before comparing', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Name:' },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Name',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('strips HTML from label text before comparing', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Email<br/>' },
                    {
                        name: 'Email',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Email',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('strips "field Required" suffix from accessibility label before comparing', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Email' },
                    {
                        name: 'Email',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Email field Required',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('skips fields with empty accessibility label (caught by other rule)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Name' },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: '',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('skips when no nearby label is found', () => {
            // Label is too far away (gap > 60px)
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 50, text: 'Name' },
                    {
                        name: 'Name',
                        type: 'FieldTextbox3',
                        layoutLeft: 300,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Wrong',
                    },
                ],
            });
            // No label within proximity → no comparison → no finding
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('picks the closest label when multiple are nearby', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'far lbl',
                        type: 'FieldLabel',
                        layoutLeft: 50,
                        layoutTop: 100,
                        width: 50,
                        text: 'Far Label',
                    },
                    {
                        name: 'near lbl',
                        type: 'FieldLabel',
                        layoutLeft: 120,
                        layoutTop: 100,
                        width: 50,
                        text: 'Near Label',
                    },
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        layoutLeft: 180,
                        layoutTop: 100,
                        width: 200,
                        accessibilityLabel: 'Near Label',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        // --- Self-labeled types ---

        it('passes for checkbox with matching accessibility label and text', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'CB1',
                        type: 'FieldCheckbox',
                        text: 'I agree to the terms',
                        accessibilityLabel: 'I agree to the terms',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('flags checkbox with mismatched accessibility label', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'CB1',
                        type: 'FieldCheckbox',
                        text: 'Accept Terms',
                        accessibilityLabel: 'Something Else',
                    },
                ],
            });
            const findings = runRule('accessibility-label-match', ctx);
            expect(findings).toHaveFindingCount('accessibility-label-match', 1);
        });

        it('handles FormButton as self-labeled', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnSave',
                        type: 'FormButton',
                        text: 'Save',
                        accessibilityLabel: 'Save',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('handles UploadButton as self-labeled', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Upload',
                        type: 'UploadButton',
                        text: 'Upload Document',
                        accessibilityLabel: 'Upload Files',
                    },
                ],
            });
            const findings = runRule('accessibility-label-match', ctx);
            expect(findings).toHaveFindingCount('accessibility-label-match', 1);
        });

        it('skips self-labeled types with empty text', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'CB',
                        type: 'FieldCheckbox',
                        text: '',
                        accessibilityLabel: 'Something',
                    },
                ],
            });
            // No expected text → skip comparison
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        // --- Vertical tolerance ---

        it('matches labels within 15px vertical tolerance', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Name' },
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 115,
                        width: 200,
                        accessibilityLabel: 'Name',
                    },
                ],
            });
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });

        it('does not match labels beyond 15px vertical tolerance', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80, text: 'Name' },
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        layoutLeft: 140,
                        layoutTop: 120,
                        width: 200,
                        accessibilityLabel: 'Wrong',
                    },
                ],
            });
            // 20px diff > 15px tolerance → no label match → no finding
            expect(runRule('accessibility-label-match', ctx)).toEqual([]);
        });
    });
});
