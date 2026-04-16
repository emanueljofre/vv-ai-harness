/**
 * Unit tests for rules/orphan-refs.js
 *
 * Tests 2 rules: orphan-container-ref, orphan-group-member
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

describe('orphan-refs rules', () => {
    // ------------------------------------------------------------------
    // orphan-container-ref
    // ------------------------------------------------------------------
    describe('orphan-container-ref', () => {
        it('flags fields referencing non-existent containers', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', id: 'f1', containerId: 'missing-container' }],
            });
            const findings = runRule('orphan-container-ref', ctx);
            expect(findings).toHaveFindingCount('orphan-container-ref', 1);
            expect(findings[0].severity).toBe('error');
            expect(findings[0].message).toContain('missing-container');
        });

        it('passes when containerId references an existing FieldContainer', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1' },
                    { name: 'F1', type: 'FieldTextbox3', id: 'f1', containerId: 'c1' },
                ],
            });
            expect(runRule('orphan-container-ref', ctx)).toEqual([]);
        });

        it('ignores empty containerId', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', containerId: '' }],
            });
            expect(runRule('orphan-container-ref', ctx)).toEqual([]);
        });

        it('ignores zero GUID containerId', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', containerId: ZERO_GUID }],
            });
            expect(runRule('orphan-container-ref', ctx)).toEqual([]);
        });

        it('only recognizes FieldContainer type as valid containers', () => {
            // A textbox with the same ID should not count as a valid container
            const ctx = buildContext({
                fields: [
                    { name: 'NotAContainer', type: 'FieldTextbox3', id: 'x1' },
                    { name: 'F1', type: 'FieldTextbox3', id: 'f1', containerId: 'x1' },
                ],
            });
            const findings = runRule('orphan-container-ref', ctx);
            expect(findings).toHaveFindingCount('orphan-container-ref', 1);
        });

        it('handles multiple orphan references', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'gone1' },
                    { name: 'F2', type: 'FieldCheckbox', containerId: 'gone2' },
                ],
            });
            const findings = runRule('orphan-container-ref', ctx);
            expect(findings).toHaveFindingCount('orphan-container-ref', 2);
        });
    });

    // ------------------------------------------------------------------
    // orphan-group-member
    // ------------------------------------------------------------------
    describe('orphan-group-member', () => {
        it('flags group members referencing non-existent fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', id: 'f1' }],
                groups: [
                    {
                        name: 'Test Group',
                        fieldMembers: [{ fieldId: 'deleted-field', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            const findings = runRule('orphan-group-member', ctx);
            expect(findings).toHaveFindingCount('orphan-group-member', 1);
            expect(findings[0].field).toBe('Test Group');
            expect(findings[0].message).toContain('deleted-field');
        });

        it('passes when group members reference valid fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', id: 'f1' }],
                groups: [
                    {
                        name: 'Test Group',
                        fieldMembers: [{ fieldId: 'f1', fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('orphan-group-member', ctx)).toEqual([]);
        });

        it('ignores zero GUID members', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'G1',
                        fieldMembers: [{ fieldId: ZERO_GUID, fieldType: 'FieldTextbox3' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('orphan-group-member', ctx)).toEqual([]);
        });

        it('ignores built-in control members (00000001- prefix)', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'G1',
                        fieldMembers: [{ fieldId: '00000001-0000-0000-0000-000000000001', fieldType: 'FormControls' }],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('orphan-group-member', ctx)).toEqual([]);
        });

        it('handles empty groups', () => {
            const ctx = buildContext({
                groups: [
                    {
                        name: 'Empty Group',
                        fieldMembers: [],
                        formControlMembers: [],
                    },
                ],
            });
            expect(runRule('orphan-group-member', ctx)).toEqual([]);
        });
    });
});
