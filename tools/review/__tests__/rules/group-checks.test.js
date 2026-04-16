/**
 * Unit tests for rules/group-checks.js
 *
 * Tests 5 rules:
 *   field-multiple-groups, group-override-condition, group-meaningful-name,
 *   label-unnamed-in-group, group-consolidate-conditions
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

describe('group-checks rules', () => {
    // ------------------------------------------------------------------
    // field-multiple-groups
    // ------------------------------------------------------------------
    describe('field-multiple-groups', () => {
        it('flags a field appearing in multiple groups', () => {
            const ctx = buildContext({
                fields: [{ name: 'Shared Field', type: 'FieldTextbox3', id: 'f1' }],
                groups: [
                    {
                        name: 'Group A',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'Group B',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            const findings = runRule('field-multiple-groups', ctx);
            expect(findings).toHaveFindingCount('field-multiple-groups', 1);
            expect(findings[0].field).toBe('Shared Field');
            expect(findings[0].message).toContain('2 groups');
            expect(findings[0].message).toContain('Group A');
            expect(findings[0].message).toContain('Group B');
        });

        it('passes when each field is in at most one group', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', id: 'f1' },
                    { name: 'F2', type: 'FieldTextbox3', id: 'f2' },
                ],
                groups: [
                    {
                        name: 'Group A',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'Group B',
                        fieldMembers: [{ fieldId: 'f2', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('field-multiple-groups', ctx)).toEqual([]);
        });

        it('ignores zero GUID field IDs', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'G1',
                        fieldMembers: [{ fieldId: ZERO_GUID, fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'G2',
                        fieldMembers: [{ fieldId: ZERO_GUID, fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('field-multiple-groups', ctx)).toEqual([]);
        });

        it('ignores built-in control IDs (00000001- prefix)', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'G1',
                        fieldMembers: [{ fieldId: '00000001-0000-0000-0000-000000000001', fieldType: 'FormControls' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'G2',
                        fieldMembers: [{ fieldId: '00000001-0000-0000-0000-000000000001', fieldType: 'FormControls' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('field-multiple-groups', ctx)).toEqual([]);
        });

        it('resolves field name from controlMap', () => {
            const ctx = buildContext({
                fields: [{ name: 'My Field', type: 'FieldTextbox3', id: 'f1' }],
                groups: [
                    {
                        name: 'G1',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'G2',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                    {
                        name: 'G3',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            const findings = runRule('field-multiple-groups', ctx);
            expect(findings[0].field).toBe('My Field');
            expect(findings[0].message).toContain('3 groups');
        });
    });

    // ------------------------------------------------------------------
    // group-override-condition
    // ------------------------------------------------------------------
    describe('group-override-condition', () => {
        it('flags groups without an override field in conditions', () => {
            const ctx = buildContext({
                fields: [{ name: 'Some Field', type: 'FieldTextbox3', id: 'f1' }],
                groups: [
                    {
                        name: 'ReadOnly Group',
                        fieldMembers: [],
                        formControlMembers: [],
                        conditions: {
                            ConditionBase: { FieldValue1: { FieldID: 'f1' } },
                        },
                    },
                ],
            });
            const findings = runRule('group-override-condition', ctx);
            expect(findings).toHaveFindingCount('group-override-condition', 1);
            expect(findings[0].severity).toBe('info');
        });

        it('passes when condition references an override field', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override', type: 'FieldCheckbox', id: 'override-1' }],
                groups: [
                    {
                        name: 'ReadOnly Group',
                        fieldMembers: [],
                        formControlMembers: [],
                        conditions: {
                            ConditionBase: { FieldValue1: { FieldID: 'override-1' } },
                        },
                    },
                ],
            });
            expect(runRule('group-override-condition', ctx)).toEqual([]);
        });

        it('passes when readOnlyConditions references an override field', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override', type: 'FieldCheckbox', id: 'ov1' }],
                groups: [
                    {
                        name: 'ReadOnly Group',
                        fieldMembers: [],
                        formControlMembers: [],
                        readOnlyConditions: {
                            ConditionBase: { FieldValue1: { FieldID: 'ov1' } },
                        },
                    },
                ],
            });
            expect(runRule('group-override-condition', ctx)).toEqual([]);
        });

        it('skips groups with "admin" in the name', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Admin Controls',
                        fieldMembers: [],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('group-override-condition', ctx)).toEqual([]);
        });

        it('flags groups without any conditions', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Visible Fields',
                        fieldMembers: [],
                        formControlMembers: [],
                    },
                ],
            });
            const findings = runRule('group-override-condition', ctx);
            expect(findings).toHaveFindingCount('group-override-condition', 1);
        });
    });

    // ------------------------------------------------------------------
    // group-meaningful-name
    // ------------------------------------------------------------------
    describe('group-meaningful-name', () => {
        it('flags default group names like "Group1"', () => {
            const ctx = buildContext({
                groups: [{ name: 'Group1', fieldMembers: [], formControlMembers: [] }],
            });
            const findings = runRule('group-meaningful-name', ctx);
            expect(findings).toHaveFindingCount('group-meaningful-name', 1);
        });

        it('flags "Group" alone', () => {
            const ctx = buildContext({
                groups: [{ name: 'Group', fieldMembers: [], formControlMembers: [] }],
            });
            expect(runRule('group-meaningful-name', ctx)).toHaveFindingCount('group-meaningful-name', 1);
        });

        it('flags unnamed groups', () => {
            const ctx = buildContext({
                groups: [{ name: '(unnamed)', fieldMembers: [], formControlMembers: [] }],
            });
            expect(runRule('group-meaningful-name', ctx)).toHaveFindingCount('group-meaningful-name', 1);
        });

        it('flags very short names (less than 3 chars)', () => {
            const ctx = buildContext({
                groups: [{ name: 'AB', fieldMembers: [], formControlMembers: [] }],
            });
            expect(runRule('group-meaningful-name', ctx)).toHaveFindingCount('group-meaningful-name', 1);
        });

        it('passes for descriptive names', () => {
            const ctx = buildContext({
                groups: [
                    { name: 'Hidden Fields', fieldMembers: [], formControlMembers: [] },
                    { name: 'BTN Manage Tab', fieldMembers: [], formControlMembers: [] },
                ],
            });
            expect(runRule('group-meaningful-name', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // label-unnamed-in-group
    // ------------------------------------------------------------------
    describe('label-unnamed-in-group', () => {
        it('flags renamed labels not in any group', () => {
            const ctx = buildContext({
                fields: [{ name: 'Section Header', type: 'FieldLabel', id: 'lbl1' }],
                groups: [],
            });
            const findings = runRule('label-unnamed-in-group', ctx);
            expect(findings).toHaveFindingCount('label-unnamed-in-group', 1);
            expect(findings[0].field).toBe('Section Header');
        });

        it('passes for renamed labels that are in a group', () => {
            const ctx = buildContext({
                fields: [{ name: 'Section Header', type: 'FieldLabel', id: 'lbl1' }],
                groups: [
                    {
                        name: 'Show/Hide',
                        fieldMembers: [{ fieldId: 'lbl1', fieldType: 'FieldLabel' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('label-unnamed-in-group', ctx)).toEqual([]);
        });

        it('skips default-named labels (Label1, Label2)', () => {
            const ctx = buildContext({
                fields: [{ name: 'Label1', type: 'FieldLabel', id: 'lbl1' }],
                groups: [],
            });
            expect(runRule('label-unnamed-in-group', ctx)).toEqual([]);
        });

        it('skips empty-named labels', () => {
            const ctx = buildContext({
                fields: [{ name: '', type: 'FieldLabel', id: 'lbl1' }],
                groups: [],
            });
            expect(runRule('label-unnamed-in-group', ctx)).toEqual([]);
        });

        it('only checks FieldLabel type', () => {
            const ctx = buildContext({
                fields: [{ name: 'Custom Name', type: 'FieldTextbox3', id: 'f1' }],
                groups: [],
            });
            expect(runRule('label-unnamed-in-group', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // group-consolidate-conditions
    // ------------------------------------------------------------------
    describe('group-consolidate-conditions', () => {
        it('flags groups with identical conditions', () => {
            const conditions = {
                ConditionBase: { FieldValue1: { FieldID: 'f1' }, Operator: 'equals', Value: 'true' },
            };
            const ctx = buildContext({
                groups: [
                    { name: 'Group A', fieldMembers: [], formControlMembers: [], conditions },
                    { name: 'Group B', fieldMembers: [], formControlMembers: [], conditions },
                ],
            });
            const findings = runRule('group-consolidate-conditions', ctx);
            expect(findings).toHaveFindingCount('group-consolidate-conditions', 1);
            expect(findings[0].field).toBe('Group B');
            expect(findings[0].message).toContain('Group A');
        });

        it('passes for groups with different conditions', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Group A',
                        fieldMembers: [],
                        formControlMembers: [],
                        conditions: { ConditionBase: { FieldValue1: { FieldID: 'f1' } } },
                    },
                    {
                        name: 'Group B',
                        fieldMembers: [],
                        formControlMembers: [],
                        conditions: { ConditionBase: { FieldValue1: { FieldID: 'f2' } } },
                    },
                ],
            });
            expect(runRule('group-consolidate-conditions', ctx)).toEqual([]);
        });

        it('skips groups without conditions', () => {
            const ctx = buildContext({
                groups: [
                    { name: 'Group A', fieldMembers: [], formControlMembers: [] },
                    { name: 'Group B', fieldMembers: [], formControlMembers: [] },
                ],
            });
            expect(runRule('group-consolidate-conditions', ctx)).toEqual([]);
        });

        it('returns empty when fewer than 2 groups', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Only Group',
                        fieldMembers: [],
                        formControlMembers: [],
                        conditions: { ConditionBase: { FieldValue1: { FieldID: 'f1' } } },
                    },
                ],
            });
            expect(runRule('group-consolidate-conditions', ctx)).toEqual([]);
        });

        it('detects matching readOnlyConditions too', () => {
            const roConditions = {
                ConditionBase: { FieldValue1: { FieldID: 'f1' }, Operator: 'equals' },
            };
            const ctx = buildContext({
                groups: [
                    { name: 'Group A', fieldMembers: [], formControlMembers: [], readOnlyConditions: roConditions },
                    { name: 'Group B', fieldMembers: [], formControlMembers: [], readOnlyConditions: roConditions },
                ],
            });
            const findings = runRule('group-consolidate-conditions', ctx);
            expect(findings).toHaveFindingCount('group-consolidate-conditions', 1);
        });
    });
});
