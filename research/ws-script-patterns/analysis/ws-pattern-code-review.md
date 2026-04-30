# Code Review — `drafts/ws.js`

**File reviewed:** `research/ws-script-patterns/drafts/ws.js` (316 lines, with helpers + working `getForm` example)
**Reviewed against:** `scripts/templates/webservice-pattern.js` (current canonical), legacy server (`lib/VVRestApi/VVRestApiNodeJs/`), and the successor package [`visualvault-api@2.0.0`](https://github.com/VisualVault/vv-rest-api-node) (npm: `visualvault-api`, source repo: `VisualVault/vv-rest-api-node`).
**Date:** 2026-04-27 (sixth pass — after B1, M4, M5, H1, and L1 were applied)

---

## TL;DR

The skeleton is now **correct, forward-compatible, and validation-safe**. No blockers remain. The two highest-value items left are the **query-injection hazard** in `getFormRecords` (H2) and the **PII risk** from logging raw `ffCollection` (H3). After those, the issues are hygiene and one pattern-level decision about hoisting pure helpers.

The most important fixes, in order:

1. **H2** — `getFormRecords` interpolates user input into the query string (injection).
2. **H3** — `logEntry.parameters: ffCollection` logs raw form-field values on every request (PII).

| #   | Severity | Summary                                                                                                                                                                                |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H2  | High     | `getFormRecords` at L266 interpolates `filterValue` into the query string — quote breaks query / injection.                                                                            |
| H3  | High     | `logEntry.parameters: ffCollection` logs raw form-field values on every request (PII risk, carry-forward).                                                                             |
| M1  | Medium   | `getFormRecords` hardcodes filter on `[First Name]` but accepts a generic `filterValue` — abstraction mismatch.                                                                        |
| M2  | Medium   | Mixed promise styles — `.then()` chain in `getFormRecords` while the rest uses `await`.                                                                                                |
| M3  | Medium   | Pure helpers (`parseRes`, `checkMetaAndStatus`, `checkDataPropertyExists`, `checkDataIsNotEmpty`, `sanitizeLog`) are defined inside `main` — recreated per request, not unit-testable. |
| M6  | Medium   | Status never explicitly re-asserted to `"Success"` (carry-forward).                                                                                                                    |
| M7  | Medium   | Private API access `_httpHelper._sessionToken.{customerAlias,databaseAlias}` — verified forward-compatible into `visualvault-api@2.0.0`, but still a single-source-of-truth concern.   |
| L3  | Low      | `serializeValue` redefined inside `sanitizeLog` per call (carry-forward).                                                                                                              |
| L4  | Low      | `sanitizeLog` does not bound output size (carry-forward).                                                                                                                              |
| L5  | Low      | `getCredentials` returns placeholder strings with no guard (carry-forward).                                                                                                            |
| L6  | Low      | `userId: clientId` / `password: clientSecret` duplicates the secret across two field names (carry-forward).                                                                            |
| L7  | Low      | `formID` is misleading — `getFormRecords` returns an array of records, not a single ID.                                                                                                |
| L8  | Low      | Loose equality (`!=`, `==`) used in helpers — inconsistent with the rest of the code.                                                                                                  |
| L9  | Low      | `dataIsObject` trips for arrays too (`typeof [] === 'object'`); current code is correct but the naming hides intent.                                                                   |

> **Resolved since previous passes:** the three original blockers (dangling top-level code, undefined `sendEmail`, side-effecting call outside `try`); the `getBaseUrl()` forward-compat issue; the URL-parse crash; the missing helper toolbox; **B1** (`errorLog` → `output.errors`); **M4** (`try/catch/finally { return }` removed); **M5** (rethrow now carries `'Required fields are missing or invalid'`); **H1** (`checkDataIsNotEmpty` `null` guard restored); **L1** (header dates switched to ISO 8601); **L2** (`let logEntry` → `const`).

---

## Resolved (recent passes)

### B1. `errorLog.push(error.message)` — undefined identifier — **fixed**

The catch block now writes to `output.errors` (the array the rest of the script reads). Validation errors flow into the same place the outer gate at L288 inspects.

```js
} catch (error) {
  output.errors.push(error.message);
}
```

Option A (direct rename) was applied. The deeper structural issue that hid this bug (M4) is also resolved below.

### M4. `try/catch/finally { return }` swallowed errors — **fixed**

The `finally` block has been removed; `return fieldValue` now sits at the function's natural end. Any future exception thrown from inside the catch propagates up to the outer try/catch in `main` instead of being silently discarded. ESLint `no-unsafe-finally` no longer applies.

### H1. `checkDataIsNotEmpty` `null` guard — **fixed**

`dataIsObject` now short-circuits on `null`:

```js
const dataIsObject = vvClientRes.data !== null && typeof vvClientRes.data === 'object';
```

Matches the canonical at `webservice-pattern.js:239`. `checkDataIsNotEmpty` is now safe to call standalone (without `checkDataPropertyExists` in front of it) on responses where `data: null` is a legitimate "no results" outcome.

### L1. Header date format — **fixed**

`Date of Dev`, `Last Rev Date`, and the revision-notes example now use `YYYY-MM-DD` (ISO 8601) instead of the ambiguous `MM/DD/YYYY`.

### L2. `let logEntry` → `const` — **fixed**

`logEntry` is mutated property-by-property but never reassigned; declaring it `const` matches the pattern of the surrounding constants and prevents accidental reassignment.

### M5. Empty-message rethrow — **fixed**

```js
if (output.errors.length > 0) {
    throw new Error('Required fields are missing or invalid');
}
```

The bare `throw new Error()` now carries a real message. The catch-clause push at L304 (`output.errors.push(err.message)`) now contributes the string `'Required fields are missing or invalid'` to the response — a meaningful summary line alongside the per-field messages from `getFieldValueByName`.

**Behavior of the response payload after this change** — for a request missing `First Name`, callers now see:

```json
{
    "status": "Error",
    "errors": ["The field 'First Name' was not found.", "Required fields are missing or invalid"],
    "data": null
}
```

The summary + per-field detail combo is intentional and useful for downstream consumers categorizing failures. If a future maintainer wants strictly per-field errors with no summary, the canonical guard (`if (err.message) output.errors.push(err.message);`) plus a sentinel error (`throw new Error('__validation__')`) is the alternative — preserved here for reference but not currently applied.

---

## High

### H2. Query injection in `getFormRecords` (L266)

```js
const getFormsParams = {
  q: `[First Name] eq '${filterValue}'`,
  ...
};
```

`filterValue` arrives from `getFieldValueByName('First Name')`, which in turn came from the form-field collection — i.e., **caller-controlled input**. Any single quote inside the value breaks the query at minimum (`O'Brien` becomes `[First Name] eq 'O'Brien'` — a parse error). At worst, depending on how permissive the VV query parser is, this is a query-injection vector — a caller could craft a value like `' or [Status] eq 'Active` to broaden the filter.

**Fix:** escape single quotes (and ideally use VV's parameterised query support if it exists). At minimum:

```js
const safe = String(filterValue).replace(/'/g, "''");
const getFormsParams = { q: `[First Name] eq '${safe}'`, ... };
```

A comment in the template explaining why this matters would prevent the same bug from being copied into every project's WS scripts.

---

### H3. Logs the entire `ffCollection` on every request (L69) — **carry-forward**

```js
parameters: ffCollection,
```

`ffCollection` is `formFieldCollection` (`routes/scripts.js:74`); its `_ffColl` array contains **every form-field value the caller supplied**. `sanitizeLog` JSON-stringifies it and writes it to disk on every invocation. PII risk, log volume, internal-shape leak — same as before.

**Fix (forward-compatible with `visualvault-api@2.0.0`):** the new package exposes `FormFieldCollection.getFieldArray()` as public API. Use it now — works on legacy too because the legacy collection has `_ffColl` as the underlying array.

```js
// Legacy-compatible: read names through whichever API is available
const fieldNames = (typeof ffCollection.getFieldArray === 'function'
  ? ffCollection.getFieldArray()
  : ffCollection._ffColl || []
).map((f) => f.name);

let logEntry = {
  ...
  parameters: fieldNames,
  ...
};
```

If full values are needed for an investigation, gate them behind a debug flag and a redaction list.

---

## Medium

### M1. `getFormRecords` signature lies about its abstraction (L262)

```js
function getFormRecords(filterValue, templateName) {
  const getFormsParams = {
    q: `[First Name] eq '${filterValue}'`,    // ← always First Name
    ...
  };
  ...
}
```

The function takes a generic `filterValue` and `templateName`, but the query field is hardcoded to `[First Name]`. A caller passing `getFormRecords('Active', 'Status Records')` would still filter by `[First Name] eq 'Active'`. Three options:

- Rename to `getFormByFirstName(name, templateName)` — narrow signature, honest.
- Accept a third parameter `filterField`: `getFormRecords(filterField, filterValue, templateName)`.
- Accept a full `params` object and let the caller build `q` themselves; the helper does only the response-checking pipeline.

**Recommendation for the template:** option 3, because it generalizes — most real scripts will need different fields, expand options, and field selections. The helper's value is the response-validation pipeline, not the query construction.

---

### M2. Mixed promise styles (L271–L277)

```js
return vvClient.forms
    .getForms(getFormsParams, templateName)
    .then((res) => parseRes(res))
    .then((res) => checkMetaAndStatus(res, shortDescription))
    .then((res) => checkDataPropertyExists(res, shortDescription))
    .then((res) => checkDataIsNotEmpty(res, shortDescription))
    .then((res) => res.data);
```

The rest of the script uses `async/await`. Mixing `.then()` chains here is stylistically inconsistent and harder to debug (stack traces are flatter; you can't drop a `console.log` between steps without restructuring). It's also less forward-compatible with the new package, which switched from Q to native promises (existing `.then()` chains still work, but Q-specific methods like `.fail()` / `.fin()` would not — having `.then()`-only chains is a transitional smell).

**Fix:**

```js
async function getFormRecords(filterValue, templateName) {
  const shortDescription = `Get form ${filterValue}`;
  const params = { q: ..., fields: 'id,name' };
  let res = await vvClient.forms.getForms(params, templateName);
  res = parseRes(res);
  checkMetaAndStatus(res, shortDescription);
  checkDataPropertyExists(res, shortDescription);
  checkDataIsNotEmpty(res, shortDescription);
  return res.data;
}
```

Cleaner, debuggable, idiomatic.

---

### M3. Pure helpers should hoist to module scope

`parseRes`, `checkMetaAndStatus`, `checkDataPropertyExists`, `checkDataIsNotEmpty`, `sanitizeLog`, and `serializeValue` are pure (close over nothing from `main`). Defining them inside `main`:

- recreates the closures on every request (negligible cost, but unnecessary),
- prevents unit testing (they're not exported anywhere),
- makes the file harder to read because helpers and business logic interleave.

`getFieldValueByName` and `getFormRecords` legitimately close over `output`, `ffCollection`, and `vvClient` — those have to stay inside `main`. The pure ones don't.

**Recommendation for the canonical template:** put the pure helpers in a separate module (e.g., `scripts/templates/_helpers.js`) and `require` them from each pattern. Constraint: the VV server must accept `require('./relative')` from script files. If it doesn't, paste them inline at module scope (above `module.exports.main`) — they still hoist out of the per-request closure.

---

### M6. Status never explicitly re-asserted to `"Success"` (L301) — **carry-forward**

The canonical has both branches:

```js
if (output.errors.length > 0) output.status = 'Warning';
else output.status = 'Success';
```

Today `output.status` defaults to `'Success'` at construction (L58), so both versions behave identically. As soon as a maintainer adds intermediate logic that mutates `output.status`, the missing `else` becomes a bug.

**Fix:** restore the `else` branch.

---

### M7. Private API access `_httpHelper._sessionToken.{customerAlias,databaseAlias}` (L65–L66)

Verified against `visualvault-api@2.0.0` (the documented successor package):

- New `HttpHelper` class still has `this._sessionToken = sessionToken;`
- New `SessionToken` class still exposes `customerAlias`, `databaseAlias`, `baseUrl` as public properties.

So the access path is **forward-compatible** into the successor. The remaining argument for isolating it in one helper is single-source-of-truth — when (if) the platform server upgrades and either package adds a public getter, you change one line.

**Recommendation:** add a tiny helper at the top:

```js
function describeSession(client) {
    const t = client._httpHelper._sessionToken;
    return { customerAlias: t.customerAlias, databaseAlias: t.databaseAlias, baseUrl: t.baseUrl };
}
```

This is also a natural seam for the eventual migration. **Severity remains Medium** because it's a maintenance concern, not a correctness concern.

---

## Low

### L3. `serializeValue` redefined per call (L239)

Hoist alongside `sanitizeLog` (see M3).

### L4. No bound on `sanitizeLog` output size

A 50KB `parameters` object becomes a 50KB log line. Combined with H3, real concern. Add a per-value cap:

```js
const MAX_VALUE_CHARS = 2000;
const truncated =
    serialized.length > MAX_VALUE_CHARS
        ? serialized.slice(0, MAX_VALUE_CHARS) + `…[+${serialized.length - MAX_VALUE_CHARS}]`
        : serialized;
```

### L5. `getCredentials` placeholders are silent failures

Add an upfront guard so a forgotten copy fails loudly instead of producing an opaque 401 at OAuth time:

```js
const PLACEHOLDERS = ['CUSTOMER ALIAS', 'DATABASE ALIAS', 'CLIENT ID', 'CLIENT SECRET'];
if ([customerAlias, databaseAlias, clientId, clientSecret].some((v) => PLACEHOLDERS.includes(v))) {
    throw new Error('getCredentials() still contains placeholder values — update before deploying');
}
```

### L6. Duplicate credentials

`userId: clientId, password: clientSecret` — same secret under two field names. Verified at `routes/scripts.js:93–113` that the `/scripts` route uses `customerAlias`/`databaseAlias` for OAuth; whether `userId`/`password` are read anywhere should be confirmed (a quick grep through the legacy server). If unused, drop the duplication. If used, add an inline comment explaining why.

### L7. `formID` is a misnomer (L295, L298)

```js
const formID = await getFormRecords(firstName, 'Business');
output.data = formID;
```

`getFormRecords` returns `res.data` — an **array of form records**, not an ID. Either rename (`formRecords`, `forms`, `matches`) or change the helper to return the first record's ID if that's the intent (then handle the empty-array case explicitly).

### L8. Loose equality

`!= 200`, `== 0`, `== 'Error'` (L162, L182, L195, L204, L207, L208, L220). Use `!==` / `===` for consistency with the rest of the file. Functionally equivalent for the values being compared today, but a habit worth keeping.

### L9. `dataIsObject` (L206)

Once H1 is fixed, the name is technically correct (`typeof null === 'object'` — guard added; `typeof [] === 'object'` — handled by checking arrays first). A short comment would reassure future readers that the array-then-object ordering is deliberate.

---

## Pattern-level observations

- **Forward-compat audit (this draft against `visualvault-api@2.0.0`):**
    - `vvClient._httpHelper._sessionToken.*` — preserved, including `baseUrl`, `customerAlias`, `databaseAlias`.
    - `ffCollection.getFormFieldByName(name)` — preserved (now backed by `.find()` instead of for-loop).
    - `ffCollection._ffColl` — still works; **prefer `getFieldArray()`** when fixing H3 because it's the new public API.
    - `vvClient.forms.getForms(...)` returning a JSON string — preserved; `parseRes` keeps working.
    - `response.json(200, output)` — server-side (legacy repo, unchanged).
    - `module.exports.main` / `module.exports.getCredentials` contract — server-side, unchanged.

    **The only forward-incompatible call in the previous draft (`vvClient.getBaseUrl()`) is now gone.** This template is forward-compatible with the documented successor.

- **Async discipline.** The body now has a real `await` (L295) — good. Once M2 is applied, the whole flow is async-await with no `.then()` chains.

- **Response contract.** `response.json(200, output)` always returns HTTP 200 even on `output.status === 'Error'`. This is intentional (the VV consumer keys on `output.status`, not HTTP status). The template should say so explicitly in a comment so newcomers don't "fix" it to `500`.

- **Helpers and the validation harness.** Once M3 lands and helpers move to module scope (or a `_helpers.js`), every helper here is a unit-test target — `parseRes`, `checkMetaAndStatus`, `checkDataPropertyExists`, `checkDataIsNotEmpty`, `sanitizeLog`. They're pure, they're heavily reused across customer scripts, and they're exactly the kind of thing this task should ship tests for.

---

## Recommended action

1. **Correctness (apply now):** H2, H3. Real bugs or hazards on the demo path.
2. **Pattern decision:** M3 — hoist pure helpers to module scope or a shared `_helpers.js`. Decide before promoting.
3. **Other correctness/maintenance:** M1, M2, M6, M7.
4. **Hygiene (apply with the promotion):** L3–L9.

Several findings (H3, M6, M7, L3–L6) are inherited from the current canonical `scripts/templates/webservice-pattern.js` — fixing them in the draft means fixing them upstream when this task promotes the validated version. H2, M1, M2, L7 are new in this draft, introduced by the helper additions and the working `getForm` example. B1, M4, M5, H1, L1, L2 were also new (or carry-forward) and have already been fixed across the recent passes.
