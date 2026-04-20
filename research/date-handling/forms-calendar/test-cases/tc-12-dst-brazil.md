# TC-12-dst-brazil — Config D, DST Edge Case, BRT: structurally untestable (Brazil has no DST since 2019)

## Nature

**SKIP slot** — cannot be tested on any supported timezone because Brazil abolished DST in 2019 (Decreto Federal nº 9.772, 2019-04-25), and no IANA `America/*` zone with active DST is in scope for this matrix. This file exists to record the non-test rationale, ensure the matrix slot is not silently ignored, and point readers to the nearest live equivalents (`12-dst-transition`, `12-dst-US-PST`).

Do not run as a test. Close the matrix row as `SKIP` with this file as evidence.

## Environment Specs

| Parameter               | Required Value                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                               |
| **System Timezone**     | N/A — no live Brazilian DST exists. `America/Sao_Paulo` has had no DST since 2019.     |
| **Platform**            | VisualVault FormViewer, any build                                                      |
| **VV Code Path**        | V1 or V2 — not exercised                                                               |
| **Target Field Config** | Config D — `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false` (matrix anchor) |
| **Scenario**            | Intended: round-trip across the Brazilian DST transition. Reality: no transition.      |

---

## Why This Slot Is Unreachable

The original matrix intent was to reproduce FORM-BUG-5 drift across a DST boundary for Brazilian users — symmetric to `12-dst-US-PST` (US spring-forward) but in BRT. This requires the local OS clock to cross a DST transition while the browser holds a field value.

- **Brazil abolished DST in 2019.** `America/Sao_Paulo` has had constant `-03:00` offset year-round since Feb 2019. The IANA tzdata file still carries the historical transitions, but no future transition is scheduled.
- **No other `America/*` zone is in scope.** The matrix targets BRT, IST, and UTC+0 as first-class timezones; adding another Americas zone just to hit a DST transition adds a new variable (offset magnitude) without teaching anything new about Brazil.
- **`12-dst-US-PST` already covers the DST-transition mechanism** for an Americas negative-offset zone. Its FAIL mode (DST jump compounding FORM-BUG-5) generalizes to any region that would observe DST; re-running it under `America/Sao_Paulo` with a historical pre-2019 date would require tzdata rollback, which is not a supported test environment.

Running this slot against any other DST-observing zone would change the meaning of "Brazil DST" and should be recorded as a different matrix ID, not as this one.

---

## Preconditions

None — no test is run. For completeness, if a future DST rule is reinstated in Brazil, re-scope this slot as follows:

1. Wait for a published DST rule change in `tzdata` for `America/Sao_Paulo`.
2. Convert this TC into a live test following the `12-dst-US-PST` pattern, with input date set to the transition local-clock-jump moment.
3. Promote the matrix row from SKIP to PENDING and re-link Evidence.

---

## Test Steps

None. This slot is not executed.

---

## Fail Conditions

**FAIL-1 (Someone ran the slot anyway):** a run file exists under `runs/tc-12-dst-brazil-run-*.md`.

- Interpretation: the SKIP rationale was ignored. Archive the run file with a note and keep the slot SKIP unless `tzdata` has a new Brazilian DST rule.

**FAIL-2 (Brazil reinstates DST):** a future `tzdata` release introduces a DST rule for `America/Sao_Paulo`.

- Interpretation: this TC is no longer SKIP. Follow the conversion steps in "Preconditions" to turn it into a live test.

---

## Related

| Reference                      | Location                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Matrix row                     | `matrix.md` — row `12-dst-brazil`                                                                    |
| Sibling: BRT non-DST control   | [tc-12-dst-transition.md](tc-12-dst-transition.md) — confirms no DST anomaly under BRT               |
| Sibling: Americas DST analogue | [tc-12-dst-US-PST.md](tc-12-dst-US-PST.md) — US spring-forward DST jump + FORM-BUG-5                 |
| FORM-BUG-5 analysis            | `analysis/bug-5-fake-z-drift.md` — the underlying drift mechanism that a DST boundary would compound |
| Regulatory reference           | Decreto Federal nº 9.772 (2019-04-25) — abolished DST in Brazil                                      |
