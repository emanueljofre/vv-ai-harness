# Document Library — Test Matrix

Methodology and test slot definitions for the document index field date-handling investigation.
Analysis → `analysis/overview.md` | Spec → `testing/specs/date-handling/doc-index-field-dates.spec.js`

**Execution results**: See `projects/{customer}/testing/date-handling/document-library/status.md` per environment.

Total slots: 74 (58 baselined + 16 backlog — see [Open Gaps & Backlog](#open-gaps--backlog))

> **Note**: Baseline slots assume the **default Platform Scope** (en-US Culture, Doc Library Configuration Section at its default values — see [`forms-calendar/matrix.md § Platform Scope`](../forms-calendar/matrix.md#platform-scope) and [`projects/emanueljofre-vv5dev/analysis/central-admin/config-sections/document-library.json`](../../../projects/emanueljofre-vv5dev/analysis/central-admin/config-sections/document-library.json)).

---

## ID Convention

Document library test IDs use the format `doc-{category}-{variant}` (e.g., `doc-1-iso-naive`, `doc-2-brt-offset`).

**Platform-scope suffix** (added 2026-04-20): slots under non-default scope use `.<scope>` (e.g. `doc-9-ddmm.ptBR`, `doc-10-review.custTZ-UTC`). Scope tokens per [`forms-calendar/matrix.md § Platform Scope`](../forms-calendar/matrix.md#platform-scope).

---

## Field Configuration — Not Applicable

Unlike form calendar fields (8 configs: enableTime × ignoreTimezone × useLegacy), document index fields have a **single "Date Time" type** (fieldType 4) with no date-specific configuration flags. This eliminates the Config A-H dimension entirely.

| Property          | Form Calendar Fields                  | Document Index Fields        |
| ----------------- | ------------------------------------- | ---------------------------- |
| Configuration     | 8 combos (enableTime, ignoreTZ, etc.) | None — single "Date Time"    |
| TZ sensitivity    | Client-side (Angular/Kendo)           | Server-side (API conversion) |
| Z in API response | Always appended by `getForms`         | **Never** — always stripped  |
| Storage           | As-sent (mixed UTC/local)             | Converted to UTC, Z stripped |

---

## TZ Dimension

- **API tests (DOC-1 through DOC-4, DOC-7, DOC-8)**: TZ-independent. The API accepts and converts date strings server-side — client/server timezone has no effect. Single run sufficient.
- **UI tests (DOC-5)**: TZ-sensitive. RadDateTimePicker renders dates in browser local time. BRT + IST minimum.
- **Cross-layer (DOC-6)**: Partial TZ sensitivity. BRT primary, IST for offset comparison tests.

---

## Coverage Summary

| Category                          | Total  | Priority | Method          |
| --------------------------------- | :----: | :------: | --------------- |
| DOC-1. Format Normalization       |   8    |    P1    | API             |
| DOC-2. TZ Offset Handling (BUG-1) |   10   |    P1    | API             |
| DOC-3. Field Clearing (BUG-2)     |   6    |    P1    | API             |
| DOC-4. Update Path & Overwrite    |   6    |    P2    | API             |
| DOC-5. UI Round-Trip              |   8    |    P2    | Browser         |
| DOC-6. Cross-Layer Comparison     |   6    |    P2    | API + Browser   |
| DOC-7. Query & Search             |   4    |    P2    | API             |
| DOC-8. DocAPI Infrastructure Diff |   4    |    P1    | API (cross-env) |
| DOC-9. Culture (Input + UI)       |   8    |    P1    | API + Browser   |
| DOC-10. Lifecycle Date Defaults   |   8    |    P2    | API             |
| DOC-11. Index Field Default Value |   6    |    P2    | API             |
| **TOTAL**                         | **74** |          |                 |

---

## Open Gaps & Backlog

Platform-scope gaps identified 2026-04-20. Cross-linked with [`forms-calendar/matrix.md § Open Gaps`](../forms-calendar/matrix.md#open-gaps--backlog).

| ID    | Gap                                                                                 | Why it matters                                                                                                                                                                      | Close by                  | Priority |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------- |
| DOCG1 | Customer Culture (ptBR/esES) effect on DD/MM parsing + RadDateTimePicker display    | DOC-1 already includes `doc-1-eu-date` passing (unlike WS-BUG-2). Worth verifying that result holds under ptBR Culture, and that RadDateTimePicker (DOC-5) renders DD/MM correctly. | DOC-9 (8 slots below)     | **P1**   |
| DOCG2 | Lifecycle date defaults: Days to Review / Expire / Training Due / Workflow Task Due | Central Admin Doc Library section has 4 Days-based defaults. If a document is created with "Review in N days", what TZ drives the computation? DST / year-boundary edge cases.      | DOC-10 (8 slots below)    | **P2**   |
| DOCG3 | Default Checkin State (`Released` vs `Unreleased`)                                  | Not date-related — only affects workflow timing if release triggers a dated action. Low priority.                                                                                   | Spot-check only           | P3       |
| DOCG4 | S3 Secure URL Expiration Minutes                                                    | Expiry timestamp on S3 pre-signed URLs. Off-topic for date-bug investigation but documented as a date-related setting.                                                              | Defer                     | P4       |
| DOCG5 | `Index Documents on save in UI` (DocAPI flag)                                       | If OFF, date index field writes bypass DocAPI. Spot-check under `disabled` scope.                                                                                                   | Spot-check                | P3       |
| DOCG6 | T1 "Convert Date Fields to Customer Timezone" — does it apply to index fields?      | Title says "Date Fields" — ambiguous whether it applies only to Forms calendar fields or also to Doc Library index fields. Material for understanding platform consistency.         | Spot-check under T1 scope | P2       |

---

## Execution Order

| Step | Category | Rationale                                                         |
| :--: | -------- | ----------------------------------------------------------------- |
|  1   | DOC-1    | Format normalization — establishes baseline, no prerequisites     |
|  2   | DOC-2    | TZ offset handling — core bug verification, uses known inputs     |
|  3   | DOC-3    | Field clearing — edge cases, uses values written by DOC-1/2       |
|  4   | DOC-8    | DocAPI differential — requires WADNR test document, cross-env     |
|  5   | DOC-4    | Update path — overwrites existing values from prior categories    |
|  6   | DOC-7    | Query/search — uses values written by prior categories            |
|  7   | DOC-6    | Cross-layer — requires forms test infrastructure coordination     |
|  8   | DOC-5    | UI round-trip — requires Playwright helper for checkout/RadPicker |

---

## DOC-1. API Write Format Normalization (8 slots)

How different input formats are normalized when written to a document index field via the REST API. Establishes what the server accepts and how it normalizes.

**Test method**: `PUT /documents/{id}/indexfields` with each format, then `GET` to read back.

| ID              | Input Format          | Input Value               | Expected Stored       | Notes                                                                     |
| --------------- | --------------------- | ------------------------- | --------------------- | ------------------------------------------------------------------------- |
| doc-1-iso-date  | ISO date-only         | `2026-03-15`              | `2026-03-15T00:00:00` | Appends T00:00:00                                                         |
| doc-1-us-date   | US date               | `03/15/2026`              | `2026-03-15T00:00:00` | Parsed, normalized to ISO                                                 |
| doc-1-eu-date   | EU date (DD/MM/YYYY)  | `15/03/2026`              | `2026-03-15T00:00:00` | Correctly parsed (unlike WS-BUG-2)                                        |
| doc-1-iso-naive | ISO naive datetime    | `2026-03-15T14:30:00`     | `2026-03-15T14:30:00` | Preserved exactly — baseline                                              |
| doc-1-us-12h    | US datetime 12h       | `03/15/2026 2:30 PM`      | `2026-03-15T14:30:00` | 12h → 24h conversion                                                      |
| doc-1-us-24h    | US datetime 24h       | `03/15/2026 14:30`        | `2026-03-15T14:30:00` | Parsed and normalized                                                     |
| doc-1-iso-ms    | ISO with milliseconds | `2026-03-15T14:30:00.000` | TBD                   | Are milliseconds preserved or stripped?                                   |
| doc-1-ambiguous | Ambiguous date        | `01/02/2026`              | TBD                   | Jan 2 or Feb 1? (EU date parsed OK above — does ambiguous default to US?) |

---

## DOC-2. Timezone Offset Handling — DOC-BUG-1 (10 slots)

Core bug verification: timezone offsets are silently converted to UTC and the Z marker is stripped, producing timezone-ambiguous values.

**Mechanism**: Server converts offset → UTC, then drops the Z. Consumers cannot distinguish UTC from local time.

| ID                 | Input Value                 | Expected (bug behavior) | Tests                                        |
| ------------------ | --------------------------- | ----------------------- | -------------------------------------------- |
| doc-2-z-strip      | `2026-03-15T14:30:00Z`      | `2026-03-15T14:30:00`   | Z silently stripped                          |
| doc-2-brt-offset   | `2026-03-15T14:30:00-03:00` | `2026-03-15T17:30:00`   | BRT→UTC: 14:30-(-03:00)=17:30                |
| doc-2-ist-offset   | `2026-03-15T14:30:00+05:30` | `2026-03-15T09:00:00`   | IST→UTC: 14:30-(+05:30)=09:00                |
| doc-2-pdt-offset   | `2026-03-15T14:30:00-07:00` | `2026-03-15T21:30:00`   | PDT→UTC: 14:30-(-07:00)=21:30                |
| doc-2-midnight-brt | `2026-03-15T00:00:00-03:00` | `2026-03-15T03:00:00`   | Midnight BRT → 03:00 UTC (time shifts)       |
| doc-2-midnight-z   | `2026-03-15T00:00:00Z`      | `2026-03-15T00:00:00`   | Midnight UTC — Z stripped, value correct     |
| doc-2-late-ist     | `2026-03-15T23:00:00+05:30` | `2026-03-15T17:30:00`   | Late night UTC+ — same day after conversion  |
| doc-2-early-ist    | `2026-03-15T02:00:00+05:30` | `2026-03-14T20:30:00`   | Early morning UTC+ → **PREVIOUS day** in UTC |
| doc-2-dst-edge     | `2026-03-08T02:30:00-05:00` | TBD                     | US DST transition (spring forward)           |
| doc-2-no-z-resp    | Read after naive write      | No Z in response        | Confirm API never returns Z on index fields  |

---

## DOC-3. Field Clearing & Empty Values — DOC-BUG-2 (6 slots)

Can a date index field be cleared once set? All known clearing attempts fail silently.

**Test method**: Write a known date value, then attempt to clear with each variant. Read back to verify.

| ID                 | Clear Attempt | Expected (bug behavior)       | Notes                         |
| ------------------ | ------------- | ----------------------------- | ----------------------------- |
| doc-3-empty-string | `""`          | Previous value persists (BUG) | Most obvious clearing method  |
| doc-3-null-string  | `"null"`      | Previous value persists       | String literal "null"         |
| doc-3-undefined    | `"undefined"` | Previous value persists       | String literal "undefined"    |
| doc-3-zero         | `"0"`         | Previous value persists       | Numeric zero as string        |
| doc-3-invalid      | `"2026"`      | Previous value persists       | Incomplete date — silent fail |
| doc-3-space        | `" "`         | TBD                           | Whitespace only               |

---

## DOC-4. Update Path & Overwrite (6 slots)

Write a date, then overwrite with a different format/value. Tests whether format changes are handled correctly and updates are idempotent.

| ID                    | First Write                 | Second Write                | Expected After        | Tests                     |
| --------------------- | --------------------------- | --------------------------- | --------------------- | ------------------------- |
| doc-4-naive-to-offset | `2026-03-15T14:30:00`       | `2026-06-01T10:00:00-03:00` | `2026-06-01T13:00:00` | Naive → offset (UTC conv) |
| doc-4-offset-to-naive | `2026-03-15T14:30:00-03:00` | `2026-06-01T10:00:00`       | `2026-06-01T10:00:00` | Offset → naive (no conv)  |
| doc-4-us-to-iso       | `03/15/2026`                | `2026-06-01T14:30:00`       | `2026-06-01T14:30:00` | Format change accepted    |
| doc-4-date-to-dt      | `2026-03-15`                | `2026-03-15T14:30:00`       | `2026-03-15T14:30:00` | Date-only → datetime      |
| doc-4-dt-to-date      | `2026-03-15T14:30:00`       | `2026-06-01`                | `2026-06-01T00:00:00` | Datetime → date-only      |
| doc-4-idempotent      | `2026-03-15T14:30:00`       | `2026-03-15T14:30:00`       | `2026-03-15T14:30:00` | Same value — no change    |

---

## DOC-5. UI Round-Trip via RadDateTimePicker (8 slots)

Write via API → view in Document Detail UI → edit in UI → verify API read. Requires document checkout flow (Check Out → Index Fields tab → edit → Save).

**Prerequisites**: Playwright helper for RadDateTimePicker interaction and document checkout/checkin flow.

| ID                      | Scenario                                 | Dimension / Question                             |
| ----------------------- | ---------------------------------------- | ------------------------------------------------ |
| doc-5-api-to-ui-display | Write naive datetime via API, view in UI | Does display format match US 12h convention?     |
| doc-5-ui-save-naive     | Edit date in UI, save, read via API      | What format does RadDateTimePicker submit?       |
| doc-5-ui-save-roundtrip | API write → UI view → UI edit → API read | End-to-end data integrity preserved?             |
| doc-5-ui-checkout-req   | Attempt UI edit without checkout         | Confirm datepicker is disabled (read-only)       |
| doc-5-ui-tz-brt         | View stored UTC value in BRT browser     | Does `14:30:00` display as `2:30 PM`?            |
| doc-5-ui-tz-ist         | View same value in IST browser           | Does display differ from BRT? (DOC-BUG-1 impact) |
| doc-5-ui-date-only      | Write date-only, check UI display        | Does RadDateTimePicker show `12:00 AM`?          |
| doc-5-ui-clear          | Attempt to clear date in UI              | Can UI clear what API cannot? (DOC-BUG-2)        |

---

## DOC-6. Cross-Layer Comparison (6 slots)

Same date value written to both a form calendar field AND a document index field. Compares normalization and storage behavior across the two systems.

| ID                       | Action                                                            | Expected Comparison                                        |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| doc-6-naive-both         | Write `2026-03-15T14:30:00` to form (postForms) + index field     | Form: `T14:30:00Z` (Z appended); Index: `T14:30:00` (no Z) |
| doc-6-offset-both        | Write `2026-03-15T14:30:00-03:00` to both                         | Form: stores as-sent; Index: converts to `T17:30:00` UTC   |
| doc-6-z-both             | Write `2026-03-15T14:30:00Z` to both                              | Form: stores with Z; Index: strips Z                       |
| doc-6-builtin-vs-index   | Read `modifyDate` (system) vs index field on same doc             | `modifyDate` has Z; index field has no Z — inconsistent    |
| doc-6-postforms-vs-put   | Write via `postForms` date field vs `putDocumentIndexFields`      | Different normalization paths confirmed                    |
| doc-6-vvclient-roundtrip | Write index field via `vvClient.documents.putDocumentIndexFields` | Does Node.js client behave same as direct REST API?        |

---

## DOC-7. Query & Search Behavior (4 slots)

Can documents be filtered by date index field values? Does the timezone ambiguity from DOC-BUG-1 break search queries?

**Test method**: Use document search/query API with date filter criteria on index fields.

| ID                     | Scenario                                               | Question                                           |
| ---------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| doc-7-query-exact      | Query where Date index field = `2026-03-15T14:30:00`   | Does exact match work on index field values?       |
| doc-7-query-range      | Query where Date between `2026-03-01` and `2026-03-31` | Do range filters work on index fields?             |
| doc-7-query-offset-val | Query for value stored via offset (DOC-BUG-1)          | Must query use UTC value or original offset value? |
| doc-7-query-null       | Query for documents with empty/null date index field   | Can you find documents with unset date fields?     |

---

## DOC-8. DocAPI Infrastructure Differential (4 slots)

vv5dev has `docapi: enabled`, vvdemo has `docapi: disabled`. This is the only component where the infrastructure actually differs between environments. These tests verify whether the DocAPI flag changes index field write/read behavior.

**Test method**: Run the same write+read sequence on both environments and compare results.

| ID                     | Scenario                          | Environment      | Expected                       |
| ---------------------- | --------------------------------- | ---------------- | ------------------------------ |
| doc-8-write-docapi-on  | PUT index field (DocAPI enabled)  | vv5dev (WADNR)   | Same normalization as vvdemo   |
| doc-8-read-docapi-on   | GET index field (DocAPI enabled)  | vv5dev (WADNR)   | Same response format as vvdemo |
| doc-8-write-docapi-off | PUT index field (DocAPI disabled) | vvdemo (Emanuel) | Baseline behavior              |
| doc-8-read-docapi-off  | GET index field (DocAPI disabled) | vvdemo (Emanuel) | Baseline behavior              |

**Key question**: Does `docApiDefaultForDocList: true` on vv5dev route index field operations through a different code path?

---

## DOC-9. Culture — Input Parsing + UI Display (Platform-Scope Backlog)

Does Customer Culture (Central Admin → Customer Details → Culture) affect how the Document Library API parses DD/MM input and how the RadDateTimePicker renders dates? DOC-1's `doc-1-eu-date` already reports DD/MM parsing as **working** on enUS — worth re-verifying under ptBR and checking UI display. Paired with Forms Cat 18 and WS-12.

**Method**: Set Customer Culture to `Portuguese (Brazil)`. Rerun the DOC-1 format-normalization slots with Culture = ptBR. Open the RadDateTimePicker on a test document (DOC-5 parallel) and verify display/format.

**Shape**: 4 API slots × 2 cultures = 8 slots. Covers: DD/MM, MM/DD (ambiguous), ISO, RadDateTimePicker display.

| Test ID               | Aspect            | Culture | Input / Setup                  | enUS baseline                   | Expected under ptBR                | Status  | Run Date | Evidence |
| --------------------- | ----------------- | :-----: | ------------------------------ | ------------------------------- | ---------------------------------- | ------- | -------- | -------- |
| doc-9-api-ddmm.ptBR   | API PUT           |  ptBR   | `"15/03/2026"`                 | Parses (doc-1-eu-date PASS)     | Parses ✓ — confirm no regression   | PENDING | —        | —        |
| doc-9-api-mmdd.ptBR   | API PUT           |  ptBR   | `"03/15/2026"`                 | Parses as Mar 15 (MM/DD native) | Parses as Apr 3 (DD/MM) OR rejects | PENDING | —        | —        |
| doc-9-api-iso.ptBR    | API PUT           |  ptBR   | `"2026-03-15"`                 | Parses                          | Parses (ISO Culture-independent)   | PENDING | —        | —        |
| doc-9-ui-display.ptBR | RadDateTimePicker |  ptBR   | stored `"2026-03-15T00:00:00"` | Display: `3/15/2026`            | Display: `15/03/2026`              | PENDING | —        | —        |
| doc-9-api-ddmm.enUS   | API PUT           |  enUS   | `"15/03/2026"`                 | —                               | Control: reproduces doc-1-eu-date  | PENDING | —        | —        |
| doc-9-api-mmdd.enUS   | API PUT           |  enUS   | `"03/15/2026"`                 | —                               | Control                            | PENDING | —        | —        |
| doc-9-api-iso.enUS    | API PUT           |  enUS   | `"2026-03-15"`                 | —                               | Control                            | PENDING | —        | —        |
| doc-9-ui-display.enUS | RadDateTimePicker |  enUS   | stored `"2026-03-15T00:00:00"` | —                               | Control                            | PENDING | —        | —        |

> **Key comparison**: doc-9-api-mmdd.ptBR vs doc-9-api-ddmm.ptBR — if both succeed with opposite interpretations, the Doc Library API is tolerant and Culture-driven. If one rejects, the API enforces Culture strictly. Either is informative.

---

## DOC-10. Lifecycle Date Defaults (Platform-Scope Backlog)

Central Admin **Document Library** section defines four Days-based defaults that drive date math on documents and related tasks:

- `Default Days for Documents to be Reviewed`
- `Default Days for a Document to Expire`
- `Default Days for a Training Task to be due`
- `Default days for a Workflow Task to be due`

These compute `due_date = creation_date + N days` at save time. **Untested**: which TZ drives the arithmetic, and what happens at DST/year-boundary edges.

**Method**: Create a document at a known UTC time close to midnight in Customer TZ. Read back the computed review/expiration dates. Cross-check against expected `created + N days` with both UTC and Customer TZ as the arithmetic basis.

**Shape**: 4 defaults × 2 Customer TZs = 8 slots.

| Test ID             | Default Field     | Customer TZ | Test Condition                                             | Expected                                                                             | Status  | Run Date | Evidence |
| ------------------- | ----------------- | ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- | -------- | -------- |
| doc-10-review.UTC   | Days to Review    | UTC         | Upload doc at 2026-03-15T23:30:00 UTC                      | Review date stored as 2026-03-15 + N days (straight UTC arithmetic)                  | PENDING | —        | —        |
| doc-10-review.BRT   | Days to Review    | BRT         | Upload doc at 2026-03-15T23:30:00 UTC (20:30 BRT same day) | Review date = 2026-03-15 + N days in BRT? Or 2026-03-16 + N if UTC midnight crossed? | PENDING | —        | —        |
| doc-10-expire.UTC   | Days to Expire    | UTC         | Upload doc at 2026-03-15T23:30:00 UTC                      | Expire date = 2026-03-15 + N days                                                    | PENDING | —        | —        |
| doc-10-expire.BRT   | Days to Expire    | BRT         | Same                                                       | Expire date in BRT TZ                                                                | PENDING | —        | —        |
| doc-10-training.UTC | Training Task Due | UTC         | Create training task from doc                              | Task due = now + N days in UTC                                                       | PENDING | —        | —        |
| doc-10-training.BRT | Training Task Due | BRT         | Same                                                       | Task due in BRT                                                                      | PENDING | —        | —        |
| doc-10-workflow.UTC | Workflow Task Due | UTC         | Start workflow on doc                                      | Task due = now + N days in UTC                                                       | PENDING | —        | —        |
| doc-10-workflow.BRT | Workflow Task Due | BRT         | Same                                                       | Task due in BRT                                                                      | PENDING | —        | —        |

> **Cross-reference**: Forms Cat 19 tests server-generated timestamps on forms (`Created Date` auto-field, `DateTime.Now`, etc.). DOC-10 tests the same question from the Doc Library angle. The answers _should_ be consistent — if they're not, we've found a platform inconsistency.
> **DST edge case**: Schedule a follow-up DOC-10 run with creation timestamp inside a DST-transition window in a DST-observing Customer TZ (America/Los_Angeles). Spot-check only — not in the 8 slots above.

---

## DOC-11. Index Field Default Value Behavior (6 slots)

How a global index field's `defaultValue` (configured in Admin → Index Field Admin) behaves when a fresh document is uploaded. Parallels Forms Cat 5 (preset-date) — probes whether the default flows through the same normalization path as PUT writes, and whether DOC-BUG-1/2 extend to defaults.

**Test asset**: a second global index field named `Date With Preset` (fieldType 4, Date Time) with `defaultValue = "2026-01-01T00:00:00"` assigned to the test folder.

**Free finding (2026-04-24)**: The `defaultValue` is stored **naively** in the field definition (no Z suffix), same shape as DOC-BUG-1 output. Either the Admin UI strips Z on save, or the field-definition storage mechanism itself can't hold a TZ marker.

**Test method**:

- Slots needing a **fresh document**: upload a new `zzz-doc11-<timestamp>.txt` into the test folder, then GET/PUT against it.
- Slots reusing the existing test document: PUT then GET against `testDocumentId`.

| ID                            | Scenario                                                            | Expected                                   | Needs fresh doc | Tests                                                                |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | :-------------: | -------------------------------------------------------------------- |
| doc-11-default-auto-populate  | Upload fresh doc; GET index fields without any write                | `Date With Preset` = `2026-01-01T00:00:00` |       yes       | Does the default apply at doc creation?                              |
| doc-11-default-literal-copy   | Upload fresh doc; compare returned value byte-for-byte vs field def | Identical string                           |       yes       | Server copies verbatim vs re-interprets in server TZ                 |
| doc-11-default-overwrite      | Upload fresh doc (default applied); PUT `2026-06-15T10:00:00`; GET  | `2026-06-15T10:00:00`                      |       yes       | Default is overwritable                                              |
| doc-11-default-clear-fallback | Upload fresh doc; PUT `""`; GET                                     | Default persists (or DOC-BUG-2 behavior)   |       yes       | Does clear revert to default, or inherit DOC-BUG-2 (previous value)? |
| doc-11-default-roundtrip      | Existing doc: PUT `2026-01-01T00:00:00` (matches default), GET      | `2026-01-01T00:00:00`                      |       no        | Confirm no special treatment when explicit value equals default      |
| doc-11-default-z-strip        | Inspect field definition's `defaultValue` via GET `/indexfields`    | `2026-01-01T00:00:00` (no Z)               |       no        | Confirm DOC-BUG-1 extends to field-definition defaults               |

> **Bug-tag candidate**: if `doc-11-default-clear-fallback` reverts to the default instead of keeping the last-written value, that's a **behavior divergence** from DOC-BUG-2 — index fields with defaults behave differently than index fields without. Worth documenting either way.

---

## Test Document Prerequisites

### vvdemo (EmanuelJofre)

- **Folder**: `/TestFolder` with "Date" index field (fieldType 4) assigned
- **Document**: `Test1003` (ID: `5c4c9e8c-25ca-eb11-8202-d7701a6d4070`)
- **Write policy**: `unrestricted` (development sandbox)

### vv5dev (EmanuelJofre)

- **Folder**: `/zzz-date-tests` (`70a66b3e-f36b-1410-85ef-001e45e95bc5`)
- **Document**: `zzz-date-test-doc` — documentId `3b0b0f37-e83f-f111-8313-9bb7e317217d` (revisionId `72a66b3e-…`)
- **Index fields**: `Date` (fieldType 4, no default) and `Date With Preset` (fieldType 4, defaultValue `2026-01-01T00:00:00`) — both assigned to folder
- **Write policy**: `unrestricted` (development sandbox)
- **Provision**: `node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev` (idempotent)

### vv5dev (WADNR)

- **Folder**: TBD — create `zzz`-prefixed test folder with Date index field
- **Document**: TBD — create test document in the zzz folder
- **Write policy**: Requires new `documents` entry in `.env.json` writePolicy allowlist
- **Note**: Document writes are currently blocked on WADNR. Must add folder/document to allowlist before DOC-8 execution.

---

## Relationship to Existing Tests

The 17 tests in `doc-index-field-dates.spec.js` (2026-04-09) map approximately to:

| Existing Test Group       | Count  | Matrix Category  | Coverage                                       |
| ------------------------- | :----: | ---------------- | ---------------------------------------------- |
| Format normalization      |   6    | DOC-1 (8 slots)  | 6/8 — missing: ms, ambiguous                   |
| DOC-BUG-1 TZ offset       |   7    | DOC-2 (10 slots) | 7/10 — missing: PDT, DST, no-Z-response        |
| DOC-BUG-2 clearing        |   2    | DOC-3 (6 slots)  | 2/6 — missing: undefined, zero, invalid, space |
| Z suffix comparison       |   1    | DOC-6 (6 slots)  | 1/6 — partial cross-layer                      |
| Built-in dates comparison |   1    | DOC-6 (6 slots)  | 1/6 — partial cross-layer                      |
| **Total existing**        | **17** |                  | ~17/52 covered                                 |

The refactored spec will expand coverage from 17 to 52 slots across all 8 categories.
