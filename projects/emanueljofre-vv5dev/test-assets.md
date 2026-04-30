# Test Assets — EmanuelJofre-vv5dev (vv5dev / EmanuelJofre / Main)

Read-write: **Yes** — personal sandbox on vv5dev. All writes allowed (`writePolicy: unrestricted`).

**Platform variant**: Kendo v2 + V2 calendar code path (`useUpdatedCalendarValueLogic = true`, DB-scope Central Admin). Contrasts with vvdemo (Kendo v1 + V1). See [`research/date-handling/CLAUDE.md`](../../research/date-handling/CLAUDE.md) § V1 vs V2.

## Forms

| Name | Template ID | Purpose | Configs | Notes |
|------|-------------|---------|---------|-------|
| Date Test Harness | `713af8f2-d93c-f111-8312-f68855a47462` | Full date config coverage — V2 harness | A-H × 3 modes (24 fields) | Semantic field names; field map in `testing/fixtures/vv-config.js` `FIELD_MAP_BY_CUSTOMER['EmanuelJofre-vv5dev']` |

TargetDateTest equivalent (URL-parameter category) not yet created on vv5dev.

### Date Test Harness — Field Map

8 configs × 3 initial-value modes. Full executable config in `testing/fixtures/vv-config.js` (`FIELD_MAP_BY_CUSTOMER['EmanuelJofre-vv5dev']`).

| Config | enableTime | ignoreTZ | useLegacy | Base (empty) | Preset | CurrentDate |
|--------|-----------|----------|-----------|-------------|--------|-------------|
| A | false | false | false | dateTzAwareV2Empty | dateTzAwareV2Preset | dateTzAwareV2Today |
| B | false | true | false | dateLocalV2Empty | dateLocalV2Preset | dateLocalV2Today |
| C | true | false | false | dateTimeUtcV2Empty | dateTimeUtcV2Preset | dateTimeUtcV2Now |
| D | true | true | false | dateTimeLocalV2Empty | dateTimeLocalV2Preset | dateTimeLocalV2Now |
| E | false | false | true | dateTzAwareLegacyEmpty | dateTzAwareLegacyPreset | dateTzAwareLegacyToday |
| F | false | true | true | dateLocalLegacyEmpty | dateLocalLegacyPreset | dateLocalLegacyToday |
| G | true | false | true | dateTimeUtcLegacyEmpty | dateTimeUtcLegacyPreset | dateTimeUtcLegacyNow |
| H | true | true | true | dateTimeLocalLegacyEmpty | dateTimeLocalLegacyPreset | dateTimeLocalLegacyNow |

## Saved Records

Created by `testing/global-setup.js` and cached in `testing/config/saved-records.json`. Field names resolve via the active `FIELD_MAP` at runtime — same record definitions as vvdemo, different concrete field names.

Record keys: `cat3-A-BRT`, `cat3-AD-IST`, `cat3-C-BRT`, `cat3-B-BRT`, `cat3-G-BRT`, `cat3-EF-BRT`, `cat3-H-BRT`, `cat3-B-IST` (see `vv-config.js` `RECORD_DEFINITIONS`).

## Custom Queries

Required for WS-14 (Custom Query read path). Created manually in Central Admin → Custom Queries. Both `Text Query`, cache **disabled**, connection `use1d-vvdevsql1_vv5dev_EmanuelJofre_Main_FormData`.

| Name | SQL | Used by |
|------|-----|---------|
| `DateTest - All Records` | `SELECT TOP 2000 * FROM [Date Test Harness] ORDER BY vvCreateDate DESC` | WS-14 filter variant (ODATA `q` applied on top) |
| `DateTest - By Instance Name` | `SELECT TOP 100 * FROM [Date Test Harness] WHERE DhDocID = @instanceName` | WS-14 param variant (SQL `@instanceName` binding) |

> **`ORDER BY vvCreateDate DESC` is load-bearing on vv5dev**: the form table exceeds 2000 rows. VV's `q` filter runs on the post-TOP SQL result set, so without descending order fresh rows fall outside the window and the filter can't find them. See `research/date-handling/web-services/matrix.md § WS-14` for the two platform mechanics uncovered during scaffolding (camelCased response columns + TOP/ORDER BY interaction).

Query names are hardcoded in `scripts/examples/webservice-test-harness.js` `actionCustomQueryRead()`. Change them there if you rename the queries in Control Panel.

## Document Library

Provisioning: `node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev` (idempotent — safe to rerun).

| Asset            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Test folder      | `/zzz-date-tests` (id `70a66b3e-f36b-1410-85ef-001e45e95bc5`)         |
| Test document    | `zzz-date-test-doc` (documentId `3b0b0f37-e83f-f111-8313-9bb7e317217d`, revisionId `72a66b3e-f36b-1410-85ef-001e45e95bc5`) |
| Index field 1    | `Date` (fieldType 4, no default) — assigned to folder                  |
| Index field 2    | `Date With Preset` (fieldType 4, defaultValue `2026-01-01T00:00:00`) — assigned to folder |

CUSTOMER_DOC_CONFIG wired in `testing/fixtures/vv-config.js`. Fresh-doc uploads for DOC-11 land in the same folder with `zzz-doc11-<timestamp>` naming.

## Notes

- **Playwright integration**: `testing/fixtures/vv-config.js` selects the per-customer form URL + FIELD_MAP via `vvConfig.customerKey`. The customer key is `EmanuelJofre-vv5dev` (set as `.env.json` `activeCustomer`).
- **V1 gate**: test specs in `testing/specs/date-handling/` previously hard-asserted V1 (`expect(isV2).toBe(false)`); downgraded to `void isV2` so the V2 env runs through. See `research/date-handling/forms-calendar/analysis/overview.md` for V1 vs V2 expected-value deltas.
