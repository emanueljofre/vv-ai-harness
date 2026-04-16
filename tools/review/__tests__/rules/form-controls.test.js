/**
 * Unit tests for rules/form-controls.js
 *
 * Tests 2 rules: save-button-hidden, tab-control-visible
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('form-controls rules', () => {
    // ------------------------------------------------------------------
    // save-button-hidden
    // ------------------------------------------------------------------
    describe('save-button-hidden', () => {
        it('flags when SaveButton is not in any group', () => {
            const ctx = buildContext({
                groups: [{ name: 'Some Group', fieldMembers: [], formControlMembers: [] }],
            });
            const findings = runRule('save-button-hidden', ctx);
            expect(findings).toHaveFindingCount('save-button-hidden', 1);
            expect(findings[0].field).toBe('SaveButton');
            expect(findings[0].message).toContain('not in any group');
        });

        it('passes when SaveButton is in a group', () => {
            const ctx = buildContext({
                groups: [{ name: 'Hide Save', fieldMembers: [], formControlMembers: ['SaveButton'] }],
            });
            expect(runRule('save-button-hidden', ctx)).toEqual([]);
        });

        it('flags when no groups exist at all', () => {
            const ctx = buildContext({ groups: [] });
            const findings = runRule('save-button-hidden', ctx);
            expect(findings).toHaveFindingCount('save-button-hidden', 1);
        });

        it('passes when SaveButton appears in any group (not necessarily a hidden one)', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Visible Group',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: ['SaveButton'],
                    },
                ],
            });
            // The rule only checks presence in a group, not the group's behavior
            expect(runRule('save-button-hidden', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // tab-control-visible
    // ------------------------------------------------------------------
    describe('tab-control-visible', () => {
        it('flags when TabControl is in a group', () => {
            const ctx = buildContext({
                groups: [{ name: 'Hide Tabs', fieldMembers: [], formControlMembers: ['TabControl'] }],
            });
            const findings = runRule('tab-control-visible', ctx);
            expect(findings).toHaveFindingCount('tab-control-visible', 1);
            expect(findings[0].field).toBe('TabControl');
            expect(findings[0].message).toContain('Hide Tabs');
            expect(findings[0].message).toContain('Menu tab');
        });

        it('passes when TabControl is not in any group', () => {
            const ctx = buildContext({
                groups: [{ name: 'Some Group', fieldMembers: [], formControlMembers: ['SaveButton'] }],
            });
            expect(runRule('tab-control-visible', ctx)).toEqual([]);
        });

        it('passes with no groups', () => {
            const ctx = buildContext({ groups: [] });
            expect(runRule('tab-control-visible', ctx)).toEqual([]);
        });

        it('flags each group that contains TabControl', () => {
            const ctx = buildContext({
                groups: [
                    { name: 'Group A', fieldMembers: [], formControlMembers: ['TabControl'] },
                    { name: 'Group B', fieldMembers: [], formControlMembers: ['TabControl'] },
                ],
            });
            const findings = runRule('tab-control-visible', ctx);
            expect(findings).toHaveFindingCount('tab-control-visible', 2);
        });

        it('differentiates TabControl from other FormControls', () => {
            const ctx = buildContext({
                groups: [{ name: 'Controls', fieldMembers: [], formControlMembers: ['SaveButton', 'SubmitButton'] }],
            });
            // No TabControl → no finding
            expect(runRule('tab-control-visible', ctx)).toEqual([]);
        });
    });
});
