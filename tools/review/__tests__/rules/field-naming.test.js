/**
 * Unit tests for rules/field-naming.js
 *
 * Tests all 5 field-naming rules:
 *   title-case, default-name, duplicate-name, empty-name, valid-identifier
 */

const { loadFixture, buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('field-naming rules', () => {
    // ------------------------------------------------------------------
    // title-case
    // ------------------------------------------------------------------
    describe('title-case', () => {
        it('passes for properly cased names', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3' },
                    { name: 'Date of Birth', type: 'FieldCalendar3' },
                    { name: 'SSN', type: 'FieldTextbox3' },
                ],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toEqual([]);
        });

        it('flags camelCase names', () => {
            const ctx = buildContext({
                fields: [{ name: 'firstName', type: 'FieldTextbox3' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'title-case', field: 'firstName' });
        });

        it('flags ALL CAPS names', () => {
            const ctx = buildContext({
                fields: [{ name: 'FIRST NAME', type: 'FieldTextbox3' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toHaveFindingCount('title-case', 1);
        });

        it('skips default names (handled by default-name rule)', () => {
            const ctx = buildContext({
                fields: [{ name: 'DataField1', type: 'FieldTextbox3' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toEqual([]);
        });

        it('skips non-applicable field types', () => {
            const ctx = buildContext({
                fields: [{ name: 'someLabel', type: 'FieldLabel' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toEqual([]);
        });

        it('applies to FieldSlider', () => {
            const ctx = buildContext({
                fields: [{ name: 'priorityLevel', type: 'FieldSlider' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toHaveFindingCount('title-case', 1);
        });

        it('allows exception words in lowercase', () => {
            const ctx = buildContext({
                fields: [{ name: 'Power of Attorney', type: 'FieldTextbox3' }],
            });
            const findings = runRule('title-case', ctx);
            expect(findings).toEqual([]);
        });

        it('detects violations in the naming-violations fixture', () => {
            const ctx = loadFixture('naming-violations');
            const findings = runRule('title-case', ctx);
            expect(findings).toContainFindingMatch({ field: 'firstName' });
        });

        it('returns no findings for the empty template', () => {
            const ctx = loadFixture('empty-template');
            const findings = runRule('title-case', ctx);
            expect(findings).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // default-name
    // ------------------------------------------------------------------
    describe('default-name', () => {
        it('flags DataField1', () => {
            const ctx = buildContext({
                fields: [{ name: 'DataField1', type: 'FieldTextbox3' }],
            });
            const findings = runRule('default-name', ctx);
            expect(findings).toHaveFindingCount('default-name', 1);
        });

        it('flags UploadButton1', () => {
            const ctx = buildContext({
                fields: [{ name: 'UploadButton1', type: 'UploadButton' }],
            });
            const findings = runRule('default-name', ctx);
            expect(findings).toHaveFindingCount('default-name', 1);
        });

        it('passes for descriptive names', () => {
            const ctx = buildContext({
                fields: [{ name: 'Application Date', type: 'FieldCalendar3' }],
            });
            const findings = runRule('default-name', ctx);
            expect(findings).toEqual([]);
        });

        it('detects default names in the naming-violations fixture', () => {
            const ctx = loadFixture('naming-violations');
            const findings = runRule('default-name', ctx);
            expect(findings).toContainFindingMatch({ field: 'DataField1' });
        });

        it('flags default names for newly added field types', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'DataField3', type: 'FieldRectangle' },
                    { name: 'Slider1', type: 'FieldSlider' },
                    { name: 'BarCode1', type: 'BarCodeFormControl' },
                    { name: 'QuestionsControl1', type: 'QuestionsControl' },
                    { name: 'WizardStep1', type: 'WizardStep' },
                ],
            });
            const findings = runRule('default-name', ctx);
            expect(findings).toHaveFindingCount('default-name', 5);
        });

        it('passes for descriptive names on new field types', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Section Divider', type: 'FieldRectangle' },
                    { name: 'Priority Level', type: 'FieldSlider' },
                    { name: 'Tracking Code', type: 'BarCodeFormControl' },
                ],
            });
            const findings = runRule('default-name', ctx);
            expect(findings).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // duplicate-name
    // ------------------------------------------------------------------
    describe('duplicate-name', () => {
        it('flags duplicate field names', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Dup Field', type: 'FieldTextbox3', id: 'f1' },
                    { name: 'Dup Field', type: 'FieldTextbox3', id: 'f2' },
                ],
            });
            const findings = runRule('duplicate-name', ctx);
            expect(findings).toHaveFindingCount('duplicate-name', 1);
            expect(findings[0].message).toContain('2 occurrences');
        });

        it('is case-insensitive', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'My Field', type: 'FieldTextbox3', id: 'f1' },
                    { name: 'my field', type: 'FieldTextbox3', id: 'f2' },
                ],
            });
            const findings = runRule('duplicate-name', ctx);
            expect(findings).toHaveFindingCount('duplicate-name', 1);
        });

        it('passes for unique names', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3' },
                    { name: 'Last Name', type: 'FieldTextbox3' },
                ],
            });
            const findings = runRule('duplicate-name', ctx);
            expect(findings).toEqual([]);
        });

        it('detects duplicates in the naming-violations fixture', () => {
            const ctx = loadFixture('naming-violations');
            const findings = runRule('duplicate-name', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'duplicate-name' });
        });
    });

    // ------------------------------------------------------------------
    // empty-name
    // ------------------------------------------------------------------
    describe('empty-name', () => {
        it('flags fields with empty names', () => {
            const ctx = buildContext({
                fields: [{ name: '', type: 'FieldTextbox3' }],
            });
            const findings = runRule('empty-name', ctx);
            expect(findings).toHaveFindingCount('empty-name', 1);
        });

        it('flags fields with whitespace-only names', () => {
            const ctx = buildContext({
                fields: [{ name: '   ', type: 'FieldTextbox3' }],
            });
            const findings = runRule('empty-name', ctx);
            expect(findings).toHaveFindingCount('empty-name', 1);
        });

        it('passes for named fields', () => {
            const ctx = loadFixture('minimal-template');
            const findings = runRule('empty-name', ctx);
            expect(findings).toEqual([]);
        });

        it('detects empty name in the naming-violations fixture', () => {
            const ctx = loadFixture('naming-violations');
            const findings = runRule('empty-name', ctx);
            expect(findings).toHaveFindingCount('empty-name', 1);
        });
    });

    // ------------------------------------------------------------------
    // valid-identifier
    // ------------------------------------------------------------------
    describe('valid-identifier', () => {
        it('flags names with special characters', () => {
            const ctx = buildContext({
                fields: [{ name: 'Field #1', type: 'FieldTextbox3' }],
            });
            const findings = runRule('valid-identifier', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'valid-identifier', field: 'Field #1' });
        });

        it('passes for standard names', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3' },
                    { name: 'Address Line 2', type: 'FieldTextbox3' },
                ],
            });
            const findings = runRule('valid-identifier', ctx);
            expect(findings).toEqual([]);
        });

        it('skips empty names (handled by empty-name rule)', () => {
            const ctx = buildContext({
                fields: [{ name: '', type: 'FieldTextbox3' }],
            });
            const findings = runRule('valid-identifier', ctx);
            expect(findings).toEqual([]);
        });

        it('detects invalid identifier in the naming-violations fixture', () => {
            const ctx = loadFixture('naming-violations');
            const findings = runRule('valid-identifier', ctx);
            expect(findings).toContainFindingMatch({ field: 'Field #1' });
        });
    });
});
