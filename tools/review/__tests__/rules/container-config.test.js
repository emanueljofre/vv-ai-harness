/**
 * Unit tests for rules/container-config.js
 *
 * Tests 1 rule: container-responsive-flow
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('container-config rules', () => {
    describe('container-responsive-flow', () => {
        it('flags containers with >1 child and no responsive flow set', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'c1' },
                    { name: 'F2', type: 'FieldTextbox3', containerId: 'c1' },
                ],
            });
            const findings = runRule('container-responsive-flow', ctx);
            expect(findings).toHaveFindingCount('container-responsive-flow', 1);
            expect(findings[0].message).toContain('2 fields');
            expect(findings[0].message).toContain('none');
        });

        it('passes when ResponsiveFlow is 3 (1 Column)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '3' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'c1' },
                    { name: 'F2', type: 'FieldTextbox3', containerId: 'c1' },
                ],
            });
            expect(runRule('container-responsive-flow', ctx)).toEqual([]);
        });

        it('passes when ResponsiveFlow is 4 (2 Columns)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '4' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'c1' },
                    { name: 'F2', type: 'FieldTextbox3', containerId: 'c1' },
                ],
            });
            expect(runRule('container-responsive-flow', ctx)).toEqual([]);
        });

        it('flags invalid ResponsiveFlow values', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '1' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'c1' },
                    { name: 'F2', type: 'FieldTextbox3', containerId: 'c1' },
                ],
            });
            const findings = runRule('container-responsive-flow', ctx);
            expect(findings).toHaveFindingCount('container-responsive-flow', 1);
        });

        it('skips containers with 0 or 1 children', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Empty Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '' },
                    { name: 'Single Child Container', type: 'FieldContainer', id: 'c2', responsiveFlow: '' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: 'c2' },
                ],
            });
            expect(runRule('container-responsive-flow', ctx)).toEqual([]);
        });

        it('ignores non-container fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', responsiveFlow: '' }],
            });
            expect(runRule('container-responsive-flow', ctx)).toEqual([]);
        });

        it('ignores fields with zero GUID containerId', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Container', type: 'FieldContainer', id: 'c1', responsiveFlow: '' },
                    { name: 'F1', type: 'FieldTextbox3', containerId: '00000000-0000-0000-0000-000000000000' },
                    { name: 'F2', type: 'FieldTextbox3', containerId: '00000000-0000-0000-0000-000000000000' },
                ],
            });
            // Children have zero GUID — not assigned to c1
            expect(runRule('container-responsive-flow', ctx)).toEqual([]);
        });
    });
});
