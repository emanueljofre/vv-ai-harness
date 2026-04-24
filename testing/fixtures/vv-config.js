/**
 * Shared configuration for VV date-handling Playwright tests.
 *
 * Provides constants used by all test files and global-setup.js:
 * - VV instance credentials (loaded from testing/config/vv-config.json)
 * - DateTest form template URL (creates a fresh form instance on each load)
 * - Field configuration map (8 configs A-H mapping to VV calendar field boolean flags)
 * - Saved record URLs for reload/cross-TZ tests
 *
 * See testing/specs/date-handling/README.md for field configuration documentation.
 */
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./env-config');

// Auth state for @playwright/test (Layer 2 — test runner).
// Separate from testing/config/auth-state.json which is used by playwright-cli (Layer 1 — command).
// Both are gitignored. See README.md "Auth Flow" section for details.
const AUTH_STATE_PATH = path.join(__dirname, '..', 'config', 'auth-state-pw.json');

const vvConfig = loadConfig();

// Per-customer form template URLs.
// Each customer has its own test harness forms with different GUIDs.
// xcid/xcdid accept alias strings (e.g., "EmanuelJofre"/"Main") as well as GUIDs.
// Keys match the .env.json customer key (e.g., "EmanuelJofre-vvdemo", "EmanuelJofre-vv5dev").
const CUSTOMER_TEMPLATES = {
    'EmanuelJofre-vvdemo': {
        xcid: '815eb44d-5ec8-eb11-8200-a8333ebd7939',
        xcdid: '845eb44d-5ec8-eb11-8200-a8333ebd7939',
        templateName: 'DateTest',
        dateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
            '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
            '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
        targetDateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=203734a0-5433-f111-ba23-0afff212cc87' +
            '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
            '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
        // DB-6 (dash-cross-layer) dashboard URL — FormDataDetails grid over DateTest instances
        dashboardDateTest:
            'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails' +
            '?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25',
    },
    'EmanuelJofre-vv5dev': {
        xcid: 'EmanuelJofre',
        xcdid: 'Main',
        templateName: 'Date Test Harness',
        // "Date Test Harness" form — 24 calendar fields with semantic names
        dateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=378b683e-f36b-1410-85ef-001e45e95bc5' +
            '&xcid=EmanuelJofre' +
            '&xcdid=Main',
        // "Target Date Test Harness" — same fields as Date Test Harness with enableQListener=true for Category 4
        targetDateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=34d80a90-f23c-f111-8312-f68855a47462' +
            '&xcid=EmanuelJofre' +
            '&xcdid=Main',
        // Data-detail dashboards (DB-6 cross-layer). Origin = Date Test Harness records; Target = Target Date Test Harness records.
        dashboardDateTest:
            'https://vv5dev.visualvault.com/app/EmanuelJofre/Main/FormDataDetails' +
            '?Mode=ReadOnly&ReportID=b80eb7f6-dd3c-f111-8312-f68855a47462',
        dashboardTargetDateTest:
            'https://vv5dev.visualvault.com/app/EmanuelJofre/Main/FormDataDetails' +
            '?Mode=ReadOnly&ReportID=0a00a253-f33c-f111-8312-f68855a47462',
    },
    WADNR: {
        xcid: 'WADNR',
        xcdid: 'fpOnline',
        templateName: 'zzzDate Test Harness',
        dateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d' +
            '&xcid=WADNR' +
            '&xcdid=fpOnline',
        targetDateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=3f3a0b1a-4834-f111-8310-f323cafecf11' +
            '&xcid=WADNR' +
            '&xcdid=fpOnline',
    },
};

// Resolve by customer key from .env.json first, then fall back to customerAlias for backward compat.
const customerTemplates =
    CUSTOMER_TEMPLATES[vvConfig.customerKey] ||
    CUSTOMER_TEMPLATES[vvConfig.customerAlias] ||
    CUSTOMER_TEMPLATES['EmanuelJofre-vvdemo'];

// Per-customer document library test assets.
// Keyed by .env.json customer key (EmanuelJofre-vvdemo, EmanuelJofre-vv5dev, WADNR).
// Each customer needs a test folder with a Date index field and at least one test
// document. If `null`, doc tests skip.
// Provision via: node tools/admin/setup-doc-test-assets.js --project <name>
const CUSTOMER_DOC_CONFIG = {
    'EmanuelJofre-vvdemo': {
        testDocumentId: '5c4c9e8c-25ca-eb11-8202-d7701a6d4070', // Test1003 in /TestFolder
        dateFieldLabel: 'Date', // Date index field (fieldType 4) assigned to /TestFolder
        testFolderPath: '/TestFolder',
    },
    'EmanuelJofre-vv5dev': {
        testDocumentId: '3b0b0f37-e83f-f111-8313-9bb7e317217d', // zzz-date-test-doc documentId (not revisionId)
        testDocumentRevisionId: '72a66b3e-f36b-1410-85ef-001e45e95bc5',
        testFolderId: '70a66b3e-f36b-1410-85ef-001e45e95bc5',
        dateFieldLabel: 'Date',
        presetDateFieldLabel: 'Date With Preset', // default value: "2026-01-01T00:00:00"
        testFolderPath: '/zzz-date-tests',
    },
    // WADNR: TBD — create zzz-prefixed test folder + document, add to writePolicy.documents[]
    WADNR: null,
};

const customerDocConfig =
    CUSTOMER_DOC_CONFIG[vvConfig.customerKey] !== undefined
        ? CUSTOMER_DOC_CONFIG[vvConfig.customerKey]
        : CUSTOMER_DOC_CONFIG[vvConfig.customerAlias] || null;

// DateTest form template URL — navigating here creates a fresh form instance with all fields empty.
// Never use a saved record URL (DataID=) for tests that need a clean state.
const FORM_TEMPLATE_URL = customerTemplates.dateTest;

// TargetDateTest form template URL — identical to DateTest except all fields have enableQListener=true.
// Used for Category 4 (URL parameter input) tests. May not be available for all customers.
const TARGET_FORM_TEMPLATE_URL = customerTemplates.targetDateTest || null;

// Field configuration map: Config letter -> VV calendar field names and boolean flags.
//
// The DateTest form has 26 fields: 8 configs (A-H) × 3 initial-value modes.
// Each config is a unique combination of three VV calendar field settings:
//   - enableTime:      false = date-only (stores "2026-03-15"), true = datetime (stores "2026-03-15T00:00:00")
//   - ignoreTimezone:  when true + enableTime, triggers Bug #5 (GetFieldValue appends fake "Z" to local times)
//   - useLegacy:       uses V1 legacy code path; legacy popup stores raw toISOString() (UTC datetime)
//
// Each config has three field variants:
//   - base (enableInitialValue=false): empty on form load — used for user-input tests (Cat 1-4, 7-12)
//   - preset (enableInitialValue=true): pre-populated with a configured date — used for Cat 5
//   - currentDate (enableInitialValue=true): auto-filled with today's date — used for Cat 6
//
// Field3/4 are duplicates of Field1/2 (not used in formal tests).
// Field8/9 do not exist (naming gap).
const FIELD_MAP_EMANUELJOFRE_VVDEMO = {
    A: {
        field: 'Field7',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'Field2',
        currentDate: 'Field1',
    },
    B: {
        field: 'Field10',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'Field27',
        currentDate: 'Field28',
    },
    C: {
        field: 'Field6',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'Field15',
        currentDate: 'Field17',
    },
    D: {
        field: 'Field5',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'Field16',
        currentDate: 'Field18',
    },
    E: {
        field: 'Field12',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'Field19',
        currentDate: 'Field23',
    },
    F: {
        field: 'Field11',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'Field20',
        currentDate: 'Field24',
    },
    G: {
        field: 'Field14',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'Field21',
        currentDate: 'Field25',
    },
    H: {
        field: 'Field13',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'Field22',
        currentDate: 'Field26',
    },
};

// "Date Test Harness" form on vv5dev — semantic field names, 8 configs × 3 init modes.
const FIELD_MAP_EMANUELJOFRE_VV5DEV = {
    A: {
        field: 'dateTzAwareV2Empty',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'dateTzAwareV2Preset',
        currentDate: 'dateTzAwareV2Today',
    },
    B: {
        field: 'dateLocalV2Empty',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'dateLocalV2Preset',
        currentDate: 'dateLocalV2Today',
    },
    C: {
        field: 'dateTimeUtcV2Empty',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'dateTimeUtcV2Preset',
        currentDate: 'dateTimeUtcV2Now',
    },
    D: {
        field: 'dateTimeLocalV2Empty',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'dateTimeLocalV2Preset',
        currentDate: 'dateTimeLocalV2Now',
    },
    E: {
        field: 'dateTzAwareLegacyEmpty',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'dateTzAwareLegacyPreset',
        currentDate: 'dateTzAwareLegacyToday',
    },
    F: {
        field: 'dateLocalLegacyEmpty',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'dateLocalLegacyPreset',
        currentDate: 'dateLocalLegacyToday',
    },
    G: {
        field: 'dateTimeUtcLegacyEmpty',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'dateTimeUtcLegacyPreset',
        currentDate: 'dateTimeUtcLegacyNow',
    },
    H: {
        field: 'dateTimeLocalLegacyEmpty',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'dateTimeLocalLegacyPreset',
        currentDate: 'dateTimeLocalLegacyNow',
    },
};

const FIELD_MAP_BY_CUSTOMER = {
    'EmanuelJofre-vvdemo': FIELD_MAP_EMANUELJOFRE_VVDEMO,
    'EmanuelJofre-vv5dev': FIELD_MAP_EMANUELJOFRE_VV5DEV,
    WADNR: FIELD_MAP_EMANUELJOFRE_VVDEMO, // same Field-number naming as vvdemo
};

const FIELD_MAP =
    FIELD_MAP_BY_CUSTOMER[vvConfig.customerKey] ||
    FIELD_MAP_BY_CUSTOMER[vvConfig.customerAlias] ||
    FIELD_MAP_EMANUELJOFRE_VVDEMO;

// DB-6 record → config assignment. Each entry maps a `RECORD_DEFINITIONS` key
// (`db6-dateonly` / `db6-datetime`) to the list of configs populated in that
// record. Customer-agnostic — field names resolve through the active FIELD_MAP
// at runtime; record DataID + instanceName come from SAVED_RECORDS (created
// fresh per build by global-setup). Used by `dash-cross-layer.spec.js`.
const DB6_RECORD_CONFIGS = {
    'db6-dateonly': ['A', 'B', 'E', 'F'],
    'db6-datetime': ['C', 'D', 'G', 'H'],
};

// Record definitions for global-setup.js to create before tests run.
// Each entry describes a form record to be saved via the browser UI, using the specified
// input method per field. The global setup creates these records, extracts DataIDs via
// VV.Form.DataID, and writes them to testing/config/saved-records.json.
//
// Supported methods:
//   'popup'         — selectDateViaPopup() from vv-calendar.js
//   'typed'         — typeDateInField() from vv-calendar.js
//   'setFieldValue' — setFieldValue() from vv-form.js
// Field names resolve via active FIELD_MAP so definitions work across environments.
const BRT = 'America/Sao_Paulo';
const IST = 'Asia/Calcutta';
const DATE_INPUT = { year: 2026, month: 3, day: 15 };
const RECORD_DEFINITIONS = [
    {
        key: 'cat3-A-BRT',
        tz: BRT,
        fields: [
            { name: FIELD_MAP.A.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.D.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
        ],
        description: 'BRT save, Config A + D = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-AD-IST',
        tz: IST,
        fields: [
            { name: FIELD_MAP.A.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.D.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
        ],
        description: 'IST save, Config A + D = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-C-BRT',
        tz: BRT,
        fields: [{ name: FIELD_MAP.C.field, value: '03/15/2026 12:00 AM', method: 'popup', input: DATE_INPUT }],
        description: 'BRT save, Config C = 03/15/2026 12:00 AM via popup',
    },
    {
        key: 'cat3-B-BRT',
        tz: BRT,
        fields: [{ name: FIELD_MAP.B.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT }],
        description: 'BRT save, Config B = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-G-BRT',
        tz: BRT,
        fields: [{ name: FIELD_MAP.G.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT }],
        description: 'BRT save, Config G (legacy DateTime) = 03/15/2026 12:00 AM via typed input',
    },
    {
        key: 'cat3-EF-BRT',
        tz: BRT,
        fields: [
            { name: FIELD_MAP.E.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.F.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
        ],
        description: 'BRT save, Config E + F (legacy date-only) = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-H-BRT',
        tz: BRT,
        fields: [{ name: FIELD_MAP.H.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT }],
        description: 'BRT save, Config H (legacy DateTime + ignoreTZ) = 03/15/2026 12:00 AM via typed input',
    },
    {
        key: 'cat3-B-IST',
        tz: IST,
        fields: [{ name: FIELD_MAP.B.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT }],
        description: 'IST save, Config B (date-only + ignoreTZ) = 03/15/2026 via typed input',
    },
    // --- DB-6 (Dashboard Cross-Layer) reference records ---
    // Two records populated with all 4 date-only (A/B/E/F) or all 4 DateTime (C/D/G/H) configs
    // so the dashboard-cross-layer test can compare grid display vs form display for the same record.
    // Created fresh per build — tied to buildFingerprint in saved-records.json.
    {
        key: 'db6-dateonly',
        tz: BRT,
        fields: [
            { name: FIELD_MAP.A.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.B.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.E.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.F.field, value: '03/15/2026', method: 'typed', input: DATE_INPUT },
        ],
        description: 'DB-6 reference record — date-only configs A/B/E/F populated with 03/15/2026',
    },
    {
        key: 'db6-datetime',
        tz: BRT,
        fields: [
            { name: FIELD_MAP.C.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.D.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.G.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
            { name: FIELD_MAP.H.field, value: '03/15/2026 12:00 AM', method: 'typed', input: DATE_INPUT },
        ],
        description: 'DB-6 reference record — DateTime configs C/D/G/H populated with 03/15/2026 12:00 AM',
    },
];

// Fallback saved records for backward compatibility — used when saved-records.json
// doesn't exist (e.g., running a single test without full setup). These are hardcoded
// to the vvdemo EmanuelJofre/Main database and won't work in other environments.
// Other customers (WADNR) must run global-setup.js to create their own records.
const HARDCODED_SAVED_RECORDS = {
    'cat3-A-BRT':
        '/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-AD-IST':
        '/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-C-BRT':
        '/FormViewer/app?DataID=6d2f720d-8621-4a97-a751-90c4cc8588b6&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-B-BRT':
        '/FormViewer/app?DataID=c63dea33-867e-49e2-b929-fb226b6d3933&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-C-IST':
        '/FormViewer/app?DataID=278aee29-1141-4165-8769-e33869a5056e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-EF-BRT':
        '/FormViewer/app?DataID=bd05735a-f322-4ba5-9f49-d974c797489f&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-H-BRT':
        '/FormViewer/app?DataID=e154623d-d931-411b-a7e8-3699447e0ddf&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-B-IST':
        '/FormViewer/app?DataID=6335170b-6803-4dc9-8390-d5617e1d7f64&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
};

const SAVED_RECORDS_PATH = path.join(__dirname, '..', 'config', 'saved-records.json');

/**
 * Get saved records as a `{ key: { url, dataId?, instanceName? } }` map.
 *
 * Normalizes two legacy shapes:
 *   - Old shape (HARDCODED_SAVED_RECORDS): `{ key: urlString }`
 *   - New shape (global-setup output):     `{ key: { url, dataId, instanceName } }`
 *
 * Also filters out metadata keys prefixed with `__` (e.g., `__buildFingerprint`).
 *
 * Consumers that only need the URL: `SAVED_RECORDS[key].url`.
 */
function getSavedRecords() {
    const raw = fs.existsSync(SAVED_RECORDS_PATH)
        ? JSON.parse(fs.readFileSync(SAVED_RECORDS_PATH, 'utf8'))
        : HARDCODED_SAVED_RECORDS;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith('__')) continue;
        if (typeof v === 'string') out[k] = { url: v };
        else if (v && typeof v === 'object') out[k] = v;
    }
    return out;
}

const SAVED_RECORDS = getSavedRecords();

// Expose the raw JSON (including __buildFingerprint) for diagnostic tools.
const SAVED_RECORDS_META = fs.existsSync(SAVED_RECORDS_PATH)
    ? JSON.parse(fs.readFileSync(SAVED_RECORDS_PATH, 'utf8'))
    : {};

module.exports = {
    vvConfig,
    AUTH_STATE_PATH,
    CUSTOMER_TEMPLATES,
    customerTemplates,
    CUSTOMER_DOC_CONFIG,
    customerDocConfig,
    FORM_TEMPLATE_URL,
    TARGET_FORM_TEMPLATE_URL,
    FIELD_MAP,
    SAVED_RECORDS,
    SAVED_RECORDS_META,
    RECORD_DEFINITIONS,
    DB6_RECORD_CONFIGS,
};
