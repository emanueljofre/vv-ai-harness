/**
 * Unit tests for lib/parse-template.js
 *
 * Validates that XML form templates are correctly parsed into
 * the standardized context object consumed by all review rules.
 */

const path = require('path');
const { parseTemplate, toBool } = require('../lib/parse-template');

const FIXTURES = path.join(__dirname, 'fixtures');

describe('parseTemplate', () => {
    describe('minimal template', () => {
        let ctx;

        beforeAll(() => {
            ctx = parseTemplate(path.join(FIXTURES, 'minimal-template.xml'));
        });

        it('extracts template name from filename', () => {
            expect(ctx.templateName).toBe('minimal-template');
        });

        it('parses pages', () => {
            expect(ctx.pages).toHaveLength(1);
            expect(ctx.pages[0]).toMatchObject({
                index: 0,
                name: 'Page 1',
                width: 800,
                height: 600,
            });
        });

        it('parses all fields', () => {
            expect(ctx.fields).toHaveLength(4);
        });

        it('parses field types correctly', () => {
            const types = ctx.fields.map((f) => f.type);
            expect(types).toContain('FieldTextbox3');
            expect(types).toContain('FieldCalendar3');
            expect(types).toContain('FieldDropDownList3');
            expect(types).toContain('FieldLabel');
        });

        it('parses field properties', () => {
            const firstName = ctx.fields.find((f) => f.name === 'First Name');
            expect(firstName).toMatchObject({
                id: 'field1',
                type: 'FieldTextbox3',
                pageIndex: 0,
                pageName: 'Page 1',
                layoutLeft: 100,
                layoutTop: 50,
                width: 200,
                tabOrder: 1,
                accessibilityLabel: 'First Name',
            });
        });

        it('parses calendar-specific properties', () => {
            const dob = ctx.fields.find((f) => f.name === 'Date of Birth');
            expect(dob.enableTime).toBe(false);
            expect(dob.ignoreTimezone).toBe(true);
            expect(dob.useLegacy).toBe(false);
        });

        it('parses scripts', () => {
            expect(ctx.scripts).toHaveLength(1);
            expect(ctx.scripts[0]).toMatchObject({
                id: 'script1',
                name: 'onLoad',
                type: 'Function',
            });
            expect(ctx.scripts[0].code).toContain('VV.Form.GetFieldValue');
        });

        it('parses script assignments', () => {
            expect(ctx.assignments).toHaveLength(1);
            expect(ctx.assignments[0]).toMatchObject({
                scriptId: 'script1',
                controlId: 'field1',
                eventId: 'onLoad',
            });
        });

        it('parses groups', () => {
            expect(ctx.groups).toHaveLength(1);
            expect(ctx.groups[0].name).toBe('ReadOnly Group');
            expect(ctx.groups[0].fieldMembers).toHaveLength(1);
            expect(ctx.groups[0].fieldMembers[0].fieldId).toBe('field1');
        });

        it('builds controlMap', () => {
            expect(ctx.controlMap.size).toBe(4);
            expect(ctx.controlMap.get('field1')).toMatchObject({
                name: 'First Name',
                type: 'FieldTextbox3',
            });
        });
    });

    describe('empty template', () => {
        let ctx;

        beforeAll(() => {
            ctx = parseTemplate(path.join(FIXTURES, 'empty-template.xml'));
        });

        it('parses without error', () => {
            expect(ctx).toBeDefined();
        });

        it('returns empty fields array', () => {
            expect(ctx.fields).toEqual([]);
        });

        it('returns empty scripts array', () => {
            expect(ctx.scripts).toEqual([]);
        });

        it('returns one page', () => {
            expect(ctx.pages).toHaveLength(1);
        });
    });

    describe('missing FormEntity', () => {
        it('throws a descriptive error', () => {
            // Create a temp file with invalid XML structure
            const fs = require('fs');
            const os = require('os');
            const tmpFile = path.join(os.tmpdir(), 'bad-template.xml');
            fs.writeFileSync(tmpFile, '<?xml version="1.0"?><NotAForm />', 'utf-8');

            expect(() => parseTemplate(tmpFile)).toThrow(/No FormEntity found/);

            fs.unlinkSync(tmpFile);
        });
    });
});

describe('toBool', () => {
    it('handles boolean true', () => expect(toBool(true)).toBe(true));
    it('handles boolean false', () => expect(toBool(false)).toBe(false));
    it('handles string "true"', () => expect(toBool('true')).toBe(true));
    it('handles string "True"', () => expect(toBool('True')).toBe(true));
    it('handles string "false"', () => expect(toBool('false')).toBe(false));
    it('handles string "FALSE"', () => expect(toBool('FALSE')).toBe(false));
    it('handles undefined', () => expect(toBool(undefined)).toBe(false));
    it('handles null', () => expect(toBool(null)).toBe(false));
    it('handles empty string', () => expect(toBool('')).toBe(false));
});
