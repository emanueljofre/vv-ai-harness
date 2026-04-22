# Tools Reference

Complete technical reference for all CLI tools in `tools/`. For folder-level overview and conventions, see [tools/CLAUDE.md](../../tools/CLAUDE.md). For write safety rules, see [root CLAUDE.md](../../CLAUDE.md#write-safety--mandatory).

## Quick Reference

| Script                                                 | npm alias          | Category  | Purpose                                                                         | Scope           | Writes                       |
| ------------------------------------------------------ | ------------------ | --------- | ------------------------------------------------------------------------------- | --------------- | ---------------------------- |
| [extract.js](#extractjs)                               | —                  | Extract   | Unified extraction of VV admin components                                       | project         | disk-only                    |
| [version-snapshot.js](#version-snapshotjs)             | `version:snapshot` | Explore   | Capture platform version state                                                  | environment     | disk-only                    |
| [version-diff.js](#version-diffjs)                     | `version:diff`     | Explore   | Compare two version snapshots                                                   | general         | read-only                    |
| [environment-profile.js](#environment-profilejs)       | `env:profile`      | Explore   | Generate environment metadata profile                                           | project         | disk-only                    |
| [build-timeline.js](#build-timelinejs)                 | `build:timeline`   | Analysis  | Derived view of platform builds observed                                        | project         | read-only                    |
| [task-status.js](#task-statusjs)                       | `task:status`      | Analysis  | Matrix slots executed vs pending per project                                    | project         | disk-only (with `--write`)   |
| [rebaseline-v2.js](#rebaseline-v2js)                   | `rebaseline:v2`    | Analysis  | Create `.V2` siblings in `test-data.js` from V2-env observations                | project         | disk-only (with `--write`)   |
| [audit-v2-baseline.js](#audit-v2-baselinejs)           | `audit:v2`         | Analysis  | Classify V1-vs-V2 expected diffs with bug-absorption guard                      | project         | disk-only (with `--write`)   |
| [tag-v2-baseline.js](#tag-v2-baselinejs)               | `tag:v2`           | Analysis  | Add `FORM-BUG-V2-*` tags to UNFLAGGED V2 siblings (pattern-based)               | general         | disk-only (with `--write`)   |
| [audit-ws-v2.js](#audit-ws-v2js)                       | `audit:ws:v2`      | Analysis  | Classify WS regression results vs matrix V1 baseline + tag WS-BUG-2/3/5/6       | project         | disk-only (with `--write`)   |
| [generate-ws-v2-matrix.js](#generate-ws-v2-matrixjs)   | `matrix:ws:v2`     | Analysis  | Auto-append V2 Baseline Additions section to WS matrix from audit NOT_IN_MATRIX | project         | writes to `research/` matrix |
| [review-forms.js](#review-formsjs)                     | `review:forms`     | Review    | Standards review of form template XMLs                                          | project         | disk-only                    |
| [inventory-fields.js](#inventory-tools)                | —                  | Inventory | Calendar field config analysis                                                  | project (WADNR) | disk-only                    |
| [inventory-scripts.js](#inventory-tools)               | —                  | Inventory | Inline script interaction analysis                                              | project (WADNR) | disk-only                    |
| [run-ws-test.js](#run-ws-testjs)                       | —                  | Runner    | WS test harness (direct Node.js)                                                | environment     | to-VV                        |
| [run-sp-test.js](#run-sp-testjs)                       | —                  | Runner    | SP test harness (direct Node.js)                                                | environment     | to-VV                        |
| [run-relate-test.js](#run-relate-testjs)               | —                  | Runner    | Relate/unrelate API round-trip                                                  | environment     | to-VV                        |
| [create-ws.js](#create-wsjs)                           | —                  | Admin     | Create web service via admin UI                                                 | project         | to-VV                        |
| [create-schedule.js](#admin-tools--compact-entries)    | —                  | Admin     | Create scheduled service via admin UI                                           | project         | to-VV                        |
| [test-schedule.js](#admin-tools--compact-entries)      | —                  | Admin     | Test scheduled service end-to-end                                               | project         | to-VV                        |
| [verify-ws.js](#admin-tools--compact-entries)          | —                  | Admin     | Verify web service existence via API                                            | project         | read-only                    |
| [explore-admin.js](#admin-tools--compact-entries)      | —                  | Admin     | Discover admin page structure                                                   | project         | read-only                    |
| [audit-bug2–bug7](#audit--verification-tools)          | —                  | Audit     | Bug evidence collection (7 scripts)                                             | environment     | varies                       |
| [explore-dashboard.js](#verification--probe-scripts)   | —                  | Audit     | Dashboard grid inspection                                                       | environment     | read-only                    |
| [verify-ws\*-browser.js](#verification--probe-scripts) | —                  | Audit     | Browser-based WS verification                                                   | environment     | read-only                    |
| [probe-\*.js (SP)](#scheduled-process-probes)          | —                  | Explore   | SP research investigation (8 scripts)                                           | environment     | varies                       |
| [generate-artifacts.js](#generator-tools)              | —                  | Generator | Forms regression → markdown artifacts                                           | general         | disk-only                    |
| [generate-ws-artifacts.js](#generator-tools)           | —                  | Generator | WS regression → markdown artifacts                                              | general         | disk-only                    |
| [generate-dash-artifacts.js](#generator-tools)         | —                  | Generator | Dashboard regression → markdown artifacts                                       | general         | disk-only                    |

## Scope & Write Behavior Key

**Scope** — what context the tool needs:

| Scope         | Meaning                                                              | Typical flag                   |
| ------------- | -------------------------------------------------------------------- | ------------------------------ |
| `project`     | Requires a customer project; reads/writes to `projects/{name}/`      | `--project <name>`             |
| `environment` | Targets the active VV environment (needs auth) but not project-bound | uses `.env.json` active config |
| `general`     | No VV connection; works on local files only                          | —                              |

**Write behavior** — what the tool modifies:

| Write       | Meaning                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `read-only` | No writes anywhere — console output only                                                                           |
| `disk-only` | Writes files locally (reports, extracts, artifacts) — no VV modifications                                          |
| `to-VV`     | Creates or modifies data in a VV environment — governed by [write policy](../../CLAUDE.md#write-safety--mandatory) |

---

## 1. Extract Tools

### extract.js

**Purpose:** Unified extraction orchestrator for all VV admin components.
**Scope:** project | **Write:** disk-only
**Path:** `tools/extract/extract.js`

**Usage:**

```bash
node tools/extract/extract.js --project wadnr
node tools/extract/extract.js --project wadnr --component scripts
node tools/extract/extract.js --project wadnr --filter "Lib*"
node tools/extract/extract.js --list
node tools/extract/extract.js --dry-run
```

**Parameters:**

| Flag                 | Required | Default                        | Description                                                       |
| -------------------- | -------- | ------------------------------ | ----------------------------------------------------------------- |
| `--project <name>`   | No\*     | active from `.env.json`        | Customer name (case-insensitive)                                  |
| `--component <name>` | No       | all                            | Single component: scripts, schedules, globals, templates, queries |
| `--output <path>`    | No       | `projects/{project}/extracts/` | Custom output directory                                           |
| `--filter <pattern>` | No       | —                              | Glob-style name filter (e.g., `"Lib*"`)                           |
| `--force`            | No       | false                          | Re-extract everything (ignore manifest)                           |
| `--dry-run`          | No       | false                          | Show what would be extracted                                      |
| `--list`             | No       | false                          | List available components and exit                                |
| `--headed`           | No       | false                          | Show browser                                                      |

\*Either `--project` or `--output` is required.

**Output:** `projects/{customer}/extracts/{component}/` — extracted JS/XML files + `manifest.json` + `README.md` per component. Uses manifest-based incremental sync (only re-downloads changed items).

**Dependencies:** `.env.json` credentials, Playwright (browser automation for admin pages).

#### Legacy Extract Scripts

Superseded by `extract.js` — kept for reference. Each handles one component:

| Script                 | Component                | Notes                              |
| ---------------------- | ------------------------ | ---------------------------------- |
| `extract-templates.js` | Form templates           | WADNR-hardcoded, headed by default |
| `extract-scripts.js`   | Web services             | WADNR-hardcoded                    |
| `extract-globals.js`   | VV.Form.Global functions | WADNR-hardcoded                    |

---

## 2. Explore Tools

### version-snapshot.js

**Purpose:** Capture all discoverable version/build information from a VV environment.
**Scope:** environment | **Write:** disk-only
**Path:** `tools/explore/version-snapshot.js`
**npm alias:** `npm run version:snapshot`

**Usage:**

```bash
node tools/explore/version-snapshot.js
node tools/explore/version-snapshot.js --print
node tools/explore/version-snapshot.js --output /custom/dir
npm run version:snapshot
```

**Parameters:**

| Flag             | Required | Default                    | Description                              |
| ---------------- | -------- | -------------------------- | ---------------------------------------- |
| `--print`        | No       | false                      | Print JSON to stdout only (no file save) |
| `--output <dir>` | No       | `tools/explore/snapshots/` | Custom output directory                  |

**Data captured** (all HTTP, no browser): platform progVersion + dbVersion, FormViewer build number + code version, service config endpoints, server headers (IIS, ASP.NET), FormsAPI Stackify ID, API meta (data type count), UTC offset.

**Output:** `tools/explore/snapshots/version-{ENV}-{YYYYMMDD-HHmmss}.json` + latest symlink.

**Dependencies:** `.env.json` credentials.

### version-diff.js

**Purpose:** Compare two version snapshots to detect what changed after a deploy.
**Scope:** general | **Write:** read-only
**Path:** `tools/explore/version-diff.js`
**npm alias:** `npm run version:diff` / `npm run version:list`

**Usage:**

```bash
node tools/explore/version-diff.js                             # latest vs previous
node tools/explore/version-diff.js <before.json> <after.json>  # specific files
node tools/explore/version-diff.js --list                      # list snapshots
npm run version:diff
npm run version:list
```

**Parameters:**

| Flag            | Required | Default  | Description                       |
| --------------- | -------- | -------- | --------------------------------- |
| `--list`        | No       | false    | List available snapshots and exit |
| Positional args | No       | latest 2 | Two JSON file paths to compare    |

**Output:** Console text diff report.

**Dependencies:** Existing snapshots in `tools/explore/snapshots/`.

### environment-profile.js

**Purpose:** Generate comprehensive environment metadata profile for a customer.
**Scope:** project | **Write:** disk-only
**Path:** `tools/explore/environment-profile.js`
**npm alias:** `npm run env:profile` / `npm run env:profile:browser`

**Usage:**

```bash
node tools/explore/environment-profile.js --project wadnr
node tools/explore/environment-profile.js --project emanueljofre-vvdemo --with-browser
node tools/explore/environment-profile.js --print
npm run env:profile
npm run env:profile:browser
```

**Parameters:**

| Flag               | Required | Default                                | Description                               |
| ------------------ | -------- | -------------------------------------- | ----------------------------------------- |
| `--project <name>` | No       | active from `.env.json`                | Customer name                             |
| `--with-browser`   | No       | false                                  | Include browser probes (~10-12s extra)    |
| `--headed`         | No       | false                                  | Show browser (only with `--with-browser`) |
| `--print`          | No       | false                                  | Print JSON to stdout only                 |
| `--output <path>`  | No       | `projects/{customer}/environment.json` | Custom output path                        |

**Data captured:**

- **HTTP (always, ~3s):** platform version, DB version, config endpoints, FormViewer build/config, server headers, FormsAPI Stackify ID, API meta
- **Browser (optional, ~12s):** Admin app stack (jQuery, Kendo, Telerik, Angular), FormViewer SPA stack (Angular, Kendo v1/v2 variant, SignalR, Moment.js)

**Output:** `projects/{customer}/environment.json`

**Dependencies:** `.env.json` credentials. Browser probes need Playwright.

### probe-v1-v2-flag.js

**Purpose:** Report whether a VV environment is running the V1 or V2 calendar-value code path (`VV.Form.calendarValueService.useUpdatedCalendarValueLogic`).
**Scope:** cross-env | **Write:** none (read-only form load)
**Path:** `tools/explore/probe-v1-v2-flag.js`

```bash
node tools/explore/probe-v1-v2-flag.js --project EmanuelJofre-vv5dev
```

Opens the first available form template via the REST API, loads it in FormViewer, evaluates the flag. If the flag is `true` without `?ObjectID=` in the URL and `modelId` empty, it's being pushed by `setUserInfo()` — i.e., the customer-or-database-scope **"Use Updated Calendar Control Logic"** toggle is enabled. DB scope overrides customer scope; see [Central Admin § Forms](../architecture/visualvault-platform.md#configuration-sections-toolbar).

### probe-central-admin.js

**Purpose:** Walk the `/ca/ConfigureCustomerDetails` tabs and capture per-tab settings to JSON.
**Scope:** cross-env | **Write:** none (clicks tabs only, never Save)
**Path:** `tools/explore/probe-central-admin.js`

```bash
node tools/explore/probe-central-admin.js --project EmanuelJofre-vv5dev --customerid <guid>
```

**Requires a Central Admin-privileged account** (regular API users are bounced at `/ca/centraladmin`). Service accounts like `apivv5` cannot pass the gate. For environments where Playwright auth can't reach CA, use the Claude-in-Chrome extension with a manually-authenticated session. Outputs to `projects/{project}/analysis/central-admin/` — `index.json`, per-tab JSON + HTML.

### Scheduled Process Probes

Research investigation tools for SP execution mechanics. Not general-purpose — tied to the [scheduled-process-logs](../../research/_archive/scheduled-process-logs/) investigation.

**Common pattern:** Standalone Node.js/Playwright scripts, target the active environment, most support `--headed`.

| Script                           | Purpose                                                    | Writes to VV? |
| -------------------------------- | ---------------------------------------------------------- | ------------- |
| `probe-scheduled-processes.js`   | GET /scheduledProcess API — discover creation/modify dates | No            |
| `probe-schedule-logs.js`         | Scrape SP run logs from admin UI                           | No            |
| `probe-sp-timeouts.js`           | Read Timeout/Callback fields from all outside processes    | No            |
| `probe-sp-callback.js`           | Test callback behavior (3 scenarios)                       | Yes           |
| `probe-sp-callback-scheduled.js` | Callback test via actual scheduler execution               | Yes           |
| `probe-sp-scenarios.js`          | response.json() vs postCompletion() across 4 scenarios     | Yes           |
| `probe-sp-timeout-discovery.js`  | Find platform default HTTP timeout empirically             | Yes           |
| `probe-sp-timeout-unit.js`       | Determine if Timeout field is seconds or minutes           | Yes           |

---

## 3. Review Tools

### review-forms.js

**Purpose:** Standards review of form template XML files — parse, run rule checks, generate reports.
**Scope:** project | **Write:** disk-only
**Path:** `tools/review/review-forms.js`
**npm alias:** `npm run review:forms`

**Usage:**

```bash
node tools/review/review-forms.js --project wadnr
node tools/review/review-forms.js --project wadnr --template Appeal
node tools/review/review-forms.js --project wadnr --rule field-naming
node tools/review/review-forms.js --project wadnr --severity error
node tools/review/review-forms.js --project wadnr --print
npm run review:forms -- --project wadnr
```

**Parameters:**

| Flag                 | Required | Default | Description                             |
| -------------------- | -------- | ------- | --------------------------------------- |
| `--project <name>`   | Yes      | —       | Customer project to review              |
| `--template <name>`  | No       | all     | Single template (filename without .xml) |
| `--rule <id>`        | No       | all     | Run only a specific rule                |
| `--severity <level>` | No       | all     | Filter: error, warning, info            |
| `--print`            | No       | false   | Print to stdout only (no file output)   |

**Available rules:** `field-naming`, `script-hygiene`, `calendar-config`, `tab-order`, `accessibility`, `orphan-refs`

**Input:** `projects/{project}/extracts/form-templates/*.xml`
**Output:** `projects/{project}/analysis/standards-review/` — summary.md, per-template reports, run-metadata.json

**Dependencies:** Extracted form templates (run `extract.js --component templates` first).

---

## 4. Inventory Tools

**Common pattern:** WADNR-hardcoded local analysis tools. No CLI parameters. Read extracted form template XMLs, produce markdown reports. No VV connection.

**Scope:** project (WADNR) | **Write:** disk-only

| Script                 | Purpose                                                                                   | Input                                          | Output                                        |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| `inventory-fields.js`  | Calendar field config analysis — maps fields to Configs A–H, usage distribution           | `projects/wadnr/extracts/form-templates/*.xml` | `projects/wadnr/analysis/field-inventory.md`  |
| `inventory-scripts.js` | Inline script analysis — date field interactions, WS calls, global usage, Bug #5 exposure | `projects/wadnr/extracts/form-templates/*.xml` | `projects/wadnr/analysis/script-inventory.md` |

**Dependencies:** Extracted WADNR form templates.

---

## 5. Runner Tools

### run-ws-test.js

**Purpose:** Direct Node.js runner for the WS date-handling test harness (bypasses VV server routing).
**Scope:** environment | **Write:** to-VV (creates/modifies test records)
**Path:** `tools/runners/run-ws-test.js`

**Usage:**

```bash
node tools/runners/run-ws-test.js --action WS-1 --configs A,D --input-date 2026-03-15
node tools/runners/run-ws-test.js --action WS-2 --configs ALL --record-id DateTest-000080
node tools/runners/run-ws-test.js --action WS-1 --configs A --debug
TZ=UTC node tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
node --inspect-brk tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
```

**Parameters:**

| Flag                     | Required | Default  | Description                           |
| ------------------------ | -------- | -------- | ------------------------------------- |
| `--action <WS-1..WS-9>`  | Yes      | —        | Test category to run                  |
| `--configs <A,C,D\|ALL>` | No       | ALL      | Target calendar configs               |
| `--record-id <name>`     | No       | —        | Record instance name (for WS-2, WS-3) |
| `--input-date <date>`    | No       | —        | Date string to write (for WS-1, WS-3) |
| `--input-formats <fmts>` | No       | —        | Format keys (for WS-5)                |
| `--template-name <name>` | No       | DateTest | Form template name                    |
| `--debug`                | No       | false    | Include raw API responses             |

**Environment variables:** `TZ=<timezone>` — simulate server timezone (e.g., UTC, America/Sao_Paulo).

**Output:** Console JSON with status, results, errors. Exit code 0/1.

**Dependencies:** `.env.json` credentials. Write policy governs record creation.

### run-sp-test.js

**Purpose:** Direct Node.js runner for scheduled process test scripts (bypasses VV server routing).
**Scope:** environment | **Write:** to-VV (script execution may create/modify records)
**Path:** `tools/runners/run-sp-test.js`

**Usage:**

```bash
node tools/runners/run-sp-test.js
node tools/runners/run-sp-test.js --script ScheduledProcessTestHarness
node tools/runners/run-sp-test.js --token <real-scheduled-process-guid>
node tools/runners/run-sp-test.js --skip-completion
TZ=UTC node tools/runners/run-sp-test.js
```

**Parameters:**

| Flag                | Required | Default                     | Description                                      |
| ------------------- | -------- | --------------------------- | ------------------------------------------------ |
| `--script <name>`   | No       | ScheduledProcessTestHarness | Script name in `scripts/test-scripts/scheduled/` |
| `--token <guid>`    | No       | placeholder (zeros)         | Scheduled process GUID for postCompletion        |
| `--skip-completion` | No       | false                       | Monkey-patch postCompletion to no-op             |

**Environment variables:** `TZ=<timezone>` — simulate server timezone.

**Output:** Console JSON. Exit code 0/1.

**Dependencies:** `.env.json` credentials.

### run-relate-test.js

**Purpose:** Relate/unrelate API round-trip verification — creates 2 records, relates, verifies, unrelates, verifies.
**Scope:** environment | **Write:** to-VV (creates form records)
**Path:** `tools/runners/run-relate-test.js`

**Usage:**

```bash
node tools/runners/run-relate-test.js
node tools/runners/run-relate-test.js --template-name DateTest
node tools/runners/run-relate-test.js --debug
```

**Parameters:**

| Flag                     | Required | Default  | Description                        |
| ------------------------ | -------- | -------- | ---------------------------------- |
| `--template-name <name>` | No       | DateTest | Form template to create records on |
| `--debug`                | No       | false    | Show full API responses            |

**Output:** Console JSON with lifecycle results. Exit code 0/1.

**Dependencies:** `.env.json` credentials. Checks `config.readOnly` — exits if read-only.

---

## 6. Admin Tools

### Common Pattern

All admin tools automate VV admin pages via Playwright. They share these traits:

- **Scope:** project (require `--project`)
- **Dependencies:** `.env.json` credentials, Playwright
- Support `--headed` (show browser) and `--dry-run` (preview only)
- Check `config.readOnly` before writes

### create-ws.js

**Purpose:** Create a web service (outside process) via the admin UI. No REST API exists for this — requires browser automation.
**Scope:** project | **Write:** to-VV
**Path:** `tools/admin/create-ws.js`

**Usage:**

```bash
node tools/admin/create-ws.js --project emanueljofre-vvdemo --name "zzzMyService" --category form
node tools/admin/create-ws.js --project emanueljofre-vvdemo --name "zzzMyService" --category form --script "response.json(200, 'ok')"
node tools/admin/create-ws.js --project emanueljofre-vvdemo --name "zzzMyService" --category form --script-file ./path/to/script.js
node tools/admin/create-ws.js --project emanueljofre-vvdemo --name "zzzMyService" --description "test" --category workflow --headed
```

**Parameters:**

| Flag                   | Required | Default | Description                           |
| ---------------------- | -------- | ------- | ------------------------------------- |
| `--project <name>`     | Yes      | —       | Customer name                         |
| `--name <name>`        | Yes      | —       | Web service name                      |
| `--description <desc>` | No       | `""`    | Service description                   |
| `--category <cat>`     | No       | form    | Category alias (see below)            |
| `--connection <type>`  | No       | nodejs  | Connection: `nodejs` or `webservice`  |
| `--script <code>`      | No       | —       | Inline script source code             |
| `--script-file <path>` | No       | —       | Path to a .js file with script source |
| `--timeout <sec>`      | No       | —       | Service timeout in seconds            |
| `--headed`             | No       | false   | Show browser                          |
| `--dry-run`            | No       | false   | Print what would be created           |

**Category aliases:** `form` (Form Controls), `scheduled` (Scheduled Service), `query` (WS Data Query), `2fa` (Two Factor Auth), `session` (User Session End), `nodejs` (Node.Js Script Service), `workflow` (Form Workflow WS), `docflow` (Document Workflow WS)

**Output:** Console summary with name, script ID, verification.

### Admin Tools — Compact Entries

#### create-schedule.js

**Purpose:** Create a scheduled service via the admin UI.
**Write:** to-VV

| Flag                   | Required | Default | Description                                     |
| ---------------------- | -------- | ------- | ----------------------------------------------- |
| `--project <name>`     | Yes      | —       | Customer name                                   |
| `--name <name>`        | Yes      | —       | Schedule name                                   |
| `--description <desc>` | No       | `""`    | Description                                     |
| `--service <wsName>`   | Yes      | —       | Linked web service (must be Scheduled category) |
| `--enabled`            | No       | false   | Enable the schedule immediately                 |
| `--headed`             | No       | false   | Show browser                                    |
| `--dry-run`            | No       | false   | Preview only                                    |

#### test-schedule.js

**Purpose:** Test a scheduled service end-to-end — open, enable if needed, trigger, poll for completion.
**Write:** to-VV (enables schedule, triggers execution)

| Flag               | Required | Default | Description   |
| ------------------ | -------- | ------- | ------------- |
| `--project <name>` | Yes      | —       | Customer name |
| `--name <name>`    | Yes      | —       | Schedule name |
| `--headed`         | No       | false   | Show browser  |

#### verify-ws.js

**Purpose:** Verify web service(s) exist and are callable via the REST API.
**Write:** read-only

| Flag               | Required | Default | Description                               |
| ------------------ | -------- | ------- | ----------------------------------------- |
| `--project <name>` | Yes      | —       | Customer name                             |
| `--name <name>`    | No\*     | —       | Web service name (glob matching with `*`) |
| `--list`           | No       | false   | List all web services                     |
| `--invoke`         | No       | false   | Invoke the service after verifying        |

\*Either `--name` or `--list` required.

#### explore-admin.js

**Purpose:** Discover admin page structure — toolbar buttons, dock panel fields, postback targets.
**Write:** read-only

| Flag               | Required | Default | Description                                                   |
| ------------------ | -------- | ------- | ------------------------------------------------------------- |
| `--project <name>` | Yes      | —       | Customer name                                                 |
| `--section <name>` | Yes      | —       | Admin section (e.g., `scheduleradmin`, `outsideprocessadmin`) |
| `--headed`         | No       | false   | Show browser                                                  |

---

## 7. Audit & Verification Tools

### Common Pattern

Standalone Playwright scripts for collecting bug evidence and verifying platform behaviors. Most share:

- **Scope:** environment (target vvdemo EmanuelJofre sandbox)
- **Dependencies:** Playwright, `.env.json` credentials
- **Parameters:** None or minimal (some support `--headed`)
- **Output:** Console reports with captured field values, comparisons, and evidence

### Bug Audit Scripts

| Script                       | Bug | What it verifies                                                         | Writes to VV?         |
| ---------------------------- | --- | ------------------------------------------------------------------------ | --------------------- |
| `audit-bug2-db-evidence.js`  | #2  | Legacy popup vs typed input store different DB values                    | Yes (creates records) |
| `audit-bug2-legacy-popup.js` | #2  | Popup vs typed behavior for configs E, F, G, H                           | Yes (creates records) |
| `audit-bug3-v2-probe.js`     | #3  | V2 activation triggers and hardcoded parameter effects                   | No                    |
| `audit-bug4-save-format.js`  | #4  | getSaveValue() Z-stripping + getCalendarFieldValue() TZ reinterpretation | No                    |
| `audit-bug5-fake-z.js`       | #5  | getCalendarFieldValue() adds fake [Z] to Config D → progressive drift    | No                    |
| `audit-bug6-empty-fields.js` | #6  | getCalendarFieldValue() lacks empty guard → "Invalid Date"               | No                    |
| `audit-bug7-wrong-day.js`    | #7  | Date-only fields store wrong day for UTC+ timezones                      | No                    |

### Verification & Probe Scripts

| Script                            | Purpose                                              | Parameters                                                                                      | Writes?                 |
| --------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| `explore-dashboard.js`            | Inspect DateTest Dashboard RadGrid values across TZs | `--tz BRT\|IST\|UTC0`, `--record ID`, `--all`, `--compare`                                      | No                      |
| `verify-ws4-browser.js`           | Browser verification of WS-4 created records         | `--data-id GUID`, `--configs A,C`, `--tz TZ`, `--expected JSON`                                 | No                      |
| `verify-ws10-browser.js`          | WS-10 postForms vs forminstance comparison           | `--postforms-id GUID`, `--forminstance-id GUID`, `--save-stabilize`, `--configs C,D`, `--tz TZ` | No                      |
| `verify-format-mismatch.js`       | Dashboard vs Forms format cross-layer comparison     | None                                                                                            | No                      |
| `probe-postback.js`               | ASP.NET \_\_doPostBack mechanics for RadGrid         | None                                                                                            | No                      |
| `probe-wadnr-api.js`              | WADNR REST API endpoint probe                        | None                                                                                            | No                      |
| `explore-wadnr-outsideprocess.js` | outsideprocessadmin DOM structure dump               | None                                                                                            | disk-only (screenshots) |

---

## 8. Generator Tools

### Common Pattern

Create/update markdown test artifacts from regression pipeline results. All share:

- **Scope:** general (no VV connection)
- **Write:** disk-only (markdown files in `research/`)
- **Dependencies:** Regression results JSON from a prior pipeline run

| Flag             | Required | Default                                             | Description                   |
| ---------------- | -------- | --------------------------------------------------- | ----------------------------- |
| `--input <path>` | No       | `testing/tmp/{type}-regression-results-latest.json` | Path to results JSON          |
| `--dry-run`      | No       | false                                               | Preview without writing files |

### Per-Generator Details

| Script                       | Target         | Default input                         | Output directory                         | Extra flags        |
| ---------------------------- | -------------- | ------------------------------------- | ---------------------------------------- | ------------------ |
| `generate-artifacts.js`      | Forms calendar | `regression-results-latest.json`      | `research/date-handling/forms-calendar/` | `--artifacts-only` |
| `generate-ws-artifacts.js`   | Web services   | `ws-regression-results-latest.json`   | `research/date-handling/web-services/`   | —                  |
| `generate-dash-artifacts.js` | Dashboards     | `dash-regression-results-latest.json` | `research/date-handling/dashboards/`     | `--category DB-N`  |

**Output per generator:** run files (`runs/tc-{ID}-run-{N}.md`), updated matrix (`matrix.md`), summary updates. Run files are immutable (append-only audit trail).

---

## 8b. Analysis Tools

### build-timeline.js

**Purpose:** Derive a chronological view of platform builds observed in a project, grouping artifacts by build fingerprint.
**Scope:** project | **Write:** read-only (prints to stdout)
**npm alias:** `npm run build:timeline`
**Path:** `tools/analysis/build-timeline.js`

```bash
npm run build:timeline -- --project EmanuelJofre-vv5dev
npm run build:timeline -- --project EmanuelJofre-vv5dev --tc TC-1-D-BRT   # per-TC history across builds
npm run build:timeline -- --project EmanuelJofre-vv5dev --json            # machine-readable
```

Walks `projects/{name}/**/*.json` and picks up any artifact with an embedded `buildContext` — regression results, environment profiles, extract manifests. Groups by SHA-8 fingerprint (over `environment + progVersion + dbVersion + formViewerBuild`), sorts by timestamp, and prints first/last-seen windows per build plus the observations that anchored each entry.

No separate state file is maintained — the timeline is a **view** over existing artifacts. Delete an artifact, you lose that observation. Used to correlate test-behavior changes with platform rollouts: when a fingerprint flips, compare per-TC status across the two builds.

Consumers: any run that writes a JSON with `buildContext` contributes automatically. The `buildContext.fingerprint` field is computed by `build-fingerprint.js`.

### task-status.js

**Purpose:** Cross-reference matrix-defined slots vs regression runs to produce an executed-vs-pending rollup per customer.
**Scope:** project | **Write:** read-only to stdout, `--write` persists `status.md` to the project
**npm alias:** `npm run task:status`
**Path:** `tools/analysis/task-status.js`

```bash
npm run task:status -- --project EmanuelJofre-vv5dev
npm run task:status -- --project EmanuelJofre-vv5dev --write          # persist to projects/{name}/testing/date-handling/forms-calendar/status.md
npm run task:status -- --project EmanuelJofre-vv5dev --pending-only
npm run task:status -- --project EmanuelJofre-vv5dev --json
```

Parses TC IDs from `research/date-handling/{component}/matrix.md`, walks `projects/{project}/**/*.json` for regression results, diffs the two to classify each slot as: **executed** (at least one non-skipped run — with last status, run count, fingerprint, project, last actualRaw), **pending** (in matrix, never executed on this customer), or **extra** (executed but not in matrix — usually an ID-format mismatch or newly-added spec).

Per-TC `lastStatus` reflects the **latest run's activity**, not the most recent non-skip. Values: `passed`/`failed`/`timedOut` (latest run had a non-skip entry), `inactive` (latest run skipped across all projects but prior runs had non-skip history — usually a V1/V2 scope drift), or `skipped` (never non-skipped). Inactive rows surface `priorStatus` + `priorTimestamp` so dormant-but-once-failing slots don't inflate the Failed count yet retain their history.

Covers all six date-handling components (`forms-calendar`, `web-services`, `dashboards`, `document-library`, `workflows`, `scheduled-processes`). Omit `--component` to get a cross-component rollup + per-component breakdown; pass `--component <name>` to limit scope. Each component has its own matrix ID format (`1-A-BRT`, `ws-1-*`, `db-5-exact`, `doc-1-iso-date`, `wf-1-brt-midday`, `sp-2-now-brt`) — all normalized to lowercase for matching.

**Requires the regression-reporter to know about the component's ID prefix** — `regression-reporter.js` extracts `TC-*:` (forms), `DB-*:`/`DOC-*:`/`WF-*:`/`SP-*:`/`WS-*:` category titles, and lowercase fine-grained slot IDs from test titles. Tests whose titles don't carry a recognizable slot ID are not tracked by this tool.

Pairs with `build-timeline.js`: timeline tells you _which builds ran when_; task-status tells you _which slots have been covered and what they looked like_. Together they answer "did TC-X regress on build Y?".

### rebaseline-v2.js

**Purpose:** Create `.V2` siblings in `testing/fixtures/test-data.js` from the expected-vs-observed diffs of a V2-env regression run, so V2 entries can pass against V2 behavior while V1 entries stay untouched for V1 envs.
**Scope:** project | **Write:** disk-only (with `--write`)
**npm alias:** `npm run rebaseline:v2`
**Path:** `tools/analysis/rebaseline-v2.js`

```bash
npm run rebaseline:v2 -- --project EmanuelJofre-vv5dev                 # dry-run (default)
npm run rebaseline:v2 -- --project EmanuelJofre-vv5dev --write         # apply
npm run rebaseline:v2 -- --project EmanuelJofre-vv5dev --tc 1-A-BRT    # single TC
```

For each TC in the latest regression JSON: if a `.V2` sibling already exists, updates its `expectedRaw`/`expectedApi` in place; otherwise clones the V1 entry, swaps `id` to `{base}.V2`, adds `scope: 'V2'`, and writes observed values. Skips entries whose V1 action is `umbrella/skip/theoretical`. Empty or null observations trigger a SKIP (reporter couldn't parse actuals). Uses `apiFallback` (api = raw) when only raw was captured (test stopped at first failing assertion).

Refuses to run unless the regression JSON is from a V2 environment (identified by customer alias / fingerprint cross-check).

### audit-v2-baseline.js

**Purpose:** Classify every `.V2` sibling vs its V1 parent into five buckets so silently-absorbed V2 bugs are surfaced before the baseline is considered clean.
**Scope:** project | **Write:** disk-only (with `--write`)
**npm alias:** `npm run audit:v2`
**Path:** `tools/analysis/audit-v2-baseline.js`

```bash
npm run audit:v2 -- --project EmanuelJofre-vv5dev
npm run audit:v2 -- --project EmanuelJofre-vv5dev --write    # persist to v2-baseline-audit.md
npm run audit:v2 -- --project EmanuelJofre-vv5dev --json     # machine-readable
```

Verdicts (per V2 sibling):

| Verdict                | Meaning                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `IDENTICAL`            | V2 expected == V1 expected. No action.                                                              |
| `FORMAT_ONLY`          | Same UTC moment — only serialization differs. Benign.                                               |
| `SAME_LOCAL_DATE`      | Same calendar date in the entry's TZ (different UTC representations). Usually benign for date-only. |
| `KNOWN_BUG_PERSISTS`   | Semantic difference AND the V1 **or** V2 entry has `bugs: [...]`. Documented.                       |
| `UNFLAGGED_DIFFERENCE` | Semantic difference AND neither entry has a bug marker. ★ Review required.                          |
| `ORPHAN_V2`            | `.V2` sibling with no V1 parent by base ID. Structural issue.                                       |

Parses `YYYY-MM-DD` as a calendar date in the entry's TZ (NOT UTC midnight) and compares calendar dates via `Intl.DateTimeFormat` with the right zone. UNFLAGGED count after tagging drives the v2-review-queue backlog.

### tag-v2-baseline.js

**Purpose:** Sweep UNFLAGGED `.V2` entries through pattern matchers and add V2-specific bug tags so the baseline documents why V2 differs, instead of silently absorbing the diff.
**Scope:** general | **Write:** disk-only (with `--write`)
**npm alias:** `npm run tag:v2`
**Path:** `tools/analysis/tag-v2-baseline.js`

```bash
npm run tag:v2                # dry-run
npm run tag:v2 -- --write     # apply
npm run tag:v2 -- --json      # machine output
```

Five pattern matchers applied in order:

| Pattern | Detection                                        | Tag                          |
| ------- | ------------------------------------------------ | ---------------------------- |
| A       | V1 bare date → V2 UTC midnight same day          | `FORM-BUG-V2-UTCMIDNIGHT`    |
| B       | V1 naive ISO → V2 same ISO + `.000Z`             | `FORM-BUG-V2-LEGACY-Z`       |
| C       | `action: 'preset'` with year/month shift V1→V2   | `FORM-BUG-V2-PRESET-YEAR`    |
| D       | cat-6 `expectedRaw: 'false'` (reporter artifact) | (reset to `dynamic`, no tag) |
| E       | V1 bare date → V2 UTC previous-day               | `FORM-BUG-7-persists-on-V2`  |

Writes tags to the V2 sibling's `bugs: [...]` array (dedups existing entries). Leaves IDENTICAL/FORMAT_ONLY/KNOWN_BUG_PERSISTS/SAME_LOCAL_DATE untouched. Entries that no pattern matches are left for manual review via the project's `v2-review-queue.md`.

### audit-ws-v2.js

**Purpose:** Classify every slot in a WS regression run vs the V1 baseline parsed from `research/date-handling/web-services/matrix.md`, surfacing silent V2 divergence against documented expectations. Mirrors `audit-v2-baseline.js` but for WS — there's no `test-data.js` equivalent for pure WS specs, so the matrix is the source of truth.
**Scope:** project | **Write:** disk-only (with `--write`)
**npm alias:** `npm run audit:ws:v2`
**Path:** `tools/analysis/audit-ws-v2.js`

```bash
npm run audit:ws:v2 -- --project EmanuelJofre-vv5dev
npm run audit:ws:v2 -- --project EmanuelJofre-vv5dev --write    # persist v2-baseline-audit.{md,json}
npm run audit:ws:v2 -- --project EmanuelJofre-vv5dev --json     # machine-readable
```

Verdicts (per slot):

| Verdict                       | Meaning                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `IDENTICAL`                   | V2 observed stored == V1 matrix expected. No action.                             |
| `FORMAT_ONLY`                 | Same UTC moment — V1/V2 differ only in serialization format.                     |
| `SAME_LOCAL_DATE`             | Same calendar date in the slot's TZ (different UTC representations).             |
| `KNOWN_BUG_PERSISTS`          | Semantic diff AND matrix has a `bugs` marker OR a bug-signature pattern matched. |
| `UNFLAGGED_DIFFERENCE`        | Semantic diff AND no known-bug marker. ★ Review required.                        |
| `NEW_IN_V2` / `MISSING_IN_V2` | Value appeared / disappeared vs V1 expected.                                     |
| `NOT_IN_MATRIX`               | Slot observed but no matching matrix row (use `matrix:ws:v2` to baseline).       |

Parses matrix headers that contain `Expected`, `Cycle 2`, or plain `Stored` so WS-1/2/3/5/6/7/8/9 tables all map cleanly despite inconsistent column names. Pattern matchers for WS-BUG-2/3/5/6 inject bug tags into the report when their signatures (e.g. WS-5 Latam formats → null, date-only accepting time) fire.

Writes `projects/{name}/testing/date-handling/web-services/v2-baseline-audit.md` + `.json`. WS-2 UNFLAGGED entries get an auto-rendered explanatory note about pipeline-artifact causes (pipeline reads a fresh WS-1 record; configs not set in that record read back empty).

### generate-ws-v2-matrix.js

**Purpose:** Auto-generate a `V2 Baseline Additions — {project} ({date})` section in `research/date-handling/web-services/matrix.md` containing one row per `NOT_IN_MATRIX` audit slot, with the observed `stored` value as the new Expected. Idempotent via HTML anchor comments (replaces its own section on re-run).
**Scope:** project | **Write:** writes to `research/date-handling/web-services/matrix.md`
**npm alias:** `npm run matrix:ws:v2`
**Path:** `tools/analysis/generate-ws-v2-matrix.js`

```bash
npm run matrix:ws:v2 -- --project EmanuelJofre-vv5dev              # apply
npm run matrix:ws:v2 -- --project EmanuelJofre-vv5dev --dry-run    # preview
```

Reads the project's latest `v2-baseline-audit.json`, skips NOT_IN_MATRIX rows with no observed value (harness summary rows without stored data), and appends a markdown table inside `<!-- ws-v2-baseline:{project} -->` anchors. Subsequent runs replace the section rather than duplicating. Workflow: `test:ws:regression` → `audit:ws:v2 --write` → `matrix:ws:v2` → re-run `audit:ws:v2 --write` to confirm the NOT_IN_MATRIX slots flip to IDENTICAL.

## 9. Helper Modules

Library modules in `tools/helpers/` — consumed by tools, not invoked directly.

| Module                   | Purpose                                                            | Key Exports                                                                                                                                                                                       | Primary Consumers                                             |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **vv-admin.js**          | Admin page automation — login, RadGrid scraping, ASP.NET postbacks | `findCustomer`, `listCustomers`, `getActiveCustomer`, `loadEnvConfig`, `login`, `adminUrl`, `triggerPostback`, `getGridDetailLinks`, `goToNextGridPage`, `extractDockPanelDetail`, `readGridRows` | extract.js, admin/\* tools, explore probes                    |
| **vv-probes.js**         | HTTP-only platform discovery — no browser needed                   | `getToken`, `captureApiVersion`, `captureConfigEndpoints`, `captureServerHeaders`, `captureFormViewerBuild`, `captureFormViewerConfig`, `captureFormsApiInfo`, `captureApiMeta`                   | version-snapshot.js, environment-profile.js                   |
| **vv-browser-probes.js** | Browser-based front-end stack detection                            | `captureAdminApp`, `captureFormViewerApp`, `runBrowserProbes`                                                                                                                                     | environment-profile.js (`--with-browser`)                     |
| **vv-sync.js**           | Manifest-based incremental sync for extractions                    | `sanitizeFilename`, `matchesFilter`, `loadManifest`, `saveManifest`, `computeChanges`, `generateReadme`                                                                                           | extract.js, extract components                                |
| **vv-explore.js**        | Exploration spec utilities — response collection, DOM/JS scanning  | `createResponseCollector`, `enumerateJSGlobals`, `scanDOM`, `probeEndpoints`, `formatReport`                                                                                                      | explore specs                                                 |
| **build-context.js**     | Platform build metadata capture (~2s, HTTP only)                   | `captureBuildContext`                                                                                                                                                                             | testing global-setup, regression pipelines                    |
| **build-fingerprint.js** | SHA-8 fingerprint over behavior-relevant build fields              | `fingerprint`, `extractFields`, `FINGERPRINT_FIELDS`                                                                                                                                              | regression-reporter, extract.js, pipelines, build-timeline.js |
| **ws-api.js**            | REST API CRUD helpers for date-handling tests                      | `authenticate`, `createFormInstance`, `getFormInstance`, `queryFormInstances`, `updateFormInstance`, `apiRoundTripCycle`                                                                          | WS test specs                                                 |
| **ws-log.js**            | Log shim for running scripts outside the server tree               | Proxies to `lib/.../log`                                                                                                                                                                          | Server-side script runners                                    |

---

## 10. Cross-Tool Workflows

### Extract → Review

Standards review requires extracted templates. Run extraction first, then review:

```bash
node tools/extract/extract.js --project wadnr --component templates
node tools/review/review-forms.js --project wadnr
```

### Extract → Inventory

Field and script inventory tools analyze extracted WADNR templates:

```bash
node tools/extract/extract.js --project wadnr --component templates
node tools/inventory/inventory-fields.js
node tools/inventory/inventory-scripts.js
```

### Regression → Generate Artifacts

Each regression pipeline runs tests, then generates markdown artifacts:

```bash
# Forms calendar
npm run test:pw:regression
node tools/generators/generate-artifacts.js

# Web services
npm run test:ws:regression
node tools/generators/generate-ws-artifacts.js

# Dashboards
npm run test:dash:regression
node tools/generators/generate-dash-artifacts.js
```

### Version Monitoring

Track platform changes across deploys:

```bash
npm run version:snapshot        # before deploy
# ... deploy happens ...
npm run version:snapshot        # after deploy
npm run version:diff            # see what changed
```

### Admin Object Setup

Create a web service, link it to a schedule, test it:

```bash
node tools/admin/create-ws.js --project emanueljofre-vvdemo --name "zzzMyService" --category scheduled
node tools/admin/create-schedule.js --project emanueljofre-vvdemo --name "zzzMySchedule" --service "zzzMyService"
node tools/admin/test-schedule.js --project emanueljofre-vvdemo --name "zzzMySchedule"
```

### Environment Profiling

Generate a full environment profile for a new or existing customer:

```bash
npm run env:profile -- --project wadnr                # HTTP only (~3s)
npm run env:profile:browser -- --project wadnr        # with browser probes (~12s)
```
