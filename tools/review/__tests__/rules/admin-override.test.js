/**
 * Unit tests for rules/admin-override.js
 *
 * Tests 2 rules: admin-override-container, admin-override-security
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('admin-override rules', () => {
    // ------------------------------------------------------------------
    // admin-override-container
    // ------------------------------------------------------------------
    describe('admin-override-container', () => {
        it('flags when no admin override container exists', () => {
            const ctx = buildContext({
                fields: [{ name: 'First Name', type: 'FieldTextbox3', id: 'f1' }],
            });
            const findings = runRule('admin-override-container', ctx);
            expect(findings).toHaveFindingCount('admin-override-container', 1);
            expect(findings[0].message).toContain('does not have an Admin Override container');
        });

        it('passes when full admin override structure exists', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                    { name: 'btnAdminSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
            });
            expect(runRule('admin-override-container', ctx)).toEqual([]);
        });

        it('flags when admin container exists but missing checkbox', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'btnAdminSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
            });
            const findings = runRule('admin-override-container', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'admin-override-container' });
            expect(findings.some((f) => f.message.includes('checkbox'))).toBe(true);
        });

        it('flags when admin container exists but missing button', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                ],
            });
            const findings = runRule('admin-override-container', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'admin-override-container' });
            expect(findings.some((f) => f.message.includes('button'))).toBe(true);
        });

        it('recognizes "Admin Section" as alternative container name', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                    { name: 'btnAdminSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
            });
            expect(runRule('admin-override-container', ctx)).toEqual([]);
        });

        it('requires checkbox to have "Admin Override" in its name', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'Some Checkbox', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                    { name: 'btnSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
            });
            const findings = runRule('admin-override-container', ctx);
            expect(findings.some((f) => f.message.includes('checkbox'))).toBe(true);
        });

        it('requires checkbox to be inside the admin container (same containerId)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c2' }, // wrong container
                    { name: 'btnSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
            });
            const findings = runRule('admin-override-container', ctx);
            expect(findings.some((f) => f.message.includes('checkbox'))).toBe(true);
        });
    });

    // ------------------------------------------------------------------
    // admin-override-security
    // ------------------------------------------------------------------
    describe('admin-override-security', () => {
        it('flags when admin container is not in any group', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' }],
                groups: [],
            });
            const findings = runRule('admin-override-security', ctx);
            expect(findings).toHaveFindingCount('admin-override-security', 1);
            expect(findings[0].message).toContain('not in any group');
        });

        it('flags when admin container group has no security members', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override Section', type: 'FieldContainer', id: 'c1' }],
                groups: [
                    {
                        name: 'Admin Group',
                        fieldMembers: [{ fieldId: 'c1', fieldType: 'FieldContainer' }],
                        formControlMembers: [],
                        securityMembers: null,
                    },
                ],
            });
            const findings = runRule('admin-override-security', ctx);
            expect(findings).toHaveFindingCount('admin-override-security', 1);
            expect(findings[0].message).toContain('no security visibility');
        });

        it('passes when admin container is in a group with security members', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override Container', type: 'FieldContainer', id: 'c1' }],
                groups: [
                    {
                        name: 'Admin Visibility',
                        fieldMembers: [{ fieldId: 'c1', fieldType: 'FieldContainer' }],
                        formControlMembers: [],
                        securityMembers: { SecurityMember: [{ MemberID: 'vault-access-group-id' }] },
                    },
                ],
            });
            expect(runRule('admin-override-security', ctx)).toEqual([]);
        });

        it('returns empty when no admin container exists (handled by other rule)', () => {
            const ctx = buildContext({
                fields: [{ name: 'Regular Field', type: 'FieldTextbox3' }],
                groups: [],
            });
            expect(runRule('admin-override-security', ctx)).toEqual([]);
        });

        it('recognizes "Admin Section" as admin container', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Section', type: 'FieldContainer', id: 'c1' }],
                groups: [],
            });
            const findings = runRule('admin-override-security', ctx);
            expect(findings).toHaveFindingCount('admin-override-security', 1);
        });

        it('flags non-admin fields in the admin group', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Container', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                    { name: 'btnAdminSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                    { name: 'First Name', type: 'FieldTextbox3', id: 'f1' },
                ],
                groups: [
                    {
                        name: 'Admin Visibility',
                        fieldMembers: [
                            { fieldId: 'c1', fieldType: 'FieldContainer' },
                            { fieldId: 'cb1', fieldType: 'FieldCheckbox' },
                            { fieldId: 'btn1', fieldType: 'FormButton' },
                            { fieldId: 'f1', fieldType: 'FieldTextbox3' }, // NOT an admin field
                        ],
                        formControlMembers: [],
                        securityMembers: { SecurityMember: [{ MemberID: 'vault-access' }] },
                    },
                ],
            });
            const findings = runRule('admin-override-security', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'admin-override-security', field: 'First Name' });
            expect(findings[0].message).toContain('Non-admin field');
        });

        it('allows admin container and its children in the admin group', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Admin Override Container', type: 'FieldContainer', id: 'c1' },
                    { name: 'Admin Override', type: 'FieldCheckbox', id: 'cb1', containerId: 'c1' },
                    { name: 'btnAdminSave', type: 'FormButton', id: 'btn1', containerId: 'c1' },
                ],
                groups: [
                    {
                        name: 'Admin Visibility',
                        fieldMembers: [
                            { fieldId: 'c1', fieldType: 'FieldContainer' },
                            { fieldId: 'cb1', fieldType: 'FieldCheckbox' },
                            { fieldId: 'btn1', fieldType: 'FormButton' },
                        ],
                        formControlMembers: [],
                        securityMembers: { SecurityMember: [{ MemberID: 'vault-access' }] },
                    },
                ],
            });
            // Should only check security, not flag any fields
            const findings = runRule('admin-override-security', ctx);
            expect(findings).toEqual([]);
        });

        it('ignores zero GUID and platform GUID members', () => {
            const ctx = buildContext({
                fields: [{ name: 'Admin Override Container', type: 'FieldContainer', id: 'c1' }],
                groups: [
                    {
                        name: 'Admin Visibility',
                        fieldMembers: [
                            { fieldId: 'c1', fieldType: 'FieldContainer' },
                            { fieldId: '00000000-0000-0000-0000-000000000000', fieldType: '' },
                            { fieldId: '00000001-0000-0000-0000-000000000001', fieldType: 'FormControls' },
                        ],
                        formControlMembers: [],
                        securityMembers: { SecurityMember: [{ MemberID: 'vault-access' }] },
                    },
                ],
            });
            expect(runRule('admin-override-security', ctx)).toEqual([]);
        });
    });
});
