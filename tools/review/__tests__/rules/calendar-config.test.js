/**
 * Unit tests for rules/calendar-config.js
 *
 * Tests 3 rules: calendar-name-match, calendar-legacy, calendar-valid-config
 */

const { buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('calendar-config rules', () => {
    // ------------------------------------------------------------------
    // calendar-name-match
    // ------------------------------------------------------------------
    describe('calendar-name-match', () => {
        it('passes for date-only name with enableTime=false', () => {
            const ctx = buildContext({
                fields: [{ name: 'Due Date', type: 'FieldCalendar3', enableTime: false }],
            });
            expect(runRule('calendar-name-match', ctx)).toEqual([]);
        });

        it('flags name with "time" but enableTime is OFF', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Date and Time',
                        type: 'FieldCalendar3',
                        enableTime: false,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            const findings = runRule('calendar-name-match', ctx);
            expect(findings).toContainFindingMatch({ ruleId: 'calendar-name-match', field: 'Date and Time' });
            expect(findings[0].severity).toBe('warning');
            expect(findings[0].message).toContain('enableTime is OFF');
        });

        it('flags "datetime" in name with enableTime OFF', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Created Datetime',
                        type: 'FieldCalendar3',
                        enableTime: false,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toHaveFindingCount('calendar-name-match', 1);
        });

        it('flags "timestamp" in name with enableTime OFF', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Approval Timestamp',
                        type: 'FieldCalendar3',
                        enableTime: false,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toHaveFindingCount('calendar-name-match', 1);
        });

        it('passes for "datetime" name with enableTime ON', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Created Datetime',
                        type: 'FieldCalendar3',
                        enableTime: true,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toEqual([]);
        });

        it('flags date-only pattern name with enableTime ON (info severity)', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Due Date',
                        type: 'FieldCalendar3',
                        enableTime: true,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            const findings = runRule('calendar-name-match', ctx);
            expect(findings).toHaveFindingCount('calendar-name-match', 1);
            expect(findings[0].severity).toBe('info');
            expect(findings[0].message).toContain('date-only');
        });

        it('detects "Expiration Date" as strong date-only indicator', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Expiration Date',
                        type: 'FieldCalendar3',
                        enableTime: true,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toHaveFindingCount('calendar-name-match', 1);
        });

        it('detects "Date of Birth" as strong date-only indicator', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Date of Birth',
                        type: 'FieldCalendar3',
                        enableTime: true,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toHaveFindingCount('calendar-name-match', 1);
        });

        it('detects "Start Date" as strong date-only indicator', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Start Date',
                        type: 'FieldCalendar3',
                        enableTime: true,
                        ignoreTimezone: false,
                        useLegacy: false,
                    },
                ],
            });
            expect(runRule('calendar-name-match', ctx)).toHaveFindingCount('calendar-name-match', 1);
        });

        it('skips non-calendar fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'Date and Time', type: 'FieldTextbox3' }],
            });
            expect(runRule('calendar-name-match', ctx)).toEqual([]);
        });

        it('includes config ID in message', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Date and Time',
                        type: 'FieldCalendar3',
                        enableTime: false,
                        ignoreTimezone: true,
                        useLegacy: false,
                    },
                ],
            });
            const findings = runRule('calendar-name-match', ctx);
            expect(findings[0].message).toContain('Config B');
        });
    });

    // ------------------------------------------------------------------
    // calendar-legacy
    // ------------------------------------------------------------------
    describe('calendar-legacy', () => {
        it('flags calendars using legacy datepicker', () => {
            const ctx = buildContext({
                fields: [
                    {
                        name: 'Old Date',
                        type: 'FieldCalendar3',
                        useLegacy: true,
                        enableTime: false,
                        ignoreTimezone: false,
                    },
                ],
            });
            const findings = runRule('calendar-legacy', ctx);
            expect(findings).toHaveFindingCount('calendar-legacy', 1);
            expect(findings[0].severity).toBe('info');
            expect(findings[0].message).toContain('legacy');
        });

        it('passes for modern datepicker', () => {
            const ctx = buildContext({
                fields: [{ name: 'Modern Date', type: 'FieldCalendar3', useLegacy: false }],
            });
            expect(runRule('calendar-legacy', ctx)).toEqual([]);
        });

        it('skips non-calendar fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'X', type: 'FieldTextbox3', useLegacy: true }],
            });
            expect(runRule('calendar-legacy', ctx)).toEqual([]);
        });

        it('includes config label in message', () => {
            const ctx = buildContext({
                fields: [
                    { name: 'X', type: 'FieldCalendar3', useLegacy: true, enableTime: true, ignoreTimezone: false },
                ],
            });
            const findings = runRule('calendar-legacy', ctx);
            expect(findings[0].message).toContain('Config G');
            expect(findings[0].message).toContain('DateTime + Legacy');
        });
    });

    // ------------------------------------------------------------------
    // calendar-valid-config
    // ------------------------------------------------------------------
    describe('calendar-valid-config', () => {
        it('passes for all 8 valid configurations', () => {
            // All boolean combos of enableTime/ignoreTimezone/useLegacy are valid
            const configs = [
                { enableTime: false, ignoreTimezone: false, useLegacy: false },
                { enableTime: false, ignoreTimezone: true, useLegacy: false },
                { enableTime: true, ignoreTimezone: false, useLegacy: false },
                { enableTime: true, ignoreTimezone: true, useLegacy: false },
                { enableTime: false, ignoreTimezone: false, useLegacy: true },
                { enableTime: false, ignoreTimezone: true, useLegacy: true },
                { enableTime: true, ignoreTimezone: false, useLegacy: true },
                { enableTime: true, ignoreTimezone: true, useLegacy: true },
            ];
            for (const config of configs) {
                const ctx = buildContext({
                    fields: [{ name: 'Test', type: 'FieldCalendar3', ...config }],
                });
                expect(runRule('calendar-valid-config', ctx)).toEqual([]);
            }
        });

        it('skips non-calendar fields', () => {
            const ctx = buildContext({
                fields: [{ name: 'X', type: 'FieldTextbox3' }],
            });
            expect(runRule('calendar-valid-config', ctx)).toEqual([]);
        });
    });
});
