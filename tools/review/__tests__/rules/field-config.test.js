/**
 * Unit tests for rules/field-config.js
 *
 * Tests 2 rules: listener-disabled, field-max-length
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('field-config rules', () => {
    // ------------------------------------------------------------------
    // listener-disabled
    // ------------------------------------------------------------------
    describe('listener-disabled', () => {
        it('flags fields with EnableQListener enabled', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'First Name',
                        type: 'FieldTextbox3',
                        _raw: { EnableQListener: 'true' },
                    },
                ],
            });
            const findings = runRule('listener-disabled', ctx);
            expect(findings).toHaveFindingCount('listener-disabled', 1);
            expect(findings[0].severity).toBe('info');
            expect(findings[0].message).toContain('EnableQListener');
        });

        it('passes when EnableQListener is false', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'First Name',
                        type: 'FieldTextbox3',
                        _raw: { EnableQListener: 'false' },
                    },
                ],
            });
            expect(runRule('listener-disabled', ctx)).toEqual([]);
        });

        it('passes when EnableQListener is not set', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'First Name',
                        type: 'FieldTextbox3',
                        _raw: {},
                    },
                ],
            });
            expect(runRule('listener-disabled', ctx)).toEqual([]);
        });

        it('checks all applicable field types', () => {
            const types = [
                'FieldTextbox3',
                'FieldTextArea3',
                'FieldCalendar3',
                'FieldDropDownList3',
                'FieldCheckbox',
                'CellField',
            ];
            const ctx = buildContext({
                fields: types.map((type, i) => ({
                    name: `F${i}`,
                    type,
                    _raw: { EnableQListener: 'true' },
                })),
            });
            const findings = runRule('listener-disabled', ctx);
            expect(findings).toHaveLength(types.length);
        });

        it('skips non-applicable field types', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Upload',
                        type: 'UploadButton',
                        _raw: { EnableQListener: 'true' },
                    },
                ],
            });
            expect(runRule('listener-disabled', ctx)).toEqual([]);
        });

        it('handles boolean true value (not just string)', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        _raw: { EnableQListener: true },
                    },
                ],
            });
            expect(runRule('listener-disabled', ctx)).toHaveFindingCount('listener-disabled', 1);
        });
    });

    // ------------------------------------------------------------------
    // field-max-length
    // ------------------------------------------------------------------
    describe('field-max-length', () => {
        // --- TextArea ---

        it('flags TextArea with MaxLength below 3000', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Notes',
                        type: 'FieldTextArea3',
                        _raw: { Length: 500 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings).toHaveFindingCount('field-max-length', 1);
            expect(findings[0].message).toContain('500');
            expect(findings[0].message).toContain('3000');
        });

        it('passes TextArea with MaxLength >= 3000', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Notes',
                        type: 'FieldTextArea3',
                        _raw: { Length: 3000 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        it('skips TextArea with Length 0 (platform default)', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Notes',
                        type: 'FieldTextArea3',
                        _raw: { Length: 0 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        // --- Name pattern matching ---

        it('flags name fields with MaxLength below 100', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'First Name',
                        type: 'FieldTextbox3',
                        _raw: { Length: 50 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings).toHaveFindingCount('field-max-length', 1);
            expect(findings[0].message).toContain('name field');
            expect(findings[0].message).toContain('100');
        });

        it('passes name fields with MaxLength >= 100', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Last Name',
                        type: 'FieldTextbox3',
                        _raw: { Length: 100 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        it('flags address fields with MaxLength below 300', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Street Address',
                        type: 'FieldTextbox3',
                        _raw: { Length: 100 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings).toHaveFindingCount('field-max-length', 1);
            expect(findings[0].message).toContain('address field');
            expect(findings[0].message).toContain('300');
        });

        it('flags notes/comments fields with MaxLength below 3000', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Reviewer Comments',
                        type: 'FieldTextbox3',
                        _raw: { Length: 500 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings).toHaveFindingCount('field-max-length', 1);
            expect(findings[0].message).toContain('notes field');
            expect(findings[0].message).toContain('3000');
        });

        it('detects various notes keywords: description, remarks, narrative, explanation', () => {
            const keywords = ['Description', 'Remarks', 'Narrative', 'Explanation'];
            for (const kw of keywords) {
                const ctx = buildContext({
                    fields: [
                        {
                            name: kw,
                            type: 'FieldTextbox3',
                            _raw: { Length: 100 },
                        },
                    ],
                });
                const findings = runRule('field-max-length', ctx);
                expect(findings).toHaveFindingCount('field-max-length', 1);
            }
        });

        // --- Default length for unmatched fields ---

        it('flags unmatched textbox fields with MaxLength below 50', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Reference Number',
                        type: 'FieldTextbox3',
                        _raw: { Length: 20 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings).toHaveFindingCount('field-max-length', 1);
            expect(findings[0].message).toContain('20');
            expect(findings[0].message).toContain('50');
        });

        it('passes unmatched textbox fields with MaxLength >= 50', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Reference Number',
                        type: 'FieldTextbox3',
                        _raw: { Length: 50 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        // --- Skip conditions ---

        it('skips default field names', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'DataField1',
                        type: 'FieldTextbox3',
                        _raw: { Length: 10 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        it('skips empty field names', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: '',
                        type: 'FieldTextbox3',
                        _raw: { Length: 10 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        it('skips non-applicable field types', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Notes',
                        type: 'FieldCheckbox',
                        _raw: { Length: 10 },
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        it('skips fields with Length not set (0)', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'First Name',
                        type: 'FieldTextbox3',
                        _raw: {},
                    },
                ],
            });
            expect(runRule('field-max-length', ctx)).toEqual([]);
        });

        // --- Pattern priority ---

        it('matches address before generic name (more specific wins)', () => {
            // "Mailing Address" matches both /address/i and could match /name/i — but address pattern comes first in LENGTH_RULES
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Mailing Address',
                        type: 'FieldTextbox3',
                        _raw: { Length: 100 },
                    },
                ],
            });
            const findings = runRule('field-max-length', ctx);
            expect(findings[0].message).toContain('address field');
        });
    });
});
