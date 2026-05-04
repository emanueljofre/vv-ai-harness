# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components**. Goal: find, test, and document every date-related bug in the platform.

## Scope

| Component                           | Status      | Folder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Forms — Calendar Fields**         | In Progress | `forms-calendar/` (269 baselined + 95 backlog — Cat 17/18/19 for platform-scope toggles; Cat 20 multi-user concurrency added 2026-04-22, 13 PENDING slots for cross-user drift, stale-write detection, helpdesk-pattern probes)                                                                                                                                                                                                                                                                                                                                          |
| **Web Services (REST API)**         | In Progress | `web-services/` (148 baselined on WADNR 2026-04-10 + **129/129 PASS on vv5dev V2 baseline 2026-05-04** — WS-1..9 + WS-14 across BRT/IST/UTC; matrix expected values for `ws-8-A-fmtUS` / `ws-8-C-fmtZ` corrected `"undefined"` → `Match`; 22 browser-only slots non-executable via the API runner). **V1/V2 parity confirmed (2026-04-22)**: vvdemo V1 (`b18dbfdb`) vs vv5dev V2 (`f36b65dd`) audit at build `f36b65dd` → **135/135 IDENTICAL / 0 unflagged divergences**. No regression on the API write path. The `useUpdatedCalendarValueLogic` toggle is Forms-only. |
| **Analytic Dashboards**             | In Progress | `dashboards/` (44 baselined on WADNR 2026-04-10 + 36/44 baselined on vv5dev 2026-04-22 — DB-1/2/3/4/5/6/7/8 all PASS; 12 backlog — DB-9 Culture new 2026-04-20)                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Document Library (index fields)** | In Progress | `document-library/` (58 baselined + 16 backlog — DOC-9 Culture and DOC-10 lifecycle defaults new 2026-04-20; DOC-11 index-field defaults added 2026-04-24; DOC-7 query/search baselined 2026-04-24). vv5dev baseline 2026-04-24: 40/40 PASS across 4 TZ × 3 browsers (DOC-1..DOC-4, DOC-7, DOC-11). Empty-string clearing clears the field on vv5dev — DOC-BUG-2 may be a partial fix vs. vvdemo; flagged for follow-up. DOC-7 confirmed DOC-BUG-1 extends to query semantics (consumers must use server-converted UTC, not original offset).                            |
| **Workflows (date triggers)**       | Not Started | `workflows/` — 22 PENDING slots scaffolded 2026-04-20 (WF-1 due-date, WF-2 work-week, WF-3 escalation, WF-4-6)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Scheduled Processes (date)**      | In Progress | `scheduled-processes/` — 14 slots total. 2026-04-22: SP-2 (4/4 PASS) + SP-4 (2/2 node+SQL PASS, customerTz leg blocked on API gap) baselined on emanueljofre-vv5dev via `DateTimeNowProbe`. SP-1 (firing window) + SP-3 (Service Tasks) DEFERRED — require ≥24h observation. Matrix corrections landed: SQL returned as ISO-8601 UTC on the wire, SQL host TZ = UTC (not UTC-7).                                                                                                                                                                                         |
| **VisualVault Reports**             | Not Started | `reports/` (future)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Node.js Client Library**          | Not Started | `node-client/` (future)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

> **2026-04-20 expansion**: Central Admin mapping revealed the three-scope hierarchy (Environment / Customer / Database) and the full inventory of date-affecting toggles. Each matrix now carries a `Platform Scope` section, scope-suffix ID convention, and an `Open Gaps & Backlog` section. See [`projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md`](../../projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md) for the scope catalog.

## Folder Structure

```
research/date-handling/
  analysis/                    # RCA, fix strategy, leadership recommendation, cross-layer consistency matrix
  forms-calendar/              # Forms investigation: analysis/, matrix.md, test-cases/
  web-services/                # WS investigation: analysis/, matrix.md, test-cases/
  dashboards/                  # Dashboard investigation: analysis/, matrix.md, test-cases/
  document-library/            # Document index field investigation: analysis/overview.md
```

## Key Facts

- **Database**: All calendar fields are SQL Server `datetime` type (no `date` type). JS format differences translate to actual data differences in DB.
- **VV server timezone**: BRT (UTC-3) on vvdemo, UTC-7 on vv5dev. Note: in the form read/write cycle the server is a passthrough (stores naive datetimes, appends `Z` on read). Shift magnitude depends on the **user's browser timezone**, not the server's. Server TZ only matters for server-generated timestamps (`DateTime.Now`, `GETDATE()`) and server-side processing.
- **Mixed timezone storage**: Same `datetime` column contains both UTC values (from `toISOString()`) and timezone-ambiguous local values (from `getSaveValue()`).
- **API write path**: REST API (`postForms`) stores dates uniformly — no Config C/D divergence, no FORM-BUG-7. Mixed storage is exclusively a Forms Angular pipeline issue.
- **All 6 cross-cutting questions answered.** See `analysis/temporal-models.md`.
- **JSON templates**: Newer Form Designer uses a sparse JSON format (only non-default values stored). Designer exposes all date flags. Validated: identical behavior to XML templates per config. See `forms-calendar/analysis/json-template-date-behavior.md`.

## Confirmed Bugs

| ID                               | Name                                                                  | Severity | File                                                              |
| -------------------------------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| FORM-BUG-1                       | Timezone marker stripped on form load                                 | Medium   | `forms-calendar/analysis/bug-1-timezone-stripping.md`             |
| FORM-BUG-2                       | Popup and typed input store different values                          | Low      | `forms-calendar/analysis/bug-2-inconsistent-handlers.md`          |
| FORM-BUG-3                       | V2 hardcoded parameters                                               | Low      | `forms-calendar/analysis/bug-3-hardcoded-params.md`               |
| FORM-BUG-4                       | Save format strips timezone                                           | Medium   | `forms-calendar/analysis/bug-4-legacy-save-format.md`             |
| FORM-BUG-5                       | Fake Z in GetFieldValue — progressive drift                           | **High** | `forms-calendar/analysis/bug-5-fake-z-drift.md`                   |
| FORM-BUG-6                       | GetFieldValue returns "Invalid Date" for empty fields                 | Medium   | `forms-calendar/analysis/bug-6-invalid-date-empty.md`             |
| FORM-BUG-7                       | SetFieldValue stores wrong day for UTC+                               | **High** | `forms-calendar/analysis/bug-7-wrong-day-utc-plus.md`             |
| FORM-BUG-8                       | V2 `SetFieldValue('' \| null)` hangs indefinitely                     | Medium   | `docs/reference/form-fields.md` (research doc pending)            |
| FORM-BUG-V2-EPOCH-PRESERVED      | V2 preserves epoch-ms input instead of normalizing to ISO             | Medium   | `forms-calendar/analysis/bug-9-v2-epoch-preserved.md`             |
| FORM-BUG-V2-URL-PARAM-NORMALIZE  | V2 URL-param init normalizes to UTC ISO, ignoring `ignoreTimezone`    | Medium   | `forms-calendar/analysis/bug-10-v2-url-param-normalize.md`        |
| FORM-BUG-V2-LEGACY-Z             | V2 appends `.000Z` to values V1 stored as naive local strings         | Low      | `forms-calendar/analysis/bug-11-v2-legacy-z.md`                   |
| FORM-BUG-V2-UTCMIDNIGHT          | V2 stores date-only fields as `T00:00:00.000Z` instead of bare date   | Low      | `docs/reference/form-fields.md` (research doc pending)            |
| FORM-BUG-V2-PRESET-YEAR          | V2 preset Initial Value shifts year/month on form init                | Medium   | `docs/reference/form-fields.md` (research doc pending)            |
| FORM-BUG-V2-TYPED-MM-OVERFLOW    | V2 typed input silently normalizes invalid month via JS Date overflow | **High** | `docs/reference/form-fields.md` (research doc pending)            |
| FORM-BUG-V2-CONFIG-D-TYPED-EMPTY | V2 Config D typed input silently fails to commit                      | Medium   | `docs/reference/form-fields.md` (research doc pending)            |
| WS-BUG-1                         | Cross-layer shift (API→Forms)                                         | High     | `web-services/analysis/ws-bug-1-cross-layer-shift.md`             |
| WS-BUG-2                         | DD/MM/YYYY silently discarded                                         | High     | `web-services/analysis/ws-bug-2-latam-data-loss.md`               |
| WS-BUG-3                         | Ambiguous dates silently swapped                                      | High     | `web-services/analysis/ws-bug-3-ambiguous-dates.md`               |
| WS-BUG-4                         | Two endpoints store the same value, Forms diverges                    | Medium   | `web-services/analysis/ws-bug-4-endpoint-format-mismatch.md`      |
| WS-BUG-5                         | Compact ISO and epoch formats silently discarded                      | Medium   | `web-services/analysis/ws-bug-5-silent-null-formats.md`           |
| WS-BUG-6                         | Date-only fields accept time components                               | Medium   | `web-services/analysis/ws-bug-6-no-date-only-enforcement.md`      |
| DB-BUG-1                         | Dashboard format inconsistency                                        | Medium   | `dashboards/analysis/formdashboard-bug-1-format-inconsistency.md` |
| DOC-BUG-1                        | Index field: TZ offset converted to UTC, Z stripped                   | **High** | `document-library/analysis/overview.md`                           |
| DOC-BUG-2                        | Index field: cannot clear date once set                               | Medium   | `document-library/analysis/overview.md`                           |

Each bug has a companion `*-fix-recommendations.md` file. See `analysis/temporal-models.md` for the root cause analysis and `analysis/fix-strategy.md` for the fix roadmap.

## Forms Calendar Fields (Current Focus)

See `forms-calendar/matrix.md` for current coverage status.

### Key Context

- **V1 vs V2**: Two init paths gated by `useUpdatedCalendarValueLogic`, controlled by the **"Use Updated Calendar Control Logic"** checkbox in Central Admin (Database scope wins over Customer scope; pushed via `setUserInfo()`). Tests on vvdemo/EmanuelJofre-vvdemo and WADNR run V1 (box unchecked at both scopes); tests on vv5dev/EmanuelJofre-vv5dev run **V2** (DB-scope checked). See `forms-calendar/analysis/overview.md` § V1 vs V2 and [`docs/architecture/visualvault-platform.md § Central Admin`](../../docs/architecture/visualvault-platform.md#central-admin-cross-customer-control-panel).
- **Code paths**: SetFieldValue, GetFieldValue, form load, save — documented in `forms-calendar/analysis/overview.md` § Confirmed Code Paths.
- **Test assets by environment**: [`projects/emanueljofre-vvdemo/test-assets.md`](../../projects/emanueljofre-vvdemo/test-assets.md) (read-write), [`projects/wadnr/test-assets.md`](../../projects/wadnr/test-assets.md) (read-only)
- **Customer-scoped analyses**:
    - [`projects/wadnr/analysis/date-handling-current-state.md`](../../projects/wadnr/analysis/date-handling-current-state.md) — 11-layer catalogue + per-config (B/C/D) scenario walkthroughs across PST/EST/UTC + XLAYER matrix + risk register for WADNR (V1).
    - [`projects/emanueljofre-vv5dev/analysis/date-handling/`](../../projects/emanueljofre-vv5dev/analysis/date-handling/) — V2 platform documentation: [`v2-bugs-catalog.md`](../../projects/emanueljofre-vv5dev/analysis/date-handling/v2-bugs-catalog.md) (21 bugs grouped by category), [`bug-reports/`](../../projects/emanueljofre-vv5dev/analysis/date-handling/bug-reports/) (21 support-ticket-ready dossiers), [`v2-impact-analysis.md`](../../projects/emanueljofre-vv5dev/analysis/date-handling/v2-impact-analysis.md) (severity matrix, customer-impact scenarios, V1→V2 migration risk map), [`v2-briefing.md`](../../projects/emanueljofre-vv5dev/analysis/date-handling/v2-briefing.md) (manager-facing summary).
- **Test forms**: URLs in `testing/fixtures/vv-config.js`. Per-env form names and saved records in `projects/{customer}/test-assets.md`.
- **Field configs**: 8 configs (A-H) × 3 initial-value modes. Field map in `testing/fixtures/vv-config.js` FIELD_MAP. Config details in `forms-calendar/matrix.md`.
- **Console API**: See `docs/reference/vv-form-api.md` for VV.Form inspection methods.

### Testing Method

Tests run via Playwright (see root `CLAUDE.md` § Browser Automation). Cross-timezone testing requires changing **macOS system timezone** + restarting Chrome (DevTools Sensors does NOT override JS `Date` timezone). Verify with `new Date().toString()`.

### What Has NOT Been Tested

- V2 code path (`useUpdatedCalendarValueLogic=true`) runs live on vv5dev/EmanuelJofre-vv5dev (DB-scope Central Admin toggle). Initial V2 chromium baseline captured 2026-04-20 (405 executed / 51 passed / 354 failed) — see [`projects/emanueljofre-vv5dev/testing/date-handling/status.md`](../../projects/emanueljofre-vv5dev/testing/date-handling/status.md) and `failures.json`. Expected values in specs are predominantly V1-baselined; next iteration needs V2-specific expected values per TC. **V2-scoped entries landed**: 8 `.V2` entries for `11-{A..H}-save-BRT-load-IST` (2026-04-20); 8 `.V2` entries for Cat 13 (`13-initial-values-BRT`, `13-user-input-BRT`, `13-cross-tz-save-{BRT,IST}`, `13-preset-vs-user-input-{BRT,IST}`, `13-after-roundtrip`, `13-multi-roundtrip-db`) and 9 `.V2` entries for Cat 10 (`10-{A,C,D}-ws-*`) added 2026-04-21. All gated by a runtime `scope` filter in their specs. V2 siblings capture the observed "`.000Z`-suffixed raw" pattern and confirm FORM-BUG-5 (roundtrip drift) is fixed on V2. See the V2-scope baseline sub-table in [`forms-calendar/matrix.md`](forms-calendar/matrix.md#v2-scope-baseline-emanueljofre-vv5dev-db-scope-use-updated-calendar-control-logic--on).
- V1 load path FORM-BUG-7 in IST — code-confirmed but no live test
- Preset/Current Date with `enableTime=true` fields — needs new form fields
- Category 2 legacy typed input (E-H) across all TZs
- Category 14 Phase B/C — masked field behavior (requires Form Designer on EmanuelJofre)

### Next Steps

1. **Category 14 — Mask Impact Phase B/C**: Phase A (unmasked baseline) complete on both environments (13/13, 8P/5F). Phase B/C (add masks, re-run) requires Form Designer on EmanuelJofre.
2. **Category 2 — Typed Input legacy (E-H)**: Typed input for legacy configs across BRT, IST, UTC+0.
3. **Document Library DOC-5..DOC-8 specs**: DOC-1..DOC-4 + DOC-11 fully baselined on vvdemo and vv5dev via `doc-index-field-dates.spec.js`. Remaining 22 pending slots need infrastructure: DOC-5 (RadDateTimePicker + checkout helper), DOC-6 (cross-layer form + index coordination), DOC-7 (document query API), DOC-8 (DocAPI differential; needs WADNR test document + allowlist entry).

See `forms-calendar/matrix.md` for the full test matrix (269 slots, Cat 1–16).
