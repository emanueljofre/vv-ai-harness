/**
 * Unit tests for rules/spelling.js
 *
 * Tests 1 rule: spelling
 *
 * Note: Uses nspell (Hunspell) — tests depend on the en_US dictionary.
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('spelling rules', () => {
    describe('spelling', () => {
        it('passes for correctly spelled field names', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3' },
                    { name: 'Email Address', type: 'FieldTextbox3' },
                ],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('flags misspelled words', () => {
            const ctx = buildContext({
                fields: [{ name: 'Addres Line', type: 'FieldTextbox3' }],
            });
            const findings = runRule('spelling', ctx);
            expect(findings).toContainFinding('spelling');
            expect(findings[0].message).toContain('Addres');
        });

        it('includes suggestions in the message', () => {
            const ctx = buildContext({
                fields: [{ name: 'Adress', type: 'FieldTextbox3' }],
            });
            const findings = runRule('spelling', ctx);
            expect(findings[0].message).toContain('suggestions');
        });

        it('skips acronym exceptions (ID, SSN, DOB, etc.)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'SSN', type: 'FieldTextbox3' },
                    { name: 'Employee ID', type: 'FieldTextbox3' },
                    { name: 'DOB', type: 'FieldCalendar3' },
                ],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('skips lowercase exception words (of, to, a, and, etc.)', () => {
            const ctx = buildContext({
                fields: [{ name: 'Power of Attorney', type: 'FieldTextbox3' }],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('skips default field names (DataField1, UploadButton1, etc.)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'DataField1', type: 'FieldTextbox3' },
                    { name: 'UploadButton1', type: 'UploadButton' },
                    { name: 'Image1', type: 'ImageFormControl' },
                ],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('skips empty field names', () => {
            const ctx = buildContext({
                fields: [{ name: '', type: 'FieldTextbox3' }],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('skips non-applicable field types (FieldLabel, FieldContainer)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Mispeled Label', type: 'FieldLabel' },
                    { name: 'Contaner Box', type: 'FieldContainer' },
                ],
            });
            expect(runRule('spelling', ctx)).toEqual([]);
        });

        it('checks applicable field types', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Adress', type: 'FieldTextbox3' },
                    { name: 'Adress', type: 'FieldTextArea3' },
                    { name: 'Adress', type: 'FieldDropDownList3' },
                ],
            });
            const findings = runRule('spelling', ctx);
            expect(findings).toHaveLength(3);
        });

        it('handles empty template', () => {
            const ctx = buildContext({ fields: [] });
            expect(runRule('spelling', ctx)).toEqual([]);
        });
    });
});
