# FORM-BUG-1: Calendar fields display and save the wrong date/time when a form is opened

## Metadata


- **Environment:** WA Department of Natural Resources (WADNR) — https://vv5dev.visualvault.com (customer alias `WADNR`, database `fpOnline`)
- **Build / platform version:** progVersion 6.1.20240711.1 · buildNumber 20260404.1 · codeVersion v0.5.1 · dbVersion 3041 (build date 2026-04-04)
- **Browser / OS:** Not browser-specific.
- **User role:** Any authenticated internal user. No role-specific factor.
- **Timezone:** Any non-UTC browser timezone. At UTC+0 the shift is zero and the defect is not visible, though still present in the code path.
- **Frequency:** Always (deterministic when the trigger conditions are met).
- **Severity:** **HIGH** — Incorrect date/time values are displayed and persisted silently when a form is opened and saved again.

## Summary

When a user opens a form that contains an affected calendar field, the date or time shown in the field is not the value that was stored. It appears shifted by the user's browser timezone offset from UTC — a user in Brazil sees times three hours earlier, a user in India sees them five and a half hours later. When the stored time is near UTC midnight, the date component can also roll forward or backward by one calendar day.

The user does not see any warning. If the form is saved — even without touching the calendar field — the shifted value is written back to the database, silently replacing the original. The shift happens **once**, on the first form open after the value was written: subsequent opens and saves of the same record do not move the value any further. The original value, however, is gone.

## Steps to Reproduce

Preconditions, test data, and the Expected-vs-Actual rule below are shared by all three reproductions.

### Preconditions

- **Access:** a user account on WADNR / vv5dev (https://vv5dev.visualvault.com).
- **Browser setup:** system timezone set to any non-UTC zone. Examples in this report use **Arizona (America/Phoenix, MST, UTC−7, no DST)**. Any other non-UTC zone reproduces the bug with a different shift amount.
- **Platform setup:** two test harnesses exist on WADNR:
    - `zzzDate Test Harness` (templateId `ff59bb37-b331-f111-830f-d3ae5cbd0a3d`) — used by Reproductions A and B.
    - `zzzTarget Date Test Harness` (templateId `3f3a0b1a-4834-f111-8310-f323cafecf11`) — used by Reproduction C. Same field layout as the first harness, plus `Enable Listener` checked on every calendar field.

### Test data

Calendar-field settings on `zzzDate Test Harness` for the three fields referenced below (Form Designer → Miscellaneous panel):

| Field | Enable Initial Value | Initial Value | Enable Time | Ignore Timezones | Use Legacy Control |
|-------|:--------------------:|---------------|:-----------:|:----------------:|:------------------:|
| `Field5`  | ☐ false | (n/a — field is empty by template) | ☑ true | ☑ true | ☐ false |
| `Field16` | ☑ true  | `03/01/2026` (specific date)       | ☑ true | ☑ true | ☐ false |
| `Field18` | ☑ true  | Current Date                       | ☑ true | ☑ true | ☐ false |

`zzzTarget Date Test Harness` has the same three fields with the same settings, plus `Enable Listener` checked on every calendar field.

### How to read Expected vs Actual

- **Expected** is the same value for every browser timezone — what a user would reasonably assume the form is going to display and save.
- **Actual** is the Expected value shifted by the browser's UTC offset. Offsets west of UTC shift the value earlier, offsets east of UTC shift it later. When the shift crosses midnight, the calendar date rolls back or forward one day.
- Formula: **actual = expected + (browser UTC offset)**.
- At a UTC+0 browser the shift is zero — the defect is not visible, though still present in the code path.
- Concrete per-timezone values for all three reproductions are listed in the "Concrete values by timezone" table at the end of this section.

### Reproduction A — Template `Initial Value` defaults (`Field16` and `Field18`)

Setting: a form template is configured so that a calendar field auto-populates on form open with an `Initial Value` — either a specific date or the `Current Date` option. 

1. Fill in a new, empty form instance of `zzzDate Test Harness` in the browser (not an existing record).
2. Observe the value displayed in `Field16`.
3. Observe the value displayed in `Field18`.
4. Click Save.
5. Reopen the same saved record.
6. Observe `Field16` and `Field18` again.

**Expected result:**
- After step 2: `Field16` shows `03/01/2026 12:00:00 AM` (the configured `Initial Value`).
- After step 3: `Field18` shows today's date at `12:00:00 AM` (e.g., on 2026-03-15 it shows `03/15/2026 12:00:00 AM`) — the value produced by `Initial Value = Current Date`.
- After step 6: both fields show the same values as after steps 2–3; saving did not change the stored values.

**Actual result:** both fields display the Expected value shifted by the browser's UTC offset. Step 4 (Save) commits the shifted value to the database, overwriting the original `Initial Value` / `Current Date` resolution. Further open/save cycles do not move the values further — the corruption is one-time, but the originals are gone.

### Reproduction B — API-written value on a base field (`Field5`)

Setting: a web service or external integration creates a form record via the platform's REST API. This is the workflow that triggered the original WADNR report (Freshdesk #124697).

1. Issue a `POST /api/v1/formtemplates/ff59bb37-b331-f111-830f-d3ae5cbd0a3d/forms` request (e.g., via `vvClient.forms.postForms`) with `Field5` set to `03/15/2026 12:00:00 PM`. The submission format does not matter — `03/15/2026 12:00:00 PM`, `2026-03-15T12:00:00`, `2026-03-15T12:00:00Z`, `2026-03-15T12:00:00.000Z`, and every other accepted format produce the same outcome below.
2. Confirm via a `GET` against the same endpoint (or by inspecting the database, if accessible) that `Field5` was stored as `03/15/2026 12:00:00 PM`.
3. Open the newly created record in the browser.
4. Observe the value displayed in `Field5`.
5. Click Save.
6. Reopen the same record, or re-query the API.

**Expected result:**
- After step 4: `Field5` shows `03/15/2026 12:00:00 PM` (the value just written through the API).
- After step 6: `Field5` still shows `03/15/2026 12:00:00 PM`; the stored value is unchanged.

**Actual result:** `Field5` displays the Expected value shifted by the browser's UTC offset. Step 5 (Save) commits the shifted value to the database, overwriting the original API-written value. Further open/save cycles do not move the value further.

### Reproduction C — Cross-form links with date URL parameters

Setting: a button, workflow step, or deep link opens a second form and passes a date/time value into one of its fields through a URL query parameter. This is the mechanism behind `VV.FORM.GLOBAL.FillinAndRelateForm` chains and custom deep links. The receiving field must have `Enable Listener` checked for it to accept a URL-parameter value; all calendar fields on `zzzTarget Date Test Harness` are configured this way, so no extra setup is required.

1. Construct a URL that opens `zzzTarget Date Test Harness` with a UTC-marked date/time value (any value ending with `Z`) in a query parameter targeted at `Field5`. Example values: `2026-03-15T12:00:00Z`, `2026-03-15T14:30:00Z`, or `2026-03-15T00:00:00Z`.
2. Navigate to the URL in the browser.
3. Observe the value displayed in `Field5` on the target form.
4. Click Save.
5. Reopen the saved record.
6. Observe `Field5` again.

**Expected result:**
- After step 3: `Field5` shows the wall-clock time encoded in the URL value — for input `2026-03-15T12:00:00Z`, the field shows `03/15/2026 12:00:00 PM` in every browser timezone, because the field has `Ignore Timezones` checked.
- After step 6: the stored value still matches what was shown in step 3; saving did not change it.

**Actual result:** at step 3, `Field5` already displays a shifted value — the shift happens on form open, before the user clicks anything. The displayed value is the Expected value shifted by the browser's UTC offset. Step 4 (Save) commits that shifted value to the database. After step 6 (reopen), the value is unchanged — the corruption is one-time, but the value passed in the URL is gone.

The shift applies at any time of day. A UTC-midnight input (`00:00:00Z`) produces the most visible symptom because the shift crosses the date boundary and rolls the calendar day back (for negative offsets) or forward (for positive offsets). Chained workflows (form A → form B → form C via FillinAndRelate) can accumulate shifts across hops.

### Concrete values by timezone

Inputs match the reproductions above:

- **A** — `Field16` uses `Initial Value = 03/01/2026 12:00:00 AM`; `Field18` uses `Current Date` with today = 2026-03-15.
- **B** — `Field5` written via the API as `03/15/2026 12:00:00 PM`.
- **C** — `Field5` received via URL parameter `2026-03-15T00:00:00Z`.

Expected values (same in every timezone): A — `Field16` → `03/01/2026 12:00:00 AM`, `Field18` → `03/15/2026 12:00:00 AM`. B — `Field5` → `03/15/2026 12:00:00 PM`. C — `Field5` → `03/15/2026 12:00:00 AM` (wall-clock time from the URL, with `Ignore Timezones` checked).

| Timezone | Offset | A — `Field16` actual | A — `Field18` actual | B — `Field5` actual | C — `Field5` actual |
|----------|:------:|----------------------|----------------------|---------------------|---------------------|
| Arizona (MST) | −7h | `02/28/2026 5:00:00 PM` | `03/14/2026 5:00:00 PM` | `03/15/2026 5:00:00 AM` | `03/14/2026 5:00:00 PM` |
| New York (EST) | −5h | `02/28/2026 7:00:00 PM` | `03/14/2026 7:00:00 PM` | `03/15/2026 7:00:00 AM` | `03/14/2026 7:00:00 PM` |
| São Paulo (BRT) | −3h | `02/28/2026 9:00:00 PM` | `03/14/2026 9:00:00 PM` | `03/15/2026 9:00:00 AM` | `03/14/2026 9:00:00 PM` |
| London (GMT) | 0 | `03/01/2026 12:00:00 AM` | `03/15/2026 12:00:00 AM` | `03/15/2026 12:00:00 PM` | `03/15/2026 12:00:00 AM` |
| Madrid (CET) | +1h | `03/01/2026 1:00:00 AM` | `03/15/2026 1:00:00 AM` | `03/15/2026 1:00:00 PM` | `03/15/2026 1:00:00 AM` |
| Mumbai (IST) | +5:30h | `03/01/2026 5:30:00 AM` | `03/15/2026 5:30:00 AM` | `03/15/2026 5:30:00 PM` | `03/15/2026 5:30:00 AM` |



## Scope

- **Other users affected?** Yes. Any authenticated user opening a form instance that contains a calendar field with `Enable Time` and `Ignore Timezones` both checked, whenever the field's value was supplied by the public API, an `Initial Value` (specific date or `Current Date`), or a URL query parameter. Deterministic.
- **Other environments affected?** Yes. Identical behavior reproduced on the vvdemo development environment on the same platform build across 122 regression slots. The defect reproduces in every non-UTC browser timezone tested (BRT, IST, PST). It does **not** reproduce at UTC+0.
- **Workaround:**
    - **Reproduction B (API imports)** — values can be written through the legacy `forminstance/` endpoint instead of `postForms`; those values do not shift on form open. This is the mitigation currently in effect at WADNR for the migration from the legacy system. Caveat: `postForms` and `forminstance/` carry different timezone semantics on the read-back path (`postForms` marks values as UTC, `forminstance/` leaves them as wall-clock), so the workaround is only appropriate when every affected field on the target template is intended to represent wall-clock time (i.e., `Ignore Timezones` checked). A project that needs some fields to round-trip as true UTC timestamps and others as wall-clock values cannot simply route all writes to one endpoint — the correct choice is per-field, and in that situation only a platform-level fix resolves the defect for all callers.
    - **Reproductions A and C** — no viable customer-side workaround. Reconfiguring affected fields to a date-only type eliminates the time component but loses information.

## Root Cause
