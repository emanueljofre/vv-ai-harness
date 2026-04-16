/**
 * Unit tests for rules/upload-config.js
 *
 * Tests 1 rule: simple-upload
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('upload-config rules', () => {
    describe('simple-upload', () => {
        it('passes when DisplayUploadedFiles is false', () => {
            const ctx = buildContext({
                fields: [{ name: 'Upload Doc', type: 'UploadButton', displayUploadedFiles: 'false' }],
            });
            expect(runRule('simple-upload', ctx)).toEqual([]);
        });

        it('flags when DisplayUploadedFiles is true', () => {
            const ctx = buildContext({
                fields: [{ name: 'Upload Doc', type: 'UploadButton', displayUploadedFiles: 'true' }],
            });
            const findings = runRule('simple-upload', ctx);
            expect(findings).toHaveFindingCount('simple-upload', 1);
            expect(findings[0].message).toContain('true');
        });

        it('flags when DisplayUploadedFiles is not set (empty string)', () => {
            const ctx = buildContext({
                fields: [{ name: 'Upload Doc', type: 'UploadButton', displayUploadedFiles: '' }],
            });
            const findings = runRule('simple-upload', ctx);
            expect(findings).toHaveFindingCount('simple-upload', 1);
            expect(findings[0].message).toContain('not set');
        });

        it('skips non-UploadButton fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'F1', type: 'FieldTextbox3', displayUploadedFiles: 'true' }],
            });
            expect(runRule('simple-upload', ctx)).toEqual([]);
        });

        it('is case-insensitive for the "false" check', () => {
            const ctx = buildContext({
                fields: [{ name: 'Upload', type: 'UploadButton', displayUploadedFiles: 'False' }],
            });
            expect(runRule('simple-upload', ctx)).toEqual([]);
        });
    });
});
