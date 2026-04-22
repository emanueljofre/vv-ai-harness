# Scheduled Processes — Date-Handling Test Matrix

Methodology and test slot definitions for scheduled process (SP) date-handling investigation.

**Status:** **New as of 2026-04-20** — no execution data yet. All slots PENDING. This matrix was created in response to the Central Admin exploration revealing SP-related date settings (Service Tasks, harness Scripting Server URL, Customer TZ propagation) not covered elsewhere.

**Execution results**: See `projects/{customer}/testing/date-handling/scheduled-processes/status.md` once established per environment.

Total slots: 14 (all PENDING — backlog)

**Scope boundary**: this matrix covers **date-related SP behavior only**. General SP execution mechanics (response.json, postCompletion, platform HTTP timeout, log discovery) are documented in the archived [`../_archive/scheduled-process-logs/`](../_archive/scheduled-process-logs/) investigation and not repeated here.

---

## Scope

- SP trigger firing window — which TZ decides "now" for cron-style SP schedules
- `DateTime.Now` / `GETDATE()` inside SP script bodies (cross-ref WS-13 for generic scripts)
- Service Task scheduled jobs (`Reindex suspect documents`, `Document Archive`, `User Expiration`, `Warning Task Escalation`, `Deadline Task Escalation`) — firing window TZ semantics
- Interaction between `Is Sandbox Server: false` (Other section) and SP firing — do sandboxes fire on the same schedule?
- Harness routing — on vv5dev, SPs hit `https://nodejs-preprod.visualvault.com` (Other → Scripting Server Url). Timestamps produced there may use a different TZ than the customer.

Out of scope (tracked elsewhere):

- SP log parsing, timeout classification, response.json vs postCompletion → [`../_archive/scheduled-process-logs/`](../_archive/scheduled-process-logs/)
- Scripts invoked via form buttons (not scheduled) → [`../web-services/matrix.md`](../web-services/matrix.md)
- Workflow escalation SPs that fire based on date thresholds → [`../workflows/matrix.md § WF-3`](../workflows/matrix.md)

---

## ID Convention

SP test IDs use the format `sp-{category}-{scenario}` (e.g. `sp-1-midnight-utc`, `sp-2-getdate-brt`).
Platform-scope suffix applies: `sp-1-midnight.custTZ-UTC`, `sp-3-archive.custTZ-BRT`. Scope tokens per [`forms-calendar/matrix.md § Platform Scope`](../forms-calendar/matrix.md#platform-scope).

---

## Platform Scope Dependencies

| Setting                                          | Location                                | Default (vv5dev)                         | Affects                                        |
| ------------------------------------------------ | --------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Customer Time Zone                               | Customer Details → Time Zone            | UTC (vv5dev) / BRT (vvdemo)              | All: which TZ "now" resolves to                |
| `Scripting Server Url`                           | Configuration Sections → Other          | `https://nodejs-preprod.visualvault.com` | Where SP script bodies execute                 |
| `Is Sandbox Server`                              | Configuration Sections → Other          | ☐                                        | May gate whether SPs actually fire             |
| `Enable Server Scripting`                        | Configuration Sections → Other          | ☑                                        | Master enable for SP execution                 |
| `Days to Retain {Exception,Info,Email,LDAP} Log` | Configuration Sections → General → Logs | 1/2/30/30                                | Log retention affects what SP runs are visible |
| `Audit Log Purge Options` (XML)                  | Configuration Sections → Service Tasks  | Per-category days                        | Purge timing (itself an SP)                    |
| `Job Status Cache Seconds`                       | Configuration Sections → Service Tasks  | 60                                       | SP-status UI lag                               |
| Process Server Locations (XML)                   | Configuration Sections → Server Farm    | `net.tcp://localhost:8790 ...`           | Which server runs SP jobs                      |

---

## Coverage Summary

| Category                                            | Total  | Priority | Method                                           |
| --------------------------------------------------- | :----: | :------: | ------------------------------------------------ |
| SP-1. SP Trigger Firing Window                      |   4    |    P1    | Create SP with daily schedule, observe fire time |
| SP-2. `DateTime.Now` / `GETDATE()` inside SP Script |   4    |    P1    | SP script returns server clock                   |
| SP-3. Service Task Firing Window                    |   4    |    P2    | Observe built-in Service Tasks                   |
| SP-4. Harness vs VV-Server TZ Disagreement          |   2    |    P2    | Script captures both TZs                         |
| **TOTAL**                                           | **14** |          |                                                  |

---

## Execution Order

| Step | Category | Rationale                                                             |
| :--: | -------- | --------------------------------------------------------------------- |
|  1   | SP-2     | Capture `DateTime.Now` baseline first — establishes harness-side TZ   |
|  2   | SP-4     | Cross-check harness TZ vs VV-server expectation                       |
|  3   | SP-1     | Trigger firing window — longer observation loop                       |
|  4   | SP-3     | Service Tasks — hardest to observe (built-in schedules, less control) |

---

## SP-1. SP Trigger Firing Window

> **Status (2026-04-22): DEFERRED** — not part of the first execution wave. Firing-window observation requires a multi-hour window (≥24h for "daily at 02:00" slots) and cannot be validated via the synchronous `run-sp-test.js` runner. Planned execution path: deploy a minute-granular probe SP (`sp-1-hourly-*`) with a file- or log-based fire-time sink, observe ≥2 consecutive fires, then backfill the daily slots via manual spike. Tracking only — no blocker for SP-2/SP-4. Revisit after SP-2/SP-4 baseline lands.

**Question**: A Scheduled Process configured to run "daily at 02:00" — is "02:00" in Customer TZ, harness `TZ` env, or SQL OS TZ? This determines whether a Brazilian customer with `Customer TZ = BRT` has SPs firing at Brazilian wall-clock 02:00 or UTC 02:00 (23:00 BRT previous day).

**Method**: Create a lightweight SP scheduled "daily at 02:00". Log the exact fire time. Compare against wall-clock in Customer TZ.

**Shape**: 2 Customer TZs × 2 schedule types (daily fixed time, hourly) = 4 slots.

| Test ID         | Customer TZ | Schedule Spec     | Expected fire (Customer TZ) | Hypothesis to falsify                       | Status  | Run Date | Evidence |
| --------------- | ----------- | ----------------- | --------------------------- | ------------------------------------------- | ------- | -------- | -------- |
| sp-1-daily-utc  | UTC         | Daily at 02:00    | 02:00 UTC wall-clock        | Customer TZ honored vs UTC default          | PENDING | —        | —        |
| sp-1-daily-brt  | BRT         | Daily at 02:00    | 02:00 BRT (05:00 UTC)       | If fires at 02:00 UTC → Customer TZ ignored | PENDING | —        | —        |
| sp-1-hourly-utc | UTC         | Every hour at :15 | :15 on every hour           | Verify TZ independence for short intervals  | PENDING | —        | —        |
| sp-1-hourly-brt | BRT         | Every hour at :15 | :15 on every hour           | Hourly should be TZ-agnostic; confirm       | PENDING | —        | —        |

> **Critical implication**: If Customer TZ is NOT honored, a customer expecting "start of business day" SPs may actually see them fire mid-afternoon. Document loudly if confirmed.
> **Prerequisite**: Need to confirm where SP schedule TZ is stored (likely in scheduledProcess metadata — extract from a test SP to verify).

---

## SP-2. `DateTime.Now` / `GETDATE()` inside SP Script

**Question**: Inside the SP body, when the script calls `DateTime.Now` (Node.js) or `GETDATE()` (SQL), which TZ does it resolve to? Paired with WS-13 (same question for non-SP scripts — answer _should_ be the same).

**Method**: Write a tiny SP script that returns `DateTime.Now.ToString()` + `process.env.TZ` + a SQL call to `SELECT GETDATE()`. Run it; compare to Customer TZ, harness TZ, and SQL OS TZ.

**Shape**: 2 Customer TZs × 2 mechanisms (Node, SQL) = 4 slots.

| Test ID          | Customer TZ | Mechanism                              | Expected value (format template)                                                                                                               | What we learn                                                                  | Status  | Run Date | Evidence |
| ---------------- | ----------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- | -------- | -------- |
| sp-2-now-utc     | UTC         | `new Date().toISOString()`             | `<YYYY-MM-DDTHH:mm:ss.SSSZ>` = current UTC wall-clock ± ≤2s run latency                                                                        | `toISOString()` is TZ-invariant — compare vs `toString()` and `process.env.TZ` | PENDING | —        | —        |
| sp-2-now-brt     | BRT         | `new Date().toISOString()`             | `<YYYY-MM-DDTHH:mm:ss.SSSZ>` = current UTC wall-clock (identical shape to utc slot)                                                            | Customer TZ does NOT shift `toISOString()` output                              | PENDING | —        | —        |
| sp-2-getdate-utc | UTC         | SQL `GETDATE()` via `customQuery.post` | `<YYYY-MM-DD HH:mm:ss.SSS>` in SQL OS TZ (no TZ marker — naive local)                                                                          | Confirm SQL OS independence from Customer TZ                                   | PENDING | —        | —        |
| sp-2-getdate-brt | BRT         | SQL `GETDATE()` via `customQuery.post` | `<YYYY-MM-DD HH:mm:ss.SSS>` in SQL OS TZ — **byte-identical shape to sp-2-getdate-utc** when probed within the same second (shared SQL server) | Confirm SQL OS is shared across customers — Customer TZ does not reach SQL     | PENDING | —        | —        |

> **Expected finding (hypothesis)**: `new Date().toISOString()` always returns UTC wall-clock regardless of Customer TZ or harness `process.env.TZ` (Node spec-guaranteed). The companion `new Date().toString()` output WILL shift with `process.env.TZ` (captured in SP-4). `GETDATE()` follows SQL OS TZ only — same SQL server on both customers → both `sp-2-getdate-*` slots return a naive datetime in the same TZ. If confirmed, **Customer TZ is effectively display-only** for server-generated timestamps in SPs — matching the expected WS-13 finding.
>
> **Format conventions**:
>
> - Node output: ISO-8601 with millisecond precision and trailing `Z` (e.g. `2026-04-22T14:35:12.418Z`).
> - SQL output: SQL Server default `datetime` ToString — `YYYY-MM-DD HH:mm:ss.SSS`, no TZ marker, representing naive local time of the SQL OS (likely UTC-7 on vv5dev's DB host — needs confirmation).
>
> **Tolerance**: ±2 seconds between capture and expected, to absorb cron-jitter and network round-trip.

#### V2-scope baseline (EmanuelJofre-vv5dev, DB-scope "Use Updated Calendar Control Logic" = ON)

V2 expected values are **identical to V1** — `useUpdatedCalendarValueLogic` is Forms-only (confirmed in [`../forms-calendar/CLAUDE.md`](../forms-calendar/CLAUDE.md) and validated 2026-04-22 via WS V1/V2 parity run, `b18dbfdb`/`f36b65dd`). SP script execution does not traverse the Angular calendar pipeline, so the toggle cannot affect `DateTime.Now` or `GETDATE()` output. Listed below for parity tracking / regression-run completeness only.

| Test ID             | Customer TZ | Mechanism                  | Expected (V2 ≡ V1)                                              | Note                               | Status  | Run Date | Evidence |
| ------------------- | ----------- | -------------------------- | --------------------------------------------------------------- | ---------------------------------- | ------- | -------- | -------- |
| sp-2-now-utc.V2     | UTC         | `new Date().toISOString()` | `<YYYY-MM-DDTHH:mm:ss.SSSZ>` (identical to sp-2-now-utc)        | Parity slot — toggle is Forms-only | PENDING | —        | —        |
| sp-2-now-brt.V2     | BRT         | `new Date().toISOString()` | `<YYYY-MM-DDTHH:mm:ss.SSSZ>` (identical to sp-2-now-brt)        | Parity slot — toggle is Forms-only | PENDING | —        | —        |
| sp-2-getdate-utc.V2 | UTC         | SQL `GETDATE()`            | `<YYYY-MM-DD HH:mm:ss.SSS>` SQL OS TZ (identical to V1 sibling) | Parity slot — toggle is Forms-only | PENDING | —        | —        |
| sp-2-getdate-brt.V2 | BRT         | SQL `GETDATE()`            | `<YYYY-MM-DD HH:mm:ss.SSS>` SQL OS TZ (identical to V1 sibling) | Parity slot — toggle is Forms-only | PENDING | —        | —        |

---

## SP-3. Service Task Firing Window

> **Status (2026-04-22): DEFERRED — document-only.** Service Task schedules are built-in and uncontrollable; observation windows are ≥24h and not suitable for regression-run automation. Planned execution path: one-shot manual spike per Service Task (set up an expiration/archive condition at a known Customer-TZ wall-clock, observe the next fire, document the TZ behaviour in this matrix). No status rollup or generator support expected — evidence lives in session-bound `results.md` entries under the project testing folder.

**Question**: Central Admin Service Tasks (`Document Archive`, `Document Expiration`, `Document Review`, `Reindex suspect documents`, `User Expiration`, `User Password Expiration`, `Warning Task Escalation`, `Deadline Task Escalation`, etc.) run on schedules we don't control directly. Do they fire in Customer TZ or another TZ? And does Customer TZ change mid-day affect the next firing?

**Method**: Pick one observable Service Task (e.g., `Document Archive` — easy to surface via doc state change). Set a doc to expire at a known wall-clock moment. Observe when the archive action fires.

**Shape**: 2 Service Tasks × 2 Customer TZs = 4 slots.

| Test ID           | Service Task     | Customer TZ | Setup                                          | Expected fire time                         | Status  | Run Date | Evidence |
| ----------------- | ---------------- | ----------- | ---------------------------------------------- | ------------------------------------------ | ------- | -------- | -------- |
| sp-3-archive-utc  | Document Archive | UTC         | Doc expires at 2026-03-15T01:00 (Customer TZ)  | Archive fires after 01:00 UTC wall-clock   | PENDING | —        | —        |
| sp-3-archive-brt  | Document Archive | BRT         | Same spec                                      | Archive fires after 01:00 BRT (04:00 UTC)? | PENDING | —        | —        |
| sp-3-user-exp-utc | User Expiration  | UTC         | User expires at 2026-03-15T01:00 (Customer TZ) | User disabled after 01:00 UTC              | PENDING | —        | —        |
| sp-3-user-exp-brt | User Expiration  | BRT         | Same                                           | User disabled after 01:00 BRT              | PENDING | —        | —        |

> **Caveat**: Service Task schedules may be daily (not minute-granular). Observation window may be 24h+.
> **Cross-reference**: [Workflows WF-3](../workflows/matrix.md) — escalation-specific Service Tasks.

---

## SP-4. Harness vs VV-Server TZ Disagreement

**Question**: The `Scripting Server Url` on vv5dev points at `https://nodejs-preprod.visualvault.com` — a cloud harness likely running with `TZ=UTC` (AWS default). Meanwhile the VV ASP.NET server runs on Windows with its own OS TZ. These may disagree with each other AND with Customer TZ. What does a date-producing SP return?

**Method**: SP script logs all three: `new Date().toString()`, `process.env.TZ`, and a SQL `GETDATE()` roundtrip. Compare.

**Shape**: 2 slots — one per Customer TZ.

| Test ID            | Customer TZ | Script logs                                             | Expected values (per log field)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Status  | Run Date | Evidence |
| ------------------ | ----------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | -------- |
| sp-4-tz-report-utc | UTC         | Node TZ, SQL GETDATE, Customer TZ (from getUserContext) | `process.env.TZ`: `"UTC"` if preprod/AWS (hypothesis) — may be unset (then Intl default). `new Date().toString()`: `<EEE MMM DD YYYY HH:mm:ss GMT±HHMM (Zone)>` reflecting `process.env.TZ` — e.g. `"Wed Apr 22 2026 14:35:12 GMT+0000 (Coordinated Universal Time)"`. `new Date().toISOString()`: `<YYYY-MM-DDTHH:mm:ss.SSSZ>` UTC. `GETDATE()`: `<YYYY-MM-DD HH:mm:ss.SSS>` in SQL OS TZ (likely UTC-7 for vv5dev DB host). `getUserContext().customerTimeZone` (or equivalent): `"UTC"` / offset `0`.       | PENDING | —        | —        |
| sp-4-tz-report-brt | BRT         | Same triple as utc slot                                 | `process.env.TZ`: same harness value as utc slot (same preprod node) — NOT `"America/Sao_Paulo"` unless run locally. `new Date().toString()`: identical shape to utc slot (harness TZ is shared across customers). `new Date().toISOString()`: `<YYYY-MM-DDTHH:mm:ss.SSSZ>` UTC — matches utc slot within ±2s. `GETDATE()`: byte-identical to sp-4-tz-report-utc at same moment (shared SQL). `getUserContext().customerTimeZone`: `"America/Sao_Paulo"` / offset `-3` (or VV's enum — confirm via first run). | PENDING | —        | —        |

> **Key question**: Does the harness's `TZ` env var differ between the vv5dev preprod instance and the vvdemo instance? If yes, the TZ discrepancy between a customer's scripts running on "the same" harness is actually three-fold (Customer TZ, harness TZ, SQL OS TZ). Document for customer-support playbooks.
>
> **Format conventions** (same as SP-2):
>
> - `new Date().toString()` — JS default, zone-aware: `<EEE MMM DD YYYY HH:mm:ss GMT±HHMM (zone-name)>`.
> - `new Date().toISOString()` — always UTC, `<YYYY-MM-DDTHH:mm:ss.SSSZ>`.
> - `GETDATE()` — SQL default, naive: `<YYYY-MM-DD HH:mm:ss.SSS>`.
> - `process.env.TZ` — IANA zone string or empty.
> - `getUserContext()` Customer TZ field name and value format TBD — first run should capture the exact key/value shape; replace the template above with the observed canonical string.
>
> **Assumptions flagged for validation**: (a) vv5dev preprod harness has `TZ=UTC` — unverified, first run supplies evidence; (b) SQL OS TZ is UTC-7 (Mountain, Phoenix) shared across customers — unverified; (c) the `getUserContext` helper exposes Customer TZ under a key like `customerTimeZone` or `timezone` — exact key TBD.

#### V2-scope baseline (EmanuelJofre-vv5dev, DB-scope "Use Updated Calendar Control Logic" = ON)

V2 expected values are **identical to V1** — `useUpdatedCalendarValueLogic` is Forms-only; SP script execution bypasses the Angular calendar pipeline. Listed for parity tracking / regression-run completeness only.

| Test ID               | Customer TZ | Script logs           | Expected (V2 ≡ V1)                   | Note                               | Status  | Run Date | Evidence |
| --------------------- | ----------- | --------------------- | ------------------------------------ | ---------------------------------- | ------- | -------- | -------- |
| sp-4-tz-report-utc.V2 | UTC         | Same triple as utc V1 | Byte-identical to sp-4-tz-report-utc | Parity slot — toggle is Forms-only | PENDING | —        | —        |
| sp-4-tz-report-brt.V2 | BRT         | Same triple as brt V1 | Byte-identical to sp-4-tz-report-brt | Parity slot — toggle is Forms-only | PENDING | —        | —        |

---

## Open Gaps & Backlog

All 14 slots above are in Tier 1-2 backlog (see [`forms-calendar/matrix.md § Open Gaps § G26`](../forms-calendar/matrix.md#open-gaps--backlog)). Additional:

| ID   | Gap                                                                        | Close by                  | Priority |
| ---- | -------------------------------------------------------------------------- | ------------------------- | -------- |
| SPG1 | DST transition fire-time behavior (spring-forward / fall-back)             | DST-scoped SP-1 additions | P3       |
| SPG2 | `Is Sandbox Server` flag — does turning it on gate SP firing?              | Spot-check                | P3       |
| SPG3 | SP log date display under customer Culture (cross-ref Dashboards DB-9)     | Extend SP-3               | P3       |
| SPG4 | `Distributed Cache Enabled` off/on — does it affect TZ cache invalidation? | Defer until perf concerns | P4       |
| SPG5 | `Audit Log Purge Options` XML — TZ used for "days=360" retention math      | Add to SP-3               | P3       |

---

## Relationship to Existing Tests

| Existing matrix / archive          | What it covers                                                                        | What SP adds                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `_archive/scheduled-process-logs/` | Platform execution mechanics (response.json, postCompletion, timeouts, log discovery) | Date/TZ semantics specifically                            |
| WS-9 / WS-13                       | `DateTime.Now` in generic scripts                                                     | Same mechanism, but inside an SP-triggered script context |
| Forms Cat 19                       | Server-generated timestamps on form save                                              | Server-generated timestamps on SP schedules               |
| Workflows WF-3                     | Workflow-specific escalation Service Tasks                                            | General Service Task firing semantics                     |

SP-2 and WS-13 ask the same question. The answer **must** match — if it doesn't, there's a platform-internal inconsistency between SP-triggered and form-triggered script execution paths.
