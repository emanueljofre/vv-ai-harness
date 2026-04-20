# TC-11-save-BRT-load-IST — All Configs A–H, Cross-TZ Reload, BRT→IST: raw preserved across 8 configs; only Config D GFV drift (FORM-BUG-5)

## Nature

**Umbrella TC** — aggregates the eight per-config cross-TZ reload tests into a single coverage slot. There is no separate field or record to exercise here; each child TC runs the same action (reload a BRT-saved record in IST) on its own config and records the result.

Run the child TCs individually; this file exists to index them, document the cross-config finding, and link the matrix `11-save-BRT-load-IST` row to reproducible evidence.

## Environment Specs

| Parameter               | Required Value                                                                   |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                         |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST (India does not observe DST).            |
| **Platform**            | VisualVault FormViewer, Build `<number from top-right of form page>`             |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)         |
| **Target Field Config** | All 8 configs (A–H) — each child TC targets one config via P6                    |
| **Scenario**            | Eight BRT-saved records (`cat3-{A..H}-BRT`) reloaded in IST; no typed/popup edit |

---

## Preconditions

**P1 — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Prepare eight BRT-saved records** (one per config A–H):

Each child TC references a saved record key (`cat3-{A..H}-BRT`) cataloged in `testing/fixtures/vv-config.js` → `SAVED_RECORDS`. Each record was created in BRT (UTC-3) with its config's target field populated with `03/15/2026` (date-only configs) or `03/15/2026 12:00 AM` (DateTime configs). The DataID URLs are resolved at runtime.

If any record is missing, save it manually in BRT first and add its DataID URL to `SAVED_RECORDS` before running the corresponding child TC.

**P5 — Verify code path** (DevTools console, after any child TC loads a record):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify each child TC applies to V2 before continuing
```

**P6 — Per-child field lookup:** each child TC uses its own config filter against `VV.Form.VV.FormPartition.fieldMaster` to resolve the target field. Refer to the individual TC files.

---

## Test Steps

Run each child TC end-to-end and mark the row below. Each child is self-contained — its preconditions overlap with this umbrella's P1–P5 but repeat them for tester independence.

| #   | Child TC                                                             | Config                                                                              | Expected Result                                                   | ✓   |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --- |
| 1   | [tc-11-A-save-BRT-load-IST.md](tc-11-A-save-BRT-load-IST.md)         | A (date-only)                                                                       | Raw `"2026-03-15"` preserved; GFV identical (no transformation)   | ☐   |
| 2   | [tc-11-B-save-BRT-load-IST.md](tc-11-B-save-BRT-load-IST.md)         | B (date-only + ignoreTZ)                                                            | Raw `"2026-03-15"` preserved; GFV identical                       | ☐   |
| 3   | [tc-11-C-save-BRT-load-IST.md](tc-11-C-save-BRT-load-IST.md)         | C (DateTime)                                                                        | Raw `"2026-03-15T00:00:00"` preserved; GFV re-interpreted as IST  | ☐   |
| 4   | [tc-11-D-save-BRT-load-IST.md](tc-11-D-save-BRT-load-IST.md)         | D (DateTime + ignoreTZ)                                                             | Raw `"2026-03-15T00:00:00"` preserved; GFV adds fake `.000Z`      | ☐   |
| 5   | [tc-11-E-save-BRT-load-IST.md](tc-11-E-save-BRT-load-IST.md)         | E (legacy date-only)                                                                | Raw `"2026-03-15"` preserved; legacy GFV identical                | ☐   |
| 6   | [tc-11-F-save-BRT-load-IST.md](tc-11-F-save-BRT-load-IST.md)         | F (legacy date-only + ignoreTZ)                                                     | Raw `"2026-03-15"` preserved; legacy GFV identical                | ☐   |
| 7   | [tc-11-G-save-BRT-load-IST.md](tc-11-G-save-BRT-load-IST.md)         | G (legacy DateTime)                                                                 | Raw `"2026-03-15T00:00:00"` preserved; legacy GFV returns raw     | ☐   |
| 8   | [tc-11-H-save-BRT-load-IST.md](tc-11-H-save-BRT-load-IST.md)         | H (legacy DateTime + ignoreTZ)                                                      | Raw `"2026-03-15T00:00:00"` preserved; legacy bypasses FORM-BUG-5 | ☐   |
| 9   | Confirm browser timezone (DevTools console, during any child reload) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns `"2026-03-14T18:30:00.000Z"` | — confirms IST active                                             | ☐   |

> All eight children must PASS independently before the umbrella slot can be marked PASS. If any child fails, the umbrella fails until the child is re-run and passes.

---

## Fail Conditions

**FAIL-1 (Any child fails raw preservation):** one or more of the eight child TCs returns raw other than the saved value.

- Interpretation: cross-TZ load corrupts the stored date for at least one config — contradicts the FORM-BUG-7 code audit, which locates the day-shift at input/save, not load. Record which child(ren) failed and their observed raw values.

**FAIL-2 (Config D GFV does not carry fake `.000Z`):** the Config D child (`11-D-save-BRT-load-IST`) passes but its GFV no longer appends `.000Z` to the raw value.

- Interpretation: FORM-BUG-5 behavior changed between runs — re-run `12-utc-0-control` and `11-D-concurrent-IST-edit` to confirm the bug still reproduces.

**FAIL-3 (Wrong timezone):** Step 9 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active. Each child TC documents its V1-baselined expected values; V2 behavior may differ for Configs C/D and must be re-validated per child before claiming PASS.

---

## Related

| Reference              | Location                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `11-save-BRT-load-IST`                                   |
| Child TCs (A–H)        | `tc-11-{A..H}-save-BRT-load-IST.md` — linked in the Test Steps table above |
| Sibling cross-TZ tests | `tc-11-save-IST-load-BRT.md`, `tc-11-roundtrip-cross.md`                   |
| FORM-BUG-5 analysis    | `analysis/bug-5-fake-z-drift.md` — Config D GFV fake-Z mechanism           |
| FORM-BUG-7 analysis    | `analysis/bug-7-wrong-day-utc-plus.md` — fires at input, not load          |
| Saved records catalog  | `testing/fixtures/vv-config.js` — `SAVED_RECORDS` keys `cat3-{A..H}-BRT`   |
| Field config reference | `matrix.md` — Field Configurations table                                   |
