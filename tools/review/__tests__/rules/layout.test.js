/**
 * Unit tests for rules/layout.js
 *
 * Tests 3 rules: distance-to-border, label-overlap, button-min-size
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('layout rules', () => {
    // ------------------------------------------------------------------
    // distance-to-border
    // ------------------------------------------------------------------
    describe('distance-to-border', () => {
        const page = { index: 0, id: 'p1', name: 'Page 1', width: 800, height: 600 };

        it('flags fields too close to the right border (< 30px)', () => {
            // Field at left=700, width=80 → right edge at 780 → distance to 800 = 20px
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'F1', type: 'FieldTextbox3', layoutLeft: 700, width: 80 }],
            });
            const findings = runRule('distance-to-border', ctx);
            expect(findings).toHaveFindingCount('distance-to-border', 1);
            expect(findings[0].message).toContain('20px');
            expect(findings[0].message).toContain('minimum: 30px');
        });

        it('passes when field is far enough from the border', () => {
            // Field at left=100, width=200 → right edge at 300 → distance to 800 = 500px
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'F1', type: 'FieldTextbox3', layoutLeft: 100, width: 200 }],
            });
            expect(runRule('distance-to-border', ctx)).toEqual([]);
        });

        it('passes when distance is exactly 30px (boundary)', () => {
            // Field at left=570, width=200 → right edge at 770 → distance to 800 = 30px
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'F1', type: 'FieldTextbox3', layoutLeft: 570, width: 200 }],
            });
            expect(runRule('distance-to-border', ctx)).toEqual([]);
        });

        it('flags at 29px distance (just below threshold)', () => {
            // right edge at 771 → distance = 29px
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'F1', type: 'FieldTextbox3', layoutLeft: 571, width: 200 }],
            });
            expect(runRule('distance-to-border', ctx)).toHaveFindingCount('distance-to-border', 1);
        });

        it('skips FieldLabel (not in DISTANCE_CHECK_TYPES)', () => {
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'Label', type: 'FieldLabel', layoutLeft: 790, width: 50 }],
            });
            expect(runRule('distance-to-border', ctx)).toEqual([]);
        });

        it('skips FieldContainer (not in DISTANCE_CHECK_TYPES)', () => {
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'Box', type: 'FieldContainer', layoutLeft: 790, width: 50 }],
            });
            expect(runRule('distance-to-border', ctx)).toEqual([]);
        });

        it('checks all applicable field types', () => {
            const types = [
                'FormButton',
                'FieldCalendar3',
                'CellField',
                'FieldCheckbox',
                'FieldDropDownList3',
                'FormIDStamp',
                'ImageFormControl',
                'UserIDStamp',
                'FieldTextbox3',
                'FieldTextArea3',
                'UploadButton',
                'FieldSlider',
                'BarCodeFormControl',
                'QuestionsControl',
            ];
            const ctx = buildContext({
                pages: [page],
                fields: types.map((type, i) => ({
                    name: `F${i}`,
                    type,
                    layoutLeft: 790,
                    width: 50,
                })),
            });
            const findings = runRule('distance-to-border', ctx);
            expect(findings).toHaveLength(types.length);
        });

        it('handles field extending beyond page width (negative distance)', () => {
            const ctx = buildContext({
                pages: [page],
                fields: [{ name: 'Overflow', type: 'FieldTextbox3', layoutLeft: 750, width: 100 }],
            });
            const findings = runRule('distance-to-border', ctx);
            expect(findings).toHaveFindingCount('distance-to-border', 1);
            // 750 + 100 = 850, distance = 800 - 850 = -50
            expect(findings[0].message).toContain('-50px');
        });
    });

    // ------------------------------------------------------------------
    // label-overlap
    // ------------------------------------------------------------------
    describe('label-overlap', () => {
        it('flags label overlapping an adjacent field', () => {
            // Label right edge: 50 + 120 = 170. Field left: 160. Overlap: 10px
            const ctx = buildContext({
                fields: [
                    { name: 'lbl Name', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 120 },
                    { name: 'First Name', type: 'FieldTextbox3', layoutLeft: 160, layoutTop: 100, width: 200 },
                ],
            });
            const findings = runRule('label-overlap', ctx);
            expect(findings).toHaveFindingCount('label-overlap', 1);
            expect(findings[0].field).toBe('First Name');
            expect(findings[0].message).toContain('lbl Name');
            expect(findings[0].message).toContain('10px');
        });

        it('passes when there is no overlap', () => {
            // Label right edge: 50 + 80 = 130. Field left: 140. Gap: 10px
            const ctx = buildContext({
                fields: [
                    { name: 'lbl Name', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 80 },
                    { name: 'First Name', type: 'FieldTextbox3', layoutLeft: 140, layoutTop: 100, width: 200 },
                ],
            });
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });

        it('only checks fields on the same row (vertical tolerance 15px)', () => {
            // Label at top=100, field at top=120 (20px diff > 15px tolerance)
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 200 },
                    { name: 'F1', type: 'FieldTextbox3', layoutLeft: 100, layoutTop: 120, width: 200 },
                ],
            });
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });

        it('only checks fields to the right of the label', () => {
            // Field is to the LEFT of the label — should not be checked
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 200, layoutTop: 100, width: 100 },
                    { name: 'F1', type: 'FieldTextbox3', layoutLeft: 50, layoutTop: 100, width: 200 },
                ],
            });
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });

        it('requires overlap >= 5px (threshold)', () => {
            // Label right: 50 + 100 = 150. Field left: 146. Overlap: 4px (below 5px threshold)
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 100 },
                    { name: 'F1', type: 'FieldTextbox3', layoutLeft: 146, layoutTop: 100, width: 200 },
                ],
            });
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });

        it('excludes FormIDStamp from overlap targets', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'lbl', type: 'FieldLabel', layoutLeft: 50, layoutTop: 100, width: 200 },
                    { name: 'Stamp', type: 'FormIDStamp', layoutLeft: 100, layoutTop: 100, width: 200 },
                ],
            });
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });

        it('checks overlaps on separate pages independently', () => {
            const ctx = buildContext({
                pages: [
                    { index: 0, id: 'p1', name: 'Page 1', width: 800, height: 600 },
                    { index: 1, id: 'p2', name: 'Page 2', width: 800, height: 600 },
                ],
                fields: [
                    {
                        name: 'lbl1',
                        type: 'FieldLabel',
                        layoutLeft: 50,
                        layoutTop: 100,
                        width: 200,
                        pageIndex: 0,
                        pageName: 'Page 1',
                    },
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        layoutLeft: 100,
                        layoutTop: 100,
                        width: 200,
                        pageIndex: 1,
                        pageName: 'Page 2',
                    },
                ],
            });
            // Different pages — no overlap detected
            expect(runRule('label-overlap', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // button-min-size
    // ------------------------------------------------------------------
    describe('button-min-size', () => {
        it('flags buttons smaller than 24x24px', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnSmall',
                        type: 'FormButton',
                        _raw: { Width: 20, Height: 15 },
                    },
                ],
            });
            const findings = runRule('button-min-size', ctx);
            expect(findings).toHaveFindingCount('button-min-size', 1);
            expect(findings[0].message).toContain('20x15px');
            expect(findings[0].message).toContain('24x24px');
        });

        it('passes for buttons at exactly 24x24px', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnOk',
                        type: 'FormButton',
                        _raw: { Width: 24, Height: 24 },
                    },
                ],
            });
            expect(runRule('button-min-size', ctx)).toEqual([]);
        });

        it('passes for buttons larger than minimum', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnLarge',
                        type: 'FormButton',
                        _raw: { Width: 100, Height: 30 },
                    },
                ],
            });
            expect(runRule('button-min-size', ctx)).toEqual([]);
        });

        it('flags button with sufficient width but insufficient height', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnWide',
                        type: 'FormButton',
                        _raw: { Width: 100, Height: 20 },
                    },
                ],
            });
            expect(runRule('button-min-size', ctx)).toHaveFindingCount('button-min-size', 1);
        });

        it('flags button with sufficient height but insufficient width', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnNarrow',
                        type: 'FormButton',
                        _raw: { Width: 20, Height: 30 },
                    },
                ],
            });
            expect(runRule('button-min-size', ctx)).toHaveFindingCount('button-min-size', 1);
        });

        it('skips non-button fields', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'F1',
                        type: 'FieldTextbox3',
                        _raw: { Width: 10, Height: 10 },
                    },
                ],
            });
            expect(runRule('button-min-size', ctx)).toEqual([]);
        });

        it('handles missing Width/Height in _raw', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'btnEmpty',
                        type: 'FormButton',
                        _raw: {},
                    },
                ],
            });
            // Width=0, Height=0 → both < 24
            expect(runRule('button-min-size', ctx)).toHaveFindingCount('button-min-size', 1);
        });
    });
});
