# Web Services — Test Matrix

Methodology and test slot definitions for the web services date-handling investigation.
API analysis → `analysis/overview.md` | Harness → `webservice-test-harness.js`

**Execution results**: See `projects/{customer}/testing/date-handling/web-services/status.md` per environment.

Total slots: 166 (148 baselined + 18 backlog — see [Open Gaps & Backlog](#open-gaps--backlog))

> **Note**: Results columns in the tables below are a historical snapshot from the EmanuelJofre (vvdemo) baseline run under the **default Platform Scope** (V1 code path, T1/T2 off, en-US Culture — see [`forms-calendar/matrix.md § Platform Scope`](../forms-calendar/matrix.md#platform-scope)). Live status tracking is in per-project `status.md` files.

---

## ID Convention

Web services test IDs use the format `ws-{category}-{config}-{tz}` (e.g., `ws-1-A-BRT`).
For format/scenario variants: `ws-{category}-{config}-{variant}` (e.g., `ws-5-A-US`, `ws-7-A-change`).

**Platform-scope suffix** (added 2026-04-20): slots run under a non-default Platform Scope carry a `.<scope>` suffix — e.g. `ws-11-D-BRT.T1`, `ws-12-A-DDMM.ptBR`, `ws-13-now.UTC`. The scope tokens (`V1`/`V2`, `T1`/`T2`/`T3`, `enUS`/`ptBR`/`esES`) are defined in [`forms-calendar/matrix.md § Platform Scope`](../forms-calendar/matrix.md#platform-scope) and apply identically here.

---

## Field Configurations

Same 8 field configurations as forms-calendar — tests target the same DateTest form:

| Config | enableTime | ignoreTZ | useLegacy | Test Field | Type                                        |
| :----: | :--------: | :------: | :-------: | ---------- | ------------------------------------------- |
|   A    |   false    |  false   |   false   | Field7     | Date-only baseline                          |
|   B    |   false    |   true   |   false   | Field10    | Date-only + ignoreTZ                        |
|   C    |    true    |  false   |   false   | Field6     | DateTime UTC-aware                          |
|   D    |    true    |   true   |   false   | Field5     | DateTime + ignoreTZ (FORM-BUG-5/#6 surface) |
|   E    |   false    |  false   |   true    | Field12    | Legacy date-only                            |
|   F    |   false    |   true   |   true    | Field11    | Legacy date-only + ignoreTZ                 |
|   G    |    true    |  false   |   true    | Field14    | Legacy DateTime                             |
|   H    |    true    |   true   |   true    | Field13    | Legacy DateTime + ignoreTZ                  |

---

## TZ Dimension — Different from Forms

The Node.js library sends date **strings** to the VV server — no local timezone interpretation occurs (confirmed via upstream analysis: `docs/guides/scripting.md`). Therefore:

- **API-only tests** (WS-1, WS-3, WS-5, WS-6, WS-7, WS-8): BRT primary, IST spot-check to confirm TZ independence.
- **Cross-layer tests** (WS-2, WS-4): Browser TZ matters for the Forms side → BRT + IST.

If IST spot-checks confirm TZ independence, no need for full 3-TZ expansion on API-only categories.

### Server TZ Simulation

The Node.js server's process timezone can be controlled via the `TZ` environment variable without changing the macOS system timezone or restarting Chrome:

```bash
TZ=UTC node app.js                    # Simulates AWS/cloud (production)
TZ=America/Sao_Paulo node app.js      # Simulates BRT dev machine (default)
TZ=Asia/Calcutta node app.js          # Simulates IST dev machine
```

WS-1 includes UTC spot-checks (ws-1-{A,C,D,H}-UTC) to prove that the cloud environment produces identical results to local development. If all three TZs (BRT, IST, UTC) produce identical stored values, server TZ is confirmed irrelevant for API string passthrough.

---

## Coverage Summary

`PASS` = ran, no issue. `FAIL` = ran, unexpected behavior. `PENDING` = not yet run. `BLOCKED` = requires setup not available.

| Category                             |  Total  | PASS | FAIL | PENDING | BLOCKED | Priority |
| ------------------------------------ | :-----: | :--: | :--: | :-----: | :-----: | :------: |
| WS-1. API Write Path (Create)        |   16    |  16  |  0   |    0    |         |    P1    |
| WS-2. API Read + Cross-Layer         |   16    |  16  |  0   |    0    |         |    P1    |
| WS-3. API Round-Trip                 |    4    |  4   |  0   |    0    |         |    P2    |
| WS-4. API→Forms Cross-Layer          |   10    |  3   |  7   |    0    |         |    P3    |
| WS-5. Input Format Tolerance         |   33    |  24  |  9   |    0    |         |    P2    |
| WS-6. Empty/Null Handling            |   12    |  12  |  0   |    0    |         |    P3    |
| WS-7. API Update Path                |   12    |  12  |  0   |    0    |         |    P2    |
| WS-8. Query Date Filtering           |   10    |  10  |  0   |    0    |         |    P3    |
| WS-9. Date Computation               |   23    |  17  |  6   |    0    |         |    P2    |
| WS-10. postForms vs forminstance/    |   12    |  2   |  10  |    0    |    0    |    P1    |
| WS-11. T1/T2 Cross-Layer             |    6    |  0   |  0   |    6    |    0    |    P0    |
| WS-12. Culture Input Tolerance       |    8    |  0   |  0   |    8    |    0    |    P1    |
| WS-13. Customer-TZ in Server Scripts |    4    |  0   |  0   |    4    |    0    |    P1    |
| **TOTAL**                            | **166** | 116  |  32  | **18**  |  **0**  |          |

> **Counting note**: WS-10A includes 7 additional forminstance/ comparison rows (all PASS) embedded in the detailed table for side-by-side analysis. These share test IDs with the postForms rows and are **not** counted as separate test slots. WS-5 counts 33 executed format/config combinations (2 planned LATAM variants for Config C were not needed — Config A results generalize).

---

## Open Gaps & Backlog

Platform-scope gaps identified from the Central Admin exploration on 2026-04-20. Cross-linked with [`forms-calendar/matrix.md § Open Gaps`](../forms-calendar/matrix.md#open-gaps--backlog).

| ID   | Gap                                                               | Why it matters                                                                                                            | Close by                                   | Priority |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| WSG1 | T1 / T2 Forms-side toggle effect on cross-layer                   | WS-2 / WS-4 verify API→Forms re-read. If T1 rewrites the Forms-side interpretation, WS-BUG-1 shift could flip.            | WS-11 (6 slots below)                      | **P0**   |
| WSG2 | Customer Culture effect on API DD/MM parsing (WEBSERVICE-BUG-2/3) | Under `ptBR` customer Culture, DD/MM may become the canonical format — flipping WS-BUG-2/3 from bugs to expected behavior | WS-12 (8 slots below)                      | **P1**   |
| WSG3 | Customer TZ effect on `DateTime.Now` / `GETDATE()` in scripts     | WS-9 tests script date math, but never varies Customer TZ. Scripts using customer-local time produce different outputs    | WS-13 (4 slots below)                      | **P1**   |
| WSG4 | V2 code-path effect on cross-layer (WS-2 / WS-4)                  | Forms V2 changes how API-written values are re-read. Cross-ref Forms G1.                                                  | V2 rebaseline of WS-2/WS-4 (not a new cat) | **P0**   |
| WSG5 | `Parse JSON Dropdownlist Values` — does it affect calendar JSON?  | Checkbox in Forms section. May or may not apply to calendar JSON template dropdown metadata.                              | Spot check — low priority                  | P3       |

### Cross-cutting references

- [Forms Cat 17](../forms-calendar/matrix.md#17--platform-tz-conversion-toggles-t1t2) — paired form-side Cat for WS-11
- [Forms Cat 18](../forms-calendar/matrix.md#18--customer-culture-locale) — paired form-side Cat for WS-12
- [Forms Cat 19](../forms-calendar/matrix.md#19--server-generated-timestamps) — paired form-side Cat for WS-13
- [Scheduled Processes matrix](../scheduled-processes/matrix.md) — SP script `DateTime.Now` semantics (related to WS-13)

---

## Execution Order

| Step | Category | Rationale                                                                                     |
| :--: | -------- | --------------------------------------------------------------------------------------------- |
|  1   | WS-2     | Read existing records — no setup needed, uses DateTest-000080 (BRT) and DateTest-000084 (IST) |
|  2   | WS-1     | Create records — produces test data reusable by WS-3, WS-4, WS-8                              |
|  3   | WS-3     | Round-trip — uses WS-1 records                                                                |
|  4   | WS-5     | Format tolerance — independent                                                                |
|  5   | WS-7     | Update path — independent                                                                     |
|  6   | WS-4     | API→Forms — needs browser, uses WS-1 records                                                  |
|  7   | WS-6     | Empty/null — edge cases                                                                       |
|  8   | WS-8     | Query filtering — uses WS-1 records                                                           |
|  9   | WS-9     | Date computation — tests JS Date patterns across server TZs, requires `TZ=` env var switching |

---

## WS-1. API Write Path (Create)

Create a new form record via `postForms()` with a date value in each target config field. Read back via `getForms()` and compare sent vs stored.

**Hypothesis**: The VV server stores the value as a SQL `datetime` (no Z, no format). No FORM-BUG-7 (client-side only). Field config flags may or may not affect server-side behavior.

**Test date**: `"2026-03-15"` for date-only configs (A/B/E/F), `"2026-03-15T14:30:00"` for DateTime configs (C/D/G/H). Using non-midnight time (14:30) to distinguish from date-only.

| ID         | Config | TZ  | Input Sent              | Expected Stored          | Status | Actual                   | Bugs | Notes                             |
| ---------- | :----: | :-: | ----------------------- | ------------------------ | :----: | ------------------------ | ---- | --------------------------------- |
| ws-1-A-BRT |   A    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Date preserved; getForms adds T+Z |
| ws-1-B-BRT |   B    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | ignoreTZ no effect on API         |
| ws-1-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Time preserved; getForms adds Z   |
| ws-1-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | ignoreTZ no effect on API         |
| ws-1-E-BRT |   E    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy = same as non-legacy       |
| ws-1-F-BRT |   F    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy + ignoreTZ = same          |
| ws-1-G-BRT |   G    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy DateTime = same            |
| ws-1-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy + ignoreTZ = same          |
| ws-1-A-IST |   A    | IST | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | TZ independent ✓ H-1,H-4          |
| ws-1-C-IST |   C    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓                  |
| ws-1-D-IST |   D    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓                  |
| ws-1-H-IST |   H    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓                  |
| ws-1-A-UTC |   A    | UTC | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Cloud simulation ✓ H-4            |
| ws-1-C-UTC |   C    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓                |
| ws-1-D-UTC |   D    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓                |
| ws-1-H-UTC |   H    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓                |

> **WS-1 Finding**: All 16 tests PASS. The VV server stores the value as a SQL `datetime` (DB dump confirmed: `2026-03-15 14:30:00.000`). The `getForms` API serializes the response as ISO+Z (`"T14:30:00Z"` for datetime, `"T00:00:00Z"` for date-only). The date value itself is preserved perfectly. No FORM-BUG-7 (H-1 confirmed). Server TZ has no effect (H-4 confirmed). Field config flags (enableTime, ignoreTimezone, useLegacy) have no effect on API write behavior. Created records: DateTest-000889 through DateTest-000894.

---

## WS-2. API Read + Cross-Layer Verification

Read existing Forms-saved records via `getForms()` with `expand: true`. Two analysis dimensions per slot:

1. **API format**: Does the API return the raw stored value without FORM-BUG-5 (fake Z) or FORM-BUG-6 ("Invalid Date")?
2. **Cross-layer**: Does the API return exactly what Forms `getValueObjectValue()` stored (including buggy values from IST)?

**Records**:

- DateTest-000080 Rev 2 — saved from BRT (2026-03-31), Config A + D set to 03/15/2026 (legacy WADNR-era reference)
- DateTest-000084 Rev 1 — saved from IST (2026-04-01), Config A + D set to 03/15/2026 (legacy WADNR-era reference)
- **BRT rows (2026-04-22 on):** read from the WS-SETUP-BASELINE record the pipeline creates fresh each run — all 8 configs (A-H) populated via the API write path (WS-1-equivalent). Date-only configs (A/B/E/F) are written as `"2026-03-15"`; DateTime configs (C/D/G/H) are written as `"2026-03-15T14:30:00"`. See `scripts/examples/webservice-test-harness.js` `actionSetupBaseline()` + `testing/pipelines/run-ws-regression.js` TEST_INVOCATIONS.
- **IST rows:** still calibrated against the last-WS-1 record (no baseline setup for IST yet). `ws-2-A-IST` additionally exercises FORM-BUG-7 via the Forms-saved reference record `DateTest-000084`.

**Note**: BRT Expected values below reflect the baseline-record state (all configs populated). IST rows retain the legacy reference-record expectations; extending baseline setup to IST is a tracked follow-up (see `projects/emanueljofre-vv5dev/testing/date-handling/web-services/v2-baseline-audit.md`).

| ID         | Config | Record Source  | Forms Stored Value                  | Expected API Return                  | Status | Actual                   | Bugs | Notes                                                 |
| ---------- | :----: | -------------- | ----------------------------------- | ------------------------------------ | :----: | ------------------------ | ---- | ----------------------------------------------------- |
| ws-2-A-BRT |   A    | baseline (BRT) | `"2026-03-15"`                      | `"2026-03-15T00:00:00Z"`             |  PASS  | `"2026-03-15T00:00:00Z"` |      | getForms serializes date-only → datetime+Z; H-2 ✓     |
| ws-2-B-BRT |   B    | baseline (BRT) | `"2026-03-15"`                      | `"2026-03-15T00:00:00Z"`             |  PASS  | `"2026-03-15T00:00:00Z"` |      | Date-only, ignoreTimezone=true; same serialization    |
| ws-2-C-BRT |   C    | baseline (BRT) | `"2026-03-15T14:30:00"`             | `"2026-03-15T14:30:00Z"`             |  PASS  | `"2026-03-15T14:30:00Z"` |      | DateTime — time preserved; Z appended on read         |
| ws-2-D-BRT |   D    | baseline (BRT) | `"2026-03-15T14:30:00"`             | `"2026-03-15T14:30:00Z"`             |  PASS  | `"2026-03-15T14:30:00Z"` |      | Real Z (no fake Z — H-2 confirmed); getForms serializes with Z |
| ws-2-E-BRT |   E    | baseline (BRT) | `"2026-03-15"`                      | `"2026-03-15T00:00:00Z"`             |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy date-only; API returns datetime+Z              |
| ws-2-F-BRT |   F    | baseline (BRT) | `"2026-03-15"`                      | `"2026-03-15T00:00:00Z"`             |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy date-only + ignoreTimezone; same format        |
| ws-2-G-BRT |   G    | baseline (BRT) | `"2026-03-15T14:30:00"`             | `"2026-03-15T14:30:00Z"`             |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy DateTime; time preserved                       |
| ws-2-H-BRT |   H    | baseline (BRT) | `"2026-03-15T14:30:00"`             | `"2026-03-15T14:30:00Z"`             |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy DateTime + ignoreTimezone; same format         |
| ws-2-A-IST |   A    | 000084 (IST)  | `"2026-03-14"` (FORM-BUG-7: -1 day) | `"2026-03-14T00:00:00Z"` (bug in DB) |  PASS  | `"2026-03-14T00:00:00Z"` | #7   | API confirms wrong date in storage; H-7 ✓             |
| ws-2-B-IST |   B    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Unset                                                 |
| ws-2-C-IST |   C    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Unset                                                 |
| ws-2-D-IST |   D    | 000084 (IST)  | `"2026-03-15T00:00:00"`             | `"2026-03-15T00:00:00Z"` (real Z)    |  PASS  | `"2026-03-15T00:00:00Z"` |      | No fake Z — H-2 confirmed                             |
| ws-2-E-IST |   E    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                                   |
| ws-2-F-IST |   F    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                                   |
| ws-2-G-IST |   G    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                                   |
| ws-2-H-IST |   H    | 000084 (IST)  | (not set)                           | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                                   |

> **WS-2 Finding**: All 16 tests PASS. `getForms` serializes all values as ISO datetime+Z. No FORM-BUG-5 fake Z (H-2 confirmed). No FORM-BUG-6 "Invalid Date" — unset fields return `null` (H-3 partially confirmed). API confirms FORM-BUG-7 damage: IST-saved Config A has `2026-03-14 00:00:00.000` in DB (H-7 confirmed — wrong date readable via API). Cross-layer: `getForms` serialization format differs from Forms `getValueObjectValue()` — `getForms` serializes to `"...T00:00:00Z"` while Forms V1 rawValue is date-only string or datetime without Z.

---

## WS-3. API Round-Trip

Write a date via API (`postForms`), read back (`getForms`), write the read-back value (`postFormRevision`), read again. 2 cycles. Verify no drift.

**Hypothesis**: API introduces no drift because there's no FORM-BUG-5 fake Z in the read path. All cycles should return identical values.

| ID         | Config | TZ  | Input                   | Cycle 1 Read             | Cycle 2 Read             | Drift? | Status | Bugs | Notes                            |
| ---------- | :----: | :-: | ----------------------- | ------------------------ | ------------------------ | :----: | :----: | ---- | -------------------------------- |
| ws-3-A-BRT |   A    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | false  |  PASS  |      | Zero drift; H-8 ✓                |
| ws-3-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | Zero drift; H-8 ✓                |
| ws-3-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | No FORM-BUG-5 in API path; H-8 ✓ |
| ws-3-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | Legacy = same behavior; H-8 ✓    |

> **WS-3 Finding**: All 4 tests PASS. API round-trip is completely drift-free across all configs. `getForms` serializes with Z on read, and the Z-serialized value is accepted without modification on write-back. No FORM-BUG-5 accumulation. H-8 confirmed. Contrast: Forms GFV round-trip drifts for Config D (FORM-BUG-5 fake Z causes progressive shift).

---

## WS-4. API→Forms Cross-Layer

<!-- task-status: non-executable prefix="ws-4-" reason="browser-only" -->

> **Execution note — browser-only.** These 10 slots cannot be driven by the WS regression runner (`testing/pipelines/run-ws-regression.js`) or `run-ws-test.js` alone — they require browser verification via Playwright / Chrome MCP using `/@-test-ws-date-pw --mode browser`. The WS regression pipeline explicitly skips WS-4 (see `testing/pipelines/run-ws-regression.js`). `npm run task:status` treats these as non-executable for this runner, not as actionable pending.

Create or update a record via API, then open the form in the browser. Verify that the display value and `GetFieldValue()` match what was sent via API.

**Hypothesis**: API stores correct values (bypassing FORM-BUG-7). But Forms may apply FORM-BUG-7 on the _display/load path_ (`initCalendarValueV1` → `moment(e).toDate()`), potentially showing wrong dates in IST even for cleanly-stored data.

**Method**: Use WS-1 records (created via API). Open in browser via DataID URL. Run `VV.Form.GetFieldValue()` and check visual display.

| ID             | Config | Browser TZ | API-Stored Value         | Expected Forms Display | Status | Actual Display        | Actual rawValue         | Bugs    | Notes                                                                 |
| -------------- | :----: | :--------: | ------------------------ | ---------------------- | :----: | --------------------- | ----------------------- | ------- | --------------------------------------------------------------------- |
| ws-4-A-BRT     |   A    |    BRT     | `"2026-03-15T00:00:00Z"` | 03/15/2026             |  PASS  | `03/15/2026`          | `"2026-03-15"`          |         | Date-only correct ✓                                                   |
| ws-4-C-BRT     |   C    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | CB-8    | UTC→BRT shift: 14:30Z → 11:30 local                                   |
| ws-4-D-BRT     |   D    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted, GFV fake Z                   |
| ws-4-H-BRT     |   H    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | CB-8    | Like D minus fake Z                                                   |
| ws-4-A-IST     |   A    |    IST     | `"2026-03-15T00:00:00Z"` | 03/15/2026             |  PASS  | `03/15/2026`          | `"2026-03-15"`          |         | Date-only correct in IST ✓; H-6 refuted                               |
| ws-4-C-IST     |   C    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 08:00 PM` | `"2026-03-15T20:00:00"` | CB-8    | UTC→IST shift: 14:30Z → 20:00 local                                   |
| ws-4-D-IST     |   D    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted, GFV fake Z                   |
| ws-4-H-IST     |   H    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | CB-8    | Like D minus fake Z                                                   |
| ws-4-D-mid-BRT |   D    |    BRT     | `"2026-03-15T02:00:00Z"` | 03/15/2026 2:00 AM     |  FAIL  | `03/15/2026 02:00 AM` | `"2026-03-14T23:00:00"` | CB-8    | **Midnight crossed! rawValue = Mar 14** (02:00Z = 23:00 BRT prev day) |
| ws-4-D-mid-IST |   D    |    IST     | `"2026-03-15T02:00:00Z"` | 03/15/2026 2:00 AM     |  PASS  | `03/15/2026 02:00 AM` | `"2026-03-15T07:30:00"` |         | No crossing in IST (02:00Z + 5:30 = 07:30 same day)                   |

> **WS-4 Finding**: 3 PASS, 7 FAIL. **Date-only (Config A): PASS** in both TZs — FORM-BUG-7 does NOT manifest on form load/display path. **DateTime (C/D/H): FAIL** — CB-8: `FormInstance/Controls` serializes postForms records with Z, Forms V1 interprets as UTC, shifts to local. Config D/H display correctly (ignoreTZ) but rawValue is wrong. **Midnight-crossing**: `T02:00:00Z` in BRT → rawValue crosses to **Mar 14** (`23:00 BRT`). Display says `02:00 AM Mar 15` but stored date is **wrong day** — critical for CSV imports with early-morning UTC times.

---

## WS-5. Input Format Tolerance

Send various date string formats via `postForms()`. Verify which are accepted, rejected, or normalized.

**Formats tested** (using base date 2026-03-15):

| Key   | Format                  | Date-Only Input           | DateTime Input                |
| ----- | ----------------------- | ------------------------- | ----------------------------- |
| ISO   | ISO 8601 date-only      | `"2026-03-15"`            | `"2026-03-15"`                |
| US    | US format (MM/DD/YYYY)  | `"03/15/2026"`            | `"03/15/2026"`                |
| DT    | ISO datetime no offset  | —                         | `"2026-03-15T14:30:00"`       |
| DTZ   | ISO datetime UTC        | —                         | `"2026-03-15T14:30:00Z"`      |
| DTMS  | ISO datetime ms UTC     | —                         | `"2026-03-15T14:30:00.000Z"`  |
| DTBRT | ISO datetime BRT offset | —                         | `"2026-03-15T14:30:00-03:00"` |
| DTIST | ISO datetime IST offset | —                         | `"2026-03-15T14:30:00+05:30"` |
| DB    | DB storage format       | `"3/15/2026 12:00:00 AM"` | `"3/15/2026 2:30:00 PM"`      |
| LATAM | DD/MM/YYYY (day-first)  | `"15/03/2026"`            | `"15/03/2026"`                |
| LATAM | DD-MM-YYYY (day-first)  | `"15-03-2026"`            | `"15-03-2026"`                |
| LATAM | DD.MM.YYYY (day-first)  | `"15.03.2026"`            | —                             |

**Configs**: A (date-only) and C (DateTime)

| ID            | Config | Format | Input Sent                        | Expected Stored          | Status | Actual                   | Accepted? | Notes                                               |
| ------------- | :----: | :----: | --------------------------------- | ------------------------ | :----: | ------------------------ | :-------: | --------------------------------------------------- |
| ws-5-A-ISO    |   A    |  ISO   | `"2026-03-15"`                    | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Baseline; getForms serializes with T+Z              |
| ws-5-A-US     |   A    |   US   | `"03/15/2026"`                    | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US format accepted and normalized                   |
| ws-5-A-DT     |   A    |   DT   | `"2026-03-15T14:30:00"`           | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Time preserved in date-only field!                  |
| ws-5-A-DTZ    |   A    |  DTZ   | `"2026-03-15T14:30:00Z"`          | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Z preserved as-is                                   |
| ws-5-A-DTBRT  |   A    | DTBRT  | `"2026-03-15T14:30:00-03:00"`     | `"2026-03-15T17:30:00Z"` |  PASS  | `"2026-03-15T17:30:00Z"` |    Yes    | Offset converted to UTC (+3h)                       |
| ws-5-A-DTIST  |   A    | DTIST  | `"2026-03-15T14:30:00+05:30"`     | `"2026-03-15T09:00:00Z"` |  PASS  | `"2026-03-15T09:00:00Z"` |    Yes    | Offset converted to UTC (-5:30h)                    |
| ws-5-A-DB     |   A    |   DB   | `"3/15/2026 12:00:00 AM"`         | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | DB storage format accepted                          |
| ws-5-A-DTMS   |   A    |  DTMS  | `"2026-03-15T14:30:00.000Z"`      | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Milliseconds stripped                               |
| ws-5-A-LATAM1 |   A    | LATAM  | `"15/03/2026"` (DD/MM/YYYY)       | `null`                   |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss! [WS-BUG-2]    |
| ws-5-A-LATAM2 |   A    | LATAM  | `"15-03-2026"` (DD-MM-YYYY)       | `null`                   |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss! [WS-BUG-2]    |
| ws-5-A-LATAM3 |   A    | LATAM  | `"15.03.2026"` (DD.MM.YYYY)       | `null`                   |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss! [WS-BUG-2]    |
| ws-5-C-ISO    |   C    |  ISO   | `"2026-03-15"`                    | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Date-only → DateTime: T+Z added                     |
| ws-5-C-US     |   C    |   US   | `"03/15/2026"`                    | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US → DateTime: normalized                           |
| ws-5-C-DT     |   C    |   DT   | `"2026-03-15T14:30:00"`           | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Baseline; getForms serializes with Z                |
| ws-5-C-DTZ    |   C    |  DTZ   | `"2026-03-15T14:30:00Z"`          | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Z kept as-is                                        |
| ws-5-C-DTBRT  |   C    | DTBRT  | `"2026-03-15T14:30:00-03:00"`     | `"2026-03-15T17:30:00Z"` |  PASS  | `"2026-03-15T17:30:00Z"` |    Yes    | BRT offset → UTC conversion (+3h)                   |
| ws-5-C-DTIST  |   C    | DTIST  | `"2026-03-15T14:30:00+05:30"`     | `"2026-03-15T09:00:00Z"` |  PASS  | `"2026-03-15T09:00:00Z"` |    Yes    | IST offset → UTC conversion (-5:30h)                |
| ws-5-C-DB     |   C    |   DB   | `"3/15/2026 2:30:00 PM"`          | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | DB format accepted                                  |
| ws-5-C-DTMS   |   C    |  DTMS  | `"2026-03-15T14:30:00.000Z"`      | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Milliseconds stripped                               |
| ws-5-C-LATAM1 |   C    | LATAM  | `"15/03/2026"` (DD/MM/YYYY)       | `null`                   |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss! [WS-BUG-2]    |
| ws-5-C-LATAM2 |   C    | LATAM  | `"15-03-2026"` (DD-MM-YYYY)       | `null`                   |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss! [WS-BUG-2]    |
| ws-5-A-YS     |   A    |   Y/   | `"2026/03/15"` (YYYY/MM/DD)       | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Year-first with slashes                             |
| ws-5-A-YD     |   A    |   Y.   | `"2026.03.15"` (YYYY.MM.DD)       | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Year-first with dots                                |
| ws-5-A-USD    |   A    |  US-   | `"03-15-2026"` (MM-DD-YYYY)       | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US format with dashes                               |
| ws-5-A-ENG    |   A    |  Word  | `"March 15, 2026"`                | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | English month name                                  |
| ws-5-A-EUR    |   A    |  Euro  | `"15 March 2026"`                 | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | European word format                                |
| ws-5-A-ABBR   |   A    |  Abbr  | `"15-Mar-2026"`                   | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Abbreviated month                                   |
| ws-5-A-COMP   |   A    |  Comp  | `"20260315"`                      | `null`                   |  FAIL  | `null`                   |  Silent   | Compact ISO silently fails [WS-BUG-5]               |
| ws-5-A-YRDM   |   A    | Y-D-M  | `"2026-15-03"` (YYYY-DD-MM)       | `null`                   |  FAIL  | `null`                   |  Silent   | Invalid month 15; silently fails [WS-BUG-5]         |
| ws-5-A-AMBIG  |   A    | Ambig  | `"05/03/2026"`                    | `"2026-05-03T00:00:00Z"` |  PASS  | `"2026-05-03T00:00:00Z"` |    Yes    | **Interpreted as MM/DD (May 3)** — WEBSERVICE-BUG-3 |
| ws-5-D-DOTNET |   D    |  .NET  | `"2026-03-15T00:00:00.000+00:00"` | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | .NET `+00:00` = Z equivalent (CB-12)                |
| ws-5-D-EPOCH  |   D    | Epoch  | `1773532800000` (number)          | `null`                   |  FAIL  | `null`                   |  Silent   | Numeric epoch silently stored null [WS-BUG-5]       |
| ws-5-D-EPOCHS |   D    | Epoch  | `"1773532800000"` (string)        | `null`                   |  FAIL  | `null`                   |  Silent   | String epoch silently stored null [WS-BUG-5]        |

> **WS-5 Finding**: 24 PASS, 9 FAIL (33 slots). The VV server is very format-tolerant: ISO, US (MM/DD/YYYY), DB storage format, YYYY/MM/DD, YYYY.MM.DD, English month names, and all ISO datetime variants are accepted. **TZ offsets are converted to UTC** (BRT -03:00 → +3h, IST +05:30 → -5:30h). Milliseconds are stripped. **CRITICAL — WEBSERVICE-BUG-2**: DD/MM/YYYY (LATAM) formats are silently accepted but stored as `null` — no error, no warning, complete data loss. **WEBSERVICE-BUG-3**: Ambiguous dates like `05/03/2026` are always interpreted as MM/DD (US) — a LATAM dev intending March 5 gets May 3 stored silently. Compact ISO `20260315`, invalid `2026-15-03`, and **epoch milliseconds** (both numeric and string) also silently fail. .NET `+00:00` offset works (equivalent to Z). H-5 confirmed for ISO/US/named formats.

---

## WS-6. Empty/Null Handling

Test how the API handles empty, null, and special values when creating and updating records.

**On create** (`postForms`) — 2 configs (A date-only, D DateTime+ignoreTZ) × 5 inputs:

| ID             | Config | Input            | Expected Stored | Status | Actual | Notes                                |
| -------------- | :----: | ---------------- | --------------- | :----: | ------ | ------------------------------------ |
| ws-6-A-empty   |   A    | `""`             | `""` or null    |  PASS  | `null` | Empty → null; H-3 ✓                  |
| ws-6-A-null    |   A    | `null`           | `""` or null    |  PASS  | `null` | Null → null                          |
| ws-6-A-omit    |   A    | (field omitted)  | `""` or null    |  PASS  | `null` | Omit → null                          |
| ws-6-A-strNull |   A    | `"null"`         | `"undefined"`   |  PASS  | `null` | Literal "null" not stored as string  |
| ws-6-A-invDate |   A    | `"Invalid Date"` | `"undefined"`   |  PASS  | `null` | "Invalid Date" → null; no FORM-BUG-6 |
| ws-6-D-empty   |   D    | `""`             | `""` or null    |  PASS  | `null` | DateTime empty → null                |
| ws-6-D-null    |   D    | `null`           | `""` or null    |  PASS  | `null` | DateTime null → null                 |
| ws-6-D-omit    |   D    | (field omitted)  | `""` or null    |  PASS  | `null` | DateTime omit → null                 |
| ws-6-D-strNull |   D    | `"null"`         | `"undefined"`   |  PASS  | `null` | DateTime "null" → null               |
| ws-6-D-invDate |   D    | `"Invalid Date"` | `"undefined"`   |  PASS  | `null` | DateTime "Invalid Date" → null       |

**On update** (`postFormRevision`) — clear existing value:

| ID              | Config | Scenario                       | Expected | Status | Actual                            | Notes                            |
| --------------- | :----: | ------------------------------ | -------- | :----: | --------------------------------- | -------------------------------- |
| ws-6-A-clearUpd |   A    | Create with date → Update `""` | Cleared  |  PASS  | before=`T00:00:00Z`, after=`null` | Empty string clears date field   |
| ws-6-D-clearUpd |   D    | Create with date → Update `""` | Cleared  |  PASS  | before=`T00:00:00Z`, after=`null` | Empty string clears DateTime too |

> **WS-6 Finding**: All 12 tests PASS. The API handles empty/null/special values cleanly: all store `null`. **No FORM-BUG-6** — `"Invalid Date"` is not stored as a string (unlike Forms `GetFieldValue` which returns it). `"null"` literal string is also not stored. Empty string via `postFormRevision` successfully clears existing date values. H-3 fully confirmed: API returns `null` for empty date fields, never `""` or `"Invalid Date"`. Configs A and D behave identically.

---

## WS-7. API Update Path

Test `postFormRevision()` behavior: changing dates, preserving existing values, and adding dates to empty fields.

| ID              | Config | Scenario | Step 1 (Create)         | Step 2 (Update)         | Expected After Update    | Status | Actual                   | Notes                    |
| --------------- | :----: | :------: | ----------------------- | ----------------------- | ------------------------ | :----: | ------------------------ | ------------------------ |
| ws-7-A-change   |   A    |  Change  | `"2026-03-15"`          | `"2026-06-20"`          | `"2026-06-20T00:00:00Z"` |  PASS  | `"2026-06-20T00:00:00Z"` | New date replaces old ✓  |
| ws-7-C-change   |   C    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  | `"2026-06-20T09:00:00Z"` | DateTime change ✓        |
| ws-7-D-change   |   D    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  | `"2026-06-20T09:00:00Z"` | DateTime+ignoreTZ ✓      |
| ws-7-H-change   |   H    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00Z"` |  PASS  | `"2026-06-20T09:00:00Z"` | Legacy ✓                 |
| ws-7-A-preserve |   A    | Preserve | `"2026-03-15"`          | (field omitted)         | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` | Field preserved ✓; H-9 ✓ |
| ws-7-C-preserve |   C    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-D-preserve |   D    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-H-preserve |   H    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-A-add      |   A    |   Add    | (no date)               | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` | Add to empty field ✓     |
| ws-7-C-add      |   C    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |
| ws-7-D-add      |   D    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |
| ws-7-H-add      |   H    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |

> **WS-7 Finding**: All 12 tests PASS. `postFormRevision()` behaves correctly for all three scenarios: **Change** replaces the old value, **Preserve** keeps existing values when the field is omitted from the update, **Add** sets a date on a previously empty field. H-9 confirmed (unmentioned fields preserved). All 4 configs (A, C, D, H) behave identically — field config flags have no effect on the update path.

---

## WS-8. Query Date Filtering

Test OData-style `q` parameter filters on date fields via `getForms()`. Requires records created by WS-1.

**Prerequisite**: At least one WS-1 record with known stored values.

| ID             | Config | Query Type      | Query                                                   | Expected      | Status | Matched | Notes                                     |
| -------------- | :----: | --------------- | ------------------------------------------------------- | ------------- | :----: | :-----: | ----------------------------------------- |
| ws-8-A-eq      |   A    | Exact match     | `[Field7] eq '2026-03-15'`                              | Match         |  PASS  |   Yes   | ISO date-only matches stored T00:00:00Z   |
| ws-8-A-gt      |   A    | Greater than    | `[Field7] gt '2026-03-14'`                              | Match         |  PASS  |   Yes   | Date comparison works ✓                   |
| ws-8-A-range   |   A    | Range           | `[Field7] ge '2026-03-15' AND [Field7] le '2026-03-16'` | Match         |  PASS  |   Yes   | Inclusive range works ✓                   |
| ws-8-A-fmtUS   |   A    | Format mismatch | `[Field7] eq '03/15/2026'`                              | `"undefined"` |  PASS  |   Yes   | US format in query works! H-10 ✓          |
| ws-8-A-noMatch |   A    | No match        | `[Field7] eq '2026-03-16'`                              | No match      |  PASS  |   No    | Control — correct no-match ✓              |
| ws-8-C-eq      |   C    | Exact match     | `[Field6] eq '2026-03-15T14:30:00'`                     | Match         |  PASS  |   Yes   | DateTime equality works ✓                 |
| ws-8-C-gt      |   C    | Greater than    | `[Field6] gt '2026-03-15T14:00:00'`                     | Match         |  PASS  |   Yes   | DateTime comparison works ✓               |
| ws-8-C-range   |   C    | Range           | `[Field6] ge '2026-03-15' AND [Field6] le '2026-03-16'` | Match         |  PASS  |   Yes   | Date-only range on DateTime field works ✓ |
| ws-8-C-fmtZ    |   C    | Format mismatch | `[Field6] eq '2026-03-15T14:30:00Z'`                    | `"undefined"` |  PASS  |   Yes   | Z suffix in query matches stored Z ✓      |
| ws-8-C-noMatch |   C    | No match        | `[Field6] eq '2026-03-15T15:00:00'`                     | No match      |  PASS  |   No    | Control — correct no-match ✓              |

> **WS-8 Finding**: All 10 tests PASS. The OData query engine normalizes date formats — ISO date-only, US format (MM/DD/YYYY), and ISO datetime with Z all match correctly. Date-only range queries work on DateTime fields. H-10 confirmed: OData filters match stored format reliably. The query engine is more format-tolerant than expected.

---

## WS-9. Date Computation in Scripts

Test what gets stored when scripts perform date arithmetic or create JavaScript `Date` objects before sending to the API. This simulates real production patterns where scripts compute due dates, deadlines, or offsets before creating/updating records.

**Why this matters**: `JSON.stringify()` serializes `Date` objects via `.toJSON()` → ISO 8601 with Z suffix (e.g., `"2026-04-14T00:00:00.000Z"`). The `Date` constructor and arithmetic methods are TZ-sensitive. A script running in BRT may produce different results from the same script in UTC (cloud).

**Server TZ simulation**: Use `TZ=` env var to run the Node.js server in different timezones without changing macOS system TZ.

**Patterns tested**:

| Pattern                     | Code                                          | Risk                                                                                                              |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Date obj from ISO**       | `new Date("2026-03-15")` → send to API        | Always UTC midnight → `"2026-03-15T00:00:00.000Z"`. TZ-safe for serialization, but `getDate()` returns local day. |
| **Date obj from US format** | `new Date("03/15/2026")` → send to API        | LOCAL midnight → different UTC per TZ. BRT: `T03:00:00.000Z`, IST: prev-day `T18:30:00.000Z`.                     |
| **Local arithmetic**        | `d.setDate(d.getDate() + 30)` → send Date     | `getDate()` is local-TZ-dependent. For ISO-parsed dates, local day may differ from UTC day.                       |
| **Safe string pattern**     | `d.toISOString().split('T')[0]` → send string | Always extracts UTC date → TZ-independent. Recommended pattern.                                                   |

| ID                  | Config | Server TZ | Pattern                       | Serialized (.toJSON / string) | Status | Stored                   | TZ-safe? | Notes                                                            |
| ------------------- | :----: | :-------: | ----------------------------- | ----------------------------- | :----: | ------------------------ | :------: | ---------------------------------------------------------------- |
| ws-9-A-iso-BRT      |   A    |    BRT    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | ISO parse → UTC midnight; H-11 ✓                                 |
| ws-9-A-iso-IST      |   A    |    IST    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Same result regardless of TZ                                     |
| ws-9-A-iso-UTC      |   A    |    UTC    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Cloud baseline                                                   |
| ws-9-C-iso-BRT      |   C    |    BRT    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | DateTime field receives ISO+Z                                    |
| ws-9-A-us-BRT       |   A    |    BRT    | `new Date("03/15/2026")`      | `"2026-03-15T03:00:00.000Z"`  |  FAIL  | `"2026-03-15T03:00:00Z"` |    No    | BRT midnight = 3am UTC; time leaks into date-only                |
| ws-9-A-us-IST       |   A    |    IST    | `new Date("03/15/2026")`      | `"2026-03-14T18:30:00.000Z"`  |  FAIL  | `"2026-03-14T18:30:00Z"` |    No    | IST midnight = prev UTC day! H-12 ✓                              |
| ws-9-A-us-UTC       |   A    |    UTC    | `new Date("03/15/2026")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC: local=UTC, no shift                                         |
| ws-9-A-parts-BRT    |   A    |    BRT    | `new Date(2026, 2, 15)`       | `"2026-03-15T03:00:00.000Z"`  |  FAIL  | `"2026-03-15T03:00:00Z"` |    No    | Same as US: local midnight = 3am UTC                             |
| ws-9-A-parts-IST    |   A    |    IST    | `new Date(2026, 2, 15)`       | `"2026-03-14T18:30:00.000Z"`  |  FAIL  | `"2026-03-14T18:30:00Z"` |    No    | Same as US: IST midnight = prev UTC day                          |
| ws-9-A-parts-UTC    |   A    |    UTC    | `new Date(2026, 2, 15)`       | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC control                                                      |
| ws-9-A-utc-BRT      |   A    |    BRT    | `new Date(Date.UTC(...))`     | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Explicit UTC — TZ-safe ✓                                         |
| ws-9-A-utc-IST      |   A    |    IST    | `new Date(Date.UTC(...))`     | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Explicit UTC — TZ-safe ✓                                         |
| ws-9-A-arith-BRT    |   A    |    BRT    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Local arith on UTC base → coincidentally correct                 |
| ws-9-A-arith-IST    |   A    |    IST    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | IST getDate()=15 → same result (lucky: base is UTC midnight)     |
| ws-9-A-arith-UTC    |   A    |    UTC    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC control                                                      |
| ws-9-A-arithUTC-BRT |   A    |    BRT    | `setUTCDate(getUTCDate()+30)` | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC arithmetic — always TZ-safe                                  |
| ws-9-A-arithUTC-IST |   A    |    IST    | `setUTCDate(getUTCDate()+30)` | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC arithmetic — always TZ-safe                                  |
| ws-9-A-safe-BRT     |   A    |    BRT    | `toISOString().split('T')[0]` | `"2026-04-14"`                |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Safe string extract — TZ-independent ✓                           |
| ws-9-A-safe-IST     |   A    |    IST    | `toISOString().split('T')[0]` | `"2026-04-14"`                |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Same as BRT ✓                                                    |
| ws-9-A-locale-BRT   |   A    |    BRT    | `toLocaleDateString('en-US')` | `"3/14/2026"`                 |  FAIL  | `"2026-03-14T00:00:00Z"` |    No    | **BRT gets Mar 14 (wrong day!)** — UTC midnight = prev local day |
| ws-9-A-locale-IST   |   A    |    IST    | `toLocaleDateString('en-US')` | `"3/15/2026"`                 |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | IST: UTC midnight = same local day (lucky)                       |
| ws-9-A-locale-UTC   |   A    |    UTC    | `toLocaleDateString('en-US')` | `"3/15/2026"`                 |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC control                                                      |

> **WS-9 Finding**: 17 PASS, 6 FAIL across 3 TZs and 8 patterns. **TZ-safe patterns**: `new Date("ISO")`, `Date.UTC()`, `toISOString().split('T')[0]`, `setUTCDate/getUTCDate`. **TZ-unsafe patterns**: `new Date("MM/DD")`, `new Date(y,m,d)`, `toLocaleDateString()` — all produce local midnight which shifts UTC day/time per TZ. **H-11 confirmed**: Date objects serialized with Z suffix are handled correctly by the server. **H-12 confirmed**: US-format `new Date()` produces different API results per server TZ — IST stores the previous day. **New finding**: `toLocaleDateString()` in UTC- timezones (BRT) returns the previous calendar day for UTC-midnight dates, causing wrong date storage.

---

## WS-10. postForms vs forminstance/ Endpoint Comparison (Freshdesk #124697)

<!-- task-status: non-executable prefix="ws-10a-" reason="browser-only" -->
<!-- task-status: non-executable prefix="ws-10b-" reason="browser-only" -->
<!-- task-status: non-executable prefix="ws-10c-" reason="browser-only" -->

> **Execution note — browser-only.** These 12 slots cannot be driven by the WS regression runner (`testing/pipelines/run-ws-regression.js`) alone — WS-10a compares rawValue/Display/GFV (browser-only surfaces), WS-10b reads the `FormInstance/Controls` endpoint the runner doesn't call, and WS-10c is a save-and-stabilize flow. The companion is `tools/audit/verify-ws10-browser.js`. `npm run task:status` treats these as non-executable for this runner, not as actionable pending.

**Freshdesk #124697** (Jira WADNR-10407): Customer reports that records created via `postForms` API (`/formtemplates/<id>/forms`) have their time value silently mutated on first form open. Switching to the `forminstance/` endpoint (FormsAPI) avoids the mutation. After saving the corrupted value, subsequent open+save cycles are stable.

**Root cause hypothesis**: `postForms` stores datetime values with trailing Z (CB-8). `forminstance/` may store without Z, preventing Forms V1 from applying UTC→local conversion on load.

**Three sub-actions**:

- **WS-10A**: Verify postForms cross-layer mutation + forminstance/ comparison (forminstance/ initially BLOCKED on vvdemo; resolved post-run via browser verification)
- **WS-10B**: Side-by-side endpoint comparison — initially BLOCKED (forminstance/ returned 500 on vvdemo); resolved post-run
- **WS-10C**: Save-and-stabilize — confirm first save commits mutation, subsequent saves are stable

**Harness action**: `WS-10` (creates records via both endpoints, returns DataIDs for browser verification)
**Browser script**: `verify-ws10-browser.js` (compare mode + save-stabilize mode)

**FormsAPI payload discovery**: Browser intercept of `VV.Form.CreateFormInstance` revealed the correct payload: `{ formTemplateId: "<revisionId>", formName: "", fields: [{ key: "FieldN", value: "..." }] }` — uses `key`/`value` (not `name`/`value`) and lowercase `fields` (not `Fields`).

**Critical finding (CB-29)**: Both endpoints store **identical** values in the database (`"2026-03-15T14:30:00Z"` — confirmed via WS-2 API read). Yet Forms V1 treats them differently: `postForms` records have rawValue shifted by TZ offset on form open, while `forminstance/` records preserve the original time. The difference is NOT in the stored date value but in **how the record/revision was created** — the FormsAPI writes different metadata (revision history, field format markers, or field-level storage encoding) that causes `initCalendarValueV1` to take a different code path.

### WS-10A: postForms → Browser Verify (+ forminstance/ comparison)

Records: DateTest-001583 (postForms), DateTest-001584 (forminstance/). Input: `"2026-03-15T14:30:00"`.
API read-back via WS-2: both return `"2026-03-15T14:30:00Z"` for all configs (storedMatch=true).

| ID           | Config | Browser TZ | Endpoint     | API Stored               | Actual Display            | rawValue                    | GFV                              | Status | Bugs    | Notes                                          |
| ------------ | :----: | :--------: | ------------ | ------------------------ | ------------------------- | --------------------------- | -------------------------------- | :----: | ------- | ---------------------------------------------- |
| ws-10a-A-BRT |   A    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"2026-03-15"`              | `"2026-03-15"`                   |  PASS  |         | Date-only strips time ✓                        |
| ws-10a-A-BRT |   A    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"03/15/2026 14:30:00"`     | `"03/15/2026 14:30:00"`          |  PASS  |         | Date-only — raw keeps US format from FormsAPI  |
| ws-10a-C-BRT |   C    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 11:30 AM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T14:30:00.000Z"`     |  FAIL  | CB-8    | UTC→BRT shift -3h                              |
| ws-10a-C-BRT |   C    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T17:30:00.000Z"`     |  PASS  |         | **No shift!** rawValue=T14:30 (original) ✓     |
| ws-10a-D-BRT |   D    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T11:30:00.000Z"`     |  FAIL  | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted        |
| ws-10a-D-BRT |   D    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | **`"2026-03-15T14:30:00.000Z"`** |  PASS  |         | **No shift! No FORM-BUG-5!** rawValue=T14:30 ✓ |
| ws-10a-H-BRT |   H    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T11:30:00"`          |  FAIL  | CB-8    | Like D minus fake Z (legacy)                   |
| ws-10a-H-BRT |   H    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T14:30:00"`          |  PASS  |         | **No shift!** (legacy) ✓                       |
| ws-10a-A-IST |   A    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"2026-03-15"`              | `"2026-03-15"`                   |  PASS  |         | Date-only correct ✓                            |
| ws-10a-C-IST |   C    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 08:00 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T14:30:00.000Z"`     |  FAIL  | CB-8    | UTC→IST shift +5:30h                           |
| ws-10a-C-IST |   C    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T09:00:00.000Z"`     |  PASS  |         | **No shift!** rawValue=T14:30 ✓                |
| ws-10a-D-IST |   D    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T20:00:00.000Z"`     |  FAIL  | CB-8,#5 | Display OK, rawValue shifted +5:30h            |
| ws-10a-D-IST |   D    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | **`"2026-03-15T14:30:00.000Z"`** |  PASS  |         | **No shift! No FORM-BUG-5!** ✓                 |
| ws-10a-H-IST |   H    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T20:00:00"`          |  FAIL  | CB-8    | Like D minus fake Z                            |
| ws-10a-H-IST |   H    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T14:30:00"`          |  PASS  |         | **No shift!** ✓                                |

> **WS-10A Finding**: **postForms: 2 PASS, 6 FAIL. forminstance/: 8 PASS, 0 FAIL.** The `forminstance/` endpoint completely avoids CB-8 and FORM-BUG-5. Root cause (CB-29): Both endpoints store identical SQL `datetime` values in the DB, but `FormInstance/Controls` serializes them differently — ISO+Z for postForms records, US format for forminstance/ records. Forms V1 parses US format as local time (no conversion), but ISO+Z as UTC (triggers local conversion = shift).

### WS-10B: Side-by-Side Endpoint Comparison

Records: DateTest-001583 (postForms) vs DateTest-001584 (forminstance/). Same input, same API read-back.

| ID           | Config | Browser TZ | postForms rawValue      | forminstance/ rawValue  | postForms GFV                | forminstance/ GFV            | Display Match | Status | Notes                                                      |
| ------------ | :----: | :--------: | ----------------------- | ----------------------- | ---------------------------- | ---------------------------- | :-----------: | :----: | ---------------------------------------------------------- |
| ws-10b-C-BRT |   C    |    BRT     | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T17:30:00.000Z"` |      No       |  FAIL  | rawValue: shifted vs original. GFV: both have Z but differ |
| ws-10b-D-BRT |   D    |    BRT     | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T11:30:00.000Z"` | `"2026-03-15T14:30:00.000Z"` |      Yes      |  FAIL  | rawValue differs (shifted vs original), GFV differs        |

> **WS-10B Finding (ROOT CAUSE — CB-29)**: API stores identical values (`storedMatch=true` via core API read), but the `FormInstance/Controls` endpoint reveals **different storage formats**: postForms → `"2026-03-15T14:30:00Z"` (ISO+Z), forminstance/ → `"03/15/2026 14:30:00"` (US format, no TZ). Forms V1 interprets ISO+Z as UTC (→ local conversion = CB-8 shift) but US format as local time (→ no conversion = preserved). **This is why the ticket's workaround works** — different storage format bypasses the V1 UTC interpretation.

### WS-10C: Save-and-Stabilize (First-Open Mutation)

Record: DateTest-001568 → saved as ffc087e3-4a34-4ab9-9d2d-fdcd61cf2cdf

| ID           | Config | Browser TZ | Snap 1 Display | Snap 1 rawValue         | Snap 2 Display | Snap 2 rawValue         | Snap 3 = Snap 2? | Status | Notes                                                                                                                                                                      |
| ------------ | :----: | :--------: | -------------- | ----------------------- | -------------- | ----------------------- | :--------------: | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ws-10c-C-BRT |   C    |    BRT     | `11:30 AM`     | `"2026-03-15T11:30:00"` | `11:30 AM`     | `"2026-03-15T11:30:00"` |       Yes        |  FAIL  | CB-8 shift on load, save commits shifted value, stable after                                                                                                               |
| ws-10c-D-BRT |   D    |    BRT     | **`02:30 PM`** | `"2026-03-15T11:30:00"` | **`11:30 AM`** | `"2026-03-15T11:30:00"` |       Yes        |  FAIL  | **#124697**: Display shows original time on first open (ignoreTZ), save commits shifted value, display changes to shifted time on reopen. Exactly matches customer report. |

> **WS-10C Finding**: 0 PASS, 2 FAIL. **Config D is the exact Freshdesk #124697 scenario**: display shows `02:30 PM` on first open (ignoreTZ preserves original DB time), rawValue already shifted to `T11:30:00` in memory. After save+reopen, display changes to `11:30 AM` (shifted value now in DB). Stable after first mutation — no further drift. Config C shifts both display and rawValue identically (no surprise — ignoreTZ=false).

---

## WS-11. T1/T2 Cross-Layer (Platform-Scope Backlog)

Paired with Forms Cat 17. When the Central Admin Forms section has **T1** ("Convert Date Fields to Customer Timezone") on — with or without **T2** ("Prevent Conversion For Dates Ignoring Timezones") — does the API→Forms cross-layer path (WS-2/WS-4) behave differently?

**Hypothesis**: T1 injects a Customer-TZ normalization step between DB storage and Forms re-read. If so, the CB-8 shift (WEBSERVICE-BUG-1) may disappear or invert.

**Method**: Write via `postForms` with canonical ISO+Z inputs, toggle T1/T2 at DB scope, re-read via Forms and via API. Compare to WS-2/WS-4 baseline.

**Shape**: 2 configs (A, D) × 3 toggle combos = 6 slots.

| Test ID              | Config | Scope    | Input (via postForms)        | WS-2/WS-4 baseline                                                          | Probe                                                    | Status  | Run Date | Evidence |
| -------------------- | :----: | -------- | ---------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- | ------- | -------- | -------- |
| ws-11-A-BRT.T1       |   A    | `.T1`    | `"2026-03-15T00:00:00.000Z"` | Forms: `"2026-03-15"`, OK                                                   | Does T1 introduce a shift on date-only?                  | PENDING | —        | —        |
| ws-11-D-BRT.T1       |   D    | `.T1`    | `"2026-03-15T00:00:00.000Z"` | Forms: fake Z, shift (CB-8/BUG-5)                                           | Does T1 fix or worsen CB-8? Round-trip stability?        | PENDING | —        | —        |
| ws-11-D-IST.T1       |   D    | `.T1`    | `"2026-03-15T00:00:00.000Z"` | Forms: shifted to IST local                                                 | Same but from IST browser                                | PENDING | —        | —        |
| ws-11-A-BRT.T1+T2    |   A    | `.T1+T2` | `"2026-03-15T00:00:00.000Z"` | (T2 requires ignoreTZ — Config A has ignoreTZ=false, so T2 should be no-op) | Verify T2 no-op on ignoreTZ=false                        | PENDING | —        | —        |
| ws-11-D-BRT.T1+T2    |   D    | `.T1+T2` | `"2026-03-15T00:00:00.000Z"` | Config D has ignoreTZ=true — T2 applies                                     | Does T2 restore baseline (CB-8 shift preserved)?         | PENDING | —        | —        |
| ws-11-D-BRT.baseline |   D    | —        | Same input                   | Same                                                                        | Control: rerun after T1/T2 flip to confirm no state leak | PENDING | —        | —        |

> **If T1 eliminates CB-8**: This is a platform-provided fix we need to document as the VV-recommended remediation. Tests should also verify it doesn't break anything else.
> **If T1 doesn't eliminate CB-8 or introduces new behavior**: Document the new behavior and file as a separate bug if discrepant.

---

## WS-12. Culture Input Tolerance (Platform-Scope Backlog)

Paired with Forms Cat 18. When Customer **Culture** is `ptBR` or `esES` (DD/MM/YYYY locales), does the REST API parse DD/MM strings correctly? Does this flip WEBSERVICE-BUG-2 ("DD/MM silently discarded") and WEBSERVICE-BUG-3 ("ambiguous dates silently swapped")?

**Method**: Set Customer Culture to `Portuguese (Brazil)` via Central Admin. POST via `postForms` with DD/MM, MM/DD, ISO, and ambiguous date strings. Verify parse success vs null vs swap.

**Shape**: 2 cultures × 4 formats = 8 slots.

| Test ID              | Culture | Format    | Input          | enUS baseline (WS-5 / WS-BUG-2/3) | Probe                                                                                       | Status  | Run Date | Evidence |
| -------------------- | :-----: | --------- | -------------- | --------------------------------- | ------------------------------------------------------------------------------------------- | ------- | -------- | -------- |
| ws-12-DDMM.ptBR      |  ptBR   | DD/MM     | `"15/03/2026"` | enUS: null (WS-BUG-2)             | ptBR: parse to `"2026-03-15"`? Expected yes.                                                | PENDING | —        | —        |
| ws-12-MMDD.ptBR      |  ptBR   | MM/DD     | `"03/15/2026"` | enUS: parses to `"2026-03-15"`    | ptBR: reject? Fallback? Tolerant?                                                           | PENDING | —        | —        |
| ws-12-ISO.ptBR       |  ptBR   | ISO       | `"2026-03-15"` | enUS: parses ✓                    | ISO should be Culture-independent                                                           | PENDING | —        | —        |
| ws-12-ambiguous.ptBR |  ptBR   | ambiguous | `"03/04/2026"` | enUS: parses to Mar 4 (MM/DD)     | ptBR: parse to Apr 3 (DD/MM) — opposite interpretation, no swap warning (WS-BUG-3 inverted) | PENDING | —        | —        |
| ws-12-DDMM.enUS      |  enUS   | DD/MM     | `"15/03/2026"` | —                                 | Control: reproduce WS-BUG-2 on current matrix                                               | PENDING | —        | —        |
| ws-12-MMDD.enUS      |  enUS   | MM/DD     | `"03/15/2026"` | —                                 | Control                                                                                     | PENDING | —        | —        |
| ws-12-ISO.enUS       |  enUS   | ISO       | `"2026-03-15"` | —                                 | Control                                                                                     | PENDING | —        | —        |
| ws-12-ambiguous.enUS |  enUS   | ambiguous | `"03/04/2026"` | —                                 | Control: reproduce WS-BUG-3 on current matrix                                               | PENDING | —        | —        |

> **Implication for LATAM customers**: VV admin docs probably recommend Culture=ptBR for Brazilian customers. If those customers' scripts send DD/MM to the API, WS-BUG-2/3 may be **platform-misconfiguration** not **API bug** — the fix is Culture, not code.

---

## WS-13. Customer-TZ in Server Scripts (Platform-Scope Backlog)

Paired with Forms Cat 19. Does the Central Admin Customer TZ setting propagate to `DateTime.Now` in Node.js scripts and `GETDATE()` in SQL (via custom queries / web services)?

**Method**: On two sandboxes (vv5dev Customer TZ = UTC; vvdemo Customer TZ = BRT), run a small scheduled script returning `DateTime.Now`. Read a custom query that returns `GETDATE()`. Compare to wall-clock and to the Customer TZ setting.

**Shape**: 2 Customer TZs × 2 mechanisms = 4 slots.

| Test ID           | Customer TZ | Mechanism                                    | Expected                                                                              | Status  | Run Date | Evidence |
| ----------------- | ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------- | ------- | -------- | -------- |
| ws-13-now.UTC     | UTC         | `DateTime.Now` (Node.js via outside process) | Returns UTC wall-clock timestamp. `process.env.TZ` on harness may override.           | PENDING | —        | —        |
| ws-13-now.BRT     | BRT         | `DateTime.Now` (Node.js)                     | Returns BRT wall-clock timestamp (UTC-3). Compare with TZ=UTC harness override.       | PENDING | —        | —        |
| ws-13-getdate.UTC | UTC         | `GETDATE()` via custom query                 | SQL Server OS-TZ, not Customer TZ. Document the discrepancy.                          | PENDING | —        | —        |
| ws-13-getdate.BRT | BRT         | `GETDATE()` via custom query                 | Same SQL Server OS-TZ on both customers — Customer TZ setting does **not** reach SQL. | PENDING | —        | —        |

> **Expected finding (hypothesis)**: `DateTime.Now` will follow the harness server's `TZ` env var (not Customer TZ). `GETDATE()` will follow SQL Server OS TZ (not Customer TZ). If confirmed, **the Customer TZ setting is effectively display-only** for server-generated timestamps — a significant documentation gap to close.
> **Cross-reference**: Cat 19 (Forms) tests server-generated timestamps from the form-save path (Created Date auto-field). WS-13 tests them from the script/SQL path. Combined picture tells us whether Customer TZ is enforced at any server layer.

<!-- ws-v2-baseline:emanueljofre-vv5dev -->

## V2 Baseline Additions — EmanuelJofre-vv5dev (2026-04-22)

Auto-generated from [`v2-baseline-audit.json`](../../../projects/emanueljofre-vv5dev/testing/date-handling/web-services/v2-baseline-audit.json). Build fingerprint: `f36b65dd`. These slots were emitted by the harness but not enumerated in the sections above. Observed `stored` values from the run are used as the V1-baseline-equivalent Expected here — they document what VV currently returns for each slot and become the comparison target for future regression runs. Regenerate with `node tools/analysis/generate-ws-v2-matrix.js --project <name>`.

| ID                    | Action | Config | TZ  | Variant/Format | Input Sent | Expected Stored        |  Status  |
| --------------------- | :----: | :----: | :-: | :------------: | ---------- | ---------------------- | :------: |
| `ws-5-a-brt`          |  WS-5  |   A    | BRT |       —        | `—`        | `2026-03-15T00:00:00Z` | BASELINE |
| `ws-5-c-brt`          |  WS-5  |   C    | BRT |       —        | `—`        | `2026-03-15T00:00:00Z` | BASELINE |
| `ws-5-d-brt`          |  WS-5  |   D    | BRT |       —        | `—`        | `2026-03-15T00:00:00Z` | BASELINE |
| `ws-7-a-brt`          |  WS-7  |   A    | BRT |       —        | `—`        | `2026-03-15T00:00:00Z` | BASELINE |
| `ws-7-c-brt`          |  WS-7  |   C    | BRT |       —        | `—`        | `2026-03-15T14:30:00Z` | BASELINE |
| `ws-7-d-brt`          |  WS-7  |   D    | BRT |       —        | `—`        | `2026-03-15T14:30:00Z` | BASELINE |
| `ws-7-h-brt`          |  WS-7  |   H    | BRT |       —        | `—`        | `2026-03-15T14:30:00Z` | BASELINE |
| `ws-9-a-arithutc-utc` |  WS-9  |   A    | UTC |    arithUTC    | `—`        | `2026-04-14T00:00:00Z` | BASELINE |
| `ws-9-a-safe-utc`     |  WS-9  |   A    | UTC |      safe      | `—`        | `2026-04-14T00:00:00Z` | BASELINE |
| `ws-9-a-utc-utc`      |  WS-9  |   A    | UTC |      utc       | `—`        | `2026-03-15T00:00:00Z` | BASELINE |
| `ws-9-c-arith-brt`    |  WS-9  |   C    | BRT |     arith      | `—`        | `2026-04-14T00:00:00Z` | BASELINE |
| `ws-9-c-arithutc-brt` |  WS-9  |   C    | BRT |    arithUTC    | `—`        | `2026-04-14T00:00:00Z` | BASELINE |
| `ws-9-c-locale-brt`   |  WS-9  |   C    | BRT |     locale     | `—`        | `2026-03-14T00:00:00Z` | BASELINE |
| `ws-9-c-parts-brt`    |  WS-9  |   C    | BRT |     parts      | `—`        | `2026-03-15T03:00:00Z` | BASELINE |
| `ws-9-c-safe-brt`     |  WS-9  |   C    | BRT |      safe      | `—`        | `2026-04-14T00:00:00Z` | BASELINE |
| `ws-9-c-us-brt`       |  WS-9  |   C    | BRT |       us       | `—`        | `2026-03-15T03:00:00Z` | BASELINE |
| `ws-9-c-utc-brt`      |  WS-9  |   C    | BRT |      utc       | `—`        | `2026-03-15T00:00:00Z` | BASELINE |

<!-- /ws-v2-baseline:emanueljofre-vv5dev -->
