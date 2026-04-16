/**
 * Unit tests for rules/tab-order.js
 *
 * Tests 2 rules: tab-order-zero, tab-order-unique
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('tab-order rules', () => {
    // ------------------------------------------------------------------
    // tab-order-zero
    // ------------------------------------------------------------------
    describe('tab-order-zero', () => {
        it('passes when tabOrder is 0 (auto-calculated)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3', tabOrder: 0 },
                    { name: 'Last Name', type: 'FieldTextbox3', tabOrder: 0 },
                ],
            });
            expect(runRule('tab-order-zero', ctx)).toEqual([]);
        });

        it('flags non-zero tabOrder', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'First Name', type: 'FieldTextbox3', tabOrder: 1 },
                    { name: 'Last Name', type: 'FieldTextbox3', tabOrder: 2 },
                ],
            });
            const findings = runRule('tab-order-zero', ctx);
            expect(findings).toHaveFindingCount('tab-order-zero', 2);
            expect(findings[0].message).toContain('1');
            expect(findings[1].message).toContain('2');
        });

        it('skips non-applicable field types (FieldLabel)', () => {
            const ctx = buildContext({
                fields: [{ name: 'My Label', type: 'FieldLabel', tabOrder: 5 }],
            });
            expect(runRule('tab-order-zero', ctx)).toEqual([]);
        });

        it('checks all applicable field types', () => {
            const types = [
                'FieldTextbox3',
                'FieldTextArea3',
                'FieldCalendar3',
                'FieldDropDownList3',
                'FieldCheckbox',
                'CellField',
                'UploadButton',
                'FormButton',
                'FieldSlider',
            ];
            const ctx = buildContext({
                fields: types.map((type, i) => ({ name: `F${i}`, type, tabOrder: i + 1 })),
            });
            const findings = runRule('tab-order-zero', ctx);
            expect(findings).toHaveLength(types.length);
        });

        it('handles empty template', () => {
            const ctx = buildContext({ fields: [] });
            expect(runRule('tab-order-zero', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // tab-order-unique
    // ------------------------------------------------------------------
    describe('tab-order-unique', () => {
        it('passes when all tabOrders are unique per page', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', tabOrder: 1, pageIndex: 0, pageName: 'Page 1' },
                    { name: 'F2', type: 'FieldTextbox3', tabOrder: 2, pageIndex: 0, pageName: 'Page 1' },
                ],
            });
            expect(runRule('tab-order-unique', ctx)).toEqual([]);
        });

        it('flags duplicate tabOrders on the same page', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', tabOrder: 5, pageIndex: 0, pageName: 'Page 1' },
                    { name: 'F2', type: 'FieldCheckbox', tabOrder: 5, pageIndex: 0, pageName: 'Page 1' },
                ],
            });
            const findings = runRule('tab-order-unique', ctx);
            expect(findings).toHaveFindingCount('tab-order-unique', 1);
            expect(findings[0].severity).toBe('error');
            expect(findings[0].message).toContain('2 fields');
        });

        it('allows same tabOrder on different pages', () => {
            const ctx = buildContext({
                pages: [
                    { index: 0, id: 'p1', name: 'Page 1', width: 800, height: 600 },
                    { index: 1, id: 'p2', name: 'Page 2', width: 800, height: 600 },
                ],
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', tabOrder: 1, pageIndex: 0, pageName: 'Page 1' },
                    { name: 'F2', type: 'FieldTextbox3', tabOrder: 1, pageIndex: 1, pageName: 'Page 2' },
                ],
            });
            expect(runRule('tab-order-unique', ctx)).toEqual([]);
        });

        it('ignores tabOrder 0 (auto-calculated fields are exempt)', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'F1', type: 'FieldTextbox3', tabOrder: 0 },
                    { name: 'F2', type: 'FieldTextbox3', tabOrder: 0 },
                ],
            });
            expect(runRule('tab-order-unique', ctx)).toEqual([]);
        });

        it('reports field names in the finding', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'Alpha', type: 'FieldTextbox3', tabOrder: 3 },
                    { name: 'Beta', type: 'FieldTextbox3', tabOrder: 3 },
                ],
            });
            const findings = runRule('tab-order-unique', ctx);
            expect(findings[0].field).toContain('Alpha');
            expect(findings[0].field).toContain('Beta');
        });

        it('detects multiple duplicate groups separately', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'A', type: 'FieldTextbox3', tabOrder: 1 },
                    { name: 'B', type: 'FieldTextbox3', tabOrder: 1 },
                    { name: 'C', type: 'FieldTextbox3', tabOrder: 2 },
                    { name: 'D', type: 'FieldTextbox3', tabOrder: 2 },
                ],
            });
            const findings = runRule('tab-order-unique', ctx);
            expect(findings).toHaveFindingCount('tab-order-unique', 2);
        });
    });
});
