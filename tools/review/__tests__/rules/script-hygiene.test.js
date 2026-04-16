/**
 * Unit tests for rules/script-hygiene.js
 *
 * Tests 6 rules:
 *   script-orphan-assignment, script-unassigned, script-unused-template,
 *   script-empty-body, script-field-reference, tab-reference-by-name
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('script-hygiene rules', () => {
    // ------------------------------------------------------------------
    // script-orphan-assignment
    // ------------------------------------------------------------------
    describe('script-orphan-assignment', () => {
        it('passes when all assignments reference valid controls', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', id: 'ctrl-1' }],
                scripts: [{ id: 's1', name: 'onLoad', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: 'ctrl-1', eventId: 'onChange' }],
            });
            expect(runRule('script-orphan-assignment', ctx)).toEqual([]);
        });

        it('flags assignments referencing non-existent controls', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', id: 'ctrl-1' }],
                scripts: [{ id: 's1', name: 'onLoad', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: 'deleted-control-id', eventId: 'onChange' }],
            });
            const findings = runRule('script-orphan-assignment', ctx);
            expect(findings).toHaveFindingCount('script-orphan-assignment', 1);
            expect(findings[0].message).toContain('deleted-control-id');
        });

        it('allows form-level assignments (zero GUID)', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'formLoad', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: '00000000-0000-0000-0000-000000000000', eventId: 'onLoad' }],
            });
            expect(runRule('script-orphan-assignment', ctx)).toEqual([]);
        });

        it('allows built-in control assignments (00000001- prefix)', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'onSave', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: '00000001-0000-0000-0000-000000000001', eventId: 'onSave' }],
            });
            expect(runRule('script-orphan-assignment', ctx)).toEqual([]);
        });

        it('reports the script name in the finding', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'myHandler', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: 'gone', eventId: 'onChange' }],
            });
            const findings = runRule('script-orphan-assignment', ctx);
            expect(findings[0].field).toBe('myHandler');
        });

        it('returns empty for templates with no scripts', () => {
            const ctx = buildContext({ scripts: [], assignments: [] });
            expect(runRule('script-orphan-assignment', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // script-unassigned
    // ------------------------------------------------------------------
    describe('script-unassigned', () => {
        it('flags ControlEventScriptItem with no assignment', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'orphanHandler', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [],
            });
            const findings = runRule('script-unassigned', ctx);
            expect(findings).toHaveFindingCount('script-unassigned', 1);
            expect(findings[0].field).toBe('orphanHandler');
        });

        it('passes when ControlEventScriptItem has an assignment', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'handler', code: 'return;', type: 'ControlEventScriptItem' }],
                assignments: [{ scriptId: 's1', controlId: 'ctrl-1', eventId: 'onChange' }],
            });
            expect(runRule('script-unassigned', ctx)).toEqual([]);
        });

        it('ignores TemplateScriptItem (helper functions are intentionally unassigned)', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'helperFunc', code: 'return 42;', type: 'TemplateScriptItem' }],
                assignments: [],
            });
            expect(runRule('script-unassigned', ctx)).toEqual([]);
        });

        it('ignores other script types (e.g., Function)', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'someFunc', code: 'return;', type: 'Function' }],
                assignments: [],
            });
            expect(runRule('script-unassigned', ctx)).toEqual([]);
        });

        it('returns empty for templates with no scripts', () => {
            const ctx = buildContext({ scripts: [] });
            expect(runRule('script-unassigned', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // script-unused-template
    // ------------------------------------------------------------------
    describe('script-unused-template', () => {
        it('flags TemplateScriptItem not referenced by other scripts', () => {
            const ctx = buildContext({
                scripts: [
                    { id: 's1', name: 'unusedHelper', code: 'return 42;', type: 'TemplateScriptItem' },
                    { id: 's2', name: 'handler', code: 'var x = 1;', type: 'ControlEventScriptItem' },
                ],
            });
            const findings = runRule('script-unused-template', ctx);
            expect(findings).toHaveFindingCount('script-unused-template', 1);
            expect(findings[0].field).toBe('unusedHelper');
        });

        it('passes when template script is called via VV.Form.Template.Name()', () => {
            const ctx = buildContext({
                scripts: [
                    { id: 's1', name: 'myHelper', code: 'return 42;', type: 'TemplateScriptItem' },
                    { id: 's2', name: 'handler', code: 'VV.Form.Template.myHelper();', type: 'ControlEventScriptItem' },
                ],
            });
            expect(runRule('script-unused-template', ctx)).toEqual([]);
        });

        it('passes when template script is called directly as Name()', () => {
            const ctx = buildContext({
                scripts: [
                    { id: 's1', name: 'myHelper', code: 'return 42;', type: 'TemplateScriptItem' },
                    { id: 's2', name: 'handler', code: 'var result = myHelper();', type: 'ControlEventScriptItem' },
                ],
            });
            expect(runRule('script-unused-template', ctx)).toEqual([]);
        });

        it('does not flag ControlEventScriptItem (only checks TemplateScriptItem)', () => {
            const ctx = buildContext({
                scripts: [
                    { id: 's1', name: 'handler1', code: 'return;', type: 'ControlEventScriptItem' },
                    { id: 's2', name: 'handler2', code: 'return;', type: 'ControlEventScriptItem' },
                ],
            });
            expect(runRule('script-unused-template', ctx)).toEqual([]);
        });

        it('does not match a reference in its own code', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'selfRef', code: 'selfRef(); // recursive', type: 'TemplateScriptItem' }],
            });
            // Only one script — no OTHER scripts reference it
            const findings = runRule('script-unused-template', ctx);
            expect(findings).toHaveFindingCount('script-unused-template', 1);
        });

        it('returns empty for templates with no scripts', () => {
            const ctx = buildContext({ scripts: [] });
            expect(runRule('script-unused-template', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // script-empty-body
    // ------------------------------------------------------------------
    describe('script-empty-body', () => {
        it('flags scripts with empty body', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'emptyScript', code: '', type: 'ControlEventScriptItem' }],
            });
            const findings = runRule('script-empty-body', ctx);
            expect(findings).toHaveFindingCount('script-empty-body', 1);
            expect(findings[0].field).toBe('emptyScript');
        });

        it('flags scripts with whitespace-only body', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'ws', code: '   \n\t  ', type: 'ControlEventScriptItem' }],
            });
            expect(runRule('script-empty-body', ctx)).toHaveFindingCount('script-empty-body', 1);
        });

        it('passes for scripts with code', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'handler', code: 'var x = 1;', type: 'ControlEventScriptItem' }],
            });
            expect(runRule('script-empty-body', ctx)).toEqual([]);
        });

        it('returns empty for templates with no scripts', () => {
            const ctx = buildContext({ scripts: [] });
            expect(runRule('script-empty-body', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // script-field-reference
    // ------------------------------------------------------------------
    describe('script-field-reference', () => {
        it('flags GetFieldValue referencing non-existent field', () => {
            const ctx = buildContext({
                fields: [{ name: 'First Name', type: 'FieldTextbox3' }],
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "var x = VV.Form.GetFieldValue('Last Name');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            const findings = runRule('script-field-reference', ctx);
            expect(findings).toHaveFindingCount('script-field-reference', 1);
            expect(findings[0].message).toContain('Last Name');
        });

        it('flags SetFieldValue referencing non-existent field (single-arg pattern)', () => {
            const ctx = buildContext({
                fields: [{ name: 'First Name', type: 'FieldTextbox3' }],
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "VV.Form.SetFieldValue('Gone Field');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            const findings = runRule('script-field-reference', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'script-field-reference' });
            expect(findings[0].message).toContain('Gone Field');
        });

        it('does NOT detect two-argument SetFieldValue calls (known regex limitation)', () => {
            // The regex requires ) immediately after the quoted field name.
            // Two-arg calls like SetFieldValue('Field', 'value') are missed.
            const ctx = buildContext({
                fields: [],
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "VV.Form.SetFieldValue('Gone Field', 'val');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            const findings = runRule('script-field-reference', ctx);
            expect(findings).toEqual([]);
        });

        it('passes when referenced field exists', () => {
            const ctx = buildContext({
                fields: [{ name: 'First Name', type: 'FieldTextbox3' }],
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "var x = VV.Form.GetFieldValue('First Name');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            expect(runRule('script-field-reference', ctx)).toEqual([]);
        });

        it('is case-insensitive for field name matching', () => {
            const ctx = buildContext({
                fields: [{ name: 'First Name', type: 'FieldTextbox3' }],
                scripts: [
                    { id: 's1', name: 'handler', code: "GetFieldValue('first name')", type: 'ControlEventScriptItem' },
                ],
            });
            expect(runRule('script-field-reference', ctx)).toEqual([]);
        });

        it('reports each missing field only once per script', () => {
            const ctx = buildContext({
                fields: [],
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "GetFieldValue('X'); GetFieldValue('X'); GetFieldValue('X');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            const findings = runRule('script-field-reference', ctx);
            expect(findings).toHaveFindingCount('script-field-reference', 1);
        });

        it('skips scripts with empty bodies', () => {
            const ctx = buildContext({
                fields: [],
                scripts: [{ id: 's1', name: 'handler', code: '', type: 'ControlEventScriptItem' }],
            });
            expect(runRule('script-field-reference', ctx)).toEqual([]);
        });
    });

    // ------------------------------------------------------------------
    // tab-reference-by-name
    // ------------------------------------------------------------------
    describe('tab-reference-by-name', () => {
        it('flags SelectTab with numeric argument', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'handler', code: 'VV.Form.SelectTab(2);', type: 'ControlEventScriptItem' }],
            });
            const findings = runRule('tab-reference-by-name', ctx);
            expect(findings).toHaveFindingCount('tab-reference-by-name', 1);
            expect(findings[0].message).toContain('SelectTab(2)');
        });

        it('flags TabIndex comparisons', () => {
            const ctx = buildContext({
                scripts: [{ id: 's1', name: 'handler', code: 'if (TabIndex == 0) {}', type: 'ControlEventScriptItem' }],
            });
            const findings = runRule('tab-reference-by-name', ctx);
            expect(findings).toHaveFindingCount('tab-reference-by-name', 1);
        });

        it('flags .selectedIndex assignment', () => {
            const ctx = buildContext({
                scripts: [
                    { id: 's1', name: 'handler', code: 'tabs.selectedIndex = 3;', type: 'ControlEventScriptItem' },
                ],
            });
            const findings = runRule('tab-reference-by-name', ctx);
            expect(findings).toHaveFindingCount('tab-reference-by-name', 1);
        });

        it('passes when tabs are referenced by name', () => {
            const ctx = buildContext({
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: "VV.Form.SelectTab('Details');",
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            expect(runRule('tab-reference-by-name', ctx)).toEqual([]);
        });

        it('detects multiple numeric references in one script', () => {
            const ctx = buildContext({
                scripts: [
                    {
                        id: 's1',
                        name: 'handler',
                        code: 'SelectTab(0); SelectTab(1); SelectTab(2);',
                        type: 'ControlEventScriptItem',
                    },
                ],
            });
            const findings = runRule('tab-reference-by-name', ctx);
            expect(findings.length).toBe(3);
        });

        it('returns empty for templates with no scripts', () => {
            const ctx = buildContext({ scripts: [] });
            expect(runRule('tab-reference-by-name', ctx)).toEqual([]);
        });
    });
});
