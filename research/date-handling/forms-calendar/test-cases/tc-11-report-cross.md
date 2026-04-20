# TC-11-report-cross — Cross-Timezone Report Query: theoretical — SQL range queries miss records saved in non-matching timezones

## Nature

**Theoretical / PENDING slot** — describes a query-layer consequence of the mixed-storage issue that Cat 11 and Cat 13 have already confirmed at the per-record level. This file lays out the test methodology so anyone with a VV environment and SQL read access can reproduce it; it does not document a live browser run.

Related live evidence already exists:

- `13-query-consistency` (matrix) — proved that `[Field7] eq '2026-03-15'` finds a BRT-saved record but misses an IST-saved record stored as `'2026-03-14'` after FORM-BUG-7 fires on the save path.
- `13-cross-tz-save` (matrix) — proved that Config A IST-saved records carry a `-1 day` storage drift vs BRT-saved records for the same logical date.
- `results.md § Test 2.4` — derives the mathematical expectation for the mixed-storage report problem across four zones.

This TC is the formal harness that would exercise the same mechanism at the **report query** layer (VV Reports / custom SQL / API list filter), using a controlled multi-TZ dataset.

## Environment Specs

| Parameter               | Required Value                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine) — for running the report / API call          |
| **System Timezone**     | BRT (`America/Sao_Paulo`) for the reporting user — arbitrary choice                   |
| **Platform**            | VisualVault FormViewer, Build `<number from top-right of form page>`                  |
| **VV Code Path**        | V1 or V2 — storage-level test, code path irrelevant                                   |
| **Target Field Config** | Config A (date-only) for `BUG-7` surface; Config D (DateTime+iTZ) for `BUG-5` surface |
| **Scenario**            | Issue a date-range filter that should match N records; report returns < N             |

---

## Preconditions

**P1 — Prepare the dataset** (create once; reuse for future runs):

Using the `DateTest` form template, create three records for the same logical date `2026-03-15`:

1. **Record BRT**: save in BRT (UTC-3) with target fields populated via popup or typed input.
2. **Record IST**: save in IST (UTC+5:30) with the same input values.
3. **Record UTC0**: save in UTC+0 with the same input values.

Record the DataIDs in the run file. Each record carries the same _display_ date (`03/15/2026`) but different _stored_ values per FORM-BUG-7 and the ignoreTimezone semantics — see `results.md § Test 2.4`.

**P2 — Confirm raw storage via direct read** (sanity check before querying):

For each of the three records, fetch via REST API and record the raw `field7` (Config A) and `field5` (Config D) values. Expected (reproduces `13-cross-tz-save`):

| Record      | Config A raw stored   | Config D raw stored      |
| ----------- | --------------------- | ------------------------ |
| BRT record  | `"2026-03-15"`        | `"2026-03-15T00:00:00Z"` |
| IST record  | `"2026-03-14"` ←BUG-7 | `"2026-03-15T00:00:00Z"` |
| UTC0 record | `"2026-03-15"`        | `"2026-03-15T00:00:00Z"` |

**P3 — Choose a report surface**: pick one or more of the following and repeat the queries in Test Steps:

- VV custom query filter: `[Field7] eq '2026-03-15'`
- VV Reports engine with a "date equals 2026-03-15" filter
- REST API list: `/forms?filter=Field7 eq '2026-03-15'`
- Direct SQL: `SELECT COUNT(*) FROM {table} WHERE Field7 = '2026-03-15'`

---

## Test Steps

| #   | Action                                                                   | Input / Command                                | Expected Result                                                                                                                         | ✓   |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete dataset setup                                                   | See Preconditions P1–P3                        | Three records confirmed with expected raw values                                                                                        | ☐   |
| 2   | Query `[Field7] eq '2026-03-15'` via chosen report surface               | `Field7 eq '2026-03-15'` (Config A, date-only) | Returns 2 of 3 records — BRT and UTC0 match, IST missing (IST stored as `"2026-03-14"` by FORM-BUG-7)                                   | ☐   |
| 3   | Query `[Field7] eq '2026-03-14'` via chosen report surface               | `Field7 eq '2026-03-14'` (Config A, date-only) | Returns 1 of 3 records — only IST matches; the user saw March 15 but the DB stored March 14                                             | ☐   |
| 4   | Query `[Field5] ge '2026-03-15T00:00:00Z' and lt '2026-03-16T00:00:00Z'` | Config D range over a full day                 | Returns all 3 records — ignoreTimezone-driven "same date" saves all store as `"2026-03-15T00:00:00Z"` (confirmed by `13-cross-tz-save`) | ☐   |
| 5   | Record report toolchain sensitivity                                      | Note which surface(s) from P3 were tested      | Same miss/hit pattern across every surface tested — storage is the problem, not the engine (see `13-query-consistency`)                 | ☐   |
| 6   | Confirm browser timezone                                                 | `new Date(2026, 2, 15, 0, 0, 0).toISOString()` | `"2026-03-15T03:00:00.000Z"` — confirms BRT active for the reporting user                                                               | ☐   |

---

## Fail Conditions

**FAIL-1 (All 3 records match Step 2 query):** Step 2 returns all three records.

- Interpretation: FORM-BUG-7 did not fire on the IST save, or IST-saved records are normalized somewhere in the write pipeline. Re-verify P2 raw values. If raw is `"2026-03-15"` for the IST record, FORM-BUG-7 is no longer reproducing — re-run `13-cross-tz-save` and `11-A-save-BRT-load-IST` to confirm.

**FAIL-2 (Step 2 returns 1 or 0 records):** Step 2 misses BRT or UTC0 records in addition to IST.

- Interpretation: a new storage bug beyond FORM-BUG-7 is affecting date-only records in BRT or UTC+0. Escalate — this is a regression in a previously PASS slot.

**FAIL-3 (Step 4 Config D query misses records):** Step 4 returns fewer than 3 records.

- Interpretation: Config D API write path is no longer uniform across TZs (contradicts `13-ws-input` / `13-cross-tz-save`). Capture raw values from P2 and compare to the latest `13-*` run files.

**FAIL-4 (Wrong timezone):** Step 6 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: reporting user is not in BRT. Re-do P1/P2 per the sibling TCs' timezone setup.

---

## Related

| Reference                   | Location                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Matrix row                  | `matrix.md` — row `11-report-cross`                                                                        |
| Source theoretical analysis | `projects/emanueljofre-vvdemo/testing/date-handling/forms-calendar/results.md § Test 2.4`                  |
| Per-record storage evidence | [tc-13-cross-tz-save.md](tc-13-cross-tz-save.md), [tc-13-query-consistency.md](tc-13-query-consistency.md) |
| FORM-BUG-7 analysis         | `analysis/bug-7-wrong-day-utc-plus.md`                                                                     |
| FORM-BUG-5 analysis         | `analysis/bug-5-fake-z-drift.md` — Config D storage uniformity context                                     |
| Cross-TZ umbrella           | [tc-11-save-BRT-load-IST.md](tc-11-save-BRT-load-IST.md) — per-config cross-TZ baseline                    |
