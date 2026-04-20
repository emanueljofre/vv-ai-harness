# Forms Calendar — Test Matrix

Methodology and test slot definitions for the forms calendar date-handling investigation.
Bug analysis → `analysis/`

**Execution results**: See `projects/{customer}/testing/date-handling/forms-calendar/status.md` per environment.

Total slots: 351 (269 baselined + 82 backlog — see [Open Gaps & Backlog](#open-gaps--backlog))

> **Note**: Results columns in the tables below are a historical snapshot from the EmanuelJofre (vvdemo) baseline captured under the **default Platform Scope** (V1 code path, T1/T2 off, en-US Culture — see [Platform Scope](#platform-scope)). Live status tracking is in per-project `status.md` files.

**Cross-environment validation**: WADNR (vv5dev) — 116/116 PASS on BRT-Chromium (2026-04-10). All results identical to EmanuelJofre baseline, **same V1 default scope**. See `projects/wadnr/testing/date-handling/forms-calendar/status.md`. For the WADNR-scoped synthesis (per-layer + per-config walkthroughs): `projects/wadnr/analysis/date-handling-current-state.md`.

**V2 baseline status (vv5dev/EmanuelJofre)**: Initial chromium run captured 2026-04-20 (405 executed / 51 passed / 354 failed) at [`projects/emanueljofre-vv5dev/testing/date-handling/`](../../../projects/emanueljofre-vv5dev/testing/date-handling/). Expected values in Cats 1–13 are still V1-baselined — most of the 354 "failures" are **expected-value drift**, not new bugs. A rebaseline pass is required before new-bug accounting is accurate; see [Open Gaps & Backlog § G1](#open-gaps--backlog).

---

## ID Convention

Category test IDs (`1-A-BRT`, `7-D-isoNoZ`) identify **planned test slots** — a Config × TZ × input combination that may or may not have been run. They map to rows in this file.

Execution test IDs (`1.1`, `2.3`) identify **session run blocks** in `results.md`. One execution block may cover multiple category IDs.

**Platform-scope suffix** (new 2026-04-20): when a slot is run under a non-default Platform Scope, append a `.<scope>` suffix — e.g. `1-D-BRT.V2`, `1-D-BRT.V2+T1`, `7-D-isoZ.ptBR`. Slots without a suffix implicitly use the default scope (V1, T1/T2 off, en-US). See the [Platform Scope](#platform-scope) section for the scope tokens.

---

## Field Configurations

All tests target one of 8 field configurations defined by three boolean flags:

| Config | enableTime | ignoreTZ | useLegacy | Test Field | Access      |
| :----: | :--------: | :------: | :-------: | ---------- | ----------- |
|   A    |   false    |  false   |   false   | Field7     | ✓ Available |
|   B    |   false    |   true   |   false   | Field10    | ✓ Available |
|   C    |    true    |  false   |   false   | Field6     | ✓ Available |
|   D    |    true    |   true   |   false   | Field5     | ✓ Available |
|   E    |   false    |  false   |   true    | Field12    | ✓ Available |
|   F    |   false    |   true   |   true    | Field11    | ✓ Available |
|   G    |    true    |  false   |   true    | Field14    | ✓ Available |
|   H    |    true    |   true   |   true    | Field13    | ✓ Available |

**Config D** (`enableTime=true`, `ignoreTZ=true`) is the primary bug surface — active for FORM-BUG-5 and FORM-BUG-6.
**Configs A/B** (`enableTime=false`) are the FORM-BUG-7 surface — only visible in UTC+ timezones.

---

## Platform Scope

Every test slot is implicitly run against a Platform Scope — the set of Central Admin toggles and customer-level settings that modulate the pipeline _before_ field config and browser TZ enter the picture. The full catalogue is documented in [`projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md`](../../../projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md); the subset relevant to this matrix:

| Token  | Setting                                                | Default (existing slots) | Notes                                                                   |
| ------ | ------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| `V1`   | "Use Updated Calendar Control Logic" — OFF (DB scope)  | **V1**                   | Default on vvdemo/EmanuelJofre-vvdemo and WADNR                         |
| `V2`   | "Use Updated Calendar Control Logic" — ON (DB scope)   | —                        | Default on vv5dev/EmanuelJofre-vv5dev (DB-scope push via `setUserInfo`) |
| `T1`   | "Convert Date Fields to Customer Timezone" — ON        | OFF                      | Untested platform toggle (Cat 17)                                       |
| `T2`   | "Prevent Conversion For Dates Ignoring Timezones" — ON | OFF                      | Override for `ignoreTimezone=true` when T1 is on                        |
| `T3`   | "Calendar Field Default Mask" set (platform-level)     | blank                    | Distinct from per-field `<Mask>` (Cat 14 A-C)                           |
| `enUS` | Customer Culture = `English (United States)` (MM/DD)   | **enUS**                 | Default — our entire baseline                                           |
| `ptBR` | Customer Culture = `Portuguese (Brazil)` (DD/MM)       | —                        | Customer-scope Central Admin (Cat 18)                                   |
| `esES` | Customer Culture = `Spanish (Spain)` (DD/MM)           | —                        | Customer-scope Central Admin (Cat 18)                                   |

**Scope suffix on test IDs**: slots without a suffix assume the full default scope (`.V1.enUS`, no T1/T2/T3). Non-default slots carry an explicit suffix — e.g. `1-D-BRT.V2`, `1-D-BRT.V2+T1`, `7-D-isoZ.ptBR`, `14-A-SFV.T3`. Multiple tokens combine with `+`.

**Scope precedence** (observed via V1/V2 cascade): Database > Customer > Environment. A slot's scope is the **effective resolved value** regardless of which scope set it.

---

## Coverage Summary

`PASS` = ran, no bug triggered. `FAIL` = ran, bug confirmed. `PENDING` = not yet run, no blocker. `BLOCKED` = requires access/setup not currently available. `PARTIAL` = ran, partial result only (noted in Actual). `SKIP` = intentionally excluded with known reason.

| Category                        |  Total  |  PASS   |  FAIL   | PENDING | BLOCKED | PARTIAL | SKIP  |
| ------------------------------- | :-----: | :-----: | :-----: | :-----: | :-----: | :-----: | :---: |
| 1. Calendar Popup               |   20    |    4    |   16    |    0    |    0    |    0    |   0   |
| 2. Typed Input                  |   16    |    8    |    8    |    0    |    0    |    0    |   0   |
| 3. Server Reload                |   18    |   10    |    8    |    0    |    0    |    0    |   0   |
| 4. URL Parameters               |   39    |   39    |    0    |    0    |    0    |    0    |   0   |
| 5. Preset Date                  |   18    |   11    |    7    |    0    |    0    |    0    |   0   |
| 6. Current Date                 |   15    |   13    |    2    |    0    |    0    |    0    |   0   |
| 7. SetFieldValue formats        |   39    |   23    |   16    |    0    |    0    |    0    |   0   |
| 8. GetFieldValue return         |   19    |   13    |    6    |    0    |    0    |    0    |   0   |
| 8B. GetDateObject return        |   12    |   11    |    1    |    0    |    0    |    0    |   0   |
| 9. Round-Trip (GFV)             |   20    |    9    |   11    |    0    |    0    |    0    |   0   |
| 9-GDOC. Round-Trip (GDOC)       |    5    |    4    |    1    |    0    |    0    |    0    |   0   |
| 10. Web Service                 |   11    |    4    |    5    |    1    |    0    |    0    |   1   |
| 11. Cross-Timezone              |   18    |   11    |    6    |    1    |    0    |    0    |   0   |
| 12. Edge Cases                  |   20    |    3    |   16    |    0    |    0    |    0    |   1   |
| 13. Database                    |   10    |    4    |    6    |    0    |    0    |    0    |   0   |
| 14. Mask Impact (A-C)           |   13    |    0    |    0    |   13    |    0    |    0    |   0   |
| 14-D. Platform-Default Mask     |    6    |    0    |    0    |    6    |    0    |    0    |   0   |
| 15. Kendo Widget Compare        |    8    |    0    |    0    |    8    |    0    |    0    |   0   |
| 16. Server TZ Form Save         |    6    |    0    |    0    |    6    |    0    |    0    |   0   |
| 17. Platform TZ Toggles (T1/T2) |   48    |    0    |    0    |   48    |    0    |    0    |   0   |
| 18. Customer Culture (locale)   |   20    |    0    |    0    |   20    |    0    |    0    |   0   |
| 19. Server-Generated Timestamps |    8    |    0    |    0    |    8    |    0    |    0    |   0   |
| **TOTAL**                       | **351** | **113** | **100** | **135** |  **0**  |  **1**  | **2** |

**Scope coverage note**: the 214 non-PENDING slots above are all at default scope (`.V1.enUS`, T1/T2/T3 off). The 135 PENDING slots either vary scope explicitly (Cats 17/18, V2 rebaseline) or exercise dimensions not yet covered at the default scope (Cats 14/14-D/15/16/19 and residual PENDING in 10/11).

---

## Open Gaps & Backlog

Meta-tracker for coverage gaps identified 2026-04-20 from the Central Admin exploration. Gaps not yet represented as PENDING slots in the Coverage Summary appear below as `Gn` IDs. Each entry: _Why it matters → How to close it → Priority_.

### Tier 1 — High-impact untested platform toggles

| ID  | Gap                                                           | Why it matters                                                                                                                   | Close by                                                                                                                                                          | Priority |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| G1  | V2 rebaseline of Cats 1–13 expected values                    | 354 "failures" in the V2 chromium run are mostly expected-value drift, not bugs. Until rebaselined, new-bug accounting is noisy. | Rewrite expected columns for every default-scope slot under V2 code-path logic. Code in `bug-5-fake-z-drift.md` § V2 behavior explains the expected-value deltas. | **P0**   |
| G2  | T1 "Convert Date Fields to Customer Timezone" behavior        | Untested platform toggle; could invert FORM-BUG-5/7 or create new bugs. Customers with this on will see divergent behavior.      | Cat 17 (48 slots defined below). Requires flipping toggle on a sandbox DB scope.                                                                                  | **P0**   |
| G3  | T2 "Prevent Conversion For Dates Ignoring Timezones" behavior | Override for `ignoreTimezone=true` when T1 is on. Interacts with FORM-BUG-5 (Config D) directly.                                 | Cat 17b (subset of 48 slots when T1+T2 both on).                                                                                                                  | **P0**   |
| G4  | T3 Platform-default Calendar Mask                             | Distinct from Cat 14's per-field mask. Unknown whether it applies to fields that omit `<Mask>` under sparse JSON templates.      | Cat 14-D (6 slots defined below).                                                                                                                                 | P1       |
| G5  | Customer Culture (non-en-US)                                  | Flips MM/DD ↔ DD/MM parsing. May invalidate WEBSERVICE-BUG-2/3 (DD/MM silently discarded). Affects display + parsing.            | Cat 18 (20 slots defined below).                                                                                                                                  | P1       |
| G6  | Server-generated timestamps respecting Customer TZ            | `DateTime.Now`, `GETDATE()`, Created Date, Workflow due-date. None tested with Customer TZ variation.                            | Cat 19 (8 slots defined below) + new `workflows/` and `scheduled-processes/` matrices (P2).                                                                       | P1       |

### Tier 2 — Matrix-intrinsic PENDING (no blocker, just work)

| ID  | Gap                                              | Status in matrix                                                           | Priority |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| G7  | Cat 14 Phase B/C — per-field masked fields       | 13 PENDING slots. Requires Form Designer access on EmanuelJofre (have it). | P1       |
| G8  | Cat 15 — Kendo widget internals comparison       | 8 PENDING. V1 vs V2 widget-layer diff.                                     | P2       |
| G9  | Cat 16 — Server TZ Form Save additional variants | 6 PENDING.                                                                 | P2       |
| G10 | FORM-BUG-7 V1 IST live test                      | Code-confirmed in V1, no live IST row in Cat 1.                            | P2       |
| G11 | Cat 2 typed input legacy (E-H) in IST/UTC0       | Missing.                                                                   | P3       |
| G12 | Cat 10 `10-D-script-scheduled` PENDING           | Requires live scheduled script.                                            | P3       |

### Tier 3 — Spot-check platform toggles (not yet promoted to categories)

| ID  | Toggle (Forms section, DB scope)          | Current | Risk if different                                                                 | Priority |
| --- | ----------------------------------------- | ------- | --------------------------------------------------------------------------------- | -------- |
| G13 | Use Beta Form Viewer                      | ☑       | Non-beta FormViewer is a different Angular build — FORM-BUG-5 may not exist there | P2       |
| G14 | Use Beta Form Optimizations               | ☑       | Narrower-scope runtime tweaks                                                     | P3       |
| G15 | Use Offline Forms 2.0                     | ☑       | Offline→online sync is a new conversion path                                      | P3       |
| G16 | Use Template Conditions For DataInstances | ☐       | Conditionally hidden calendar fields — still serialized on save? With what value? | P3       |
| G17 | Enable Replace Form Revision              | ☐       | New revision may re-resolve sparse JSON defaults differently                      | P3       |
| G18 | Form Designer Responsive Flow             | Default | Dropdown alternates unknown                                                       | P3       |

### Tier 4 — Cross-component gaps (driven from other matrices, linked here for awareness)

| ID  | Gap                                                     | Where tracked                                                             |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| G19 | WS matrix: T1/T2 cross-layer variants                   | [`web-services/matrix.md § WS-11`](../web-services/matrix.md)             |
| G20 | WS matrix: Culture variant (DD/MM) for input tolerance  | [`web-services/matrix.md § WS-12`](../web-services/matrix.md)             |
| G21 | WS matrix: Customer-TZ variant for `DateTime.Now` math  | [`web-services/matrix.md § WS-13`](../web-services/matrix.md)             |
| G22 | Dashboards: Culture variant of display format (DB-1)    | [`dashboards/matrix.md § DB-9`](../dashboards/matrix.md)                  |
| G23 | Doc Library: Culture variant of DOC-1/5/7               | [`document-library/matrix.md § DOC-9`](../document-library/matrix.md)     |
| G24 | Doc Library: lifecycle date defaults                    | [`document-library/matrix.md § DOC-10`](../document-library/matrix.md)    |
| G25 | Workflow task due-date computation (customer TZ)        | [`workflows/matrix.md`](../workflows/matrix.md) (new)                     |
| G26 | Scheduled Process firing window + Service Task timing   | [`scheduled-processes/matrix.md`](../scheduled-processes/matrix.md) (new) |
| G27 | Work Week (`<WorkWeek>` XML) — skip-weekend date math   | Tracked in `workflows/matrix.md`                                          |
| G28 | Timecard pay-period math (vertical module — not active) | Deferred until module is enabled                                          |

### Tier 5 — Deferred (low priority until customer surface)

- Half-odd-minute TZs (Newfoundland -3:30, Chatham +12:45/+13:45). IST covers :30; no existing :45 coverage.
- DST in non-US/non-BRT TZs.
- Year boundary with Culture=ptBR (fiscal year format differences).

---

### Group: User Input

## 1 — Calendar Popup

Select a date via popup calendar. For DateTime fields, select time then click Set.
**Bugs exercised**: FORM-BUG-7 (IST, date-only configs A/B/E/F), FORM-BUG-5 (IST/BRT, DateTime configs C/D), FORM-BUG-2 (legacy — popup vs typed asymmetry)

| Test ID  | Config |  TZ   | Date Selected   | Expected                                                                                                                                                       | Actual                                | Status | Run Date   | Evidence                            |
| -------- | :----: | :---: | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ | ---------- | ----------------------------------- |
| 1-A-BRT  |   A    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                                                                 | `"2026-03-15"`                        | FAIL   | 2026-04-09 | [summary](summaries/tc-1-A-BRT.md)  |
| 1-B-BRT  |   B    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                                                                 | `"2026-03-15"`                        | FAIL   | 2026-04-09 | [summary](summaries/tc-1-B-BRT.md)  |
| 1-C-BRT  |   C    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                                                                        | `"2026-03-15T00:00:00"`               | FAIL   | 2026-04-09 | [summary](summaries/tc-1-C-BRT.md)  |
| 1-D-BRT  |   D    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                                                                        | `"2026-03-15T00:00:00"` (GFV: fake Z) | FAIL   | 2026-04-09 | [summary](summaries/tc-1-D-BRT.md)  |
| 1-A-IST  |   A    |  IST  | Mar 15          | `"2026-03-14"` (string path → -1 day; -2 day prediction was wrong)                                                                                             | `"2026-03-14"`                        | FAIL   | 2026-04-09 | [summary](summaries/tc-1-A-IST.md)  |
| 1-B-IST  |   B    |  IST  | Mar 15          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only; -1 day)                                                                                       | `"2026-03-14"`                        | FAIL   | 2026-04-09 | [summary](summaries/tc-1-B-IST.md)  |
| 1-C-IST  |   C    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as BRT; prediction corrected 2026-03-30)                                                                 | `"2026-03-15T00:00:00"`               | FAIL   | 2026-04-09 | [summary](summaries/tc-1-C-IST.md)  |
| 1-D-IST  |   D    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as C; GFV adds fake Z → FORM-BUG-5; prediction corrected 2026-03-30)                                     | `"2026-03-15T00:00:00"`               | FAIL   | 2026-04-09 | [summary](summaries/tc-1-D-IST.md)  |
| 1-A-UTC0 |   A    | UTC+0 | Mar 15          | `"2026-03-15"` (UTC+0 midnight = UTC midnight; no shift — control)                                                                                             | `"2026-03-15"`                        | FAIL   | 2026-04-09 | [summary](summaries/tc-1-A-UTC0.md) |
| 1-D-UTC0 |   D    | UTC+0 | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (fake Z coincidentally correct; round-trip stable)                                                                                     | `"2026-03-15T00:00:00"`               | FAIL   | 2026-04-09 | [summary](summaries/tc-1-D-UTC0.md) |
| 1-E-BRT  |   E    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (legacy popup stores UTC datetime, not date-only; prediction corrected 2026-03-31; **PW audit 2026-04-06 confirms**)              | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-E-BRT.md)  |
| 1-F-BRT  |   F    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (predict same as E-BRT — legacy path format; ignoreTZ no effect; **PW audit 2026-04-06 confirms**)                                | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-F-BRT.md)  |
| 1-G-BRT  |   G    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (legacy DateTime popup closes without Time tab; raw UTC BRT midnight stored; **PW audit 2026-04-06 confirms**)                    | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-G-BRT.md)  |
| 1-H-BRT  |   H    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (legacy popup stores UTC datetime; ignoreTZ no effect; popup closes without Time tab; **PW audit 2026-04-06 confirms**)           | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-H-BRT.md)  |
| 1-E-IST  |   E    |  IST  | Mar 15          | `"2026-03-14T18:30:00.000Z"` (legacy popup stores UTC datetime; IST midnight = prev-day UTC; prediction corrected 2026-03-31)                                  | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-E-IST.md)  |
| 1-F-IST  |   F    |  IST  | Mar 15          | `"2026-03-14T18:30:00.000Z"` (same as E-IST — legacy popup UTC datetime; ignoreTZ no effect; prediction corrected 2026-03-31)                                  | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-F-IST.md)  |
| 1-G-IST  |   G    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00.000Z"` (legacy DateTime popup; IST midnight as UTC; popup closes without Time tab; prediction corrected 2026-03-31)                      | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-G-IST.md)  |
| 1-H-IST  |   H    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00.000Z"` (same as G-IST — ignoreTZ no-op on legacy popup; GFV: no fake Z — useLegacy=true; prediction corrected 2026-03-31)                | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-H-IST.md)  |
| 1-E-UTC0 |   E    | UTC+0 | Mar 15          | `"2026-03-15T00:00:00.000Z"` (legacy popup stores UTC datetime; UTC+0 midnight = UTC midnight; date correct but format wrong; prediction corrected 2026-03-31) | `"2026-03-15T00:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-E-UTC0.md) |
| 1-F-UTC0 |   F    | UTC+0 | Mar 15          | `"2026-03-15T00:00:00.000Z"` (same as E-UTC0 — ignoreTZ no effect; legacy UTC datetime; prediction corrected 2026-03-31)                                       | `"2026-03-15T00:00:00.000Z"`          | FAIL   | 2026-04-09 | [summary](summaries/tc-1-F-UTC0.md) |

> **IST note (non-legacy A/B)**: Popup and typed input both store `"2026-03-14"` (-1 day, FORM-BUG-7). The predicted -2 day double-shift was wrong — live tests 1-A-IST, 1-B-IST, 2-A-IST, 2-B-IST all confirmed single -1 day shift. FORM-BUG-2 asymmetry absent for non-legacy configs in IST.
> **IST note (legacy E/F)**: Live test 1-E-IST (2026-03-31) confirmed legacy popup stores raw `toISOString()` — `"2026-03-14T18:30:00.000Z"` (IST midnight in UTC). Same format as E/F-BRT but shifted by -5:30h from UTC perspective. The old prediction `"2026-03-14"` (date-only) was wrong; legacy popup bypasses `getSaveValue()` and stores full UTC datetime. Knock-on: 1-F-IST, 1-G-IST, 1-H-IST predictions updated accordingly (see rows above).
> **C/D IST note**: For DateTime configs, popup creates a Date at IST midnight (= 2026-03-14T18:30:00Z). `getSaveValue()` stores local-time string without Z → `"2026-03-14T18:30:00"`. On reload in IST this re-parses as local → shows 18:30 IST (not midnight). Config D adds fake Z on GFV making round-trips drift +5:30h each pass.
> **UTC+0 note**: UTC+0 midnight = UTC midnight. FORM-BUG-7 shift is zero (correct day stored). Config D fake Z coincidentally correct → zero round-trip drift. These are control tests confirming the UTC+0 boundary.

---

## 2 — Typed Input

Type a date directly in the input field (segment-by-segment keyboard entry).
**Bugs exercised**: FORM-BUG-7 (IST, date-only configs A/B), FORM-BUG-5 (IST/BRT, DateTime configs C/D), FORM-BUG-2 (legacy)

| Test ID | Config | TZ  | Date Typed          | Expected                                                                                                       | Actual                                  | Status | Run Date   | Evidence                           |
| ------- | :----: | :-: | ------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ | ---------- | ---------------------------------- |
| 2-A-BRT |   A    | BRT | 03/15/2026          | `"2026-03-15"`                                                                                                 | `"2026-03-15"` · matches popup          | PASS   | 2026-04-09 | [summary](summaries/tc-2-A-BRT.md) |
| 2-B-BRT |   B    | BRT | 03/15/2026          | `"2026-03-15"`                                                                                                 | `"2026-03-15"` · matches popup          | PASS   | 2026-04-09 | [summary](summaries/tc-2-B-BRT.md) |
| 2-C-BRT |   C    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                                                        | `"2026-03-15T00:00:00"` · matches popup | FAIL   | 2026-04-09 | [summary](summaries/tc-2-C-BRT.md) |
| 2-D-BRT |   D    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                                                        | `"2026-03-15T00:00:00"` · matches popup | FAIL   | 2026-04-09 | [summary](summaries/tc-2-D-BRT.md) |
| 2-A-IST |   A    | IST | 03/15/2026          | `"2026-03-14"` (-1 day — string path, same as popup; FORM-BUG-2 absent)                                        | `"2026-03-14"`                          | FAIL   | 2026-04-09 | [summary](summaries/tc-2-A-IST.md) |
| 2-B-IST |   B    | IST | 03/15/2026          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only)                                               | `"2026-03-14"`                          | FAIL   | 2026-04-09 | [summary](summaries/tc-2-B-IST.md) |
| 2-C-IST |   C    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as BRT/popup; prediction corrected 2026-03-31)           | `"2026-03-15T00:00:00"`                 | FAIL   | 2026-04-09 | [summary](summaries/tc-2-C-IST.md) |
| 2-D-IST |   D    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (same storage as C-IST; GFV adds fake Z → FORM-BUG-5; prediction corrected 2026-03-31) | `"2026-03-15T00:00:00"` (GFV: fake Z)   | FAIL   | 2026-04-09 | [summary](summaries/tc-2-D-IST.md) |
| 2-E-BRT |   E    | BRT | 03/15/2026          | `"2026-03-15"` (legacy typed path stores date-only; differs from popup — FORM-BUG-2 confirmed)                 | `"2026-03-15"`                          | PASS   | 2026-04-09 | [summary](summaries/tc-2-E-BRT.md) |
| 2-F-BRT |   F    | BRT | 03/15/2026          | `"2026-03-15"` (same as E-BRT — ignoreTZ no effect on date-only)                                               | `"2026-03-15"`                          | PASS   | 2026-04-09 | [summary](summaries/tc-2-F-BRT.md) |
| 2-G-BRT |   G    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (legacy DateTime typed; getSaveValue formats local; FORM-BUG-2 confirmed vs popup)     | `"2026-03-15T00:00:00"`                 | PASS   | 2026-04-09 | [summary](summaries/tc-2-G-BRT.md) |
| 2-H-BRT |   H    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (legacy DateTime + ignoreTZ; GFV: no fake Z)                                           | `"2026-03-15T00:00:00"`                 | PASS   | 2026-04-09 | [summary](summaries/tc-2-H-BRT.md) |
| 2-E-IST |   E    | IST | 03/15/2026          | `"2026-03-14"` (FORM-BUG-7 -1 day — same path as A/B-IST; confirms FORM-BUG-7 in legacy typed)                 | `"2026-03-14"`                          | FAIL   | 2026-04-09 | [summary](summaries/tc-2-E-IST.md) |
| 2-F-IST |   F    | IST | 03/15/2026          | `"2026-03-14"` (same as E-IST — ignoreTZ no effect on date-only)                                               | `"2026-03-14"`                          | FAIL   | 2026-04-09 | [summary](summaries/tc-2-F-IST.md) |
| 2-G-IST |   G    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — getSaveValue formats local; prediction corrected 2026-03-31)  | `"2026-03-15T00:00:00"`                 | PASS   | 2026-04-09 | [summary](summaries/tc-2-G-IST.md) |
| 2-H-IST |   H    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (same as G-IST; GFV: no fake Z — useLegacy=true; prediction corrected 2026-03-31)      | `"2026-03-15T00:00:00"`                 | PASS   | 2026-04-09 | [summary](summaries/tc-2-H-IST.md) |

> **IST note (corrected 2026-03-31)**: Typed input confirmed (Test 8.1): stores `"2026-03-14"` (-1 day, FORM-BUG-7) — same result as popup (Test 5.1). FORM-BUG-2 asymmetry (popup → -2 days, typed → -1 day) not observed; both go through single-shift path in V1 with useLegacy=false.
> **C/D IST note (prediction corrected 2026-03-31)**: `"2026-03-14T18:30:00"` prediction likely wrong. Based on confirmed 1-C-IST / 1-D-IST behavior, `getSaveValue()` formats as LOCAL time → expect `"2026-03-15T00:00:00"` (same as BRT) for DateTime typed IST. Needs live confirmation.
> **G/H IST note (confirmed 2026-03-31)**: 2-G-IST live test confirms typed input stores `"2026-03-15T00:00:00"` (local midnight, no Z). Original prediction `"2026-03-14T18:30:00"` was wrong — `getSaveValue()` uses `moment().format()` which outputs local time. FORM-BUG-2 confirmed: popup (1-G-IST) stores `"2026-03-14T18:30:00.000Z"` (raw UTC), typed stores `"2026-03-15T00:00:00"` (local). H-IST prediction updated accordingly. 2-H-IST confirmed 2026-04-01 — same result as G-IST, `ignoreTZ` no-op on typed path.

---

### Group: Initial Values

## 3 — Server Reload

Save form, open saved record in a new tab. Compare displayed dates and GFV return with original.
**Bugs exercised**: structural DB mixed-TZ storage, FORM-BUG-7 (IST load of date-only fields)

| Test ID     | Config | Save TZ | Load TZ | Expected                                                                                           | Actual                                                                                                                                 | Status | Run Date   | Evidence                               |
| ----------- | :----: | :-----: | :-----: | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | -------------------------------------- |
| 3-A-BRT-BRT |   A    |   BRT   |   BRT   | No shift; display identical on reload                                                              | No shift; display/GFV identical on reload                                                                                              | PASS   | 2026-04-09 | [summary](summaries/tc-3-A-BRT-BRT.md) |
| 3-C-BRT-BRT |   C    |   BRT   |   BRT   | No shift; display identical on reload                                                              | raw: `"2026-03-15T00:00:00"` survives; GFV: `"2026-03-15T03:00:00.000Z"` (FORM-BUG-4 — `new Date().toISOString()` adds +3h BRT shift)  | FAIL   | 2026-04-09 | [summary](summaries/tc-3-C-BRT-BRT.md) |
| 3-D-BRT-BRT |   D    |   BRT   |   BRT   | No shift; GFV fake Z same on reload                                                                | No shift; GFV returns same fake Z on reload                                                                                            | FAIL   | 2026-04-09 | [summary](summaries/tc-3-D-BRT-BRT.md) |
| 3-D-BRT-IST |   D    |   BRT   |   IST   | Display OK; raw TZ-invariant; GFV returns raw without fake Z                                       | Display OK; raw TZ-invariant; GFV appends fake Z (FORM-BUG-5)                                                                          | FAIL   | 2026-04-09 | [summary](summaries/tc-3-D-BRT-IST.md) |
| 3-A-BRT-IST |   A    |   BRT   |   IST   | No shift; date-only string survives cross-TZ reload (prediction corrected 2026-04-01)              | No shift; display/GFV identical on reload                                                                                              | PASS   | 2026-04-09 | [summary](summaries/tc-3-A-BRT-IST.md) |
| 3-C-BRT-IST |   C    |   BRT   |   IST   | Display 8:30 AM (BRT midnight in IST); GFV `T03:00:00Z` (prediction corrected 2026-04-01)          | Display 12:00 AM; GFV `"2026-03-14T18:30:00.000Z"` (8.5h shift, FORM-BUG-1+#4)                                                         | FAIL   | 2026-04-09 | [summary](summaries/tc-3-C-BRT-IST.md) |
| 3-D-IST-BRT |   D    |   IST   |   BRT   | Display OK; GFV same fake Z (TZ-invariant)                                                         | Display OK; raw TZ-invariant; GFV appends fake Z (FORM-BUG-5)                                                                          | FAIL   | 2026-04-09 | [summary](summaries/tc-3-D-IST-BRT.md) |
| 3-B-BRT-BRT |   B    |   BRT   |   BRT   | No shift — same as A-BRT-BRT (ignoreTZ no effect on date-only)                                     | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-3-B-BRT-BRT.md) |
| 3-B-BRT-IST |   B    |   BRT   |   IST   | No shift — same as A-BRT-IST (prediction corrected 2026-04-01)                                     | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-3-B-BRT-IST.md) |
| 3-A-IST-BRT |   A    |   IST   |   BRT   | Wrong day permanently stored (FORM-BUG-7 baked in during IST save)                                 | raw: `"2026-03-14"`, api: `"2026-03-14"`                                                                                               | FAIL   | 2026-04-09 | [summary](summaries/tc-3-A-IST-BRT.md) |
| 3-C-IST-BRT |   C    |   IST   |   BRT   | Stored IST-offset UTC-equiv; BRT reload shows different time                                       | raw: `"2026-03-15T00:00:00"` (survives); GFV: `"2026-03-15T03:00:00.000Z"` (BRT midnight, not IST midnight — FORM-BUG-1+#4 8.5h shift) | FAIL   | 2026-04-09 | [summary](summaries/tc-3-C-IST-BRT.md) |
| 3-B-IST-BRT |   B    |   IST   |   BRT   | Same as A-IST-BRT (ignoreTZ no effect on date-only)                                                | raw: `"2026-03-14"`, api: `"2026-03-14"` (FORM-BUG-7 baked in during IST save)                                                         | FAIL   | 2026-04-09 | [summary](summaries/tc-3-B-IST-BRT.md) |
| 3-E-BRT-BRT |   E    |   BRT   |   BRT   | No shift — same as A-BRT-BRT (legacy date-only, same reload path)                                  | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-3-E-BRT-BRT.md) |
| 3-F-BRT-BRT |   F    |   BRT   |   BRT   | No shift — same as E-BRT-BRT (ignoreTZ no effect on date-only)                                     | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-3-F-BRT-BRT.md) |
| 3-G-BRT-BRT |   G    |   BRT   |   BRT   | No shift; display identical — predict same as C-BRT-BRT (legacy DateTime)                          | `"2026-03-15T00:00:00"` raw + GFV unchanged                                                                                            | PASS   | 2026-04-09 | [summary](summaries/tc-3-G-BRT-BRT.md) |
| 3-H-BRT-BRT |   H    |   BRT   |   BRT   | No shift; GFV returns stored value without fake Z (useLegacy=true)                                 | raw: `"2026-03-15T00:00:00"`, api: `"2026-03-15T00:00:00"`                                                                             | PASS   | 2026-04-09 | [summary](summaries/tc-3-H-BRT-BRT.md) |
| 3-E-BRT-IST |   E    |   BRT   |   IST   | No shift — same as A-BRT-IST; date-only survives cross-TZ reload (prediction corrected 2026-04-01) | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-3-E-BRT-IST.md) |
| 3-H-BRT-IST |   H    |   BRT   |   IST   | Display OK; no fake Z drift (useLegacy=true); compare with 3-D-BRT-IST                             | raw: `"2026-03-15T00:00:00"`, api: `"2026-03-15T00:00:00"`                                                                             | PASS   | 2026-04-09 | [summary](summaries/tc-3-H-BRT-IST.md) |

> **Structural partial**: Tests 3-D-BRT-BRT and 3-A-BRT-BRT show correct display but DB stores UTC for initial-value fields and local time for user-input fields — same logical date has different stored representations. Not a discrete visible failure, but affects SQL range queries.

---

## 4 — URL Parameters

Open TargetDateTest form with date pre-filled via URL query string (`enableQListener=true`).
**Bugs exercised**: FORM-BUG-1 (Z stripped on all DateTime configs), FORM-BUG-5 (fake Z on Config D API)
**Form**: TargetDateTest (`formid=203734a0-5433-f111-ba23-0afff212cc87`) — identical to DateTest except `enableQListener=true` on all fields.
**Key findings**:

1. Date-only configs do NOT exhibit FORM-BUG-7 via URL params (unlike SetFieldValue).
2. DateTime configs universally strip Z from raw storage (FORM-BUG-1).
3. **`.000` residue from FORM-BUG-5**: After stripping Z from `"...T00:00:00.000Z"`, the `.000` ms suffix remains → `new Date("...T00:00:00.000")` is parsed as **UTC** (not local) by Chrome/V8. This means FORM-BUG-5 + FORM-BUG-1 **compound** in FillinAndRelate chains rather than canceling.

| Test ID            | Config | TZ  | URL Value                  | Expected Raw          | Expected API               | Actual Raw            | Actual API                 | Status | Run Date   | Evidence |
| ------------------ | :----: | :-: | -------------------------- | --------------------- | -------------------------- | --------------------- | -------------------------- | ------ | ---------- | -------- |
| 4-A-isoT-BRT       |   A    | BRT | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-iso-BRT        |   A    | BRT | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-isoZ-BRT       |   A    | BRT | `2026-03-15T00:00:00.000Z` | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-us-BRT         |   A    | BRT | `03/15/2026`               | `03/15/2026`          | `03/15/2026`               | `03/15/2026`          | `03/15/2026`               | FAIL   | 2026-04-09 | PW       |
| 4-A-isoT-IST       |   A    | IST | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-iso-IST        |   A    | IST | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-isoZ-IST       |   A    | IST | `2026-03-15T00:00:00.000Z` | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-A-us-IST         |   A    | IST | `03/15/2026`               | `03/15/2026`          | `03/15/2026`               | `03/15/2026`          | `03/15/2026`               | FAIL   | 2026-04-09 | PW       |
| 4-B-isoT-BRT       |   B    | BRT | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-B-isoT-IST       |   B    | IST | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-C-z-BRT          |   C    | BRT | `2026-03-15T14:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T14:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T14:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-C-noz-BRT        |   C    | BRT | `2026-03-15T14:30:00`      | `2026-03-15T14:30:00` | `2026-03-15T17:30:00.000Z` | `2026-03-15T14:30:00` | `2026-03-15T17:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-C-z-IST          |   C    | IST | `2026-03-15T14:30:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T14:30:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T14:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-C-noz-IST        |   C    | IST | `2026-03-15T14:30:00`      | `2026-03-15T14:30:00` | `2026-03-15T09:00:00.000Z` | `2026-03-15T14:30:00` | `2026-03-15T09:00:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-z-BRT          |   D    | BRT | `2026-03-15T14:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-noz-BRT        |   D    | BRT | `2026-03-15T14:30:00`      | `2026-03-15T14:30:00` | `2026-03-15T14:30:00.000Z` | `2026-03-15T14:30:00` | `2026-03-15T14:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-z-IST          |   D    | IST | `2026-03-15T14:30:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-noz-IST        |   D    | IST | `2026-03-15T14:30:00`      | `2026-03-15T14:30:00` | `2026-03-15T14:30:00.000Z` | `2026-03-15T14:30:00` | `2026-03-15T14:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-midnight-z-BRT |   D    | BRT | `2026-03-15T00:00:00.000Z` | `2026-03-14T21:00:00` | `2026-03-14T21:00:00.000Z` | `2026-03-14T21:00:00` | `2026-03-14T21:00:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-D-midnight-z-IST |   D    | IST | `2026-03-15T00:00:00.000Z` | `2026-03-15T05:30:00` | `2026-03-15T05:30:00.000Z` | `2026-03-15T05:30:00` | `2026-03-15T05:30:00.000Z` | FAIL   | 2026-04-09 | PW       |
| 4-E-isoT-BRT       |   E    | BRT | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-E-isoT-IST       |   E    | IST | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-F-isoT-BRT       |   F    | BRT | `2026-03-15T00:00:00`      | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 | PW       |
| 4-G-z-BRT          |   G    | BRT | `2026-03-15T14:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | FAIL   | 2026-04-09 | PW       |
| 4-G-z-IST          |   G    | IST | `2026-03-15T14:30:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00`      | `2026-03-15T20:00:00` | `2026-03-15T20:00:00`      | FAIL   | 2026-04-09 | PW       |
| 4-H-z-BRT          |   H    | BRT | `2026-03-15T14:30:00.000Z` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | FAIL   | 2026-04-09 | PW       |
| 4-H-z-IST          |   H    | IST | `2026-03-15T14:30:00.000Z` | `2026-03-15T20:00:00` | `2026-03-15T20:00:00`      | `2026-03-15T20:00:00` | `2026-03-15T20:00:00`      | FAIL   | 2026-04-09 | PW       |

### 4B — FillinAndRelate Chain Tests

Simulates production `FillinAndRelateForm` pattern: source GFV output → URL param → target form.
**Critical finding**: FORM-BUG-5 `.000Z` suffix leaves `.000` residue after Z-strip, causing `new Date()` to parse as UTC instead of local — bugs **compound**, not cancel.

| Test ID      | Source | Target | TZ  | Source GFV (URL param)                | Expected Target Raw   | Expected Target API        | Actual Target Raw     | Actual Target API          | Status | Run Date   |
| ------------ | :----: | :----: | :-: | ------------------------------------- | --------------------- | -------------------------- | --------------------- | -------------------------- | ------ | ---------- |
| 4-FAR-DD-BRT |   D    |   D    | BRT | `2026-03-15T00:00:00.000Z` (fake Z)   | `2026-03-14T21:00:00` | `2026-03-14T21:00:00.000Z` | `2026-03-14T21:00:00` | `2026-03-14T21:00:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-DD-IST |   D    |   D    | IST | `2026-03-15T00:00:00.000Z` (fake Z)   | `2026-03-15T05:30:00` | `2026-03-15T05:30:00.000Z` | `2026-03-15T05:30:00` | `2026-03-15T05:30:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-AA-BRT |   A    |   A    | BRT | `2026-03-15` (clean)                  | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 |
| 4-FAR-AA-IST |   A    |   A    | IST | `2026-03-14` (BUG-7 at source)        | `2026-03-14`          | `2026-03-14`               | `2026-03-14`          | `2026-03-14`               | FAIL   | 2026-04-09 |
| 4-FAR-DC-BRT |   D    |   C    | BRT | `2026-03-15T00:00:00.000Z` (fake Z)   | `2026-03-14T21:00:00` | `2026-03-15T00:00:00.000Z` | `2026-03-14T21:00:00` | `2026-03-15T00:00:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-DC-IST |   D    |   C    | IST | `2026-03-15T00:00:00.000Z` (fake Z)   | `2026-03-15T05:30:00` | `2026-03-15T00:00:00.000Z` | `2026-03-15T05:30:00` | `2026-03-15T00:00:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-CD-BRT |   C    |   D    | BRT | `2026-03-15T03:00:00.000Z` (real UTC) | `2026-03-15T00:00:00` | `2026-03-15T00:00:00.000Z` | `2026-03-15T00:00:00` | `2026-03-15T00:00:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-CA-BRT |   C    |   A    | BRT | `2026-03-15T03:00:00.000Z` (real UTC) | `2026-03-15`          | `2026-03-15`               | `2026-03-15`          | `2026-03-15`               | FAIL   | 2026-04-09 |
| 4-FAR-CA-IST |   C    |   A    | IST | `2026-03-14T18:30:00.000Z` (real UTC) | `2026-03-14`          | `2026-03-14`               | `2026-03-14`          | `2026-03-14`               | FAIL   | 2026-04-09 |

### 4C — Save/Reload Persistence Tests

Verify URL-param-sourced values persist after save + full page reload. Creates actual TargetDateTest records in vvdemo.

| Test ID             | Config | TZ  | URL Param Value                        | Expected Post-Reload Raw | Expected Post-Reload API   | Actual Post-Reload Raw | Actual Post-Reload API     | Status | Run Date   |
| ------------------- | :----: | :-: | -------------------------------------- | ------------------------ | -------------------------- | ---------------------- | -------------------------- | ------ | ---------- |
| 4-A-isoT-BRT-reload |   A    | BRT | `2026-03-15T00:00:00`                  | `2026-03-15`             | `2026-03-15`               | `2026-03-15`           | `2026-03-15`               | FAIL   | 2026-04-09 |
| 4-D-z-BRT-reload    |   D    | BRT | `2026-03-15T00:00:00.000Z`             | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z` | `2026-03-14T21:00:00`  | `2026-03-14T21:00:00.000Z` | FAIL   | 2026-04-09 |
| 4-FAR-DD-BRT-reload |  D→D   | BRT | Source GFV: `...T00:00:00.000Z` (fake) | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z` | `2026-03-14T21:00:00`  | `2026-03-14T21:00:00.000Z` | FAIL   | 2026-04-09 |

---

## 5 — Preset Date Default

Form template with a specific preset date configured in field settings.
**Bugs exercised**: FORM-BUG-7 (IST, date-only preset — configs A/B/E/F), potential FORM-BUG-3 (V2 `initCalendarValueV2` hardcodes `enableTime`)

| Test ID  | Config | Preset    |  TZ   | Expected                                                                                                              | Actual                                                                                                                                               | Status | Run Date   | Evidence                            |
| -------- | :----: | --------- | :---: | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ----------------------------------- |
| 5-A-BRT  |   A    | 3/1/2026  |  BRT  | `"2026-03-01"` / Date obj                                                                                             | Display correct; raw = UTC Date object (Field2)                                                                                                      | PASS   | 2026-04-02 | [summary](summaries/tc-5-A-BRT.md)  |
| 5-B-BRT  |   B    | 3/1/2026  |  BRT  | `"2026-03-01"` (ignoreTZ no effect on date-only preset)                                                               | Raw: Date `"2026-03-01T03:00:00.000Z"` (BRT midnight = correct); GFV: Date `"2026-03-01T03:00:00.000Z"`; save: `"2026-03-01"` ✓                      | PASS   | 2026-04-09 | [summary](summaries/tc-5-B-BRT.md)  |
| 5-C-BRT  |   C    | 3/31/2026 |  BRT  | DateTime preset stores raw Date from initialDate — `"2026-03-31T11:29:14.181Z"` (prediction corrected 2026-04-03)     | Raw: Date `"2026-03-31T11:29:14.181Z"` (identical to initialDate); GFV: `"2026-03-31T11:29:14.181Z"` (real UTC ISO) ✓                                | PASS   | 2026-04-09 | [summary](summaries/tc-5-C-BRT.md)  |
| 5-D-BRT  |   D    | 3/1/2026  |  BRT  | DateTime + ignoreTZ preset; FORM-BUG-5 fake Z on GFV (-3h shift in BRT)                                               | Raw: Date `"2026-03-01T11:28:54.627Z"` (correct); GFV: `"2026-03-01T08:28:54.627Z"` (**fake Z, -3h**, FORM-BUG-5)                                    | FAIL   | 2026-04-09 | [summary](summaries/tc-5-D-BRT.md)  |
| 5-A-IST  |   A    | 3/1/2026  |  IST  | Date obj (UTC: `"2026-02-28"`), display: `03/01/2026`, save→ `"2026-02-28"` (FORM-BUG-7 on init path)                 | Date obj (UTC: `"2026-02-28T18:30:00.000Z"`), display: `03/01/2026` (correct local), save→ `"2026-02-28"` (FORM-BUG-7)                               | FAIL   | 2026-04-09 | [summary](summaries/tc-5-A-IST.md)  |
| 5-B-IST  |   B    | 3/1/2026  |  IST  | `"2026-02-28"` (ignoreTZ=true does not protect preset — same FORM-BUG-7 path as A)                                    | Raw: Date `"2026-02-28T18:30:00.000Z"` (IST midnight = **Feb 28 UTC**, FORM-BUG-7); GFV: Date `"2026-02-28T18:30:00.000Z"`                           | FAIL   | 2026-04-09 | [summary](summaries/tc-5-B-IST.md)  |
| 5-C-IST  |   C    | 3/31/2026 |  IST  | DateTime preset stores raw Date — same as BRT, TZ-independent (prediction corrected 2026-04-03)                       | Raw: Date `"2026-03-31T11:29:14.181Z"` (identical to initialDate and 5-C-BRT); GFV: `"2026-03-31T11:29:14.181Z"` ✓                                   | PASS   | 2026-04-09 | [summary](summaries/tc-5-C-IST.md)  |
| 5-D-IST  |   D    | 3/1/2026  |  IST  | TBD — DateTime + ignoreTZ preset in IST; **does FORM-BUG-5 fire at form load?** GFV adds fake Z immediately (Field16) | Raw: Date `"2026-03-01T11:28:54.627Z"` (correct IST date); GFV: `"2026-03-01T16:58:54.627Z"` (**fake Z, +5:30h**, FORM-BUG-5 confirmed at form load) | FAIL   | 2026-04-09 | [summary](summaries/tc-5-D-IST.md)  |
| 5-A-UTC0 |   A    | 3/1/2026  | UTC+0 | `"2026-03-01"` (UTC+0 midnight = UTC midnight; no shift — FORM-BUG-7 boundary control)                                | Raw: Date `"2026-03-01T00:00:00.000Z"` (UTC midnight = correct); GFV: Date `"2026-03-01T00:00:00.000Z"`; save: `"2026-03-01"` ✓                      | PASS   | 2026-04-09 | [summary](summaries/tc-5-A-UTC0.md) |
| 5-C-UTC0 |   C    | 3/31/2026 | UTC+0 | DateTime preset at UTC+0; same as BRT/IST — TZ-independent (confirmed 2026-04-03)                                     | Raw: Date `"2026-03-31T11:29:14.181Z"` (identical to BRT/IST); GFV: `"2026-03-31T11:29:14.181Z"` ✓                                                   | PASS   | 2026-04-09 | [summary](summaries/tc-5-C-UTC0.md) |
| 5-D-UTC0 |   D    | 3/1/2026  | UTC+0 | Config D preset at UTC+0; FORM-BUG-5 fake Z present but coincidentally correct (0h shift)                             | Raw: Date `"2026-03-01T11:28:54.627Z"` (correct); GFV: `"2026-03-01T11:28:54.627Z"` (**fake Z, 0h shift** — coincidentally correct at UTC+0)         | FAIL   | 2026-04-09 | [summary](summaries/tc-5-D-UTC0.md) |
| 5-A-PST  |   A    | 3/1/2026  |  PST  | `"2026-03-01"` (UTC-8 midnight = UTC+8h; same UTC day → correct; FORM-BUG-7 UTC- unaffected)                          | Raw: Date `"2026-03-01T08:00:00.000Z"` (PST midnight = correct); GFV: Date `"2026-03-01T08:00:00.000Z"`; save: `"2026-03-01"` ✓                      | PASS   | 2026-04-09 | [summary](summaries/tc-5-A-PST.md)  |
| 5-E-BRT  |   E    | 3/1/2026  |  BRT  | `"2026-03-01"` (legacy date-only; same path as A-BRT → correct)                                                       | Raw: Date `"2026-03-01T03:00:00.000Z"` (BRT midnight = correct); GFV: Date `"2026-03-01T03:00:00.000Z"` ✓                                            | PASS   | 2026-04-09 | [summary](summaries/tc-5-E-BRT.md)  |
| 5-F-BRT  |   F    | 3/1/2026  |  BRT  | `"2026-03-01"` (same as E-BRT — ignoreTZ no effect on date-only)                                                      | Raw: Date `"2026-03-01T03:00:00.000Z"` (identical to E-BRT); GFV: Date `"2026-03-01T03:00:00.000Z"` ✓                                                | PASS   | 2026-04-09 | [summary](summaries/tc-5-F-BRT.md)  |
| 5-G-BRT  |   G    | 3/1/2026  |  BRT  | Legacy DateTime preset stores raw Date from initialDate — `"2026-03-01T11:32:23.628Z"` (confirmed 2026-04-03)         | Raw: Date `"2026-03-01T11:32:23.628Z"` (identical to initialDate); GFV: Date `"2026-03-01T11:32:23.628Z"` ✓                                          | PASS   | 2026-04-09 | [summary](summaries/tc-5-G-BRT.md)  |
| 5-H-BRT  |   H    | 3/1/2026  |  BRT  | Legacy DateTime + ignoreTZ; **no fake Z** (useLegacy=true bypasses FORM-BUG-5) — `"2026-03-01T11:33:07.735Z"`         | Raw: Date `"2026-03-01T11:33:07.735Z"` (correct); GFV: Date `"2026-03-01T11:33:07.735Z"` (**no FORM-BUG-5** — legacy safe) ✓                         | PASS   | 2026-04-09 | [summary](summaries/tc-5-H-BRT.md)  |
| 5-E-IST  |   E    | 3/1/2026  |  IST  | `"2026-02-28"` (FORM-BUG-7 -1 day — useLegacy does not protect preset path)                                           | Raw: Date `"2026-02-28T18:30:00.000Z"` (IST midnight = **Feb 28 UTC**, FORM-BUG-7); GFV: Date `"2026-02-28T18:30:00.000Z"`                           | FAIL   | 2026-04-09 | [summary](summaries/tc-5-E-IST.md)  |
| 5-F-IST  |   F    | 3/1/2026  |  IST  | `"2026-02-28"` (FORM-BUG-7 — neither ignoreTZ nor useLegacy protects preset)                                          | Raw: Date `"2026-02-28T18:30:00.000Z"` (identical to E-IST, FORM-BUG-7); GFV: Date `"2026-02-28T18:30:00.000Z"`                                      | FAIL   | 2026-04-09 | [summary](summaries/tc-5-F-IST.md)  |

---

## 6 — Current Date Default

Form template with "Current Date" as the initial value.
**Bugs exercised**: baseline/control for UTC vs local storage; cross-midnight edge in UTC- timezones; FORM-BUG-5 at first load for Config D

| Test ID  | Config |  TZ   | Expected                                                                                                | Actual                                                                                                                                           | Status | Run Date   | Evidence                            |
| -------- | :----: | :---: | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------- | ----------------------------------- |
| 6-A-BRT  |   A    |  BRT  | Date obj with current UTC time                                                                          | UTC Date obj stored; display = today's date in BRT (Field1)                                                                                      | PASS   | 2026-04-02 | [summary](summaries/tc-6-A-BRT.md)  |
| 6-B-BRT  |   B    |  BRT  | Today's date (ignoreTZ no effect on `new Date()` init path)                                             | Raw: Date `"2026-04-03T20:10:00.472Z"` (correct UTC); GFV: Date = raw ✓; local = 04/03/2026 ✓                                                    | PASS   | 2026-04-09 | [summary](summaries/tc-6-B-BRT.md)  |
| 6-C-BRT  |   C    |  BRT  | DateTime current date stores real UTC timestamp; GFV returns real UTC ISO                               | Raw: Date `"2026-04-03T20:10:00.466Z"` (correct UTC); GFV: `"2026-04-03T20:10:00.466Z"` (string, matches raw) ✓                                  | PASS   | 2026-04-09 | [summary](summaries/tc-6-C-BRT.md)  |
| 6-D-BRT  |   D    |  BRT  | DateTime + ignoreTZ current date; FORM-BUG-5 fake Z on GFV (-3h shift in BRT)                           | Raw: Date `"2026-04-03T20:10:00.467Z"` (correct); GFV: `"2026-04-03T17:10:00.467Z"` (**fake Z, -3h**, FORM-BUG-5)                                | FAIL   | 2026-04-09 | [summary](summaries/tc-6-D-BRT.md)  |
| 6-A-IST  |   A    |  IST  | Today's date in IST (UTC midnight may be previous IST day — cross-midnight edge)                        | PASS — `"2026-04-01T17:41:16.150Z"` Date obj, IST date correct                                                                                   | PASS   | 2026-04-09 | [summary](summaries/tc-6-A-IST.md)  |
| 6-B-IST  |   B    |  IST  | Today's date (ignoreTZ inert on `new Date()` path; cross-midnight edge)                                 | Raw: Date `"2026-04-03T20:20:54.094Z"`; rawLocal=`04/04/2026` (IST today); GFV: Date = raw ✓                                                     | PASS   | 2026-04-09 | [summary](summaries/tc-6-B-IST.md)  |
| 6-C-IST  |   C    |  IST  | DateTime current date stores real UTC; GFV returns real UTC ISO                                         | Raw: Date `"2026-04-03T20:20:54.087Z"`; GFV: `"2026-04-03T20:20:54.087Z"` (string, matches raw) ✓                                                | PASS   | 2026-04-09 | [summary](summaries/tc-6-C-IST.md)  |
| 6-D-IST  |   D    |  IST  | TBD — Config D current date in IST; **FORM-BUG-5 fires at load** — fake Z immediately applied (Field18) | Raw: Date `"2026-04-02T00:39:22.750Z"` (correct IST today); GFV: `"2026-04-02T06:09:22.750Z"` (**fake Z, +5:30h**, FORM-BUG-5 confirmed at load) | FAIL   | 2026-04-09 | [summary](summaries/tc-6-D-IST.md)  |
| 6-A-UTC0 |   A    | UTC+0 | Today's date in UTC+0 (local = UTC, trivially correct)                                                  | Raw: Date `"2026-04-03T20:10:55.302Z"` (correct UTC); GFV: Date = raw ✓; local = 04/03/2026 ✓                                                    | PASS   | 2026-04-09 | [summary](summaries/tc-6-A-UTC0.md) |
| 6-E-BRT  |   E    |  BRT  | Today's date (legacy date-only; `new Date()` bypasses legacy code)                                      | Raw: Date `"2026-04-03T20:20:07.985Z"`; rawLocal=`04/03/2026`; GFV: Date = raw ✓                                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-6-E-BRT.md)  |
| 6-F-BRT  |   F    |  BRT  | Today's date (legacy + ignoreTZ; both inert on `new Date()` path)                                       | Raw: Date `"2026-04-03T20:20:07.985Z"`; GFV: Date = raw ✓ (identical to E-BRT)                                                                   | PASS   | 2026-04-09 | [summary](summaries/tc-6-F-BRT.md)  |
| 6-G-BRT  |   G    |  BRT  | Legacy DateTime current date stores correct UTC; GFV returns raw Date unchanged                         | Raw: Date `"2026-04-03T20:20:07.986Z"`; GFV: Date = raw ✓                                                                                        | PASS   | 2026-04-09 | [summary](summaries/tc-6-G-BRT.md)  |
| 6-H-BRT  |   H    |  BRT  | Legacy DateTime + ignoreTZ; **no FORM-BUG-5** (useLegacy=true bypasses fake Z GFV path)                 | Raw: Date `"2026-04-03T20:20:07.986Z"`; GFV: Date = raw ✓ (**no fake Z** — compare 6-D-BRT FAIL)                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-6-H-BRT.md)  |
| 6-E-IST  |   E    |  IST  | Today's IST date (legacy date-only; **no FORM-BUG-7** — `new Date()` bypasses moment parsing)           | Raw: Date `"2026-04-03T20:20:54.092Z"`; rawLocal=`04/04/2026` (IST today); GFV: Date = raw ✓                                                     | PASS   | 2026-04-09 | [summary](summaries/tc-6-E-IST.md)  |
| 6-F-IST  |   F    |  IST  | Today's IST date (legacy + ignoreTZ; **no FORM-BUG-7** on current date path)                            | Raw: Date `"2026-04-03T20:20:54.093Z"`; rawLocal=`04/04/2026`; GFV: Date = raw ✓                                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-6-F-IST.md)  |

---

### Group: Developer API

## 7 — SetFieldValue Formats

Different input formats passed to `VV.Form.SetFieldValue()`.
**Bugs exercised**: FORM-BUG-7 (IST, date-only configs A/B), input-format sensitivity in Config C

| Test ID          | Config | TZ  | Input Value                  | Input Type    | Expected Stored                                                                             | Actual Stored                                                                                | Status | Run Date   | Evidence                                    |
| ---------------- | :----: | :-: | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------- |
| 7-D-dateObj      |   D    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-dateObj.md)      |
| 7-D-isoZ         |   D    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted!)                                                          | `"2026-03-14T21:00:00"` (FORM-BUG-5: -3h shift confirmed)                                    | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-isoZ.md)         |
| 7-D-isoNoZ       |   D    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-isoNoZ.md)       |
| 7-D-dateOnly     |   D    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-dateOnly.md)     |
| 7-D-usFormat     |   D    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-usFormat.md)     |
| 7-D-usFormatTime |   D    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-usFormatTime.md) |
| 7-D-epoch        |   D    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-epoch.md)        |
| 7-D-isoZ-IST     |   D    | IST | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15T05:30:00"` (UTC→IST +5:30h)                                                    | `"2026-03-15T05:30:00"` (confirmed +5:30h shift); GFV: `"2026-03-15T05:30:00.000Z"` (fake Z) | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-isoZ-IST.md)     |
| 7-D-dateObj-IST  |   D    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (local midnight stored correctly — prediction corrected 2026-04-01) | `"2026-03-15T00:00:00"` (correct); GFV: `"2026-03-15T00:00:00.000Z"` (fake Z)                | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-dateObj-IST.md)  |
| 7-D-isoNoZ-IST   |   D    | IST | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (local treated as IST; GFV fake Z → +5:30h/trip)                    | `"2026-03-15T00:00:00"` (correct); GFV: `"2026-03-15T00:00:00.000Z"` (fake Z)                | FAIL   | 2026-04-09 | [summary](summaries/tc-7-D-isoNoZ-IST.md)   |
| 7-C-isoZ         |   C    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local)                                                         | `"2026-03-14T21:00:00"` (day crosses in DB; GFV: correct UTC)                                | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-isoZ.md)         |
| 7-C-isoNoZ       |   C    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: real UTC)                                                      | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-isoNoZ.md)       |
| 7-C-dateOnly     |   C    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"` (midnight appended; GFV real UTC)                                   | `"2026-03-15T00:00:00"` (GFV: `"2026-03-15T03:00:00.000Z"`)                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-dateOnly.md)     |
| 7-C-dateObj      |   C    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (BRT midnight stored as local time)                                 | `"2026-03-15T00:00:00"` (GFV: `"2026-03-15T03:00:00.000Z"`)                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-dateObj.md)      |
| 7-C-usFormat     |   C    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: `"2026-03-15T03:00:00.000Z"`)                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-usFormat.md)     |
| 7-C-usFormatTime |   C    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: `"2026-03-15T03:00:00.000Z"`)                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-usFormatTime.md) |
| 7-C-epoch        |   C    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"` (BRT midnight in ms)                                                | `"2026-03-15T00:00:00"` (GFV: `"2026-03-15T03:00:00.000Z"`)                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-C-epoch.md)        |
| 7-A-dateOnly     |   A    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"`                                                                              | `"2026-03-15"`                                                                               | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-dateOnly.md)     |
| 7-A-isoZ         |   A    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (date extracted)                                                             | `"2026-03-15"` (time/Z stripped)                                                             | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-isoZ.md)         |
| 7-A-dateObj-BRT  |   A    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline)                                                               | `"2026-03-15"` (Date object safe in BRT)                                                     | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-dateObj-BRT.md)  |
| 7-A-isoNoZ       |   A    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15"` (time component stripped)                                                    | `"2026-03-15"` (time stripped, date correct)                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-isoNoZ.md)       |
| 7-A-usFormat     |   A    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15"`                                                                              | `"2026-03-15"` (US format parsed correctly)                                                  | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-usFormat.md)     |
| 7-A-usFormatTime |   A    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15"` (time stripped for date-only config)                                         | `"2026-03-15"` (time stripped, date correct)                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-usFormatTime.md) |
| 7-A-epoch        |   A    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15"`                                                                              | `"2026-03-15"` (epoch→local date correct)                                                    | PASS   | 2026-04-09 | [summary](summaries/tc-7-A-epoch.md)        |
| 7-A-dateOnly-IST |   A    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (FORM-BUG-7: -1 day)                                                         | `"2026-03-14"` (FORM-BUG-7: -1 day confirmed)                                                | FAIL   | 2026-04-09 | [summary](summaries/tc-7-A-dateOnly-IST.md) |
| 7-A-dateObj-IST  |   A    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (FORM-BUG-7: -2 days)                                                        | `"2026-03-13"` (FORM-BUG-7: -2 days confirmed)                                               | FAIL   | 2026-04-09 | [summary](summaries/tc-7-A-dateObj-IST.md)  |
| 7-B-dateOnly-BRT |   B    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (ignoreTZ=true; same behavior as A-BRT)                                      | `"2026-03-15"` (ignoreTZ inert on date-only)                                                 | PASS   | 2026-04-09 | [summary](summaries/tc-7-B-dateOnly-BRT.md) |
| 7-B-isoZ-BRT     |   B    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (same as A-isoZ)                                                             | `"2026-03-15"` (Z stripped, date correct)                                                    | PASS   | 2026-04-09 | [summary](summaries/tc-7-B-isoZ-BRT.md)     |
| 7-B-dateObj-BRT  |   B    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline; same as A-dateObj-BRT)                                        | `"2026-03-15"` (Date object safe in BRT)                                                     | PASS   | 2026-04-09 | [summary](summaries/tc-7-B-dateObj-BRT.md)  |
| 7-B-dateOnly-IST |   B    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (FORM-BUG-7: -1 day; same as A-dateOnly-IST)                                 | `"2026-03-14"` (FORM-BUG-7: -1 day confirmed)                                                | FAIL   | 2026-04-09 | [summary](summaries/tc-7-B-dateOnly-IST.md) |
| 7-B-dateObj-IST  |   B    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (FORM-BUG-7: -2 days; same as A-dateObj-IST)                                 | `"2026-03-13"` (FORM-BUG-7: -2 days confirmed)                                               | FAIL   | 2026-04-09 | [summary](summaries/tc-7-B-dateObj-IST.md)  |
| 7-E-dateOnly-BRT |   E    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (legacy date-only; same as A-dateOnly)                                       | `"2026-03-15"` (useLegacy inert on date-only)                                                | PASS   | 2026-04-09 | [summary](summaries/tc-7-E-dateOnly-BRT.md) |
| 7-E-dateOnly-IST |   E    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (FORM-BUG-7 -1 day — same as A-dateOnly-IST)                                 | `"2026-03-14"` (FORM-BUG-7: -1 day, useLegacy no protection)                                 | FAIL   | 2026-04-09 | [summary](summaries/tc-7-E-dateOnly-IST.md) |
| 7-F-dateOnly-IST |   F    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (same as E-IST — ignoreTZ no effect on date-only)                            | `"2026-03-14"` (FORM-BUG-7: -1 day, neither flag protects)                                   | FAIL   | 2026-04-09 | [summary](summaries/tc-7-F-dateOnly-IST.md) |
| 7-G-isoNoZ-BRT   |   G    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (legacy DateTime; predict same as C-isoNoZ)                         | `"2026-03-15T00:00:00"` (GFV: raw, no UTC conversion)                                        | PASS   | 2026-04-09 | [summary](summaries/tc-7-G-isoNoZ-BRT.md)   |
| 7-G-isoZ-BRT     |   G    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local BRT shift; same as C-isoZ)                               | `"2026-03-14T21:00:00"` (GFV: raw, no UTC reconversion)                                      | PASS   | 2026-04-09 | [summary](summaries/tc-7-G-isoZ-BRT.md)     |
| 7-H-isoNoZ-BRT   |   H    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (legacy DateTime + ignoreTZ; GFV: **no fake Z**)                    | `"2026-03-15T00:00:00"` (GFV: raw, no fake Z confirmed)                                      | PASS   | 2026-04-09 | [summary](summaries/tc-7-H-isoNoZ-BRT.md)   |
| 7-H-isoZ-BRT     |   H    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted same as D-isoZ; FORM-BUG-5 absent in GFV)                  | `"2026-03-14T21:00:00"` (GFV: raw, no fake Z — FORM-BUG-5 absent)                            | PASS   | 2026-04-09 | [summary](summaries/tc-7-H-isoZ-BRT.md)     |
| 7-H-dateObj-BRT  |   H    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (local midnight; GFV: no fake Z — useLegacy=true)                   | `"2026-03-15T00:00:00"` (GFV: raw, no fake Z confirmed)                                      | PASS   | 2026-04-09 | [summary](summaries/tc-7-H-dateObj-BRT.md)  |

---

## 8 — GetFieldValue Return

Return value for each configuration from `VV.Form.GetFieldValue()`.
**Bugs exercised**: FORM-BUG-5 (Config D fake Z), FORM-BUG-6 (empty Config D — scope for other configs unknown)

| Test ID       | Config |  TZ   | Stored Raw              | Expected Return                                                                                         | Actual Return                                                           | Status | Run Date   | Evidence                                 |
| ------------- | :----: | :---: | ----------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------- |
| 8-A           |   A    |  any  | `"2026-03-15"`          | `"2026-03-15"`                                                                                          | `"2026-03-15"`                                                          | PASS   | 2026-04-09 | [summary](summaries/tc-8-A.md)           |
| 8-B           |   B    |  BRT  | `"2026-03-15"`          | `"2026-03-15"` (ignoreTZ=true; date-only — expected same return as A)                                   | `"2026-03-15"` (raw unchanged, same as A)                               | PASS   | 2026-04-09 | [summary](summaries/tc-8-B-BRT.md)       |
| 8-C-BRT       |   C    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC)                                                                 | `"2026-03-15T03:00:00.000Z"` (real UTC confirmed)                       | PASS   | 2026-04-09 | [summary](summaries/tc-8-C-BRT.md)       |
| 8-C-IST       |   C    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST)                                                        | `"2026-03-14T18:30:00.000Z"` (real UTC confirmed)                       | PASS   | 2026-04-09 | [summary](summaries/tc-8-C-IST.md)       |
| 8-C-UTC0      |   C    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (real UTC at UTC+0 = stored value)                                         | `"2026-03-15T00:00:00.000Z"` (real UTC, trivially correct at UTC+0)     | PASS   | 2026-04-09 | [summary](summaries/tc-8-C-UTC0.md)      |
| 8-D-BRT       |   D    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z**)                                                               | `"2026-03-15T00:00:00.000Z"` (fake Z — not real UTC, FORM-BUG-5)        | FAIL   | 2026-04-09 | [summary](summaries/tc-8-D-BRT.md)       |
| 8-D-IST       |   D    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z** — TZ-invariant)                                                | `"2026-03-15T00:00:00.000Z"` (same fake Z regardless of TZ, FORM-BUG-5) | FAIL   | 2026-04-09 | [summary](summaries/tc-8-D-IST.md)       |
| 8-D-UTC0      |   D    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (fake Z, coincidentally correct at UTC+0)                                  | `"2026-03-15T00:00:00.000Z"` (FORM-BUG-5 fake Z, 0h drift at UTC+0)     | PASS   | 2026-04-09 | [summary](summaries/tc-8-D-UTC0.md)      |
| 8-D-empty     |   D    |  any  | `""`                    | `""` (expected) / `"Invalid Date"` (**FORM-BUG-6**)                                                     | `"Invalid Date"` (truthy string — FORM-BUG-6 confirmed)                 | FAIL   | 2026-04-09 | [summary](summaries/tc-8-D-empty.md)     |
| 8-D-empty-IST |   D    |  IST  | `""`                    | `"Invalid Date"` (FORM-BUG-6 expected TZ-independent)                                                   | `"Invalid Date"` (FORM-BUG-6 confirmed TZ-independent)                  | FAIL   | 2026-04-09 | [summary](summaries/tc-8-D-empty-IST.md) |
| 8-A-empty     |   A    |  any  | `""`                    | `""` (expected — is FORM-BUG-6 D-only or affects all configs?)                                          | `""` (empty string, strict equality confirmed)                          | PASS   | 2026-04-09 | [summary](summaries/tc-8-A-empty.md)     |
| 8-C-empty     |   C    |  any  | `""`                    | `""` (expected — is FORM-BUG-6 D-only?)                                                                 | THROWS `RangeError: Invalid time value` (FORM-BUG-6 variant)            | FAIL   | 2026-04-09 | [summary](summaries/tc-8-C-empty.md)     |
| 8-E           |   E    |  any  | `"2026-03-15"`          | `"2026-03-15"` (legacy date-only; same as A)                                                            | `"2026-03-15"` (raw unchanged, identical to A)                          | PASS   | 2026-04-09 | [summary](summaries/tc-8-E.md)           |
| 8-F           |   F    |  any  | `"2026-03-15"`          | `"2026-03-15"` (legacy date-only + ignoreTZ; same as E — date-only unaffected by ignoreTZ)              | `"2026-03-15"` (raw unchanged, all date-only configs identical)         | PASS   | 2026-04-09 | [summary](summaries/tc-8-F.md)           |
| 8-G-BRT       |   G    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (raw unchanged — useLegacy skips UTC conv; prediction corrected 2026-04-03)     | `"2026-03-15T00:00:00"` (raw, no UTC conversion)                        | PASS   | 2026-04-09 | [summary](summaries/tc-8-G-BRT.md)       |
| 8-H-BRT       |   H    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (**no fake Z** — useLegacy=true skips fake-Z branch; key FORM-BUG-5 comparison) | `"2026-03-15T00:00:00"` (raw unchanged, no fake Z)                      | PASS   | 2026-04-09 | [summary](summaries/tc-8-H-BRT.md)       |
| 8-H-IST       |   H    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (no fake Z — TZ-invariant, same as H-BRT)                                       | `"2026-03-15T00:00:00"` (raw unchanged, TZ-invariant confirmed)         | PASS   | 2026-04-09 | [summary](summaries/tc-8-H-IST.md)       |
| 8-H-empty     |   H    |  BRT  | `""`                    | `""` (expected) — does useLegacy=true prevent FORM-BUG-6?                                               | `""` (strict empty — **useLegacy=true prevents FORM-BUG-6**)            | PASS   | 2026-04-09 | [summary](summaries/tc-8-H-empty.md)     |
| 8-V2          |  D/C   |  IST  | `"2026-03-15T00:00:00"` | raw value unchanged (`useUpdatedCalendarValueLogic=true`)                                               | `"2026-03-15T00:00:00"` (V2: raw passthrough, FORM-BUG-5 absent)        | FAIL   | 2026-04-09 | [summary](summaries/tc-8-V2.md)          |

---

## 8B — GetDateObjectFromCalendar Return

Return value from `VV.Form.GetDateObjectFromCalendar()` — returns a JS `Date` object, not a string.
**Key questions**: Does it avoid FORM-BUG-5 fake Z? What day does the Date object show in UTC+ for date-only fields? Is the `.toISOString()` output safe for round-trips?
**Bugs exercised**: FORM-BUG-7 (IST date-only — Date shows correct day but UTC representation is prev day), FORM-BUG-5 comparison (Config D — Date object may be correct where GFV is wrong)

| Test ID    | Config |  TZ   | Stored Raw                  | Expected Date.toString()                                    | Expected .toISOString()      | Actual                                                                          | Status | Run Date   | Evidence                              |
| ---------- | :----: | :---: | --------------------------- | ----------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- | ------ | ---------- | ------------------------------------- |
| 8B-A-BRT   |   A    |  BRT  | `"2026-03-15"`              | `Mar 15 2026 00:00:00 GMT-0300` (BRT midnight)              | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-A-BRT.md)   |
| 8B-A-IST   |   A    |  IST  | `"2026-03-14"` (FORM-BUG-7) | `Mar 14 2026 00:00:00 GMT+0530` (FORM-BUG-7: stored Mar 14) | `"2026-03-13T18:30:00.000Z"` | `Sat Mar 14 2026 00:00:00 GMT+0530` / `"2026-03-13T18:30:00.000Z"` (FORM-BUG-7) | PASS   | 2026-04-09 | [summary](summaries/tc-8B-A-IST.md)   |
| 8B-A-UTC0  |   A    | UTC+0 | `"2026-03-15"`              | `Mar 15 2026 00:00:00 GMT+0000` (UTC midnight)              | `"2026-03-15T00:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT+0000` / `"2026-03-15T00:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-A-UTC0.md)  |
| 8B-C-BRT   |   C    |  BRT  | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT-0300` (BRT midnight)              | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-C-BRT.md)   |
| 8B-C-IST   |   C    |  IST  | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT+0530` (IST midnight)              | `"2026-03-14T18:30:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT+0530` / `"2026-03-14T18:30:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-C-IST.md)   |
| 8B-D-BRT   |   D    |  BRT  | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT-0300` — no fake Z                 | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-D-BRT.md)   |
| 8B-D-IST   |   D    |  IST  | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT+0530` — no fake Z                 | `"2026-03-14T18:30:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT+0530` / `"2026-03-14T18:30:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-D-IST.md)   |
| 8B-D-UTC0  |   D    | UTC+0 | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT+0000` — matches GFV               | `"2026-03-15T00:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT+0000` / `"2026-03-15T00:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-D-UTC0.md)  |
| 8B-D-empty |   D    |  BRT  | `""`                        | `null` (expected clean null, not Invalid Date)              | N/A                          | Returns `undefined` (not `null`); no throw, no Invalid Date — falsy, safe       | PASS   | 2026-04-09 | [summary](summaries/tc-8B-D-empty.md) |
| 8B-A-empty |   A    |  BRT  | `""`                        | `undefined` (falsy, safe)                                   | N/A                          | Returns `undefined` — falsy, safe for developer checks                          | PASS   | 2026-04-09 | [summary](summaries/tc-8B-A-empty.md) |
| 8B-E-BRT   |   E    |  BRT  | `"2026-03-15"`              | `Mar 15 2026 00:00:00 GMT-0300` (legacy date-only)          | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-E-BRT.md)   |
| 8B-H-BRT   |   H    |  BRT  | `"2026-03-15T00:00:00"`     | `Mar 15 2026 00:00:00 GMT-0300` (legacy DateTime)           | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`              | PASS   | 2026-04-09 | [summary](summaries/tc-8B-H-BRT.md)   |

> **Why this matters**: Developers writing form scripts have three ways to read a date: `GetFieldValue()` (string, FORM-BUG-5 affected), `getValueObjectValue()` (raw string, internal), and `GetDateObjectFromCalendar()` (Date object). If a developer calls `.toISOString()` on the Date object and passes it to `SetFieldValue()`, a different drift pattern emerges than the GFV round-trip — see 9-GDOC rows below.
> **IST note for date-only (8B-A-IST)**: FORM-BUG-7 upstream corrupts the stored value to `"2026-03-14"` before GDOC reads it. GDOC shows `Mar 14` (reading the wrong stored value correctly). The original prediction assumed GDOC would show `Mar 15` from a correctly stored `"2026-03-15"` — corrected 2026-04-03. GDOC itself works correctly; the failure is in SetFieldValue's date-only parsing for UTC+ timezones.

---

## 9 — Round-Trip (SFV→GFV→SFV)

Call `SetFieldValue(field, GetFieldValue(field))` and measure date drift.
**Bugs exercised**: FORM-BUG-5 (Config D — each trip drifts by TZ offset)

| Test ID    | Config |  TZ   | Trips | Expected Shift                                                                      | Actual Shift                                                            | Status | Run Date   | Evidence                              |
| ---------- | :----: | :---: | :---: | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ---------- | ------------------------------------- |
| 9-D-BRT-1  |   D    |  BRT  |   1   | -3h                                                                                 | -3h → `"2026-03-14T21:00:00"` (confirmed)                               | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-BRT-1.md)  |
| 9-D-BRT-3  |   D    |  BRT  |   3   | -9h (crosses midnight, same day)                                                    | `"2026-03-14T15:00:00"` (-9h confirmed)                                 | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-BRT-3.md)  |
| 9-D-BRT-8  |   D    |  BRT  |   8   | -24h (full day lost)                                                                | -24h → `"2026-03-14T00:00:00"` (full day lost confirmed)                | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-BRT-8.md)  |
| 9-D-BRT-10 |   D    |  BRT  |  10   | -30h                                                                                | -30h → `"2026-03-13T18:00:00"` (confirmed)                              | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-BRT-10.md) |
| 9-D-IST-1  |   D    |  IST  |   1   | +5:30h                                                                              | +5:30h → `"2026-03-15T05:30:00"` (confirmed)                            | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-IST-1.md)  |
| 9-D-IST-5  |   D    |  IST  |   5   | +27:30h → day crosses                                                               | +27:30h → `"2026-03-16T03:30:00"` (day crossed confirmed)               | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-IST-5.md)  |
| 9-D-IST-8  |   D    |  IST  |   8   | +44h → ~+1d20h (full day gained after ~5 trips)                                     | `"2026-03-16T20:00:00"` (+44h confirmed)                                | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-IST-8.md)  |
| 9-D-IST-10 |   D    |  IST  |  10   | +55h → +2d7h (mirror of BRT-10 but forward)                                         | `"2026-03-17T07:00:00"` (+55h confirmed)                                | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-IST-10.md) |
| 9-D-UTC0   |   D    | UTC+0 |   1   | 0 (fake Z coincidentally correct → stable)                                          | `"2026-03-15T00:00:00"` (0h drift, FORM-BUG-5 invisible)                | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-UTC0.md)   |
| 9-D-PST-1  |   D    |  PST  |   1   | -7h (PDT active Mar 15 — prediction corrected 2026-04-03)                           | `"2026-03-14T17:00:00"` (-7h PDT confirmed)                             | FAIL   | 2026-04-09 | [summary](summaries/tc-9-D-PST-1.md)  |
| 9-D-JST-1  |   D    |  JST  |   1   | +9h (UTC+9 — most extreme positive offset tested)                                   | `"2026-03-15T09:00:00"` (+9h confirmed)                                 | FAIL   | 2026-04-03 | [summary](summaries/tc-9-D-JST-1.md)  |
| 9-C-BRT-1  |   C    |  BRT  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                                            | PASS   | 2026-04-09 | [summary](summaries/tc-9-C-BRT-1.md)  |
| 9-C-IST-1  |   C    |  IST  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                                            | PASS   | 2026-04-09 | [summary](summaries/tc-9-C-IST-1.md)  |
| 9-A-any    |   A    |  any  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                                            | PASS   | 2026-04-09 | [summary](summaries/tc-9-A-any.md)    |
| 9-B-any    |   B    |  any  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                                            | PASS   | 2026-04-09 | [summary](summaries/tc-9-B-any.md)    |
| 9-B-IST    |   B    |  IST  |   1   | -1 day (FORM-BUG-7 on each SFV — prediction corrected 2026-04-03)                   | `"2026-03-13"` (init stored "2026-03-14" FORM-BUG-7, trip→"2026-03-13") | FAIL   | 2026-04-09 | [summary](summaries/tc-9-B-IST.md)    |
| 9-E-any    |   E    |  BRT  |   1   | 0 drift (stable — date-only legacy; same as A/B)                                    | `"2026-03-15"` (0 drift confirmed)                                      | PASS   | 2026-04-03 | [summary](summaries/tc-9-E-any.md)    |
| 9-G-BRT-1  |   G    |  BRT  |   1   | 0 drift (stable — legacy DateTime GFV returns raw)                                  | `"2026-03-15T00:00:00"` (0 drift confirmed)                             | PASS   | 2026-04-09 | [summary](summaries/tc-9-G-BRT-1.md)  |
| 9-H-BRT-1  |   H    |  BRT  |   1   | **0 drift** — useLegacy=true skips fake-Z branch; key comparison vs 9-D-BRT-1 (-3h) | `"2026-03-15T00:00:00"` unchanged, 0 drift                              | PASS   | 2026-04-09 | [summary](summaries/tc-9-H-BRT-1.md)  |
| 9-H-IST-1  |   H    |  IST  |   1   | **0 drift** — no fake Z regardless of TZ; key comparison vs 9-D-IST-1 (+5:30h)      | `"2026-03-15T00:00:00"` unchanged, **0 drift** confirmed                | PASS   | 2026-04-09 | [summary](summaries/tc-9-H-IST-1.md)  |

### 9-GDOC — Round-Trip via GetDateObjectFromCalendar

`SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` — different drift pattern than GFV round-trip because `.toISOString()` produces real UTC, not fake Z.

| Test ID        | Config | TZ  | Trips | Expected Shift                                                                                                                | Actual                                            | Status | Run Date   | Evidence                                  |
| -------------- | :----: | :-: | :---: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ | ---------- | ----------------------------------------- |
| 9-GDOC-A-BRT-1 |   A    | BRT |   1   | 0 (date-only: SFV receives ISO Z string → `normalizeCalValue` → `moment("...Z").toDate()` → BRT midnight → same day)          | `"2026-03-15"` unchanged, **0 drift**             | PASS   | 2026-04-09 | [summary](summaries/tc-9-GDOC-A-BRT-1.md) |
| 9-GDOC-A-IST-1 |   A    | IST |   1   | -3 days compound (prediction corrected 2026-04-08: initial SFV -1d Bug #7, then GDOC round-trip -2d more Bug #7)              | base `"2026-03-14"` → GDOC → `"2026-03-12"` (-3d) | FAIL   | 2026-04-09 | [summary](summaries/tc-9-GDOC-A-IST-1.md) |
| 9-GDOC-D-BRT-1 |   D    | BRT |   1   | 0 drift (prediction corrected 2026-04-01: real UTC Z parsed correctly by moment → local midnight preserved)                   | `"2026-03-15T00:00:00"` unchanged                 | PASS   | 2026-04-09 | [summary](summaries/tc-9-GDOC-D-BRT-1.md) |
| 9-GDOC-D-IST-1 |   D    | IST |   1   | 0 drift (prediction corrected 2026-04-01: GDOC `.toISOString()` = real UTC → SFV parses correctly → local midnight preserved) | `"2026-03-15T00:00:00"` unchanged, **0 drift**    | PASS   | 2026-04-09 | [summary](summaries/tc-9-GDOC-D-IST-1.md) |
| 9-GDOC-C-BRT-1 |   C    | BRT |   1   | 0 (Config C applies real UTC conversion; `.toISOString()` matches GFV; same round-trip as 9-C-BRT-1)                          | `"2026-03-15T00:00:00"` unchanged, **0 drift**    | PASS   | 2026-04-09 | [summary](summaries/tc-9-GDOC-C-BRT-1.md) |

> **Why GDOC round-trips differ from GFV round-trips**: GFV for Config D returns `"...T00:00:00.000Z"` (fake Z — local time mislabeled as UTC). `GetDateObjectFromCalendar().toISOString()` returns `"...T03:00:00.000Z"` (real UTC). When fed back into SetFieldValue, the real UTC string triggers a different code path in `normalizeCalValue()` — potentially storing `T03:00:00` instead of `T00:00:00`, a -3h shift in one trip but via a different mechanism than the fake Z drift.

---

### Group: Integration

## 10 — Web Service Input

Simulate a scheduled script, form button event, or REST API call setting a date value.
**Bugs exercised**: FORM-BUG-7 (date-only, UTC+ server?), input format sensitivity in all configs
**Blocker**: ~~Requires a Node.js test script to send values via `VVRestApi`.~~ Resolved — full WS test infrastructure built.

> **Cross-reference**: Most Cat 10 scenarios are covered by the [WS test matrix](../web-services/matrix.md) (WS-1, WS-4, WS-5). Evidence links below point to WS run files. Gap tests: [cat10-gaps-run-1.md](../web-services/runs/cat10-gaps-run-1.md).
>
> **WADNR cross-validation (2026-04-13)**: All 6 Config D scenarios re-verified on vv5dev/WADNR via WS-1 + Playwright CLI. API storage and Forms behavior identical to EmanuelJofre baseline. See [cat10-wadnr-run-1](../../projects/wadnr/testing/date-handling/forms-calendar/runs/cat10-wadnr-run-1.md).

| Test ID                | Config | Source           | Value                             | Actual (Forms Display / rawValue)                                         | Status  | Run Date   | Evidence                                                                 |
| ---------------------- | :----: | ---------------- | --------------------------------- | ------------------------------------------------------------------------- | :-----: | ---------- | ------------------------------------------------------------------------ |
| 10-D-ws-isoZ           |   D    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | Display: 03/15 12:00AM; raw shifted to local (CB-8)                       |  FAIL   | 2026-04-02 | [ws-4-batch-run-1](../web-services/runs/ws-4-batch-run-1.md)             |
| 10-D-ws-isoNoZ         |   D    | Web service JSON | `"2026-03-15T00:00:00"`           | API adds Z → same as isoZ (CB-8)                                          |  FAIL   | 2026-04-02 | [ws-4-batch-run-1](../web-services/runs/ws-4-batch-run-1.md)             |
| 10-D-ws-dateOnly       |   D    | Web service JSON | `"2026-03-15"`                    | Stored `T00:00:00Z`; display correct                                      |  PASS   | 2026-04-02 | [ws-1 matrix rows](../web-services/matrix.md#ws-1-api-write-path-create) |
| 10-D-ws-dotnet         |   D    | .NET DateTime    | `"2026-03-15T00:00:00.000+00:00"` | Stored `T00:00:00Z`; `+00:00` = Z equivalent (CB-12)                      |  PASS   | 2026-04-02 | [cat10-gaps-run-1](../web-services/runs/cat10-gaps-run-1.md)             |
| 10-D-ws-epoch          |   D    | Epoch ms         | `1773532800000`                   | Stored `null` — silent data loss (WEBSERVICE-BUG-5 variant)               |  FAIL   | 2026-04-02 | [cat10-gaps-run-1](../web-services/runs/cat10-gaps-run-1.md)             |
| 10-C-ws-isoZ           |   C    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | BRT: display 9:00 PM Mar 14; IST: 5:30 AM Mar 15 (CB-8 UTC→local)         |  FAIL   | 2026-04-02 | [ws-4-batch-run-1](../web-services/runs/ws-4-batch-run-1.md)             |
| 10-A-ws-isoZ           |   A    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | raw: `"2026-03-15"`, display: `03/15/2026` ✓                              |  PASS   | 2026-04-02 | [ws-4-batch-run-1](../web-services/runs/ws-4-batch-run-1.md)             |
| 10-A-ws-dateOnly       |   A    | Web service JSON | `"2026-03-15"`                    | raw: `"2026-03-15"`, display: `03/15/2026` ✓                              |  PASS   | 2026-04-02 | [ws-1 matrix rows](../web-services/matrix.md#ws-1-api-write-path-create) |
| 10-D-ws-midnight-cross |   D    | Web service      | `"2026-03-15T02:00:00"`           | BRT: display `02:00 AM` OK, raw `"2026-03-14T23:00:00"` **date crossed!** |  FAIL   | 2026-04-02 | [cat10-gaps-run-1](../web-services/runs/cat10-gaps-run-1.md)             |
| 10-D-script-scheduled  |   D    | Scheduled script | `response.data.date`              | —                                                                         | PENDING | —          | — (requires live scheduled script)                                       |
| 10-D-script-button     |   D    | Form button      | `VV.Form.SetFieldValue(...)`      | Same as Cat 7 — no new behavior                                           |  SKIP   | —          | See Cat 7 results                                                        |

> **Cat 10 Finding**: 4 PASS, 5 FAIL, 1 PENDING, 1 SKIP. All FAIL cases are caused by the CB-8 cross-layer datetime shift (API Z normalization + Forms V1 UTC interpretation). Date-only fields (Config A) are safe. Epoch format is a WEBSERVICE-BUG-5 variant (silent null). Midnight-crossing in BRT causes rawValue date to shift to the previous day — critical for CSV imports with near-midnight UTC times.

---

## 11 — Cross-Timezone

**Bugs exercised**: FORM-BUG-5 (compound drift when different users edit), structural DB inconsistency

| Test ID                  | Action                                                          |    TZ 1     | TZ 2  | Expected                                                                                | Actual                                                           | Status  | Run Date   | Evidence                                            |
| ------------------------ | --------------------------------------------------------------- | :---------: | :---: | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- | ---------- | --------------------------------------------------- |
| 11-save-BRT-load-IST     | Save in BRT, load in IST (all 8 configs)                        |     BRT     |  IST  | All configs raw preserved; Config D GFV adds FORM-BUG-5 fake Z                          | A-H raw preserved; D GFV `.000Z`; all others GFV = raw           | PASS    | 2026-04-09 | [spec](test-cases/tc-11-save-BRT-load-IST.md)       |
| 11-save-IST-load-BRT     | Save in IST, load in BRT                                        |     IST     |  BRT  | Load preserves raw; A shows pre-existing IST save Bug #7; D raw stable, Bug #5 GFV      | A: `"2026-03-14"` (IST save damage); D: preserved                | PASS    | 2026-04-09 | [summary](summaries/tc-11-save-IST-load-BRT.md)     |
| 11-roundtrip-cross       | BRT save → IST load → round-trip → BRT reload                   | BRT→IST→BRT |   —   | Compound drift: IST +5:30h then BRT -3h = net +2:30h from midnight                      | IST→`T05:30:00` then BRT→`T02:30:00` (+2:30h net)                | FAIL    | 2026-04-09 | [summary](summaries/tc-11-roundtrip-cross.md)       |
| 11-concurrent-edit       | User A (BRT) + User B (IST) edit same record                    |     BRT     |  IST  | Overwrite with different UTC moment for "same" date                                     | BRT→`T21:00:00` (day boundary) then IST→`T02:30:00` (+2:30h net) | FAIL    | 2026-04-09 | [summary](summaries/tc-11-concurrent-edit.md)       |
| 11-report-cross          | Query DB for dates entered from different TZs                   |    mixed    |   —   | Inconsistent SQL results                                                                | Identified theoretically (see results.md § Test 2.4)             | PENDING | —          | [spec](test-cases/tc-11-report-cross.md)            |
| 11-load-UTC0             | BRT-saved record loaded in UTC+0                                |     BRT     | UTC+0 | No fake-Z drift (Z happens to be correct)                                               | 0 drift; Bug #5 fake Z present but coincidentally OK             | FAIL    | 2026-04-09 | [summary](summaries/tc-11-load-UTC0.md)             |
| 11-load-PST              | BRT-saved record loaded in PST (UTC-8)                          |     BRT     |  PDT  | -7h/trip drift (prediction corrected 2026-04-08: PDT not PST — DST active Mar 15)       | raw preserved; round-trip `"2026-03-14T17:00:00"` (-7h)          | FAIL    | 2026-04-09 | [summary](summaries/tc-11-load-PST.md)              |
| 11-load-Tokyo            | BRT-saved record loaded in JST (UTC+9)                          |     BRT     |  JST  | +9h/trip drift on round-trip                                                            | raw preserved; round-trip `"2026-03-15T09:00:00"` (+9h)          | FAIL    | 2026-04-08 | [summary](summaries/tc-11-load-Tokyo.md)            |
| 11-A-save-BRT-load-IST   | Config A: save in BRT, load in IST                              |     BRT     |  IST  | Raw preserved (prediction corrected 2026-04-08: Bug #7 fires at input, NOT load)        | `"2026-03-15"` preserved in IST                                  | FAIL    | 2026-04-09 | [summary](summaries/tc-11-A-save-BRT-load-IST.md)   |
| 11-B-save-BRT-load-IST   | Config B: save in BRT, load in IST                              |     BRT     |  IST  | Raw preserved (same as A — ignoreTZ no effect on date-only load)                        | `"2026-03-15"` preserved in IST                                  | FAIL    | 2026-04-09 | [summary](summaries/tc-11-B-save-BRT-load-IST.md)   |
| 11-C-save-BRT-load-IST   | Config C: save in BRT, load in IST                              |     BRT     |  IST  | Raw preserved; GFV re-interprets as IST UTC (structural TZ-ambiguous limitation)        | raw `"2026-03-15T00:00:00"`, GFV IST UTC                         | PASS    | 2026-04-09 | [summary](summaries/tc-11-C-save-BRT-load-IST.md)   |
| 11-D-concurrent-IST-edit | Config D: User A (IST) edits, User B (BRT) re-edits same record |     IST     |  BRT  | Compound: User A IST +5:30h, User B BRT -3h = net +2:30h from midnight                  | IST→`T05:30:00` then BRT→`T02:30:00` (+2:30h net)                | FAIL    | 2026-04-09 | [summary](summaries/tc-11-D-concurrent-IST-edit.md) |
| 11-E-save-BRT-load-IST   | Config E (legacy date-only): save in BRT, load in IST           |     BRT     |  IST  | Raw preserved (prediction corrected 2026-04-08: legacy date-only immune to load Bug #7) | `"2026-03-15"` preserved in IST                                  | FAIL    | 2026-04-09 | [summary](summaries/tc-11-E-save-BRT-load-IST.md)   |
| 11-D-save-BRT-load-IST   | Config D (DateTime+ignoreTZ): save in BRT, load in IST          |     BRT     |  IST  | Raw preserved; GFV adds FORM-BUG-5 fake Z                                               | raw `"2026-03-15T00:00:00"`, GFV `".000Z"`                       | PASS    | 2026-04-09 | [summary](summaries/tc-11-D-save-BRT-load-IST.md)   |
| 11-F-save-BRT-load-IST   | Config F (legacy date-only + ignoreTZ): save in BRT, load IST   |     BRT     |  IST  | Raw preserved (legacy date-only + ignoreTZ immune)                                      | `"2026-03-15"` preserved in IST                                  | FAIL    | 2026-04-09 | [summary](summaries/tc-11-F-save-BRT-load-IST.md)   |
| 11-G-save-BRT-load-IST   | Config G (legacy DateTime): save in BRT, load in IST            |     BRT     |  IST  | Raw preserved (legacy DateTime GFV returns raw)                                         | `"2026-03-15T00:00:00"` preserved in IST                         | PASS    | 2026-04-09 | [summary](summaries/tc-11-G-save-BRT-load-IST.md)   |
| 11-H-save-BRT-load-IST   | Config H (legacy DateTime + ignoreTZ): save in BRT, load IST    |     BRT     |  IST  | Raw preserved (legacy bypasses FORM-BUG-5)                                              | `"2026-03-15T00:00:00"` preserved in IST                         | PASS    | 2026-04-09 | [summary](summaries/tc-11-H-save-BRT-load-IST.md)   |
| 11-H-BRT-roundtrip       | Config H: save in BRT, multiple round-trips, verify no drift    |     BRT     |   —   | 0 drift — useLegacy=true; confirms legacy fixes FORM-BUG-5 for ignoreTZ+enableTime      | `"2026-03-15T00:00:00"` unchanged after 3 trips                  | PASS    | 2026-04-09 | [summary](summaries/tc-11-H-BRT-roundtrip.md)       |

#### V2-scope baseline (EmanuelJofre-vv5dev, DB-scope "Use Updated Calendar Control Logic" = ON)

Baseline captured 2026-04-20 via `cat-11-cross-timezone.spec.js` on IST-chromium. V2 normalizes every config's `raw` to ISO-with-Z (`YYYY-MM-DDTHH:mm:ss.000Z`) and collapses the V1 GFV transformation so `api === raw`. Legacy immunity (E–H) is gone at the raw-format layer. Config A/E carry FORM-BUG-7 (IST midnight → UTC previous day); ignoreTimezone (B/D/F/H) still mitigates day shift. Spec runs SFV in IST, not cross-TZ load — see run file. Source: [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md).

| Test ID                   | Description                                | TZ 1 | TZ 2 | Expected (V2)                        | Actual (V2)                          | Status | Run Date   | Evidence                                                                                                                            |
| ------------------------- | ------------------------------------------ | :--: | :--: | ------------------------------------ | ------------------------------------ | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 11-A-save-BRT-load-IST.V2 | Config A (date-only, TZ-aware), V2         | BRT  | IST  | `"2026-03-14T18:30:00.000Z"` (BUG-7) | `"2026-03-14T18:30:00.000Z"` (BUG-7) | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-B-save-BRT-load-IST.V2 | Config B (date-only + ignoreTZ), V2        | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-C-save-BRT-load-IST.V2 | Config C (DateTime, TZ-aware), V2          | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-D-save-BRT-load-IST.V2 | Config D (DateTime + ignoreTZ), V2         | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-E-save-BRT-load-IST.V2 | Config E (legacy date-only, TZ-aware), V2  | BRT  | IST  | `"2026-03-14T18:30:00.000Z"` (BUG-7) | `"2026-03-14T18:30:00.000Z"` (BUG-7) | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-F-save-BRT-load-IST.V2 | Config F (legacy date-only + ignoreTZ), V2 | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-G-save-BRT-load-IST.V2 | Config G (legacy DateTime), V2             | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |
| 11-H-save-BRT-load-IST.V2 | Config H (legacy DateTime + ignoreTZ), V2  | BRT  | IST  | `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15T00:00:00.000Z"`         | PASS   | 2026-04-20 | [run](../../../projects/emanueljofre-vv5dev/testing/date-handling/forms-calendar/runs/cat11-save-BRT-load-IST-vv5dev-2026-04-20.md) |

---

### Group: Verification

## 12 — Edge Cases

**Bugs exercised**: FORM-BUG-5 (drift at boundaries), FORM-BUG-6 (empty value)

| Test ID                   | Config |  TZ   | Description                   | Value                        | Expected                                                                           | Actual                                                                            | Status | Run Date   | Evidence                                             |
| ------------------------- | :----: | :---: | ----------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------- |
| 12-near-midnight-1        |   D    |  BRT  | UTC input near midnight       | `"2026-03-15T00:30:00.000Z"` | Day crosses on input (BRT = Mar 14 21:30) + fake Z double jeopardy                 | Stored `"2026-03-14T21:30:00"` (day crossed); GFV adds fake Z (confirmed)         | FAIL   | 2026-04-09 | [summary](summaries/tc-12-near-midnight-1.md)        |
| 12-near-midnight-1-IST    |   D    |  IST  | UTC input near midnight, IST  | `"2026-03-15T00:30:00.000Z"` | IST = Mar 15 06:00 — no day cross on input; drift still +5:30h/trip                | raw: `"2026-03-15T06:00:00"`, GFV: `"2026-03-15T06:00:00.000Z"` (FORM-BUG-5)      | FAIL   | 2026-04-09 | [summary](summaries/tc-12-near-midnight-1-IST.md)    |
| 12-near-midnight-2        |   D    |  BRT  | Local time near midnight      | `"2026-03-15T23:00:00"`      | 23:00→20:00→17:00→... (-3h/trip)                                                   | 1 trip: 23:00→20:00 (−3h confirmed)                                               | FAIL   | 2026-04-09 | [summary](summaries/tc-12-near-midnight-2.md)        |
| 12-near-midnight-2-IST    |   D    |  IST  | Local time near midnight, IST | `"2026-03-15T23:00:00"`      | 1 trip: +5:30h → `"2026-03-16T04:30:00"` — day crosses FORWARD                     | 1 trip: `"2026-03-16T04:30:00"` (+5:30h, day forward confirmed)                   | FAIL   | 2026-04-09 | [summary](summaries/tc-12-near-midnight-2-IST.md)    |
| 12-dst-transition         |   D    |  BRT  | US DST change day             | `"2026-03-08T02:00:00"`      | -3h drift from BRT — no DST anomaly (Brazil has no DST)                            | -3h BRT drift confirmed; no DST anomaly                                           | FAIL   | 2026-04-09 | [summary](summaries/tc-12-dst-transition.md)         |
| 12-dst-US-PST             |   D    |  PDT  | US DST spring-forward         | `"2026-03-08T02:00:00"`      | 2AM→3AM advance + Bug #5 crosses day + DST boundary: `"2026-03-07T19:00:00"` (-8h) | V8 advances to 3AM; round-trip → Mar 7 19:00 PST (pre-DST)                        | FAIL   | 2026-04-09 | [summary](summaries/tc-12-dst-US-PST.md)             |
| 12-dst-brazil             |   D    |   —   | Brazil DST                    | —                            | Brazil no longer uses DST                                                          | —                                                                                 | SKIP   | —          | [spec](test-cases/tc-12-dst-brazil.md)               |
| 12-year-boundary          |   D    |  BRT  | Jan 1 midnight                | `"2026-01-01T00:00:00"`      | 1 trip → `"2025-12-31T21:00:00"` — year boundary crossed                           | 1 trip → `"2025-12-31T21:00:00"` (year crossed confirmed)                         | FAIL   | 2026-04-09 | [summary](summaries/tc-12-year-boundary.md)          |
| 12-year-boundary-IST      |   D    |  IST  | Jan 1 midnight, IST           | `"2026-01-01T00:00:00"`      | 1 trip: +5:30h → `"2026-01-01T05:30:00"` — stays in 2026 (opposite of BRT)         | 1 trip: `"2026-01-01T05:30:00"` (stays 2026 confirmed)                            | FAIL   | 2026-04-09 | [summary](summaries/tc-12-year-boundary-IST.md)      |
| 12-leap-day               |   D    |  BRT  | Feb 29 on leap year           | `"2028-02-29T00:00:00"`      | 1 trip → `"2028-02-28T21:00:00"` — leap day lost                                   | 1 trip → `"2028-02-28T21:00:00"` (leap day lost confirmed)                        | FAIL   | 2026-04-09 | [summary](summaries/tc-12-leap-day.md)               |
| 12-leap-day-IST           |   D    |  IST  | Feb 29 on leap year, IST      | `"2028-02-29T00:00:00"`      | 1 trip: +5:30h → `"2028-02-29T05:30:00"` — leap day NOT lost (opposite of BRT)     | 1 trip: `"2028-02-29T05:30:00"` (leap day preserved confirmed)                    | FAIL   | 2026-04-09 | [summary](summaries/tc-12-leap-day-IST.md)           |
| 12-empty-value            |   D    |  any  | Empty / null date             | `""` or `null`               | GFV returns truthy `"Invalid Date"` (FORM-BUG-6)                                   | `"Invalid Date"` (truthy string — FORM-BUG-6 confirmed)                           | FAIL   | 2026-04-09 | [summary](summaries/tc-12-empty-value.md)            |
| 12-null-input             |   D    |  BRT  | Explicit null input           | `null`                       | Is `null` distinct from `""` for SFV? Expect same FORM-BUG-6 behavior.             | SFV(null) → raw `""`, GFV `"Invalid Date"` — identical to `""` (Bug #6)           | FAIL   | 2026-04-09 | [summary](summaries/tc-12-null-input.md)             |
| 12-empty-Config-A         |   A    |  BRT  | Empty Config A                | `""`                         | GFV return `""` — is FORM-BUG-6 D-only or affects A?                               | raw `""`, GFV `""` — Config A immune to Bug #6                                    | PASS   | 2026-04-09 | [summary](summaries/tc-12-empty-Config-A.md)         |
| 12-empty-Config-C         |   C    |  BRT  | Empty Config C                | `""`                         | GFV return `""` — is FORM-BUG-6 D-only or affects C?                               | raw `""`, GFV throws RangeError (Bug #6 variant)                                  | FAIL   | 2026-04-09 | [summary](summaries/tc-12-empty-Config-C.md)         |
| 12-utc-0-control          |   D    | UTC+0 | Round-trip at UTC+0           | `"2026-03-15T00:00:00"`      | Fake Z coincidentally correct → 0 drift per trip                                   | `"2026-03-15T00:00:00"` unchanged, 0 drift                                        | PASS   | 2026-04-09 | [summary](summaries/tc-12-utc-0-control.md)          |
| 12-config-C-near-midnight |   C    |  BRT  | Round-trip near midnight      | `"2026-03-15T23:00:00"`      | 1 trip: stable (real UTC, no fake Z → no drift). Control for FORM-BUG-5.           | raw `"2026-03-15T23:00:00"` unchanged, GFV `"2026-03-16T02:00:00.000Z"` — 0 drift | PASS   | 2026-04-09 | [summary](summaries/tc-12-config-C-near-midnight.md) |
| 12-invalid-string         |   D    |  BRT  | Invalid string                | `"not-a-date"`               | Silently ignored, field retains previous value                                     | Field unchanged; no error thrown (confirmed)                                      | FAIL   | 2026-04-09 | [summary](summaries/tc-12-invalid-string.md)         |
| 12-far-future             |   D    |  BRT  | Year 2099                     | `"2099-12-31T00:00:00"`      | Standard -3h drift, no special issue                                               | -3h drift; no special issue (confirmed)                                           | FAIL   | 2026-04-09 | [summary](summaries/tc-12-far-future.md)             |
| 12-pre-epoch              |   D    |  BRT  | Year 1969                     | `"1969-12-31T00:00:00"`      | Standard -3h drift, handles negative epoch                                         | -3h drift; negative epoch handled correctly (confirmed)                           | FAIL   | 2026-04-09 | [summary](summaries/tc-12-pre-epoch.md)              |

---

## 13 — Database

Direct DB query to verify stored values. Requires SQL access to the VisualVault database.
**Bugs exercised**: structural mixed UTC/local storage

| Test ID                 | Description                                                                    | Expected                                                                                                                                           | Actual                                                                                                                                                                             | Status | Run Date   | Evidence                                           |
| ----------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | -------------------------------------------------- |
| 13-initial-values       | Initial/preset date fields store UTC (via `new Date().toISOString()`)          | UTC datetime in raw SQL                                                                                                                            | UTC datetime confirmed in raw SQL                                                                                                                                                  | PASS   | 2026-03-27 | [summary](summaries/tc-13-initial-values.md)       |
| 13-user-input           | User-input fields store local time (via `getSaveValue()` strips Z)             | Local time string without Z in raw SQL                                                                                                             | Local time without Z confirmed in raw SQL                                                                                                                                          | PASS   | 2026-03-27 | [summary](summaries/tc-13-user-input.md)           |
| 13-after-roundtrip      | DB values after FORM-BUG-5 drift (save after round-trip, check raw SQL)        | `"2026-03-14T21:00:00"` after 1 BRT round-trip (prediction was 8 trips; both confirmed)                                                            | API: `"2026-03-14T21:00:00Z"` after 1 trip — drift persists to DB (DateTest-001919)                                                                                                | FAIL   | 2026-04-08 | [summary](summaries/tc-13-after-roundtrip.md)      |
| 13-cross-tz-save        | DB values for a record saved from IST                                          | IST local time (UTC-equiv): e.g. `"2026-03-14T18:30:00"` (prediction corrected: Config A stores `"2026-03-14T00:00:00Z"` via BUG-7, not UTC-equiv) | BRT Config A: `"2026-03-15T00:00:00Z"`, IST Config A: `"2026-03-14T00:00:00Z"` (BUG-7 -1 day); Config D: identical from both TZs                                                   | FAIL   | 2026-04-08 | [summary](summaries/tc-13-cross-tz-save.md)        |
| 13-ws-input             | DB values when date set via web service / scheduled script                     | Same as equivalent Cat 7/10 web-service input results                                                                                              | All 4 configs (A,B,C,D) store `"2026-03-15T00:00:00Z"` identically via postForms; API bypasses Forms getSaveValue() — no C/D divergence                                            | PASS   | 2026-04-08 | [summary](summaries/tc-13-ws-input.md)             |
| 13-query-consistency    | SQL date range query for same logical date entered from BRT vs IST             | Query returns different row counts (inconsistent)                                                                                                  | `[Field7] eq '2026-03-15'` finds BRT record (000080) but misses IST record (000084, stored as Mar 14); query engine correct (WS-8 all PASS on fresh data) — storage is the problem | FAIL   | 2026-04-08 | [summary](summaries/tc-13-query-consistency.md)    |
| 13-B-storage            | Raw DB value for Config B vs Config A                                          | Same storage format as Config A (ignoreTZ has no effect on date-only)                                                                              | A = B = `"2026-03-15T00:00:00Z"` (identical via API write path; ignoreTZ no effect on date-only)                                                                                   | PASS   | 2026-04-08 | [summary](summaries/tc-13-B-storage.md)            |
| 13-C-vs-D-storage       | SQL comparison: Config C vs Config D storage for BRT midnight                  | Config C: `"2026-03-15T03:00:00"` (UTC-equiv, prediction corrected from T21:00); Config D: `"2026-03-15T00:00:00"` (local)                         | Browser-saved: C=`T03:00:00.000Z` (real UTC), D=`T00:00:00.000Z` (local); API-written: C=D (uniform). Mixed storage is Forms-only.                                                 | FAIL   | 2026-04-08 | [summary](summaries/tc-13-C-vs-D-storage.md)       |
| 13-multi-roundtrip-db   | Raw SQL after 8 BRT round-trips on Config D                                    | `"2026-03-14T00:00:00"` (drifted -24h from `"2026-03-15T00:00:00"`)                                                                                | API: `"2026-03-14T00:00:00Z"` — exactly -24h, full day lost (DateTest-001920)                                                                                                      | FAIL   | 2026-04-08 | [summary](summaries/tc-13-multi-roundtrip-db.md)   |
| 13-preset-vs-user-input | Config A: preset field vs user-input field — same logical date, SQL comparison | Two different raw SQL values for same logical date (UTC Date obj vs local string)                                                                  | BRT: preset=`T03:00:00Z` (UTC), user-input=`T00:00:00Z` (local); IST: preset=`Feb 28 T18:30:00Z` (UTC, crosses month), user-input=`Mar 14 T00:00:00Z` (BUG-7)                      | FAIL   | 2026-04-08 | [summary](summaries/tc-13-preset-vs-user-input.md) |

---

### Group: Cross-Environment Differential

Categories 14–16 investigate whether environmental differences between vvdemo (Kendo v1, progVersion 5.1) and vv5dev (Kendo v2, progVersion 6.1) cause date behavior divergence. Motivated by:

- **Mask auto-population** on vv5dev (54/137 WADNR calendar fields masked, 8 are DateTime + date-only mask)
- **Kendo v1 vs v2** widget layer differences (DOM structure, global `kendo` object, selectors)
- **Server UTC offset** -3 (BRT) vs -7 (PDT)

Audit run data (2026-04-10): `projects/wadnr/testing/date-handling/forms-calendar/runs/audit-kendo-version-wadnr-2026-04-10.md`

## 14 — Mask Impact

Does `<Mask>MM/dd/yyyy</Mask>` on a calendar field affect stored values, GetFieldValue return, or API responses? Documentation claims masks are display-only but this was **never empirically verified**.

**Environment**: EmanuelJofre (unrestricted — can modify field masks via Form Designer)
**Method**: Phase A (unmasked baseline, already known), Phase B (add mask to Field5+Field6), Phase C (re-run same tests), Phase D (remove masks).
**Natural comparison pair on WADNR**: Field3 (`mask="MM/dd/yyyy"`) vs Field7 (no mask) — both Config A, date-only.
**Bugs exercised**: potential new bug (mask-induced value truncation on DateTime fields)
**Spec**: `audit-mask-impact.spec.js`

| Test ID    | Config           | Action              | Input                   | Expected (no mask)                                                                                            | With Mask: verify                | Status | Run Date   | Evidence                              |
| ---------- | ---------------- | ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ | ---------- | ------------------------------------- |
| 14-A-SFV   | A (date-only)    | SetFieldValue       | `"2026-03-15"`          | raw=`"2026-03-15"`                                                                                            | Same?                            | PASS   | 2026-04-13 | [summary](summaries/tc-14-A-SFV.md)   |
| 14-C-SFV   | C (DateTime)     | SetFieldValue       | `"2026-03-15T14:30:00"` | raw=`"2026-03-15T14:30:00"`                                                                                   | Time truncated?                  | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-SFV.md)   |
| 14-D-SFV   | D (DateTime+iTZ) | SetFieldValue       | `"2026-03-15T14:30:00"` | raw=`"2026-03-15T14:30:00"`                                                                                   | Time truncated?                  | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-SFV.md)   |
| 14-C-GFV   | C (DateTime)     | GetFieldValue       | (after 14-C-SFV)        | api=`"2026-03-15T17:30:00.000Z"`                                                                              | Mask affect return?              | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-GFV.md)   |
| 14-D-GFV   | D (DateTime+iTZ) | GetFieldValue       | (after 14-D-SFV)        | api=`"2026-03-15T14:30:00.000Z"`                                                                              | Mask affect return?              | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-GFV.md)   |
| 14-C-popup | C                | Calendar popup      | 3/15/2026               | raw=`"2026-03-15T00:00:00"` (prediction corrected: Kendo v2 stores local midnight, not UTC-equiv `T03:00:00`) | Time picker hidden — what value? | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-popup.md) |
| 14-D-popup | D                | Calendar popup      | 3/15/2026               | raw=`"2026-03-15T00:00:00"`                                                                                   | Time picker hidden — what value? | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-popup.md) |
| 14-C-typed | C                | Typed input         | `03/15/2026 12:00 AM`   | display=`03/15/2026 12:00 AM`, raw=`"2026-03-15T00:00:00"` (same as popup)                                    | Mask forces date-only format?    | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-typed.md) |
| 14-D-typed | D                | Typed input         | `03/15/2026 12:00 AM`   | display=`03/15/2026 12:00 AM`, raw=`"2026-03-15T00:00:00"` (same as popup)                                    | Mask forces date-only format?    | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-typed.md) |
| 14-C-save  | C                | Save + reload       | (after 14-C-popup)      | raw=`"2026-03-15T00:00:00"` preserved, api=`"2026-03-15T03:00:00.000Z"`                                       | Mask affect save pipeline?       | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-save.md)  |
| 14-D-save  | D                | Save + reload       | (after 14-D-popup)      | raw=`"2026-03-15T00:00:00"` preserved, api=`"2026-03-15T00:00:00.000Z"` (Bug #5)                              | Mask affect save pipeline?       | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-save.md)  |
| 14-C-API   | C                | API read (getForms) | (after 14-C-save)       | field6=`"2026-03-15T00:00:00Z"` — server stores with Z                                                        | Server-side care about mask?     | PASS   | 2026-04-13 | [summary](summaries/tc-14-C-API.md)   |
| 14-D-API   | D                | API read (getForms) | (after 14-D-save)       | field5=`"2026-03-15T00:00:00Z"` — **identical to Config C**                                                   | Server-side care about mask?     | PASS   | 2026-04-13 | [summary](summaries/tc-14-D-API.md)   |

### Phase D — Platform-Default Calendar Mask (T3)

Does the Central Admin **Forms → "Calendar Field Default Mask"** setting (currently blank on all envs) apply to calendar fields that do **not** have their own `<Mask>` in the template? Distinct from Phase A-C's per-field mask. Platform-level control means it affects _every_ calendar field at once.

**Environment**: EmanuelJofre (DB scope or Customer scope — test both to verify cascade). Toggle via `tab=ConfigSettings` (Customer) or `tab=DatabaseSettings` (Database), then Configuration Sections dropdown → Forms → "Calendar Field Default Mask".
**Method**: Set platform-default mask to `MM/dd/yyyy`, rerun the same slots as Phase A but on unmasked fields. Compare against Phase A baseline to detect any difference.
**Test fields**: Field5 (Config D) and Field6 (Config C) — neither has a per-field mask.
**Hypothesis**: If the platform default applies, behavior should match Cat 14 Phase B/C (per-field masked fields). If it doesn't, behavior is identical to Phase A.

| Test ID            | Config           | Scope          | Input / Action                                                | Expected (no platform mask = Phase A) | With platform mask = `MM/dd/yyyy`     | Status  | Run Date | Evidence |
| ------------------ | ---------------- | -------------- | ------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ------- | -------- | -------- |
| 14-D-C-SFV.T3      | C (DateTime)     | DB-scope       | SFV `"2026-03-15T14:30:00"`                                   | raw=`"2026-03-15T14:30:00"`           | Same (display-only) / Truncated time? | PENDING | —        | —        |
| 14-D-D-SFV.T3      | D (DateTime+iTZ) | DB-scope       | SFV `"2026-03-15T14:30:00"`                                   | raw=`"2026-03-15T14:30:00"`           | Same / Truncated?                     | PENDING | —        | —        |
| 14-D-C-popup.T3    | C                | DB-scope       | Calendar popup 3/15/2026                                      | raw=`"2026-03-15T00:00:00"`           | Time picker hidden? Different raw?    | PENDING | —        | —        |
| 14-D-D-popup.T3    | D                | DB-scope       | Calendar popup 3/15/2026                                      | raw=`"2026-03-15T00:00:00"`           | Time picker hidden? Different raw?    | PENDING | —        | —        |
| 14-D-A-SFV.T3      | A (date-only)    | DB-scope       | SFV `"2026-03-15"`                                            | raw=`"2026-03-15"`                    | No-op (already date-only)             | PENDING | —        | —        |
| 14-D-scope-cascade | C                | Customer vs DB | Set T3 at Customer only, then DB overrides to different value | Observe which value applies           | Verify DB > Customer cascade for T3   | PENDING | —        | —        |

> **Why this matters for WADNR**: 54/137 WADNR calendar fields already have per-field masks. If a platform default is set, it retroactively affects the other 83 unmasked fields. Also means a "mask-free baseline" on a customer depends on the platform-default value, not just the absence of `<Mask>` in the template.

---

## 15 — Kendo Widget Comparison

Captures Kendo widget internals and VV framework properties on each environment. Run separately on vvdemo (v1) and vv5dev (v2), then diff.

**Environment**: Both (run separately, compare results)
**Method**: JS console captures via `page.evaluate()`, no form modifications needed.
**Spec**: `audit-kendo-version.spec.js`

**Findings (cross-env comparison complete 2026-04-13)**:

- `kendo` global: **does not exist on either** — both use Angular module system (corrects preliminary assumption)
- DOM selectors: `[name="FieldN"]` **does not match on either** — both lack name attributes (corrects preliminary assumption)
- `VV.Form.formId`: **undefined on both**
- `LocalizationResources`: empty object `{}` on v2, **undefined** on v1 (4 extra localization properties on v2)
- `calendarValueService` methods: v1 has **1** (`useUpdatedCalendarValueLogic`), v2 has **4** (adds `formatDateStringForDisplay`, `getCalendarFieldValue`, `getSaveValue`, `parseDateString`)
- `useUpdatedCalendarValueLogic`: `false` on both (V1 path)
- VV value pipeline (raw/api): **identical behavior** on both
- Masks: WADNR Field3/4 retain masks (not present on EmanuelJofre form)

| Test ID          | What                                  | Captures                                        | vvdemo (v1)                                                        | vv5dev (v2)                                                         | Status | Run Date   | Evidence                                    |
| ---------------- | ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------- |
| 15-vv-core       | VV.Form properties                    | formId, V1/V2 flag, method list, property count | formId=undef, V1, **1 method**, no LocalizationResources, 26 props | formId=undef, V1, **4 methods**, LocalizationResources={}, 28 props | PASS   | 2026-04-13 | [summary](summaries/tc-15-vv-core.md)       |
| 15-fieldMaster-D | fieldMaster Config D                  | All 50+ properties                              | mask="", no format/displayFormat                                   | mask="", no format/displayFormat — **IDENTICAL**                    | PASS   | 2026-04-13 | [summary](summaries/tc-15-fieldMaster-D.md) |
| 15-fieldMaster-C | fieldMaster Config C                  | All 50+ properties                              | mask="", no format/displayFormat                                   | mask="", no format/displayFormat — **IDENTICAL**                    | PASS   | 2026-04-13 | [summary](summaries/tc-15-fieldMaster-C.md) |
| 15-kendo-global  | `kendo` global object                 | version, culture, calendar patterns             | **not defined** (same as v2!)                                      | **not defined** — both use module system                            | PASS   | 2026-04-13 | [summary](summaries/tc-15-kendo-global.md)  |
| 15-widget-opts-D | Kendo widget `.options` for Field5    | format, parseFormats, culture                   | **input not found** (same as v2!)                                  | **input not found** — both lack name attr                           | PASS   | 2026-04-13 | [summary](summaries/tc-15-widget-opts-D.md) |
| 15-widget-opts-A | Kendo widget `.options` for Field7    | format, parseFormats, culture                   | **input not found** (same as v2!)                                  | **input not found** — both lack name attr                           | PASS   | 2026-04-13 | [summary](summaries/tc-15-widget-opts-A.md) |
| 15-sfv-widget    | Widget `.value()` after SetFieldValue | Date epoch, toString, toISOString               | VV OK, widget=null (DOM)                                           | VV OK, widget=null — **IDENTICAL**                                  | PASS   | 2026-04-13 | [summary](summaries/tc-15-sfv-widget.md)    |
| 15-mask-scan     | All calendar fields mask properties   | mask, placeholder, format per field             | No masks (all empty, 26 fields)                                    | Field3/4 have mask (WADNR only), rest empty                         | PASS   | 2026-04-13 | [summary](summaries/tc-15-mask-scan.md)     |

## 16 — Server TZ on Form Save

Does the VV server UTC offset affect the form save→reload→API-read pipeline? API write path was proven offset-independent (WS-1), but the browser form save path goes through different server-side code.

**Environment**: Both (requires form saves — WADNR test harness is in writePolicy)
**Method**: Save identical values via browser form UI on each env, then API read on each.
**Spec**: `audit-server-tz.spec.js`
**Prerequisite**: Run after Cat 14–15 to establish baseline assumptions.

| Test ID       | Config           | Input method  | Input                   | Compare                                                                   | Status | Run Date   | Evidence                                 |
| ------------- | ---------------- | ------------- | ----------------------- | ------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------- |
| 16-A-typed    | A (date-only)    | Typed         | `03/15/2026`            | Both: `"2026-03-15T00:00:00Z"` — **IDENTICAL**                            | PASS   | 2026-04-13 | [summary](summaries/tc-16-A-typed.md)    |
| 16-C-typed    | C (DateTime)     | Typed         | `03/15/2026 12:00 AM`   | Both: `"2026-03-15T00:00:00Z"` — **IDENTICAL**                            | PASS   | 2026-04-13 | [summary](summaries/tc-16-C-typed.md)    |
| 16-D-SFV      | D (DateTime+iTZ) | SetFieldValue | `"2026-03-15T14:30:00"` | Both: `"2026-03-15T14:30:00Z"` — **IDENTICAL**                            | PASS   | 2026-04-13 | [summary](summaries/tc-16-D-SFV.md)      |
| 16-A-controls | A                | (after save)  | —                       | Both: raw=`"2026-03-15"` — **IDENTICAL**                                  | PASS   | 2026-04-13 | [summary](summaries/tc-16-A-controls.md) |
| 16-C-controls | C                | (after save)  | —                       | Both: raw=`"2026-03-15T00:00:00"` — **IDENTICAL**                         | PASS   | 2026-04-13 | [summary](summaries/tc-16-C-controls.md) |
| 16-D-controls | D                | (after save)  | —                       | Both: raw=`"2026-03-15T14:30:00"` — **IDENTICAL** (Bug #5 fake Z on both) | PASS   | 2026-04-13 | [summary](summaries/tc-16-D-controls.md) |

---

### Group: Platform Scope

Cats 17-19 exercise the Central Admin **Platform Scope** dimension — toggles and customer settings that modulate the _pipeline_ rather than the _field_. These slots use explicit scope suffixes on their IDs (see [ID Convention](#id-convention) and [Platform Scope](#platform-scope)).

## 17 — Platform TZ Conversion Toggles (T1/T2)

Central Admin **Forms → Configuration Sections → Forms** offers two toggles we've never exercised:

- **T1** "Convert Date Fields to Customer Timezone" — unknown pipeline; likely injects a customer-TZ normalization step somewhere in the Forms save/load chain.
- **T2** "Prevent Conversion For Dates Ignoring Timezones" — only meaningful when T1 is on; overrides T1 for fields with `ignoreTimezone=true`.

Both default OFF. Turning one (or both) on could **fix FORM-BUG-5/7, create a new bug, or do nothing**. All three outcomes are meaningful. Customer TZ on the test env is the one from the Customer Details tab (UTC for vv5dev/EmanuelJofre; BRT for vvdemo).

**Environment**: EmanuelJofre (has CA access on vv5dev; also on vvdemo for T1/T2 at customer scope).
**Method**: Toggle T1 (and T2) at database scope. Re-run a core subset of Cat 1 / Cat 7 / Cat 8 slots on the 4 `ignoreTimezone`-sensitive configs (B, D, F, H) across 3 TZs. Compare to baseline.
**Spec**: `cat-17-tz-conversion-toggles.spec.js` (to be created).
**Bugs potentially exercised**: FORM-BUG-5 (Config D), FORM-BUG-7 (Configs A/B), and a potential **new bug** if T1 over-converts (double shift) or misapplies to date-only fields.

**Shape**: 4 toggle combos × 4 configs × 3 TZs = **48 slots**. Toggle combos:

|        | T1 OFF                       | T1 ON          |
| ------ | ---------------------------- | -------------- |
| T2 OFF | (default = Cat 1 baseline)   | `.T1` scope    |
| T2 ON  | (no effect — T2 requires T1) | `.T1+T2` scope |

Three toggle tokens give us a practical 3 variants × 4 configs × 3 TZs = 36 slots, plus a 12-slot control set rerunning `.baseline` on the same configs to confirm no regression from the toggle flip. Grand total **48 PENDING**.

| Test ID              | Config |  TZ   | Scope    | Baseline Expected (T1/T2 off)                                                       | Probe Question                                                                 | Status  | Run Date | Evidence |
| -------------------- | :----: | :---: | -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- | -------- | -------- |
| 17-B-BRT.T1          |   B    |  BRT  | `.T1`    | `"2026-03-15"` (date-only)                                                          | Does T1 date-only become a datetime? Any shift?                                | PENDING | —        | —        |
| 17-B-IST.T1          |   B    |  IST  | `.T1`    | `"2026-03-14"` (FORM-BUG-7)                                                         | Does T1 fix the -1 day shift?                                                  | PENDING | —        | —        |
| 17-B-UTC0.T1         |   B    | UTC+0 | `.T1`    | `"2026-03-15"`                                                                      | Control (no shift at UTC+0)                                                    | PENDING | —        | —        |
| 17-D-BRT.T1          |   D    |  BRT  | `.T1`    | `"2026-03-15T00:00:00"` + fake Z (FORM-BUG-5)                                       | Does T1 fix fake Z? Does stored value change?                                  | PENDING | —        | —        |
| 17-D-IST.T1          |   D    |  IST  | `.T1`    | `"2026-03-15T00:00:00"` + fake Z                                                    | Same. Also: does round-trip drift disappear?                                   | PENDING | —        | —        |
| 17-D-UTC0.T1         |   D    | UTC+0 | `.T1`    | `"2026-03-15T00:00:00"` + fake Z (0 drift)                                          | Control                                                                        | PENDING | —        | —        |
| 17-F-BRT.T1          |   F    |  BRT  | `.T1`    | `"2026-03-15"` (legacy date-only)                                                   | T1 affect legacy path?                                                         | PENDING | —        | —        |
| 17-F-IST.T1          |   F    |  IST  | `.T1`    | `"2026-03-14"` (FORM-BUG-7, legacy path)                                            | Same                                                                           | PENDING | —        | —        |
| 17-F-UTC0.T1         |   F    | UTC+0 | `.T1`    | `"2026-03-15"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-H-BRT.T1          |   H    |  BRT  | `.T1`    | `"2026-03-15T00:00:00"` (no fake Z — legacy)                                        | T1 flip the legacy no-fake-Z behavior?                                         | PENDING | —        | —        |
| 17-H-IST.T1          |   H    |  IST  | `.T1`    | `"2026-03-15T00:00:00"`                                                             | Same                                                                           | PENDING | —        | —        |
| 17-H-UTC0.T1         |   H    | UTC+0 | `.T1`    | `"2026-03-15T00:00:00"`                                                             | Control                                                                        | PENDING | —        | —        |
| 17-B-BRT.T1+T2       |   B    |  BRT  | `.T1+T2` | (same as `.T1`)                                                                     | T2 over-ride: does ignoreTZ=true short-circuit the T1 conversion?              | PENDING | —        | —        |
| 17-B-IST.T1+T2       |   B    |  IST  | `.T1+T2` | (FORM-BUG-7 under T1 = ?)                                                           | Does T2 restore the un-shifted value on ignoreTZ fields?                       | PENDING | —        | —        |
| 17-B-UTC0.T1+T2      |   B    | UTC+0 | `.T1+T2` | Control                                                                             | Control                                                                        | PENDING | —        | —        |
| 17-D-BRT.T1+T2       |   D    |  BRT  | `.T1+T2` | (same as `.T1`)                                                                     | Does T2 preserve the fake-Z behavior on Config D?                              | PENDING | —        | —        |
| 17-D-IST.T1+T2       |   D    |  IST  | `.T1+T2` | (same as `.T1`)                                                                     | Same                                                                           | PENDING | —        | —        |
| 17-D-UTC0.T1+T2      |   D    | UTC+0 | `.T1+T2` | Control                                                                             | Control                                                                        | PENDING | —        | —        |
| 17-F-BRT.T1+T2       |   F    |  BRT  | `.T1+T2` | (same as `.T1`)                                                                     | T2 on legacy date-only ignoreTZ                                                | PENDING | —        | —        |
| 17-F-IST.T1+T2       |   F    |  IST  | `.T1+T2` | (same as `.T1`)                                                                     | Same                                                                           | PENDING | —        | —        |
| 17-F-UTC0.T1+T2      |   F    | UTC+0 | `.T1+T2` | Control                                                                             | Control                                                                        | PENDING | —        | —        |
| 17-H-BRT.T1+T2       |   H    |  BRT  | `.T1+T2` | (same as `.T1`)                                                                     | T2 on legacy DateTime+ignoreTZ — expect identical to baseline (T1 neutralized) | PENDING | —        | —        |
| 17-H-IST.T1+T2       |   H    |  IST  | `.T1+T2` | (same as `.T1`)                                                                     | Same                                                                           | PENDING | —        | —        |
| 17-H-UTC0.T1+T2      |   H    | UTC+0 | `.T1+T2` | Control                                                                             | Control                                                                        | PENDING | —        | —        |
| 17-B-BRT.baseline    |   B    |  BRT  | —        | `"2026-03-15"`                                                                      | Control: rerun with T1/T2 off after flipping them to ensure no state leak      | PENDING | —        | —        |
| 17-B-IST.baseline    |   B    |  IST  | —        | `"2026-03-14"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-B-UTC0.baseline   |   B    | UTC+0 | —        | `"2026-03-15"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-D-BRT.baseline    |   D    |  BRT  | —        | `"2026-03-15T00:00:00"` + fake Z                                                    | Control                                                                        | PENDING | —        | —        |
| 17-D-IST.baseline    |   D    |  IST  | —        | `"2026-03-15T00:00:00"` + fake Z                                                    | Control                                                                        | PENDING | —        | —        |
| 17-D-UTC0.baseline   |   D    | UTC+0 | —        | `"2026-03-15T00:00:00"` + fake Z                                                    | Control                                                                        | PENDING | —        | —        |
| 17-F-BRT.baseline    |   F    |  BRT  | —        | `"2026-03-15"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-F-IST.baseline    |   F    |  IST  | —        | `"2026-03-14"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-F-UTC0.baseline   |   F    | UTC+0 | —        | `"2026-03-15"`                                                                      | Control                                                                        | PENDING | —        | —        |
| 17-H-BRT.baseline    |   H    |  BRT  | —        | `"2026-03-15T00:00:00"`                                                             | Control                                                                        | PENDING | —        | —        |
| 17-H-IST.baseline    |   H    |  IST  | —        | `"2026-03-15T00:00:00"`                                                             | Control                                                                        | PENDING | —        | —        |
| 17-H-UTC0.baseline   |   H    | UTC+0 | —        | `"2026-03-15T00:00:00"`                                                             | Control                                                                        | PENDING | —        | —        |
| 17-sfv-round-B       |   B    |  IST  | `.T1`    | `"2026-03-14"` then SFV→GFV→SFV                                                     | Does round-trip drift change under T1?                                         | PENDING | —        | —        |
| 17-sfv-round-D       |   D    |  IST  | `.T1`    | +5:30h/trip                                                                         | Same                                                                           | PENDING | —        | —        |
| 17-sfv-round-B-T2    |   B    |  IST  | `.T1+T2` | (per T2 semantics)                                                                  | Does T2 restore stable round-trip?                                             | PENDING | —        | —        |
| 17-sfv-round-D-T2    |   D    |  IST  | `.T1+T2` | (per T2 semantics)                                                                  | Does T2 restore stable round-trip?                                             | PENDING | —        | —        |
| 17-ws-D-T1           |   D    |  BRT  | `.T1`    | WS postForms `"2026-03-15T00:00:00.000Z"` → Forms read                              | Does T1 change cross-layer behavior? (cross-ref WS-11)                         | PENDING | —        | —        |
| 17-ws-D-T1+T2        |   D    |  BRT  | `.T1+T2` | Same WS input                                                                       | Does T2 preserve Forms V1 re-interpretation?                                   | PENDING | —        | —        |
| 17-bug5-fixed-check  |   D    |  BRT  | `.T1`    | Round-trip should produce 0 drift IF T1 fixes FORM-BUG-5                            | Hypothesis test                                                                | PENDING | —        | —        |
| 17-bug7-fixed-check  |   A    |  IST  | `.T1`    | Stored date should be Mar 15 (not Mar 14) IF T1 fixes FORM-BUG-7                    | Hypothesis test                                                                | PENDING | —        | —        |
| 17-bug5-T2-preserve  |   D    |  BRT  | `.T1+T2` | Round-trip should return to -3h drift IF T2 restores pre-T1 behavior                | Hypothesis test                                                                | PENDING | —        | —        |
| 17-config-C-T1       |   C    |  BRT  | `.T1`    | Config C has `ignoreTZ=false` — T1 applies in full. Cross-reference with C baseline | Probe                                                                          | PENDING | —        | —        |
| 17-config-A-T1       |   A    |  IST  | `.T1`    | Config A has `ignoreTZ=false` — expect T1 applies; does it fix FORM-BUG-7?          | Hypothesis test                                                                | PENDING | —        | —        |
| 17-cust-tz-change    |   D    |  BRT  | `.T1`    | Change Customer TZ mid-test; verify `Minutes to Cache Time Zone Value = 20` applies | Cross-ref Cat 19                                                               | PENDING | —        | —        |
| 17-customer-scope-T1 |   D    |  BRT  | `.T1`    | Set T1 at customer scope only (not DB) — verify cascade: DB off > Customer on = off | Scope precedence test                                                          | PENDING | —        | —        |

> **Expected Value approach for Cat 17**: We don't know the pipeline behavior yet. The "Expected" column above records **baseline (T1/T2 off) behavior** and the "Probe Question" column records what we're measuring. After first run, fill in "Actual" and convert "Probe Question" into a concrete expected value for the second pass. This is exploratory testing — treat first-run failures as **data collection**, not regression signal.

---

## 18 — Customer Culture (locale)

Central Admin **Customer Details → Culture** (customer scope) controls server-rendered date formats and parsing expectations. All existing slots assume `English (United States)` (MM/DD/YYYY). A customer on `Portuguese (Brazil)` (DD/MM/YYYY) or `Spanish (Spain)` (DD/MM/YYYY) may behave differently — particularly for:

- Input format tolerance (WS-BUG-2/3 "DD/MM silently discarded" may **flip** under ptBR — DD/MM becomes the intended format)
- Display format on reload (user sees `15/03/2026` not `03/15/2026`)
- Kendo widget parseFormats
- Typed input auto-parse (Cat 2 under `.ptBR` scope)

**Environment**: EmanuelJofre (both vvdemo and vv5dev — change via Central Admin Customer Details).
**Method**: Change customer Culture to `Portuguese (Brazil)`. Rerun a core subset of Cat 2 (typed input) and Cat 7 (SFV format tolerance) slots with DD/MM inputs. Verify both parse success and stored-value round-trip.
**Spec**: `cat-18-culture.spec.js` (to be created).
**Bugs potentially exercised**: WEBSERVICE-BUG-2/3 (cross-ref in WS-12), potential new bug if Forms and API disagree on Culture source.

**Shape**: 5 input formats × 2 cultures × 2 configs (A date-only, D DateTime+iTZ) = **20 slots**.

| Test ID             | Config | Culture | TZ  | Input (form display)  | Expected raw                   | Probe                                                         | Status  | Run Date | Evidence |
| ------------------- | :----: | :-----: | :-: | --------------------- | ------------------------------ | ------------------------------------------------------------- | ------- | -------- | -------- |
| 18-A-ptBR-ddmm      |   A    |  ptBR   | BRT | `15/03/2026`          | `"2026-03-15"`                 | Does typed DD/MM parse correctly under ptBR?                  | PENDING | —        | —        |
| 18-A-ptBR-mmdd      |   A    |  ptBR   | BRT | `03/15/2026`          | Parse fail OR parse as Mar 15? | Does MM/DD still work as fallback under ptBR?                 | PENDING | —        | —        |
| 18-A-ptBR-iso       |   A    |  ptBR   | BRT | `2026-03-15`          | `"2026-03-15"`                 | ISO format Culture-independent?                               | PENDING | —        | —        |
| 18-A-ptBR-ambiguous |   A    |  ptBR   | BRT | `03/04/2026`          | `"2026-04-03"` (Apr 3 DD/MM)   | Ambiguous date under ptBR — opposite interpretation from enUS | PENDING | —        | —        |
| 18-A-ptBR-invalid   |   A    |  ptBR   | BRT | `15/15/2026`          | Parse fail                     | Invalid under any Culture                                     | PENDING | —        | —        |
| 18-D-ptBR-ddmm      |   D    |  ptBR   | BRT | `15/03/2026 14:30`    | `"2026-03-15T14:30:00"`        | DateTime DD/MM + time                                         | PENDING | —        | —        |
| 18-D-ptBR-mmdd      |   D    |  ptBR   | BRT | `03/15/2026 14:30`    | Parse fail or tolerant?        | Mixed Culture on DateTime field                               | PENDING | —        | —        |
| 18-D-ptBR-iso       |   D    |  ptBR   | BRT | `2026-03-15T14:30:00` | `"2026-03-15T14:30:00"`        | ISO format                                                    | PENDING | —        | —        |
| 18-D-ptBR-ambiguous |   D    |  ptBR   | BRT | `03/04/2026 14:30`    | `"2026-04-03T14:30:00"`        | Ambiguous DateTime                                            | PENDING | —        | —        |
| 18-D-ptBR-invalid   |   D    |  ptBR   | BRT | `31/02/2026`          | Parse fail                     | Invalid under any Culture                                     | PENDING | —        | —        |
| 18-A-enUS-ddmm      |   A    |  enUS   | BRT | `15/03/2026`          | Parse fail OR parse as Mar 15? | Control: DD/MM under enUS (same as WEBSERVICE-BUG-2)          | PENDING | —        | —        |
| 18-A-enUS-mmdd      |   A    |  enUS   | BRT | `03/15/2026`          | `"2026-03-15"`                 | Control: MM/DD default                                        | PENDING | —        | —        |
| 18-A-enUS-iso       |   A    |  enUS   | BRT | `2026-03-15`          | `"2026-03-15"`                 | Control                                                       | PENDING | —        | —        |
| 18-A-enUS-ambiguous |   A    |  enUS   | BRT | `03/04/2026`          | `"2026-03-04"` (Mar 4 MM/DD)   | Control: opposite interpretation from ptBR                    | PENDING | —        | —        |
| 18-A-enUS-invalid   |   A    |  enUS   | BRT | `15/15/2026`          | Parse fail                     | Control                                                       | PENDING | —        | —        |
| 18-D-enUS-ddmm      |   D    |  enUS   | BRT | `15/03/2026 14:30`    | Parse fail OR parse as Mar 15? | Control                                                       | PENDING | —        | —        |
| 18-D-enUS-mmdd      |   D    |  enUS   | BRT | `03/15/2026 14:30`    | `"2026-03-15T14:30:00"`        | Control                                                       | PENDING | —        | —        |
| 18-D-enUS-iso       |   D    |  enUS   | BRT | `2026-03-15T14:30:00` | `"2026-03-15T14:30:00"`        | Control                                                       | PENDING | —        | —        |
| 18-D-enUS-ambiguous |   D    |  enUS   | BRT | `03/04/2026 14:30`    | `"2026-03-04T14:30:00"`        | Control                                                       | PENDING | —        | —        |
| 18-D-enUS-invalid   |   D    |  enUS   | BRT | `31/02/2026 14:30`    | Parse fail                     | Control                                                       | PENDING | —        | —        |

> **Cross-cutting**: WS-12 tests the same Culture dimension at the REST API layer. DB-9 tests dashboard display format. Synchronize findings.
> **"Current Culture" override**: General Configuration Section has its own "Current Culture:" text input. If set, it may shadow the Details-tab Culture. Capture both settings before the run; if they differ, probe which wins.

---

## 19 — Server-Generated Timestamps

Forms and workflows generate timestamps via four server-side mechanisms: **Created Date** auto-fields (on form save), **`DateTime.Now`** in Node.js/C# scripts, **`GETDATE()`** in SQL queries (via custom queries / web services), and **workflow due-date** computation. All should respect the **Customer Time Zone** (set in Central Admin Customer Details tab). Untested.

**Environment**: EmanuelJofre-vv5dev (Customer TZ = UTC), EmanuelJofre-vvdemo (Customer TZ = BRT). These two envs give us a free TZ comparison if we can reach server-generated timestamps on both.
**Method**: Capture server timestamps at known wall-clock moments, compute expected UTC offset based on Customer TZ, compare.
**Spec**: `cat-19-server-timestamps.spec.js` (to be created). Depends on extract of a customer form with an auto-Created-Date field.
**Cross-reference**: [Scheduled Processes matrix](../scheduled-processes/matrix.md) for SP trigger-time semantics; [Workflows matrix](../workflows/matrix.md) for due-date computation.

**Shape**: 4 mechanisms × 2 Customer TZs = **8 slots**.

| Test ID         | Mechanism                                                    | Customer TZ | Test TZ (browser) | Expected                                                                    | Status  | Run Date | Evidence |
| --------------- | ------------------------------------------------------------ | ----------- | ----------------- | --------------------------------------------------------------------------- | ------- | -------- | -------- |
| 19-created-UTC  | Created Date auto-field on save                              | UTC         | BRT               | Timestamp matches UTC wall-clock, not browser BRT                           | PENDING | —        | —        |
| 19-created-BRT  | Created Date auto-field on save                              | BRT         | UTC               | Timestamp matches BRT wall-clock                                            | PENDING | —        | —        |
| 19-now-UTC      | `DateTime.Now` in Node.js script (WS-9 variant)              | UTC         | BRT               | Script returns UTC-aligned timestamp                                        | PENDING | —        | —        |
| 19-now-BRT      | `DateTime.Now` in Node.js script                             | BRT         | UTC               | Script returns BRT-aligned timestamp                                        | PENDING | —        | —        |
| 19-getdate-UTC  | `GETDATE()` via custom query                                 | UTC         | BRT               | SQL returns UTC-aligned (or SQL-server-OS timestamp — test what VV exposes) | PENDING | —        | —        |
| 19-getdate-BRT  | `GETDATE()` via custom query                                 | BRT         | UTC               | Same                                                                        | PENDING | —        | —        |
| 19-workflow-UTC | Workflow task "Default Days for an Approval Task=5" due-date | UTC         | BRT               | Due date = now + 5 days, computed in Customer TZ (UTC)                      | PENDING | —        | —        |
| 19-workflow-BRT | Workflow task due-date                                       | BRT         | UTC               | Due date = now + 5 days, computed in Customer TZ (BRT)                      | PENDING | —        | —        |

> **Why Customer TZ matters for server timestamps**: The `Server Farm → Minutes to Cache Time Zone Value = 20` setting caches the Customer TZ on the client for 20 min. A customer-TZ change won't reach the server-timestamp generator until the cache invalidates. Cat 17 has a `17-cust-tz-change` row that cross-references this.
> **`DateTime.Now` note**: In the harness Express server, `DateTime.Now` uses the server OS TZ, not Customer TZ. If the harness is the active microservice runtime, observed timestamps depend on which container runs the code. Document this when running Cat 19 on vv5dev (harness routes to `https://nodejs-preprod.visualvault.com` per `Other → Scripting Server Url`).
