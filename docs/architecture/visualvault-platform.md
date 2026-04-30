# VisualVault Platform Architecture

Reference for navigating, understanding, and scripting against the VisualVault platform. Based on direct exploration of `vvdemo.visualvault.com` (EmanuelJofre/Main database).

---

## Multi-Tenant Hierarchy

VV uses a three-level tenancy model. Each level is a distinct scope for data, configuration, and access control:

```
Server (environment)          e.g., vvdemo.visualvault.com, vv5dev.visualvault.com
  └─ Customer (tenant/org)    e.g., EmanuelJofre, WADNR, CityOfLincoln
       └─ Database (workspace) e.g., Main, fpOnline, Phase2
```

- **Server**: the VV instance. Multiple customers can exist on the same server
- **Customer** (`customerAlias`): the organization/tenant. Has its own users, groups, API applications, and OAuth credentials
- **Database** (`databaseAlias`): a workspace within a customer. Has its own forms, documents, folders, scripts, and scheduled processes. A customer can have multiple databases (e.g., `Main` for production, `Phase2` for a separate project)

This hierarchy is reflected in URL paths, API authentication (`customerAlias`/`databaseAlias` parameters), and the `.env.json` structure (`servers → customers`).

---

## URL Anatomy

### Main Application

```
https://{environment}.visualvault.com/app/{customer}/{database}/{section}
```

| Segment       | Description                   | Examples                                               |
| ------------- | ----------------------------- | ------------------------------------------------------ |
| `environment` | Server instance               | `vvdemo`, `vv5dev`                                     |
| `customer`    | VV customer / org             | `EmanuelJofre`, `WADNR`, `CityOfLincoln`               |
| `database`    | Workspace within the customer | `Main`, `Phase2`, `fpOnline`, `BusinessRegistration`   |
| `section`     | Page or module                | `FormTemplateAdmin`, `formdata`, `outsideprocessadmin` |

**Examples:**

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/
https://vv5dev.visualvault.com/app/WADNR/fpOnline/FormTemplateAdmin
https://vv5dev.visualvault.com/app/CityOfLincoln/Phase2/formdata
```

### Form Viewer (separate app — fills in a form record)

```
https://{env}.visualvault.com/FormViewer/app?hidemenu=true&formid={revisionGUID}&xcid={customerGUID}&xcdid={databaseGUID}
```

- `formid` — GUID of the Form Template **Revision** (not the template ID). The API returns this as `revisionId`. A template has one released revision at a time; creating a new revision generates a new GUID. Confirmed 2026-04-09: template `6b31453b-...` has revision `ff59bb37-...` — the URL uses the revision GUID.
- `xcid` — customer identifier (accepts both GUID and alias string, e.g., `EmanuelJofre`)
- `xcdid` — database identifier (accepts both GUID and alias string, e.g., `Main`)
- `hidemenu=true` — hides the VV navigation shell (typical for end-user forms)

The FormViewer accepts additional URL parameters beyond the core four (`formid`, `DataID`, `xcid`, `xcdid`): `RelateForm`/`IsRelate` (relate on create), `PDF`, `lang`, `tab`, `isReadOnly`, `fillInKey`, and lookup params. See [FormViewer URL Parameters Reference](../reference/formviewer-url-params.md) for the complete catalog (extracted from Angular source, verified 2026-04-16).

Note: `xcid`/`xcdid` accept customer/database **alias strings** as well as GUIDs. Using aliases is simpler when building URLs from config. The REST API `getFormTemplates()` response does NOT include `customerId` or `customerDatabaseId` fields, so you cannot obtain GUIDs from template metadata — use `customerAlias`/`databaseAlias` from your config instead. Verified 2026-04-09 on vvdemo.

Opening a template URL creates a **new blank form instance** each time (named sequentially, e.g., `DateTest-000012`). Instance names are formed as `<FormName-truncated-to-8-chars>-NNNNNN` with a zero-padded 6-digit counter — short names like `DateTest` pass through unchanged; longer names are truncated (e.g., `Date Test Harness` → `Date Tes-007576`). The counter increments per-template and persists across the table's lifetime.

**Post-save URL behavior (V2 divergence, 2026-04-22)**: When a form is saved via `VV.Form.Save()` on a template URL, `VV.Form.DataID` updates internally to the new record's GUID, but — at least under V2 on vv5dev — the browser URL is NOT rewritten to include `?DataID=...`. The URL stays at `?formid=...` (template mode). Consequence: `page.reload()` (or a browser refresh) re-loads a fresh empty template and silently drops the just-saved record from the view. To reload the saved record, navigate explicitly to the saved-record URL built from `VV.Form.DataID`. This is observable under V2 — V1 behavior may differ (it's possible V1 does push the URL update via Angular routing, but we have not verified on a V1 env). Documented via the withdrawn `FORM-BUG-V2-SAVE-RELOAD-EMPTY` investigation in [`docs/reference/form-fields.md`](../reference/form-fields.md#known-bugs-calendar-field).

To reopen a **saved record**, use the `DataID` parameter instead of `formid`:

```
https://{env}.visualvault.com/FormViewer/app?DataID={recordGUID}&hidemenu=true&rOpener=1&xcid={customerGUID}&xcdid={databaseGUID}
```

- `DataID` — GUID of the specific form record (replaces `formid`)
- `rOpener=1` — indicates the form was opened from a record list

The FormViewer is a completely separate SPA from the main VV shell. It runs independently with its own URL structure.

### Form Details (opens a saved record within the VV app shell)

```
https://{env}.visualvault.com/app/{customer}/{database}/FormDetails?DataID={recordGUID}&Mode=ReadOnly&hidemenu=true
```

This is the route used by dashboards and the VV app to open form records. Unlike `FormViewer/app`, this loads VV.Form on the main page (no iframe, no standalone SPA). The dashboard's record-click link generates this URL via `VV.OpenWindow()` in a popup window.

### Dashboard Detail (shows a grid of form records)

```
https://{env}.visualvault.com/app/{customer}/{database}/FormDataDetails?Mode=ReadOnly&ReportID={dashboardGUID}
```

- `ReportID` — GUID identifying the dashboard/report to display
- `Mode=ReadOnly` — standard view mode (click a record to open it in FormViewer)

This is an ASP.NET page (not the Angular FormViewer SPA) using Telerik RadGrid for server-side rendering.

### Document Detail (opens a document's properties in a popup)

```
https://{env}.visualvault.com/app/{customer}/{database}/DocumentDetails?DhID={documentHistoryId}&hidemenu=true
```

- `DhID` — the document history ID (different from `documentId` — see API response `id` field vs `documentId` field)
- Opens in a popup window via `VV.OpenWindow()` when clicking a document name in the Document Library grid
- Contains 11 tabs: Details, Parent, Children, Related, Forms, Projects, ID Card, **Index Fields**, Revisions, History, Security
- Index Fields tab shows editable date/text/dropdown fields when document is checked out

### Public Portal

Anonymous public-facing forms are served from a parallel `/Public/*` URL path that mirrors `/app/*` but requires no authentication. Customers expose individual forms (permit applications, intake, public submissions) through this namespace without granting site accounts to external users.

```
https://{env}.visualvault.com/Public/form_details?formid={revisionGUID}&...
```

Public users are authenticated as a system user literally named `"public"`. Client scripts detect the mode via `sessionStorage.UserInfo.name.toLowerCase() === "public"` and rewrite `/app` → `/Public` in any URL they generate so the link lands in the correct namespace. Example: `VV.Form.Global.FillinAndRelateForm` performs this rewrite before building its target URL (verified in the global function source, 2026-04-16).

---

## Navigation Map

All sections are accessed from the top nav bar within `https://{env}.visualvault.com/app/{customer}/{database}/`:

| Nav Label                  | URL Path                                             | Description                                                                                                                              |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Library**       | `/DocumentLibrary`                                   | Folder-tree document storage. Left panel = folder tree, right = file list. Has a Recycle Bin. Breadcrumb: `Documents > Document Library` |
| **Form Templates**         | `/FormTemplateAdmin`                                 | Admin view to create/manage form schemas. Breadcrumb: `Forms > Form Template Administration`                                             |
| **Form Library**           | `/FormDataAdmin`                                     | End-user list of all forms available to fill in. Each row has a "Fill-In" link. Breadcrumb: `Forms > Form Library`                       |
| **Dashboards**             | `/formdata`                                          | List of dashboards showing submitted records. Breadcrumb: `Forms > Form Data Dashboards`. See [Dashboard Details](#dashboard-details)    |
| **Reports** (submenu)      | —                                                    | Dropdown with sub-items below                                                                                                            |
| ↳ Analytics Dashboards     | `/Dashboards`                                        | Analytics/BI dashboards (separate from form dashboards). Note: UI label has typo "Dasboards"                                             |
| ↳ VV Reports               | `/VisualVaultReports`                                | Report generation and viewing                                                                                                            |
| **Process Design Studio**  | `/ProcessDesignStudio?access_token=...`              | Visual BPMN workflow designer. Separate app. Token is a long encrypted payload regenerated per session                                   |
| **Admin Tools** (dropdown) | —                                                    | See [Admin Tools](#admin-tools) below                                                                                                    |
| **Enterprise Tools**       | Via Control Panel                                    | Dropdown with sub-items below. Breadcrumb prefix: `Control Panel > Enterprise Tools`                                                     |
| ↳ Data Connections         | `/ConnectionsAdmin`                                  | SQL Server connections backing VV databases                                                                                              |
| ↳ Microservice Library     | `/OutsideProcessAdmin`                               | External service endpoints (harness scripts appear here)                                                                                 |
| ↳ Scheduled Services       | `/SchedulerAdmin`                                    | Cron-like automation for registered microservices                                                                                        |
| ↳ Module Library           | `/ModuleAdmin`                                       | Reusable module/component library                                                                                                        |
| ↳ Offline Forms            | `/OfflineForms/index.html#!/land?xcid=...&xcdid=...` | Offline form fill-in. Separate AngularJS SPA with its own routing                                                                        |

---

## Dashboard Details

### Dashboard List (`/formdata`)

The **Dashboards** nav item (`/formdata`) shows a RadGrid of all form dashboards. Grid columns: View, Edit, Name, Modify Security, Created By, Created Date. Default page size 15, sorted alphabetically by Name. View/Edit links use `__doPostBack` to navigate.

### Dashboard Detail

Clicking "View" on a dashboard in the list opens the detail view:

```
/FormDataDetails?Mode=ReadOnly&ReportID={dashboardGUID}
```

- `Mode=ReadOnly` — standard view mode (records are read-only in the grid; click to open for editing)
- `ReportID` — GUID identifying which dashboard/report to display

### Rendering Technology

Dashboards use **Telerik RadGrid** (ASP.NET WebForms) — a **server-side rendered** grid component. The server queries the SQL database, formats values in .NET, and sends pre-rendered HTML. The browser renders static HTML with no client-side date processing.

**Key implication:** Browser timezone has **zero effect** on displayed date values. BRT, IST, and UTC0 users see byte-identical content for the same dashboard. This is fundamentally different from the FormViewer (Angular SPA with client-side `moment.js` date processing).

### Grid Structure

| Property       | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Grid component | Telerik RadGrid (`.RadGrid`, `.rgMasterTable`)                       |
| Row classes    | `.rgRow` (even), `.rgAltRow` (odd)                                   |
| Header links   | `.GridHeaderLink` (sortable column headers)                          |
| Pager          | `.rgPagerCell` — configurable page size (10/15/20/25/50/100/200/500) |
| Default sort   | By Form ID descending (most recent first)                            |

**Row data attributes** (useful for Playwright automation):

- Checkbox `dhid` attribute = DataID (revisionId GUID)
- Checkbox `dhdocid` attribute = instance name (e.g., `DateTest-001584`)

**Column layout:** Columns are sorted **alphabetically** by field name (Field1, Field10, Field11, ..., Field2, Field20, ..., Field7), not numerically. The first column is always Form ID.

### Date Display Format

The server formats dates based on the field's `enableTime` property:

| enableTime | Server Format      | Example             |
| :--------: | ------------------ | ------------------- |
|  `false`   | `M/d/yyyy`         | `3/15/2026`         |
|   `true`   | `M/d/yyyy h:mm tt` | `3/15/2026 3:00 AM` |

The `ignoreTimezone` and `useLegacy` flags do **not** affect the server-side display format — only `enableTime` matters.

### Features

| Feature         | Details                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sort**        | Click any column header to sort ascending/descending (server postback via `__doPostBack`)                                                                                                  |
| **Search**      | SQL filter builder (`a[title="Toggle search toolbar display"]`) — see [SQL Filter](#sql-filter-behavior) below                                                                             |
| **Export**      | Excel (`.xls`), Word (`.doc`), XML (`.xml`) — inside a collapsible dock panel (hidden by default, toggle via toolbar "Export" button). See [Export Behavior](#export-behavior) below       |
| **Print**       | Print dialog with page range selection                                                                                                                                                     |
| **Record Edit** | `window.open()` opens `FormDetails?DataID={guid}&hidemenu=true` in a named popup (`window_edit_{formInstanceName}`). Reuses existing popup if open. Loads VV.Form on the page (no iframe). |
| **Pagination**  | Server-side paging with configurable page size                                                                                                                                             |

### Sort Behavior

Dates sort **chronologically** (as proper datetime values), not alphabetically as text. Time components are included in DateTime sort (e.g., `3/15 5:30 PM` sorts after `3/15 2:30 PM` on the same date).

**Empty cell positioning:** Empty cells sort to **TOP** in ascending order and **BOTTOM** in descending order.

**Playwright note:** `__doPostBack` in Playwright's `page.evaluate()` fails because ASP.NET's `PageRequestManager._doPostBack` accesses `arguments.callee`, forbidden in strict mode. **Preferred workaround:** `page.addScriptTag({ content: "__doPostBack('target', '')" })` — injects a `<script>` tag that runs in the page's own non-strict context. Alternative: `page.goto('javascript:void(__doPostBack(...))')` — the navigation may reject but the postback still fires. After triggering, use `page.waitForResponse(resp => resp.request().method() === 'POST')` to detect the AJAX partial postback completion (not `waitForNavigation`, which times out for UpdatePanel postbacks).

**Pagination (FormDataDetails):** Verified pattern for iterating pages — inject a script tag that calls `__doPostBack` on the Next Page button's name attribute (the button class is stable: `input.rgPageNext` inside `.rgPagerCell`), then `page.waitForFunction` that the first row's Form ID text has changed from its pre-click value. This detects AJAX partial postback completion reliably (the `waitForResponse('POST')` fallback can match unrelated postbacks). Clicking the Next button via Playwright's `btn.click()` is unreliable — the `javascript:__doPostBack(...)` href doesn't always fire through the Playwright click path. Page-size bump via `$find(gridId).get_masterTableView().set_pageSize(N); mtv.rebind()` fires the postback without error but does NOT reliably reload the grid at the new size — iterate pages instead.

### SQL Filter Behavior

The dashboard has a **hidden SQL filter panel** (`txtSQLFilter` textarea) that accepts raw SQL WHERE clauses. It can be driven programmatically by setting the textarea value and triggering `__doPostBack` on the Update button.

**Note:** The search/filter toolbar is **not guaranteed** on all dashboards. Newly created dashboards may lack the filter toolbar entirely (no `rgFilterRow`, no `Toggle search toolbar display` link). The filter must be enabled in the dashboard's Edit settings (VV Admin).

**Date comparison semantics on DateTime columns:**

| Query                                     | Behavior                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `Field6 = '3/15/2026'`                    | Matches **midnight only** — server treats date-only input as `3/15/2026 12:00 AM` |
| `Field6 >= '3/15' AND <= '3/15 11:59 PM'` | Matches **all times** on that date — use range queries for DateTime columns       |

Date-only columns (`enableTime=false`) are unaffected — `=` works as expected because all values store midnight.

### Cross-Layer Format Difference

The dashboard and the Forms Angular SPA use different date format strings:

| Layer     | Format       | Example      |
| --------- | ------------ | ------------ |
| Dashboard | `M/d/yyyy`   | `3/15/2026`  |
| Forms SPA | `MM/dd/yyyy` | `03/15/2026` |

For DateTime fields with `ignoreTZ=false`, there is also a **time shift**: the dashboard renders the stored `datetime` value directly (e.g., `2:30 PM` for DB value `14:30:00.000`), while Forms V1 shifts the time because `FormInstance/Controls` serializes postForms-created records with a Z suffix that V1 interprets as UTC (e.g., `11:30 AM` in BRT = 14:30 − 3h). Fields with `ignoreTZ=true` preserve the display time but still differ in leading-zero format.

### Export Behavior

The export dock panel (`dockExport`) starts **hidden** (`display: none`). The "Export" toolbar button toggles its visibility. Export buttons inside the panel use `__doPostBack` to trigger server-side file generation.

**Format details:**

| Format | Extension | Actual Type | Structure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel  | `.xls`    | HTML        | Single `<table>` with `<td>` cells — same as grid display. Opens in Excel via HTML import.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Word   | `.doc`    | HTML        | Identical to Excel (same HTML table). Only the MIME type differs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| XML    | `.xml`    | XML         | `<VisualVault>` root with XSD schema. **Row elements are named after the form template with spaces stripped** — e.g., `"Date Test Harness"` on vv5dev produces `<DateTestHarness>`; `"DateTest"` on vvdemo produces `<DateTest>`. Field names use `_x0020_` for spaces (e.g., `Form_x0020_ID`). Dates in ISO 8601: `2026-03-15T00:00:00+00:00`. Parsers must auto-detect the row tag rather than hardcoding it (the `dash-export.spec.js` helper does this by picking the opening tag whose occurrence count matches `<Form_x0020_ID>` count). |

**Scope:** All exports include **ALL records** across all pages (not just the current page). A dashboard with 432 records and page size 200 still exports all 432 rows.

**Date format differences from grid:**

- Excel/Word: Date-only fields get `12:00:00 AM` appended (e.g., grid `3/15/2026` → export `3/15/2026 12:00:00 AM`). DateTime fields match grid format.
- XML: All dates are ISO 8601 with `+00:00` UTC offset. Calendar dates match grid.

**Export button IDs** (for automation):

| Button | ID                                                                    |
| ------ | --------------------------------------------------------------------- |
| Excel  | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnExcelExport2` |
| Word   | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnWordExport2`  |
| XML    | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnXMLExport2`   |

**Reproducible test:** `npx playwright test testing/specs/date-handling/dash-export.spec.js` (or individual format: `--grep "excel export"`)

### DataID = revisionId

The `DataID` parameter in the FormViewer URL corresponds to the `revisionId` returned by the VV REST API (also available as the last path segment of the `href` field in form query results). There is no separate `dataId` field in API responses.

---

## FormTemplateAdmin Details

The **Form Templates** page (`/FormTemplateAdmin`) uses Telerik RadGrid — the same framework as dashboards — but with a different column layout and row-level actions for template management.

### Grid Structure

| Property          | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Table ID          | `ctl00_ContentBody_DG1_ctl00`                                             |
| CSS class         | `rgMasterTable rgClipCells`                                               |
| Row classes       | `.rgRow` (even), `.rgAltRow` (odd) — same as Dashboard                    |
| Pager style       | `NextPrevAndNumeric` — numbered page links + First/Prev/Next/Last buttons |
| Default page size | 15 rows (configurable via `rcbInput radPreventDecorate` combo)            |

### Column Layout (12 columns)

| Index | Column            | Content / Element                                                                |
| :---: | ----------------- | -------------------------------------------------------------------------------- |
|   0   | (Select)          | Empty/checkbox                                                                   |
|   1   | Category          | e.g., "None"                                                                     |
|   2   | **Template Name** | Key identifier (used for lookups)                                                |
|   3   | Form Design       | "View" link (`lnkView`)                                                          |
|   4   | Description       | Template description text                                                        |
|   5   | Status            | "Released" (live) or "Release" (draft)                                           |
|   6   | New Rev           | Link to create new revision (`lnkNewRevision`)                                   |
|   7   | Revision          | Version number (e.g., "2.3")                                                     |
|   8   | Import            | `<a onclick="DisplayFileUploadForImport(this)">` — can be `aspNetDisabled`       |
|   9   | **Export**        | `<a title="Export Form Template" href="javascript:__doPostBack(...)">Export</a>` |
|  10   | Copy              | `<a>` link (`lnkCopyTemplate`)                                                   |
|  11   | Modified Date     | e.g., "5/22/2025 12:21 PM"                                                       |

### Template Revision Workflow

Templates follow a release lifecycle: **Released** (live, read-only) → **New Revision** (draft, editable) → **Released** (new version live).

**Creating a new revision:**

1. Click **"New Rev"** (`lnkNewRevision`) on the released row → opens a dock panel
2. Fill **Revision** (e.g., `"1.2"` — must be unique per template) and **Change Reason** (required on vv5dev)
3. Click **Save** → grid now shows two rows: released + draft (status text: `"Release"`, not `"Draft"` — the grid shows the action verb, not the state noun). Automation must match `status !== 'Released'` to find unreleased revisions

**Editing a draft revision:**

1. Click **"View"** (`lnkDesign`) on the draft row — opens the Form Designer in a popup via `VV.OpenWindow()`
2. Make changes in the designer → **File > Save Template**
3. Back in FormTemplateAdmin, click **"Release"** (`lnkChangeState`) on the draft row

**Link types on each row:**

| Link ID                 | Text                   | Mechanism                                   | Notes                                                                                                                   |
| ----------------------- | ---------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `lnkFormDetail`         | (name)                 | `VV.OpenWindow()` popup                     | Opens template detail/preview                                                                                           |
| `lnkDesign`             | "View"                 | `VV.OpenWindow()` popup                     | Opens Form Designer (edit if draft, view-only if released)                                                              |
| `lnkChangeState`        | "Released" / "Release" | `__doPostBack` or no-op                     | Toggle release state                                                                                                    |
| `lnkNewRevision`        | "New Rev"              | `__doPostBack` → dock panel                 | Creates a new draft revision                                                                                            |
| `lnkImportTemplate`     | "Import"               | `DisplayFileUploadForImport()` → dock panel | Opens RadAsyncUpload dock for XML import. Not `__doPostBack` — uses a JS function. Button: `btnFormDesignerBeginImport` |
| `lnkExportFormTemplate` | "Export"               | `__doPostBack` → file download              | Exports template XML                                                                                                    |
| `lnkCopyTemplate`       | "Copy"                 | `__doPostBack`                              | Clones the template                                                                                                     |

**REST API import** (`PUT /formtemplates/{id}/import`): Also available via `vvClient.forms.importFormTemplate(data, revisionId, xmlBuffer)`. Returns 400 `"Form Template revision is released"` if the target revision is not a draft — must create a new revision first via the admin UI, then import into the draft. The `{id}` is the revision GUID.

**XML import behavior on vv5dev**: The platform auto-populates `<Mask>MM/dd/yyyy</Mask>` on all calendar fields during import (even if the source XML has no `<Mask>`), but does **not** auto-set `<EnableQListener>` — that property is preserved as-is from the imported XML. Always verify field properties after import on vv5dev.

### Form Designer

The Form Designer is a standalone Angular/Kendo application at:

```
https://{env}.visualvault.com/FormDesigner/index.html#!/formdesigner?xcid={customerGUID}&xcdid={databaseGUID}&formId={revisionGUID}&hidemenu=true
```

- `formId` is the **revision GUID** (not the template GUID)
- `xcid` and `xcdid` require **actual GUIDs** — string aliases (e.g., `"WADNR"`, `"fpOnline"`) cause a `formErrorCode` null reference error. Get the GUIDs from the `VV.OpenWindow()` call in the FormTemplateAdmin grid row's `lnkDesign` onclick handler
- Opened via `VV.OpenWindow()` from the FormTemplateAdmin grid — not directly navigable from the VV shell
- **Left panel:** Controls tree (field names, buttons, containers). The list deduplicates by name — if two controls share the same name, only one appears in the list. The duplicate is invisible in the UI but present in the exported XML. Verified on FPAN-Amendment-Request (two `Con_SignatureHeader` containers with different GUIDs, only one shown in Controls panel)
- **Right panel:** Control Properties — shows field config when a control is selected
- **Menu bar:** Kendo menubar with File (Save Template, Preview), Edit, View, Field, Container, Page
- **Save:** File > Save Template (menu item text: `"Save Template"`, in `.k-item.topMenuTopLevel` Kendo menu)

**Key property IDs in the designer** (accessible via `document.getElementById()`):

| Property             | Input ID                  | Type     | Notes                 |
| -------------------- | ------------------------- | -------- | --------------------- |
| Name                 | `name` (sometimes absent) | text     | Field name            |
| Mask                 | `mask`                    | text     | Display format mask   |
| Enable Time          | `enableTime`              | checkbox | DateTime vs date-only |
| Ignore Timezones     | `ignoreTimezones`         | checkbox | TZ display behavior   |
| Enable Initial Value | (in properties panel)     | checkbox | Pre-populate on load  |

### Template Storage Formats

The Form Designer produces two distinct storage formats depending on when the template was created:

- **XML format** (legacy): ExportForm endpoint returns a full `<FormEntity>` XML download. All field properties stored explicitly. Used by older templates.
- **JSON format** (newer): ExportForm returns nothing. Design data accessible only via PreFormsAPI (`/FormTemplate/Controls/{revisionId}`). Uses a **sparse format** — only non-default property values are stored; the platform injects defaults at runtime. FormViewer requires `formid={revisionId}` (the template CH ID fails with "Could not locate Form Template").

Both formats produce identical runtime behavior in `fieldMaster` for the same field configuration. See `docs/reference/form-template-xml.md` § XML vs JSON Template Format.

**Identification**: JSON templates are identifiable by ExportForm returning no download, or `contentHash: null` in the extract manifest.

### Export Mechanism

The Export link triggers `__doPostBack(eventTarget, '')` which sends a server-side request to generate the template XML. The server responds with a file download (Content-Disposition attachment). This is an **AJAX partial postback** (UpdatePanel) — the grid refreshes after the download starts. **Only works for XML-format templates** — JSON-format templates return no download.

The downloaded XML is a `<FormEntity>` document containing the full template definition: metadata, pages, fields, scripts, groups/conditions, and PDF settings. See `docs/reference/form-template-xml.md` for the XML format reference.

### REST API — `GET /api/v1/{customer}/{db}/formtemplates`

Listing endpoint behavior (`vvClient.forms.getFormTemplates()`), verified 2026-04-20 on vv5dev/EmanuelJofre:

- **Released-only filter**: returns only templates whose current revision is Released. Draft (never-released) templates are invisible — they exist in the admin grid but not in the API. A new template appears in the API the first time it is Released.
- **Silent empty on missing permission**: if the authenticated OAuth user lacks form-template read permission on the target customer/database, the response is `status: 200` with `data: []` — no `401`/`403`. Distinguish "no access" from "no templates" by cross-checking against the admin grid or another user.
- **Metadata only**: the response has `id`, `revisionId`, `name`, `description`, `revision`, `status`, `modifyDate`, `createDate`, etc. The template XML content is NOT included — use `/ExportForm?...` (browser session required) or the PreFormsAPI `/FormTemplate/Controls/{revisionId}` endpoint to fetch content.

### Pagination

Pager buttons use ASP.NET `__doPostBack` for page changes:

- **Numbered page links** (`.rgNumPart a`): `href="javascript:__doPostBack('ctl00$ContentBody$DG1$ctl00$ctl03$ctl01$ctlNN', '')"` — link text is the page number
- **Current page**: marked with `class="rgCurrentPage"` and `onclick="return false;"` (no-op click)
- **Arrow buttons** (`.rgPageFirst`, `.rgPagePrev`, `.rgPageNext`, `.rgPageLast`): `<input type="button">` with `onclick="return false;__doPostBack(...)"`

**Automation note:** Page size combo box supports values like 15 (default). To show all rows, change via the RadComboBox client API or iterate pages.

---

## Authentication & Login

### Post-Login Redirect

Different VV environments redirect to different pages after successful login:

| Environment | Redirect Target                              | Notes                               |
| ----------- | -------------------------------------------- | ----------------------------------- |
| `vvdemo`    | `/app/{customer}/{db}/FormDataAdmin`         | Standard VV shell with Form Library |
| `vv5dev`    | `/VVPortalUI/home?access_token=<long token>` | Portal UI with access token in URL  |

**Playwright implication:** Cannot use a fixed `waitForURL('**/FormDataAdmin**')` pattern for all environments. Use a generic post-login detection like checking that the URL path is no longer `/` or a login path.

---

## Enterprise Tools

Located under **Control Panel > Enterprise Tools** (breadcrumb). These are the integration and automation sections — most relevant to scripting work.

### Microservices

**URL:** `/outsideprocessadmin`
**UI Label:** "Microservices" (formerly called "Web Services" in older VV docs)
**Breadcrumb:** Control Panel > Enterprise Tools > Microservice Library

Where external service endpoints are registered. The Node.js server (vv-ai-harness) appears here.

| Column              | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Service Name        | Identifier used by forms and scheduled services                       |
| Service Description | Human-readable description                                            |
| Category            | `Form` = triggered by form button/event; `Scheduled` = cron-triggered |
| Service Type        | `NodeServer` for the Node.js microservices server                     |
| Timeout             | Request timeout (0 = default)                                         |
| Callback            | Boolean — whether VV waits for a response                             |

**How it connects to the harness:** When a form event fires or a scheduled process runs, VV calls the registered URL in this library. The harness server receives the POST, executes the script code, and returns results.

**REST API:** `GET /outsideprocesses` returns all registered microservices with metadata: `id`, `name`, `description`, `processCategory` (0=Form, 1=Scheduled, 5=Workflow), `processType`, `createDate`, `createBy`, `modifyDate`, `modifyBy`. Does **NOT** include script source code. Individual resource fetch (`GET /outsideprocesses/{id}`) returns HTTP 405 — not supported. Note: the VV client returns the response as a **raw JSON string** — parse with `typeof res === 'string' ? JSON.parse(res) : res` before accessing `.data`.

**No REST API for creating microservices** — CRUD operations (create, update, delete) are only available via the admin UI.

#### Toolbar

| Button                   | Title attribute                 | Notes                                  |
| ------------------------ | ------------------------------- | -------------------------------------- |
| Add Service              | `AddOutsideProcess`             | Opens empty dock panel for new service |
| Delete Selected Services | `Remove selected microservices` | Deletes checked rows                   |

Toolbar buttons are Telerik RadToolBar items (`a.StandardToolBarButton.rtbWrap`).

**WADNR stats (2026-04-08):** 272 registered microservices (44 Form, 19 Scheduled, 209 Workflow).

#### Microservice Detail Panel

Clicking a service name in the grid opens an inline **"MICROSERVICE DETAILS"** dock panel (Telerik RadDock, not a popup or separate page). The panel opens via ASP.NET `__doPostBack` AJAX partial postback.

**Detail panel fields:**

| Field                      | Element                         | Notes                                                                                                                                      |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Name                       | `txtOpName`                     | Service name (editable). `_` and `-` are valid characters.                                                                                 |
| Description                | `txtDescription`                | (editable)                                                                                                                                 |
| Service Type               | `ddlCategory`                   | Dropdown (see options below)                                                                                                               |
| Connection Type            | `ddlConnectionType`             | Dropdown: `1`=Web Service, `2`=Node.Js Server. **Changing this triggers a postback** that switches between `txtWSURL` and `txtScriptCode`. |
| Timeout                    | `txtServiceTimeout`             | Long Running Service Settings section                                                                                                      |
| Allow anonymous access     | checkbox                        | Security Settings section                                                                                                                  |
| IP Address Restrictions    | text                            | Security Settings section                                                                                                                  |
| Enable completion callback | `chkCompletionCallback`         | Completion callback section. When enabled, VV waits for `postCompletion()` to advance recurrence.                                          |
| Callback Timeout           | `txtCompletionCallbackTimeout`  | Numeric timeout value. Unit controlled by dropdown below.                                                                                  |
| Callback Timeout Unit      | `cboCompletionCallbackUnitType` | Minutes (0), Hours (1), Days (2), Weeks (3), Months (4), Years (5)                                                                         |
| WS URL                     | `txtWSURL`                      | Textarea — visible when Connection Type = Web Service (1)                                                                                  |
| **Script source**          | `txtScriptCode`                 | Textarea — visible when Connection Type = Node.Js Server (2). Full ID: `ctl00_ContentBody_dockDetail_C_txtScriptCode`                      |
| Script ID                  | `lblScriptId`                   | GUID displayed at bottom of panel                                                                                                          |

**Category dropdown values (`ddlCategory`):**

| Value | Label                         |
| ----- | ----------------------------- |
| 0     | Form Controls                 |
| 1     | Scheduled Service             |
| 2     | Web Service Data Query        |
| 3     | Two Factor Authentication     |
| 4     | User Session End              |
| 5     | Node.Js Script Service        |
| 6     | Form Workflow Web Service     |
| 7     | Document Workflow Web Service |

**Connection type postback:** Changing `ddlConnectionType` requires an ASP.NET `__doPostBack` to reload the dock panel with the correct fields. The dropdown value alone does not update the UI — the postback switches between `txtWSURL` (Web Service) and `txtScriptCode` (Node.Js Server). Without the postback, services may be saved with the wrong connection type and become invisible to the `outsideprocesses` API. Use `triggerPostback(page, 'ctl00$ContentBody$dockDetail$C$ddlConnectionType', 'outsideprocessadmin')` in Playwright.

**Grid column layout (10 columns, verified 2026-04-08):**

| Index | Column              | Notes                                      |
| :---: | ------------------- | ------------------------------------------ |
|   0   | (Select)            | Checkbox                                   |
|   1   | Service Name        | `lnkDetails` link — click opens dock panel |
|   2   | Service Description | Text                                       |
|   3   | Category            | ScriptType text                            |
|   4   | Service Type        | "NodeServer"                               |
|   5   | Timeout             | Numeric                                    |
|   6   | Callback            | Boolean text                               |
|   7   | ModifiedDate        | Timestamp                                  |
|   8   | ModifiedBy          | Email                                      |

**Automation (Playwright):** Script source extraction must use **response interception** (parse the AJAX response body for the textarea content) rather than DOM reads. The dock panel's textarea value becomes stale if the panel is hidden via CSS — hiding the panel prevents ASP.NET UpdatePanel from updating its content. Use `page.addScriptTag({ content: "__doPostBack(target, '')" })` to trigger postbacks (avoids strict-mode `arguments.callee` errors in `page.evaluate`). Response format is ASP.NET UpdatePanel delta: `length|type|id|content|...` (pipe-delimited).

### Scheduled Services

**URL:** `/scheduleradmin`
**UI Label:** "Scheduled Services"
**Breadcrumb:** Control Panel > Enterprise Tools > Scheduled Services

Cron-like configuration for automated scripts. Each schedule references a Microservice by name. No REST API exists for listing or creating schedules — the `scheduledProcess` manager only exposes `postCompletion()` and `runAllScheduledProcesses()`.

**Completion Callback behavior:** When the "Enable completion callback" flag on the linked Microservice is **disabled** (the default — all 20 WADNR scripts use this), VV advances recurrence based on the HTTP response alone. `postCompletion()` still sets the Result flag but does not gate the scheduler. When **enabled**, VV waits for `postCompletion()` (up to the Callback Timeout) before advancing recurrence.

**Timeout field unit is SECONDS.** Confirmed empirically: `Timeout=10` timed out a 15s-delayed script but allowed a 5s-delayed one (2026-04-14 on vvdemo). **Platform default (Timeout=0):** between 180s and 300s (3–5 min) — 180s delay succeeded, 300s timed out. At the boundary, VV throws `System.Threading.Tasks.TaskCanceledException` from `OutsideProcessNodeServer.DoOutsideProcess()` (`Auersoft.VisualVault.Engine.Entities.OutsideProcess.OutsideProcessNodeServer.cs:line 205`). The timeout is a .NET `Task.Wait()` cancellation — the Node server and script continue running; VV simply stops waiting for the HTTP response.

**No REST API for creating scheduled services** — CRUD operations are only available via the admin UI.

#### Toolbar

| Button                    | Title attribute             | Notes                  |
| ------------------------- | --------------------------- | ---------------------- |
| Add a Scheduled Service   | `Add a Scheduled Service`   | Opens empty dock panel |
| Delete Selected Schedules | `Remove Selected Schedules` | Deletes checked rows   |

#### Schedule Detail Panel

Clicking a schedule name opens an inline dock panel with these fields:

| Field                | Element                                     | Notes                                                                                                                |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Name                 | `txtSpName`                                 | Schedule name (required). `_` and `-` are valid characters.                                                          |
| Description          | `txtSpDescription`                          | (optional)                                                                                                           |
| Enabled              | `chkEnabled`                                | Checkbox — activates the schedule                                                                                    |
| Localization         | `DdlCultureCode`                            | Dropdown: en-US, pt-BR, zh-HANS, es-PE, es-CO                                                                        |
| Start Date           | `calStartDate1`                             | Telerik RadDatePicker                                                                                                |
| Start Time           | `txtStartHour`, `txtStartMinute`, `cboAMPM` | Hour/minute/AM-PM                                                                                                    |
| Recurring            | `chkRecurring`                              | **Defaults to checked on new items.** Must uncheck or provide interval — save fails with validation error otherwise. |
| Recurrence Interval  | `txtRecurrenceInterval`                     | Numeric (e.g., "2")                                                                                                  |
| Recurrence Unit      | `cboRecurrenceUnitType`                     | Minutes (0), Hours (1), Days (2), Weeks (3), Months (4), Years (5)                                                   |
| Linked Service       | `cboOutsideProcessName`                     | Dropdown of Microservices with Category = Scheduled. References by GUID, displays by name.                           |
| Test Microservice    | `btnTest_input`                             | Triggers immediate execution (see below)                                                                             |
| Save And Add Another | `btnSaveAndAdd_input`                       | Saves and resets panel for next entry                                                                                |
| Save                 | `btnSave_input`                             | Saves current entry                                                                                                  |
| Close                | `btnCancel_input`                           | Closes panel without saving                                                                                          |

**"Test Microservice" button behavior:** Triggers an immediate execution of the linked service via the VV cloud → Node.js server pipeline. The response appears in a RadWindow dialog titled "Response from OutsideProcess". The dialog shows the `response.json()` message from the script (e.g., `"ScheduledProcessTestHarness Started"`). **Does NOT update "Last Run Date"** in the grid and **does NOT create a log entry** in the Scheduled Service Log — the Test button only shows the response in the dialog. Log entries are only created by automatic scheduled triggers. Verified 2026-04-14 via ngrok request history (confirmed scripts executed on server but no log entries appeared).

**"View" link / Scheduled Service Log:** The `lnkViewLog` link in grid column 2 opens a `dockScheduledProcessLog` RadWindow showing execution history. Grid columns: Row, Scheduled Run Date, Actual Run Date, Completion Date, Result (True/False), Message. The **Message column** shows the `response.json()` message, not the `postCompletion()` message — see `docs/guides/scripting.md` for details. Verified 2026-04-13 on WADNR production schedules.

**Grid column layout (verified 2026-04-08, WADNR: 21 schedules):**

| Index | Column        | Type     | Notes                                                                     |
| :---: | ------------- | -------- | ------------------------------------------------------------------------- |
|   0   | (Select)      | checkbox | Row selection                                                             |
|   1   | Name          | link     | Schedule name (`lnkDetails`)                                              |
|   2   | (View)        | link     | Detail view link                                                          |
|   3   | Enable        | text     | `"True"` / `"False"` (not a checkbox)                                     |
|   4   | Run State     | text     | `"Idle"` when not running                                                 |
|   5   | Set to Idle   | button   | `"Reset"` button (force-stops if stuck)                                   |
|   6   | Last Run Date | text     | Timestamp of last execution, or `"Not Run Yet"`                           |
|   7   | Recurrence    | text     | e.g., `"Every 2 Minutes"`, `"Every 365 Days"`, `"Recurrence Not Enabled"` |
|   8   | Next Run Date | text     | Calculated next execution timestamp                                       |
|   9   | Service Name  | text     | References a Microservice from `/outsideprocessadmin`                     |

**Note:** The documented column order had 8 columns, but the actual grid has 10 (index 2 "View" link and index 5 "Set to Idle" button were not listed). Verified by grid scraping on vv5dev/WADNR/fpOnline.

### Data Connections

**URL:** `/ConnectionsAdmin`
**UI Label:** "Database Connections"
**Breadcrumb:** Control Panel > Enterprise Tools > Data Connections

SQL Server connections backing the VV databases. Two connections exist per customer+database workspace:

| Connection                               | Type       | Description                    |
| ---------------------------------------- | ---------- | ------------------------------ |
| `use1d-demosql_vv5demo_EmanuelJofre_...` | SQL Server | VisualVault main database      |
| `use1d-demosql_vv5demo_EmanuelJofre_...` | SQL Server | VisualVault form data database |

Note: `ConnectionQueryAdmin` URL redirects here first. Click "Queries" on a connection to see its queries.

### Data Connection Queries

**URL:** `/ConnectionQueryAdmin?CcID={connectionGUID}`
**UI Label:** "Database Query Manager"
**Breadcrumb:** Control Panel > Enterprise Tools > Data Connections > Data Connection Queries

Named SQL queries defined on top of a connection. Used in dashboards, reports, and scripts via `vvClient.customQuery`.

| Column        | Notes                        |
| ------------- | ---------------------------- |
| Query Name    | Identifier used in API calls |
| Edit          | Opens query editor           |
| Description   | Human-readable               |
| Type          | `Text Query` (raw SQL)       |
| Cache Enabled | Enabled by default           |
| Cache Expires | Default 1.0 hrs              |

**Special `CcID`:** The form database uses `CcID=00000001-0000-0000-0000-c0000000f002` — this is the default form data connection. One query is typically created per form template.

**Query name validation:** Alphanumeric characters, hyphens, underscores, spaces, and commas are allowed. **Periods are not allowed** — use hyphens instead (e.g., `TC-2-4` not `TC-2.4`).

**Preview feature:** After entering SQL in the editor, click **Preview** to run the query and see results immediately without saving. Useful for ad-hoc DB inspection during testing.

**API usage:** `vvClient.customQuery.getCustomQueryResultsByName(queryName, params)` — positional args (name first, then params object). Also: `getCustomQueryResultsById(id, params)`. The client has no inline-SQL method — queries must be pre-registered here.

**Row ceiling:** The client library caps `getCustomQueryResultsByName` at **2000 records** per call. Beyond that, a paginating snippet (internal Cacher name `getAllRecords`) is required.

**Two read paths — filter (`q`) vs parameter (`params`) — behave differently** (verified 2026-04-24 on vv5dev):

| Path                                                              | How it's evaluated                                                                      |        Bypasses SQL cache?        |                    Sees fresh rows?                    | Failure mode                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | :-------------------------------: | :----------------------------------------------------: | --------------------------------------------------------------------------------------- |
| `q` filter (`{ q: "[col] eq 'val'" }`)                            | VV server applies the OData-style filter **after** the SQL query returns its result set | No — filters the post-SQL payload | Only if the fresh row is already in the SQL result set | Unknown column → HTTP 400 "Query syntax error"; known column, no match → HTTP 200 empty |
| `params` (`{ params: JSON.stringify([{parameterName, value}]) }`) | Bound directly into `@parameterName` placeholders in the SQL, executed server-side      |           Hits live SQL           |                   Yes — immediately                    | Wrong parameter name → SQL error surfaced in `meta.errors`                              |

**`q` filter column names must match the response-shape keys**, not raw SQL column names or form-API names. Custom query responses lowercase the first character of each SQL column/alias (`DhDocID` → `dhDocID`, see [Scripting — Field Name Casing](../guides/scripting.md#field-name-casing-response-key-transformation)), and `q` parses against those transformed names. `[instanceName]` (the form-API name) fails with HTTP 400. `[dhDocID]`, `[DhDocID]`, and bare `dhDocID` all resolve (the column token is case-insensitive) provided the response-shape name exists.

**`TOP N` without `ORDER BY` silently hides fresh rows from `q` filters on growing tables.** Because `q` runs post-SQL, rows beyond the unordered TOP cutoff are invisible — no error, just zero matches. Rule of thumb: any custom query that might be used with a `q` filter on a table that grows (form data, logs) should include `ORDER BY VVCreateDate DESC` so recent rows stay in the window. The `params` path does not have this problem because the WHERE clause lives in SQL, before TOP.

**On-the-wire serialization (verified 2026-04-22 on vv5dev):** SQL `datetime` columns return as ISO-8601 with trailing `Z` (e.g. `"2026-04-22T18:28:40.987Z"`), and SQL `datetimeoffset` returns as ISO-8601 with explicit offset (e.g. `"2026-04-22T18:28:40.9993913+00:00"`). The raw SQL Server `.ToString()` format (`YYYY-MM-DD HH:mm:ss.SSS`) is NOT what callers see — `customQuery` normalizes to ISO-8601 UTC on the response. The `SYSDATETIMEOFFSET()` offset reveals the SQL host OS TZ.

### Form Database Schema

Form field values are stored in SQL Server tables named after the form template. Each form template maps to one table. Schema confirmed via SSMS inspection (2026-04-06):

| Column                             | SQL Type           | Nullable | Notes                                              |
| ---------------------------------- | ------------------ | :------: | -------------------------------------------------- |
| `DhDocID`                          | `nvarchar(255)`    |    PK    | Form instance identifier (e.g., `DateTest-001584`) |
| `DhID`                             | `uniqueidentifier` |    No    | Internal GUID                                      |
| `VVCreateDate`, `VVModifyDate`     | `datetime`         |    No    | System timestamps                                  |
| `VVCreateBy`, `VVModifyBy`         | `nvarchar(256)`    |    No    | User email                                         |
| `VVCreateByUsID`, `VVModifyByUsID` | `uniqueidentifier` |    No    | User GUID                                          |
| `Field1` through `Field28`         | **`datetime`**     |   Yes    | All date fields — no `date`-only type exists       |
| `WSAction`, `WSConfigs`, etc.      | `nvarchar(max)`    |   Yes    | Test harness metadata (string fields)              |

Example query to inspect a saved record:

```sql
SELECT DhDocID, Field5, Field6, Field7
FROM DateTest
WHERE DhDocID = 'DateTest-001584'
```

**Date storage in SQL Server:** All date fields are **`datetime`** (binary, format-agnostic). The raw value serializes as `YYYY-MM-DD HH:MM:SS.mmm` (e.g., `2026-03-15 14:30:00.000`). The `M/d/yyyy h:mm:ss tt` format seen in the VV Query Admin Preview (e.g., `3/15/2026 2:30:00 PM`) is **.NET display formatting**, not the stored value. There is no timezone information at the SQL level — the `datetime` type is timezone-unaware. Empty fields store `NULL`.

**Critical implication:** Since there is no `date` column type, the `enableTime` flag is purely a client-side presentation control. Every "date-only" field can contain any time component depending on the write path. See [No Server-Side Date-Only Enforcement](#no-server-side-date-only-enforcement) below.

**VV demo server timezone:** Confirmed as **BRT (UTC-3)** by comparing `VVCreateDate` (server local timestamp) with `Field1` (`new Date().toISOString()` = UTC). Consistent 3-hour offset across all records (e.g., `VVCreateDate=12:53`, `Field1=15:53`). The server stores `VVCreateDate`/`VVModifyDate` in its local timezone, while `toISOString()`-derived field values are stored in UTC. `getSaveValue()`-derived values are timezone-ambiguous (local midnight stored as `00:00:00.000` regardless of actual UTC offset).

---

## Process Design Studio

**URL:** `/ProcessDesignStudio?access_token=...` (top-level nav item, not under Enterprise Tools)
**App type:** Single-Page App (Angular), separate from the main admin shell.

### Token-bound launch

The SPA cannot be loaded directly via URL. Navigating to `/ProcessDesignStudio/dashboard` without a freshly-issued `access_token` query string fails during boot with `TypeError: Cannot read properties of undefined (reading 'hostUrl')` (visible in the browser console; the page renders empty). The token is generated server-side **only** when the user clicks **Control Panel → Process Design Studio** — the link's `href` is rewritten with a long encrypted payload at click time. For Playwright automation: navigate to `/controlpanel`, click that link, then switch to the new tab. Direct URL navigation to PDS routes (including bookmarked URLs) will not work.

### i18n fallback

When the SPA boots but its translation bundle fails to load (the `Unable to fetch translations for en-US (app)` error in the console), the UI renders raw i18n keys instead of localized labels. Verified keys observed: `DASHBOARD.SIDE_MENU.ITEMS.{HOME,BUSINESS_PROCESS_STATS,PROCESSES,EVENTS,DATA,DATA_VIEWS,DATA_WAREHOUSE,WORKFLOWS,ANALYTICS,DATA_MODELS,DOCUMENT_CLASSIFIER}`, `WORKFLOW.{TITLE,SUB_TITLE,IN_PROCESS,IN_SEARCH,BTN_NEW,BTN_DELETE,TABLE.{NAME,DESCRIPTION,STATUS,MODIFIED,MODIFIEDBY,RUNNINGINSTANCES,OBJECT_ID,EXECUTION}}`, `EVENT_SOURCES.{TITLE,SUB_TITLE,BTN_NEW,BTN_DELETE,TABLE.{NAME,DESCRIPTION,CREATED,MODIFIED},CREATE_FORM.{NAME,TYPE,DESCRIPTION,DATA_SOURCE,FORM_TYPE_1,SELECT_FIELDS,SELECT_SUB_TYPE,SELECT_TYPE,EVENT_TYPE,EVENT_TYPES,EVENT_1,EVENT_2,EVENT_3,RELATED_PROCESSES,IN_USE},EDIT_FORM.{TITLE,BTN_OK,BTN_CANCEL},MODAL_CONFIRM.{TITLE,BTN_OK,BTN_CANCEL}}`, `HOME.{TITLE,SUB_TITLE}`, `DATA_WAREHOUSE.CREATE_FORM.{ADDITIONAL_FIELDS,ADDITIONAL_FIELDS_LABEL}`. Useful for Playwright selectors when translation is unreliable.

### Side menu structure

| Item                                         | Notes                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Home                                         | Default landing — shows counters (Workflows, Event Sources, Data Views, Events) and "Workflows in Progress" grid |
| Business Process Stats                       | —                                                                                                                |
| Processes                                    | —                                                                                                                |
| Events                                       | Event Sources list and create/edit (see below)                                                                   |
| Data → Data Views, Data Warehouse            | —                                                                                                                |
| Workflows                                    | Workflow list (Name, Description, Status, Modified, ModifiedBy, RunningInstances)                                |
| Analytics → Data Models, Document Classifier | —                                                                                                                |

### Workflow editor — tabs

`/ProcessDesignStudio/dashboard/workflows/edit/{workflowId}` opens four tabs in the right rail:

| Tab          | Content                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Designer** | Default view. BPMN canvas + Actions/Variables panel. Lists 18 action types: Copy or Move Document, Copy or Move Folder, Create Document from Template, Create Folder, Decision, Document Classifier, Document Data Lookup, Email, Finish, Form Data Lookup, Human Decision, Human Task, Loop, Microservice, Parallel Start & Join, Relate Form, Update Document, Update Form, Variable Assignment. |
| Events       | Event source bindings for this workflow                                                                                                                                                                                                                                                                                                                                                            |
| Test         | Manual workflow test runner                                                                                                                                                                                                                                                                                                                                                                        |
| **History**  | Past executions grid: Initiated By, Start Date, End Date, Version, Object ID, Status. Each row has Retrigger / View buttons.                                                                                                                                                                                                                                                                       |

### Workflow execution detail — variables

Clicking **View** on a History row opens the execution detail. The variables panel has **two distinct views** depending on what's selected:

| Selection                                | What the variables panel shows                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing selected (top-level)             | The **final** workflow-variable values after all steps ran. If any step errored, all values may show `Null` regardless of what data flowed through earlier steps.                                       |
| A specific step node (e.g. Microservice) | The values that were available **as input to that step**. This is the only place to see what the WF engine had at step entry — useful when the top-level shows `Null` but the engine actually had data. |

To see step-input values, click the step node in the BPMN visualization on the right side of the panel.

### Event Source — UI structure

Path: PDS dashboard → **Events** sidebar item (heading shows "Event Sources").

| Field                          | Notes                                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name (required)                | Free text                                                                                                                                                                                                                                                                                           |
| Type (required)                | Dropdown: `Form Data` or `Document Data`. Locked once the event source is referenced by a workflow.                                                                                                                                                                                                 |
| Description                    | Optional, max 255 chars                                                                                                                                                                                                                                                                             |
| Form template (Form Data type) | Dropdown of templates in the customer DB                                                                                                                                                                                                                                                            |
| Selected fields                | Multi-select listbox of fields from the chosen template. These become workflow variables on workflows that reference this event source.                                                                                                                                                             |
| Additional fields              | Multi-select. Includes `instancename` (the form record's instance name string).                                                                                                                                                                                                                     |
| Event Types                    | Three checkboxes labeled by i18n keys `EVENT_1`, `EVENT_2`, `EVENT_3`. The event-types that fire the event — e.g. on Form Data sources, EVENT_1/EVENT_2 are commonly checked together while EVENT_3 is left off (likely Created/Modified vs Deleted, but the i18n keys do not confirm the mapping). |
| Related Processes              | Read-only display of workflows currently using this source                                                                                                                                                                                                                                          |

**Locking rule:** Once an event source is referenced by a workflow ("Event source is being referenced by a workflow and only new fields can be added"), the Type, Form template, Selected fields, and Event Types become read-only. Only adding new fields is permitted.

---

## Admin Tools

Accessible from the "Admin Tools" dropdown in the top nav bar:

| Item                           | URL Path                                     | Description                                              |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| Users                          | `/UserAdmin`                                 | User management — create, edit, assign groups            |
| Groups                         | `/GroupAdmin`                                | Security groups — control access to forms, documents     |
| Portals                        | `/VisualVaultAdmin?SecurityType=PortalAdmin` | Customer-facing portal configuration                     |
| Menus                          | `/MenuAdmin`                                 | Custom navigation menus for portals                      |
| Dropdown Lists                 | `/DropDownListAdmin`                         | Shared dropdown/lookup lists reusable across form fields |
| Email Templates                | `/EmailTemplateAdmin`                        | Email notification templates                             |
| Site Administration: Locations | `/siteadmin?SecurityType=Location`           | Physical location definitions                            |
| Site Administration: Customers | `/siteadmin?SecurityType=Customer`           | Customer entity management                               |
| Site Administration: Suppliers | `/SiteAdmin?SecurityType=Supplier`           | Supplier entity management                               |

Note: Portals uses `/VisualVaultAdmin?SecurityType=PortalAdmin` (not `/PortalAdmin`). Site Admin sections use parameterized `/siteadmin?SecurityType=` URLs.

---

## User Menu

The user menu (top-right, shows the logged-in user's email) provides quick links via ASP.NET postbacks:

| Item            | URL / Mechanism                        | Description                                     |
| --------------- | -------------------------------------- | ----------------------------------------------- |
| Searches        | postback `lnkSearches`                 | Saved search management                         |
| Training        | postback `lnkTraining`                 | Training resources                              |
| Open Forms      | postback `lnkOpenForms`                | Forms currently open/in-progress                |
| Email Alerts    | postback `lnkEmailAlerts`              | Notification preferences                        |
| My Preferences  | `/UserProfile`                         | User profile and settings                       |
| Control Panel   | `/ControlPanel`                        | Admin control panel (leads to "My Preferences") |
| Central Admin   | postback `lnkCentralAdmin`             | Cross-customer administration                   |
| Advanced Search | `/AdvancedSearch?newsearch=true`       | Full-text search across documents and forms     |
| Saved Searches  | `/UserSearches`                        | Persisted search queries                        |
| Logout          | `/Login/{customer}/{db}?action=logout` | Session logout                                  |

### Language Support

The UI includes a language selector with: English, Brazil Portuguese, Spanish (Peru), Spanish (Colombia), Chinese (Simplified). Hidden field: `ctl00_CtrlMenu1_ddlLanguagesV5_ClientState`.

---

## Central Admin (Cross-Customer Control Panel)

Central Admin is the cross-customer super-user surface under `/ca/`. It's where platform-level customer provisioning and configuration lives — **this is where all customer-scoped toggles that affect system behavior are set**. Many platform behaviors that differ between environments trace back to settings here, so check these before assuming a behavior is a code-level bug.

Entry point: the **Central Admin** item in the top-right user menu (postback `lnkCentralAdmin`) → redirects to `/ca/SelectDatabase`.

### Access Control

Restricted to users flagged as Central Administrators. Regular customer accounts (and API-only service accounts like `apivv5`) can reach `/ca/SelectDatabase` but are bounced off `/ca/ConfigureCustomerDetails` via `/ca/centraladmin → /ca/SelectDatabase`. Playwright automation using non-CA service accounts cannot scrape these pages; use a CA-enabled browser session.

### URL Map

| Path                                                         | Purpose                                             |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `/ca/centraladmin`                                           | Access gate — redirects to SelectDatabase           |
| `/ca/SelectDatabase`                                         | Lists all customers × databases; entry point        |
| `/ca/SelectDatabase?tab=favorites`                           | Favorite databases sub-tab                          |
| `/ca/SelectDatabase?tab=alldatabases`                        | All databases sub-tab                               |
| `/ca/SelectDatabase?cid={customerId}&dbid={dbId}`            | "Login" link — SSOs into that customer's UserPortal |
| `/ca/ConfigureCustomerDetails?customerid={customerId}`       | Customer config landing (Details tab)               |
| `/ca/ConfigureCustomerDetails?customerid=...&tab={tabParam}` | Switch sub-tab (see table below)                    |

### Customer Configuration Tabs

Implemented as an outer RadTabStrip with one nested level. All tabs share the same URL — switching is a `tab=` query-string param, so each sub-view is directly linkable.

| Order | Label                             | `tab=` value                  | Content                                                                          |
| ----- | --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| 1     | Customer Details                  | `Details`                     | Name / Alias / Description / Active / **Time Zone** / Culture / Language / Logos |
| 2     | Users                             | `Users`                       | Users grid for the customer (filter: Enabled/Disabled/All × Online/All)          |
| 3     | Databases                         | `CustomerDatabases`           | Database grid: Name, **Database Version**, **Server Name**, DB / Form-DB names   |
| 4     | Settings                          | `Settings` / `ConfigSettings` | 13-section configuration form (see below) — parent tab                           |
| 4a    | Settings → Configuration Settings | `ConfigSettings`              | Default sub-tab of Settings — same content as `tab=Settings`                     |
| 4b    | Settings → Security Settings      | `SecuritySettings`            | Password Rules + Login Rules                                                     |
| 5     | Customer Administrators           | `Administrators`              | Grid of CA-privileged users for this customer                                    |
| 6     | Customer Billing                  | `CustomerBilling`             | Organization address + Subscription + audit-log grid of billing events           |

### Scope Hierarchy — Three Cascading Layers

Customer-level configuration is one of **three cascading scopes**. Understanding this is critical: a setting can be off at the scope you're looking at and still be on at runtime because a lower scope overrides it.

| Scope        | Where configured                                                                                  | Notes                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Environment  | Platform-wide (instance/server level)                                                             | Not yet located in `/ca/` UI — likely web.config/appsettings or a CA URL not exposed in the menu |
| Customer     | `/ca/ConfigureCustomerDetails?customerid=...&tab=ConfigSettings` (what we documented above)       | Same 15-section toolbar as Database scope                                                        |
| **Database** | `/ca/ConfigureCustomerDatabaseDetails?customerid=...&customerdatabaseid=...&tab=DatabaseSettings` | **Wins over Customer** when both set a value                                                     |

The `ConfigureCustomerDatabaseDetails` page has its own 6-tab strip (Database Details / Database Users / Vault Access Users / Database Settings / Content Providers / Index Management). `Database Settings` is the tab that hosts the same Configuration Sections toolbar described below, but scoped to the database.

**Landmark verification** — `useUpdatedCalendarValueLogic` (V1/V2 calendar logic) is **unchecked at customer scope but checked at database scope** on vv5dev/EmanuelJofre. Runtime probes (`tools/explore/probe-v1-v2-flag.js`) report V2 active, which matches the database scope, confirming DB-over-Customer override. `setUserInfo()` is what pushes the resolved effective value to the client.

Practical consequence: **always check the database-scope toggle, not just the customer-scope one** before concluding a setting is off. Every test on vv5dev/EmanuelJofre so far has been running under database-scope V2, not V1 like vvdemo.

**Scope of the V2 toggle — Form Viewer only** (verified 2026-04-22): the `useUpdatedCalendarValueLogic` flag gates the Angular `initCalendarValueV1`/`V2` init paths in the Form Viewer. It does **not** affect the REST API surface and does **not** affect Scheduled Process / server-script execution. Evidence:

- WS parity: 2026-04-22 audit at build `f36b65dd` → **135/135 IDENTICAL / 0 unflagged divergences** between vvdemo V1 (`b18dbfdb`) and vv5dev V2. REST endpoints (`postForms`, `getForms`, `postFormRevision`, `forminstance/`) store dates identically on both code paths. See [`research/date-handling/web-services/analysis/overview.md § Executive Summary`](../../research/date-handling/web-services/analysis/overview.md#1-executive-summary).
- SP parity: `DateTimeNowProbe` on vv5dev V2 returns the same Node + SQL clocks that V1 would; SP script execution never touches the Angular calendar pipeline. See [`research/date-handling/scheduled-processes/matrix.md`](../../research/date-handling/scheduled-processes/matrix.md).

Implication: when investigating date-behavior differences, the V1/V2 axis only matters when the data flows through the Form Viewer.

### Configuration Sections Toolbar

Both the customer-scope Configuration Settings page and the database-scope Database Settings page share a top toolbar with a **"Configuration Sections"** dropdown. Clicking an item postbacks and re-renders the form below with that section's settings. 15 sections in total:

| Section             | Size (cust / db)                                | Notable toggles                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General             | 36/29 inputs, 44/39 checkboxes, 0/4 dropdowns   | Culture, logs, perf, security, workflow, users, training, billing                                                                                                                                                      |
| Add-In Profile 1-4  | 43 inputs, 16 checkboxes each (identical slots) | QuickBase + SalesForce + Outlook integration config                                                                                                                                                                    |
| Document Library    | 99 inputs, 111 checkboxes, 8 dropdowns          | Largest — S3 storage, viewer, annotations, e-sign, indexing, WebDAV/WOPI, purge permissions per role                                                                                                                   |
| Email Configuration | 19 inputs, 11 checkboxes                        | SMTP, AWS bounce check, transmittal reasons, subscription digest                                                                                                                                                       |
| **Forms**           | 17 inputs, 23 checkboxes, 4 dropdowns           | **Use Updated Calendar Control Logic** (the V1/V2 switch), Convert Date Fields to Customer Timezone, Prevent Conversion For Dates Ignoring Timezones, Calendar Field Default Mask, Beta Form Viewer, Offline Forms 2.0 |
| Intelligent Objects | 0 inputs, 2 checkboxes                          | Feature flag only (Enable IO / Allow Vault Access to Assign Package)                                                                                                                                                   |
| Other               | 23 inputs, 6 checkboxes, 1 dropdown             | **Scripting Server URL** (harness endpoint), eFax/vFax, SNS, VVConnect, GitHub version control, utilization dashboard                                                                                                  |
| Server Farm         | 26 inputs, 2 checkboxes                         | Endpoint URLs for add-ins, `Minutes to Cache Time Zone Value: 20`, process-server endpoints, distributed cache                                                                                                         |
| Service Tasks       | 4 inputs, 21 checkboxes                         | Scheduled background jobs: doc audit, purge, reindex, user/password/training expiration, task escalation                                                                                                               |
| SociaVault PG       | 18 inputs, 0 checkboxes                         | Behavioral-health vertical: URL + form-template mapping (not activated)                                                                                                                                                |
| Timecard            | 32 inputs, 1 checkbox                           | Time-card vertical: **Pay Period Start Date + Days In Pay Period** drive date-math, task sequences, employee/accounting groups                                                                                         |
| User Interface      | 3 inputs, 33 checkboxes, 1 dropdown             | Legacy vs new admin pages (Menus/Fields/Dropdowns/Sites/Groups/form lists all on legacy), menu-hide flags, beta task list, workspace manager                                                                           |

**Totals:** ~386 settings per scope. Full per-section JSON captures: [projects/emanueljofre-vv5dev/analysis/central-admin/config-sections/](../../projects/emanueljofre-vv5dev/analysis/central-admin/config-sections/). Landmark cross-section findings (V1/V2 cascade, customer-only checkboxes, vertical modules) documented in [SCOPE-HIERARCHY.md](../../projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md).

### "General" Section — Sub-Section Breakdown

The General Configuration Section is a single scrollable form with 13 h2-headered groups. Verified on vv5dev/EmanuelJofre (platform v3041, UTC server TZ) on 2026-04-20:

| Section                   | Field count | Representative toggles                                                                                                                                                   |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content Providers         | 0 / 1       | Allow Owner/Editors to Download Corrupt Files                                                                                                                            |
| Culture And Time          | 1 / 0       | Current Culture (text override, not the Details-tab dropdown)                                                                                                            |
| Customer Billing Settings | 2 / 1       | Idle Timeout (sec), Warning Timeout (sec), Allow Public Shares                                                                                                           |
| Database                  | 0 / 2       | Use SQL2005 Commands, Use Unicode Upgrade Script                                                                                                                         |
| Logs and Paths            | 5 / 3       | Days-to-retain for Exception/Info/Email/LDAP logs, URL Content Base, Verbose Logging                                                                                     |
| Performance and Timeouts  | 7 / 3       | Web Session Timeout, Max Row Count, SQL Connection Timeout, Request Throttling                                                                                           |
| Resource Scheduler        | 1 / 1       | `<WorkWeek>` XML (days enabled), Is MyAvailability Visible                                                                                                               |
| Security and Login        | 9 / 15      | Default Authentication Type, Login Token Expiration, **Require MFA**, **Enable Roles and Permissions Security**, IP restrictions, SAML/BofA params, session cookie flags |
| Training                  | 3 / 1       | User-facing training link/header text, Users Can Initiate Document Training                                                                                              |
| User Portal Settings      | 1 / 1       | Portal Redirect URL, Append Access Token to Redirect URL                                                                                                                 |
| Users                     | 4 / 2       | **Username Format** (`UserId` / `Email` / etc.), Signature Username Format, Employee ID label, Default Password Expiration Days                                          |
| Workflow                  | 3 / 14      | Default Days for Approval Task, **Use Numeric Comparisons**, **Allow Legacy Workflow**, Task List visibility toggles, `<WorkflowTaskCompletionNames>` XML                |

(Format: `text/number inputs / checkboxes`.) The Workflow `<WorkflowTaskCompletionNames>` XML defines the Acknowledge/Complete/Finish action names for approval tasks, and `<TrainingCompetencyLevels>` defines the 5-level training scale.

### Security Settings Sub-Tab

Narrow page; two sub-sections:

| Section        | Fields                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Password Rules | Min Length / Alpha / Digit / Symbol, Max Repeating per category, Max Simple Sequence, Expiration Days, Retain N Previous, Require Mixed Alpha Case, Allow User Data, Never-Expires Default |
| Login Rules    | Max Login Attempts, Login Attempt Reset Minutes, Lock Length Minutes                                                                                                                       |

All-zero defaults on a new customer effectively disable password complexity.

### Customer Databases Grid

Exposes the full app/form DB mapping — important for tracing data-flow issues:

| Column             | Example (vv5dev/EmanuelJofre)       |
| ------------------ | ----------------------------------- |
| Name               | Main                                |
| Database Version   | `v3041`                             |
| Server Name        | `use1d-vvdevsql1`                   |
| Database Name      | `vv5dev_EmanuelJofre_Main`          |
| Form Database Name | `vv5dev_EmanuelJofre_Main_FormData` |

`Database Version` here is the **schema version** shown in Central Admin — distinct from the code version in `/api/v1/.../version`. The two usually move together but can diverge during upgrades.

### Customer Details Tab — Key Fields

| Field             | Notes                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name / Alias      | Display name + URL-segment alias (used in `/app/{alias}/{db}/...`)                                                                                                                              |
| Active (checkbox) | Soft-disable for the entire customer                                                                                                                                                            |
| **Time Zone**     | Telerik combobox → picks from Windows TZ list. Same field as `utcOffset` in `/api/v1/.../version`. Drives UI rendering and some platform-side scheduling; see below for what it does NOT drive. |
| Culture           | Server-side culture — affects server-rendered date formats, number formatting                                                                                                                   |
| Language          | Default UI language                                                                                                                                                                             |

**Per-customer time zone is set here**, and it's what `getTimeZone` in the env-profile tool reports.

**What Customer TZ does NOT drive (verified 2026-04-22 via SP-2/SP-4 probe on vv5dev):**

| Clock source                             | Actually follows                | Customer TZ? |
| ---------------------------------------- | ------------------------------- | :----------: |
| `new Date().toISOString()` (Node script) | Real UTC — TZ-invariant by spec |      no      |
| `new Date().toString()` / Intl (Node)    | Harness `process.env.TZ`        |      no      |
| SQL `GETDATE()` / `GETUTCDATE()`         | SQL host OS TZ (UTC on vv5dev)  |      no      |
| SQL `SYSDATETIMEOFFSET()` offset         | SQL host OS TZ                  |      no      |

For **server-generated timestamps inside SPs and server scripts, Customer TZ is effectively display-only.** The VV ASP.NET server's own TZ and the SQL host OS TZ are independent hosts; changing Customer TZ in Central Admin does not move Node/SQL clock outputs. Relevant where Customer TZ DOES apply: UI rendering (form display, dashboards), scheduled trigger firing windows (untested but hypothesized — see scheduled-processes matrix SP-1).

### Per-Environment Snapshots

Captured configurations for each known env are under `projects/{customer}/analysis/central-admin/`. Each snapshot includes per-tab JSON + an index with the flags most likely to affect platform behavior. Update on platform version changes or whenever a test reveals an environment-specific behavior worth tracing back.

Known snapshots:

- [`projects/emanueljofre-vv5dev/analysis/central-admin/`](../../projects/emanueljofre-vv5dev/analysis/central-admin/) — vv5dev/EmanuelJofre, v3041, UTC

---

## How the Harness Server Fits In

```
VV Platform
    │
    ├── Form event fires (button click)
    │       │
    │       └─→ POST /scripts  ──→  harness Express server (port 3000)
    │                                    │
    │                                    ├── Creates temp module from script code
    │                                    ├── Injects vvClient (authenticated)
    │                                    └── Returns result to VV
    │
    └── Scheduled Service triggers
            │
            └─→ POST /scheduledscripts  ──→  harness Express server
```

The Microservice registered in VV points to `{harness server URL}/scripts` or `/scheduledscripts`. VV calls this URL with the script code as payload. The server executes it and responds.

**Registration:** Each script is registered in **Microservices** (`/outsideprocessadmin`) as `Service Type: NodeServer`. Form scripts use `Category: Form`; cron scripts use `Category: Scheduled` and appear in **Scheduled Services** too.

**vvdemo routing:** The vvdemo environment routes Node.js microservice calls through **ngrok** to `localhost:3000`. When the local server isn't running, the error is `ERR_NGROK_8012: Traffic successfully made it to the ngrok agent, but the agent failed to establish a connection to the upstream web service at localhost:3000`. Start the server with `node lib/VVRestApi/VVRestApiNodeJs/app.js` before testing microservice execution.

---

## Version & Build Information

### Version API Endpoint

```
GET /api/v1/{customer}/{db}/version
Authorization: Bearer {accessToken}
```

Returns `VaultVersionInfo` — the core platform version and database schema version:

```json
{
    "data": {
        "dataType": "VaultVersionInfo",
        "progVersion": "5.1.20210525.1",
        "dbVersion": "3041",
        "dbCreateDate": "2021-06-08T13:35:21.493Z",
        "dbModifiedDate": "2021-06-08T13:35:21.493Z",
        "progCreateDate": "2021-06-08T13:35:21.493Z",
        "progModifiedDate": "2021-06-08T13:35:21.493Z",
        "utcOffset": -3
    }
}
```

- `progVersion` follows the build format `{major}.{minor}.{YYYYMMDD}.{buildNum}` — tracks the **core platform**, not individual services
- `dbVersion` is the database schema version number (incremented by migrations)
- `utcOffset` reflects the server's configured UTC offset
- Verified 2026-04-09 on vvdemo

**Cross-environment comparison (2026-04-10):**

| Property         | vvdemo (EmanuelJofre) | vv5dev (WADNR)   |
| ---------------- | --------------------- | ---------------- |
| `progVersion`    | `5.1.20210525.1`      | `6.1.20240711.1` |
| `dbVersion`      | `3041`                | `3041`           |
| `utcOffset`      | `-3` (BRT)            | `-7` (PDT)       |
| FormViewer build | `20260304.1`          | `20260404.1`     |
| FormViewer code  | `v0.5.1`              | `v0.5.1`         |
| Kendo variant    | v1                    | v2               |
| `docapi`         | disabled              | enabled          |
| Infrastructure   | IIS/10.0, ASP.NET 4.0 | No IIS header    |
| Deployment age   | ~1,766 days           | ~631 days        |

Despite these differences, all tested slots (742 executions across Forms, Web Services, and Dashboards) produce **identical results** on both environments. All 16 platform bugs are confirmed as platform-level, not environment-specific.

**Why results are identical despite infrastructure differences:**

- **Shared centralized services**: Both servers use the same FormsAPI (`preformsapi.visualvault.com`), DocAPI (`predocumentsapi.visualvault.com`), and Sockets service. The bugs live in these shared service layers, not in per-server code.
- **Same FormViewer code version**: Both run `v0.5.1` — the `calendarValueService` (where most form date bugs originate) is identical despite different build numbers.
- **`progVersion` is the admin app version, not the services**: The 5.1→6.1 jump affects the ASP.NET admin application, not the Angular FormViewer or .NET FormsAPI. Date-handling code paths are decoupled from the admin version.
- **Server TZ is irrelevant to form saves**: Cat 16 confirmed that `utcOffset` (-3 vs -7) does not affect form date storage — all processing happens client-side or in FormsAPI.
- **Kendo v1 vs v2 produce equivalent values**: Cat 15 confirmed the widget layer difference doesn't affect date values — bugs are in the `calendarValueService`, not the Kendo widget.

**Document Library status (updated 2026-04-24)**: DOC-1..DOC-4 + DOC-7 + DOC-11 baselined on vv5dev (40/40 PASS across 4 TZ × 3 browsers). One behavior divergence vs. vvdemo surfaced — empty-string clearing (`PUT indexFields {Date: ""}`) **clears** the field on vv5dev but matches the DOC-BUG-2 "value persists" behavior on vvdemo. Other clearing attempts (`"null"`, `"undefined"`, `"0"`, `"2026"`) still preserve previous value on both. Possible partial fix in a newer build, possible Central Admin scope difference — not yet root-caused. DOC-5/6/8 (UI round-trip, cross-layer, DocAPI differential) still pending infrastructure work.

### FormViewer Build Number

The FormViewer Angular SPA exposes build info via a **static JSON file** — no authentication or browser needed:

```
GET /FormViewer/assets/build.json     (no auth required)
→ { "build": 20260304.1, "code": "v0.5.1" }

GET /FormViewer/assets/config.json    (no auth required)
→ { "production": false, "formsApiUrl": "...", "socketsUrl": "...", "audience": "...", ... }
```

| Property         | Value                              | Source                                           |
| ---------------- | ---------------------------------- | ------------------------------------------------ |
| Build number     | `20260304.1`                       | `build.json` → `build` field                     |
| Code version     | `v0.5.1`                           | `build.json` → `code` field (semver)             |
| DOM display      | `Build: 20260304.1`                | `span.app-version` in top-right corner           |
| Environment mode | `production: false`                | `config.json` (false = pre-production on vvdemo) |
| Sockets URL      | `sockets-pre.visualvault.com`      | `config.json` → `socketsUrl`                     |
| JWT audience     | `e98f5a306fed4a279a2837dee47751b6` | `config.json` → `audience`                       |
| Verified         | 2026-04-09 on vvdemo               |                                                  |

`config.json` also reveals all backend service URLs, matching the `/configuration/*` API endpoints but without authentication.

FormViewer uses Angular content-hashed filenames for its script bundles (e.g., `main-es2015.37f6d018a9cad175a1e6.js`). These hashes change per deploy, providing a secondary deploy detection signal.

### What's NOT Exposed

The product team notifies deploys with Azure DevOps build names like `FormsAPI.Main.20260408.1`, but **individual service versions are not queryable**. The individual services (FormsAPI, DocAPI, WorkflowAPI) authenticate via JWT (not OAuth) and return `x-stackifyid` headers (APM tracking) but no version endpoints. The `/version` API only tracks the core platform, and `build.json` only tracks the FormViewer SPA.

### Server Infrastructure Headers

All responses from the main VV app include:

| Header                | Value                | Notes                              |
| --------------------- | -------------------- | ---------------------------------- |
| `Server`              | `Microsoft-IIS/10.0` | Windows Server IIS                 |
| `X-AspNet-Version`    | `4.0.30319`          | .NET Framework 4.x                 |
| `X-AspNetMvc-Version` | `5.2`                | ASP.NET MVC 5.2 (admin pages only) |

The `/App/` MVC routes include the MVC version header; API routes do not.

---

## UI Framework Stack

The VV platform runs **two distinct front-end applications** with separate technology stacks. Library versions and available globals differ between them — tools that detect versions must probe both.

### Admin App (ASP.NET WebForms)

The main VV application (non-FormViewer pages) uses a classic ASP.NET WebForms stack with Telerik UI components. Verified on vvdemo 2026-04-09.

### Client-Side Libraries

| Library             | Version      | Role                       |
| ------------------- | ------------ | -------------------------- |
| jQuery              | 3.7.1        | DOM manipulation, AJAX     |
| Kendo UI            | 2020.1.406   | Grid widgets, datepickers  |
| Telerik RadControls | ASP.NET AJAX | Primary UI component suite |
| Bootstrap           | CSS only     | Layout and styling         |
| RequireJS           | present      | JavaScript module loader   |

### Telerik Controls in Use

RadGrid, RadMenu, RadButton, RadComboBox, RadAjaxPanel, RadInput, RadToolBar, RadUploadWindow, RadComboBoxDropDown (9 distinct controls observed).

### Server-Side

- **ASP.NET WebForms** — ViewState present (`__VIEWSTATE` hidden field), `__doPostBack` event system
- **Auersoft.SessionTimer** v4.0.0.0 — custom session timeout management library
- **ASP.NET MVC 5.2** — used for some routes (admin pages return `X-AspNetMvc-Version` header)

### UIServices (ASMX Web Services)

The main app loads 5 classic ASP.NET ASMX web services for real-time UI operations:

| Service             | Path                                      | Purpose                       |
| ------------------- | ----------------------------------------- | ----------------------------- |
| ContextMenuService  | `/UIServices/ContextMenuService.asmx/js`  | Right-click context menus     |
| UploadStatusService | `/UIServices/UploadStatusService.asmx/js` | File upload progress tracking |
| ThreadStatusService | `/UIServices/ThreadStatusService.asmx/js` | Background thread monitoring  |
| LibraryService      | `/UIServices/LibraryService.asmx/js`      | Document library operations   |
| FormService         | `/UIServices/FormService.asmx/js`         | Form-related UI operations    |

### Key JavaScript Objects

| Object                   | Properties                   | Purpose                                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| `VV.MasterPage`          | 27 keys                      | Master page config: loading panels, menus, routing, session timeout |
| `VV.Notifications`       | 9 methods                    | Real-time notification system (show, dismiss, ack)                  |
| `VV.Entities`            | 3 keys                       | Entity types: Guid, FolderIndexFieldType, getFormFieldType          |
| `VV.Form`                | 121 keys                     | Form API (also available in FormViewer, different context)          |
| `window.VaultMaster`     | 4 keys                       | Master message/slider windows, Ajax helpers, JSON helpers           |
| `window.Auersoft`        | SessionTimer, VisualVault    | Session management namespace                                        |
| `window.vv.dataServices` | 1 key                        | Data services layer                                                 |
| `window.VVModules`       | Core, Common, ScriptResource | Module system                                                       |
| `window.NodeCategory`    | 5 enums                      | None, TopLevelFolder, Folder, DocumentList, Document                |

### Notification Polling

The main app polls `GET /App/{customer}/{db}/Notification` for real-time notifications. This is a standard ASP.NET MVC route (not REST API), returning notification data consumed by `VV.Notifications`.

### FormViewer SPA (Angular)

The FormViewer is a separate Angular application with its own library bundle. **Key difference from the admin app**: Angular production builds do not expose `window.angular` or `window.kendo` as globals — these are compiled into the bundle and not accessible for version detection. Verified 2026-04-10 on both vvdemo (Kendo v1) and vv5dev (Kendo v2).

**Version detection methods:**

- `window.kendo.version` and `window.angular.version.full` → **not available** on FormViewer (both return `null`)
- **Kendo variant** (v1 vs v2) → detect via DOM inspection: find a `kendo-datepicker` input and check its `role` attribute (`spinbutton` = v1, `combobox` = v2). See `docs/reference/form-fields.md` § "Kendo UI Version Differences" for the full selector table.
- **Build info** → available via static files (`/FormViewer/assets/build.json`, `/FormViewer/assets/config.json`) without authentication

The `tools/explore/environment-profile.js` tool captures both admin and FormViewer stacks. Use `npm run env:profile:browser` to run the full detection.

---

## Service Architecture

The VV platform consists of multiple backend services, each running independently. The core API at `{env}.visualvault.com` acts as the gateway; individual services are discovered via `/configuration/*` endpoints.

**Key architectural fact**: Backend services (FormsAPI, DocAPI, WorkflowAPI, Sockets) are **shared across VV servers**, not deployed per-server. Both `vvdemo` and `vv5dev` route to the same `preformsapi.visualvault.com`, `predocumentsapi.visualvault.com`, etc. Only the core API gateway and admin app are per-server. This means bugs in shared services affect all environments equally, regardless of `progVersion` differences. Verified 2026-04-13 via environment profile comparison.

### Configuration Discovery

```
GET /api/v1/{customer}/{db}/configuration/{component}
```

Returns the service URL, enabled status, and service-specific behavioral configuration. Discovered services (vvdemo, 2026-04-09):

| Component        | URL                                                           | Enabled | Tech                     |
| ---------------- | ------------------------------------------------------------- | ------- | ------------------------ |
| FormsAPI         | `https://preformsapi.visualvault.com`                         | yes     | .NET                     |
| DocAPI           | `https://predocumentsapi.visualvault.com`                     | no      | .NET                     |
| StudioAPI        | `https://dbvvyys8gc.execute-api.us-east-1.amazonaws.com/Api/` | yes     | AWS API Gateway / Lambda |
| WorkflowAPI      | `https://preworkflow.visualvault.com`                         | yes     | .NET                     |
| ObjectsAPI       | (not configured)                                              | n/a     | —                        |
| NotificationsAPI | (not configured)                                              | n/a     | —                        |

#### Per-Service Behavioral Configuration

Beyond URL and enabled status, configuration endpoints return operational settings that vary between environments. Verified 2026-04-10.

| Service   | Property                  | Type    | Description                                                                 |
| --------- | ------------------------- | ------- | --------------------------------------------------------------------------- |
| DocAPI    | `roleSecurity`            | boolean | When `true`, document access checks role membership — changes who sees what |
| DocAPI    | `docApiDefaultForDocList` | boolean | When `true`, document lists route through DocAPI instead of core API        |
| StudioAPI | `maxRowCount`             | number  | Workflow/Studio API row limit (observed: `1000`)                            |

FormsAPI operational limits are exposed via a separate authenticated endpoint (see [FormsAPI FormSettings](#formsapi-formsettings) below).

### Sockets Service

Real-time notifications use a WebSocket/SignalR service:

| Property | Value                                            |
| -------- | ------------------------------------------------ |
| URL      | `https://sockets-pre.visualvault.com`            |
| Protocol | SignalR (`/notify/negotiate?negotiateVersion=1`) |
| Server   | `nginx/1.18.0 (Ubuntu)`                          |
| Auth     | Bearer JWT (same as FormsAPI)                    |

### Service Authentication

The main OAuth bearer token (from `/OAuth/Token`) is valid for the **core API only** (`/api/v1/...`). Individual services require a **JWT token** obtained via the core API:

```
GET /api/v1/{customer}/{db}/users/getjwt?audience={audience}
Authorization: Bearer {oauthToken}
→ { "data": { "token": "..." } }
```

The `audience` parameter comes from `config.json` (`e98f5a306fed4a279a2837dee47751b6` on vvdemo). The returned JWT works for FormsAPI, DocAPI, and WorkflowAPI. Without it, these services return `401.6 "Your session has expired or is invalid"`.

### APM / Monitoring

All .NET backend services (FormsAPI, DocAPI, WorkflowAPI) include a Stackify APM header:

```
x-stackifyid: V2|{requestGuid}|C100221|CD{instanceId}
```

- `C100221` — Stackify customer ID (VV's account)
- `CD23`/`CD24` — alternating deployment instance IDs (load-balanced, 2 instances observed)
- The request GUID changes per call; the C and CD values are stable per deployment

---

## FormsAPI Service

The FormViewer SPA communicates with a **separate .NET service** (FormsAPI) for form instance persistence. This is distinct from the core VV REST API. See [Service Architecture](#service-architecture) for the full service map and auth details.

| Property       | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Base URL       | `https://preformsapi.visualvault.com/api/v1`                                    |
| Authentication | JWT (not OAuth) — obtained via `GET /users/getjwt` on core API                  |
| Discovery      | `GET /configuration/formsapi` on core API returns `formsApiUrl` and `isEnabled` |
| Node.js client | `vvClient.formsApi.formInstances` (auto-initialized if enabled)                 |

### FormsAPI Endpoints (discovered via network intercept)

| Method | Endpoint                                                            | Purpose                                                                      |
| ------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/FormTemplate/<defId>?revisionType=2`                              | Template definition (by definition GUID)                                     |
| GET    | `/FormTemplate/<revId>?revisionType=0`                              | Template by revision ID                                                      |
| GET    | `/FormTemplate/Controls/<revId>?formInstanceId=<id>&revisionType=2` | Field definitions for a template                                             |
| GET    | `/FormInstance/Controls/<dataId>?revisionType=1`                    | **Saved field values** (serialized — format varies by write path, see CB-29) |
| POST   | `/FormInstance`                                                     | Create a new form record                                                     |
| PUT    | `/FormInstance`                                                     | Update existing record                                                       |
| POST   | `/FormInstance/lock`                                                | Lock a record for editing                                                    |
| GET    | `/FormTemplate/<defId>/NextInstance?revisionType=2`                 | Get next instance name                                                       |
| GET    | `/Menu/Tab/<id>`                                                    | Tab configuration                                                            |
| GET    | `/FormSettings`                                                     | Global form settings                                                         |
| GET    | `/DefaultValues`                                                    | Default field values/settings                                                |

### FormsAPI FormSettings

`GET /FormSettings` (JWT auth) returns operational limits that affect form behavior. These vary between environments. Verified 2026-04-10 on vvdemo and vv5dev.

| Property           | Type   | Description                                                                   | Observed |
| ------------------ | ------ | ----------------------------------------------------------------------------- | -------- |
| `rowsPerPage`      | number | Default pagination for form data grids                                        | `15`     |
| `maxRows`          | number | Maximum rows returned in a single query — affects data retrieval + dashboards | `1000`   |
| `lockLimitMinutes` | number | Form lock expiry — how long a form stays locked for concurrent editing        | `1`      |

These are distinct from StudioAPI's `maxRowCount` (which limits workflow API responses).

### Serialization Format Difference (CB-29)

Both the core API (`postForms`) and FormsAPI (`forminstance/`) store **identical `datetime` values** in SQL Server. A DB dump (2026-04-06) confirmed records created by either endpoint contain the same binary value (e.g., `2026-03-15 14:30:00.000`).

The difference is in how `FormInstance/Controls` **serializes its HTTP response**:

| Write Endpoint           | DB Value (identical)      | `FormInstance/Controls` Response | Forms V1 Interpretation                |
| ------------------------ | ------------------------- | -------------------------------- | -------------------------------------- |
| Core API `postForms`     | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (ISO+Z) | UTC → converts to local (shifted)      |
| FormsAPI `forminstance/` | `2026-03-15 14:30:00.000` | `"03/15/2026 14:30:00"` (US)     | Local time → no conversion (preserved) |

The core API's `getForms` normalizes both to ISO+Z, masking the serialization difference. The divergence is only visible through `FormInstance/Controls` or by observing the Forms UI behavior.

**How Controls decides the format**: The form data table (`dbo.DateTest`) contains no column or flag that distinguishes records by creation endpoint — a column-by-column DB comparison of postForms vs forminstance/ records (DateTest-001679 vs DateTest-001680) shows identical metadata. The serialization decision is based on **hidden internal metadata** in VV's revision/instance tracking tables, not in the form data table. The specific table and field have not been identified.

**Root cause**: The FormsAPI has two serialization paths that produce different string formats for the same `datetime` value. Forms V1 `initCalendarValueV1` parses the string format — ISO+Z triggers UTC→local conversion, US format does not.

See `research/date-handling/web-services/analysis/overview.md` CB-29 for full evidence.

---

## Key Concepts & GUIDs

- **`formid`** — identifies a Form Template **definition**. Stable across versions. Used in form viewer URL and FormsAPI template lookup.
- **`xcid`** — identifies the customer (accepts GUID or alias string like `EmanuelJofre`).
- **`xcdid`** — identifies the database (accepts GUID or alias string like `Main`).
- **`CcID`** — Connection ID for a Data Connection; used in query URLs.
- **Revision** — form templates are versioned. Scripts reference a specific revision or "Released" status.
- **Status:** `Released` = live/published; `Release` = draft/in-progress (UI inconsistency — "Release" means it hasn't been released yet).

### Form Template ID Hierarchy

A form template has **three different GUIDs** used by different parts of the system:

| ID Type              | Example (DateTest)                     | Where Used                                             | How to Get                                                             |
| -------------------- | -------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Form Definition GUID | `6be0265c-152a-f111-ba23-0afff212cc87` | Form viewer URL `formid=`, FormsAPI template lookup    | URL bar, `vv-config.js`                                                |
| Template ID          | `1c6e433e-f36b-1410-896b-005f6a77cdf8` | Core API `/formtemplates/{id}/forms`                   | `vvClient.forms.getFormTemplateIdByName()` → `.templateIdGuid`         |
| Revision ID          | `ef82433e-f36b-1410-896b-005f6a77cdf8` | FormsAPI `POST /FormInstance` (`formTemplateId` field) | `vvClient.forms.getFormTemplateIdByName()` → `.templateRevisionIdGuid` |

The core API `postForms()` takes a template name and resolves it automatically. The FormsAPI `postForm()` requires the **revision ID** explicitly.

---

## Demo Environment Reference

| Item                        | Value                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| Environment                 | `vvdemo`                                                          |
| Customer                    | `EmanuelJofre`                                                    |
| Database                    | `Main`                                                            |
| Base URL                    | `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/`           |
| Customer GUID (`xcid`)      | `815eb44d-5ec8-eb11-8200-a8333ebd7939`                            |
| Database GUID (`xcdid`)     | `845eb44d-5ec8-eb11-8200-a8333ebd7939`                            |
| Form DB connection CcID     | `00000001-0000-0000-0000-c0000000f002`                            |
| Form templates              | 122 (as of 2026-03)                                               |
| Microservices registered    | 42                                                                |
| Scheduled services          | 5                                                                 |
| Dashboards                  | 25                                                                |
| Custom queries              | 124                                                               |
| FormViewer build (observed) | `20260304.1` — `span.app-version` in top-right (as of 2026-04-09) |

### Test Forms (demo environment)

| Form                          | Template GUID                                    | Template URL                                                                                                                                                                                             | Notes                                                                     |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DateTest                      | `6be0265c-152a-f111-ba23-0afff212cc87`           | `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`           | 8 date fields across all calendar configs; creates new instance each load |
| DateTest Dashboard            | ReportID: `e522c887-e72e-f111-ba23-0e3ceb11fc25` | `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`                                                                       | 467 records (as of 2026-04-06); Telerik RadGrid, server-rendered          |
| DateTest-000004 Rev 1 (saved) | —                                                | `https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Saved record from BRT session; use for reload/cross-TZ tests              |

---

## WADNR Environment Reference

| Item                           | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| Environment                    | `vv5dev`                                                   |
| Customer                       | `WADNR`                                                    |
| Database                       | `fpOnline`                                                 |
| Base URL                       | `https://vv5dev.visualvault.com/app/WADNR/fpOnline/`       |
| Customer GUID (`xcid`)         | `8b91162d-6e44-ef11-8295-92af04f88cc9`                     |
| Database GUID (`xcdid`)        | `e8de4be1-6f44-ef11-8295-92af04f88cc9`                     |
| Form templates                 | 228 total (89 active, 139 z-prefixed) as of 2026-04-07     |
| Templates with calendar fields | 35 of 77 exported (some exports failed server-side)        |
| Microservices registered       | 272 (44 Form, 19 Scheduled, 209 Workflow) as of 2026-04-08 |
| Scheduled services             | 21 (13 enabled, 8 disabled) as of 2026-04-08               |
| Global functions (runtime)     | 182 keys (157 functions + 25 properties) as of 2026-04-08  |

**Top calendar field counts** (FieldCalendar3 per template):

| Template                   | Calendar Fields |
| -------------------------- | :-------------: |
| Application Review Page    |       35        |
| Notification Communication |       13        |
| Notice to Comply           |        9        |
| Multi-purpose              |        6        |
| WTM Review Page            |        5        |
| FPAN Notice of Decision    |        5        |
| Forest Practices App/Notif |        5        |

**Exported templates:** 77 of 89 active templates exported to `projects/wadnr/extracts/form-templates/` via `tools/extract/extract-templates.js`. 12 templates consistently failed (server-side export timeout).

---

## Useful Direct URLs (demo environment)

All under `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/` unless noted.

```
# Core sections
/                               # Main portal
/DocumentLibrary                # Document Library
/FormTemplateAdmin              # Form Templates (admin)
/FormDataAdmin                  # Form Library (fill-in list)
/formdata                       # Form Data Dashboards
/Dashboards                     # Analytics Dashboards
/VisualVaultReports             # VV Reports

# Enterprise Tools
/OutsideProcessAdmin            # Microservice Library
/SchedulerAdmin                 # Scheduled Services
/ConnectionsAdmin               # Data Connections
/ConnectionQueryAdmin?CcID=00000001-0000-0000-0000-c0000000f002  # Data Connection Queries (form DB)
/ModuleAdmin                    # Module Library

# Admin Tools
/UserAdmin                      # Users
/GroupAdmin                     # Groups
/VisualVaultAdmin?SecurityType=PortalAdmin  # Portals
/MenuAdmin                      # Menus
/DropDownListAdmin              # Dropdown Lists
/EmailTemplateAdmin             # Email Templates
/siteadmin?SecurityType=Location    # Site Admin: Locations
/siteadmin?SecurityType=Customer    # Site Admin: Customers
/SiteAdmin?SecurityType=Supplier    # Site Admin: Suppliers

# User
/UserProfile                    # My Preferences
/ControlPanel                   # Control Panel
/AdvancedSearch?newsearch=true  # Advanced Search
/UserSearches                   # Saved Searches
```

Separate apps (different URL roots):

```
# FormViewer (Angular SPA)
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=...&xcid=...&xcdid=...

# Process Design Studio (token-authenticated)
https://vvdemo.visualvault.com/ProcessDesignStudio?access_token=...

# Offline Forms (AngularJS SPA)
https://vvdemo.visualvault.com/OfflineForms/index.html#!/land?xcid=...&xcdid=...
```

---

## API Behavior Notes

### Field Name Casing (Response Key Transformation)

The VV REST API transforms field names in response objects by **lowercasing only the first character** — the rest of the name is preserved exactly (not camelCase). Examples: `Status`→`status`, `Start Date`→`start Date`, `ADDRESS`→`aDDRESS`, `UsId`→`usId`. This applies to all response types: `getForms()`, `getCustomQueryResultsByName()`, and system table queries. For custom queries, the source is the SQL column name or alias. `q` filters are case-insensitive; response keys are not. When writing data, the API accepts the original mixed casing. See [scripting.md § Field Name Casing](../guides/scripting.md#field-name-casing-response-key-transformation) for the full reference table.

### Date Format Normalization

The VV REST API normalizes all date values in responses to ISO 8601 datetime with Z suffix (e.g., `"2026-03-15T00:00:00Z"`). Even date-only fields stored as `"2026-03-15"` by Forms are returned as `"2026-03-15T00:00:00Z"` by the API. Unset date fields return `null`. This normalization is performed by the VV server, not the Node.js client library.

### No Server-Side Date-Only Enforcement

The VV server has no date-only storage type. All date fields are stored as datetime, regardless of the `enableTime` flag. The "date-only" semantic is enforced only by the Forms client-side JS — the API and database treat all date fields identically. This means a "date-only" field can contain UTC midnight, local midnight as UTC, actual timestamps, or arbitrary times depending on the write source (Forms popup, preset, Current Date, or API). See `research/date-handling/web-services/analysis/overview.md` for full evidence and impact analysis.

### Data Passthrough

The Node.js client library (`lib/`) performs **no data transformation** between script code and the VV server. Field values (including dates) are serialized via `JSON.stringify()` on the way out and `JSON.parse()` on the way back. Dates remain as strings throughout — never converted to/from JavaScript `Date` objects by the library. See [Scripting Guide](../guides/scripting.md) for the full data flow.

### API Write Path Stores Dates Uniformly

The VV REST API write path (`postForms`, `postFormRevision`) stores date strings as-is without applying config-specific transformations. All field configurations (A through H, regardless of `enableTime`, `ignoreTimezone`, or `useLegacy` flags) store the same input identically. For example, `"2026-03-15"` sent to Configs A, B, C, and D via `postForms` all store as `2026-03-15 00:00:00.000` in SQL Server.

This contrasts with the **Forms browser save path**, where the Angular `getSaveValue()` pipeline applies different transformations per config: Config C stores real UTC (midnight BRT → `T03:00:00`), Config D stores local midnight as-is (`T00:00:00`), and date-only fields in UTC+ timezones store the wrong day (FORM-BUG-7). The mixed timezone storage problem is **exclusively a Forms Angular issue** — the API path is immune.

**Implication**: Developers writing dates via the REST API get consistent, predictable storage regardless of field config. The API is the safer write path for date-critical workflows.

### Document Index Field Date Handling

Document index fields (fieldType 4, "Date Time") behave differently from form calendar fields. Verified 2026-04-09 on vvdemo.

| Behavior                    | Form Fields (`postForms`)                 | Document Index Fields (`putDocumentIndexFields`) |
| --------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Date-only input             | Stored as-is                              | Normalized to `T00:00:00` (no Z)                 |
| API response Z suffix       | Always `Z` (e.g., `2026-03-15T00:00:00Z`) | **Never** — no Z in response                     |
| Timezone offset input       | Stored as-is (no conversion)              | **Converted to UTC**, Z stripped                 |
| EU date format (DD/MM/YYYY) | Silently swapped (WS-BUG-2)               | **Correctly parsed**                             |
| Clearing a value            | Sets to null                              | **Cannot clear** — silent failure                |
| Configuration flags         | enableTime, ignoreTimezone, useLegacy     | None — single "Date Time" type                   |

Key behaviors:

- **Naive datetimes preserved**: `2026-03-15T14:30:00` → stored and returned as `2026-03-15T14:30:00`
- **Timezone offsets silently resolved**: `2026-03-15T14:30:00-03:00` → stored as `2026-03-15T17:30:00` (UTC, Z stripped) — creates timezone-ambiguous values (DOC-BUG-1)
- **UI control**: Telerik RadDateTimePicker, displays in US 12h format (`3/15/2026 2:30 PM`)
- **Checkout required for UI editing**: datepicker is disabled when document is checked in; API can always write regardless
- **Built-in document dates** (`createDate`, `modifyDate`, `reviewDate`, `expireDate`) include Z suffix; index field dates do not — inconsistent within the same document

**REST API endpoints** for document index fields (from `lib/.../config.yml`):

| Endpoint                                   | Method | Purpose                                                                 |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------- |
| `/documents`                               | POST   | Upload a document (multipart). Returns `id = revisionId` — see below    |
| `/documents`                               | GET    | List/query documents — supports ODATA `?q=` filter (see below)          |
| `/documents/{id}/indexfields`              | GET    | Read index field values on a document (id = documentId, NOT revisionId) |
| `/documents/{id}/indexfields`              | PUT    | Write index field values (JSON-stringified `{ FieldLabel: value }`)     |
| `/folders`                                 | POST   | Create folder by path (`{ name, description, folderpath }`)             |
| `/folders/{id}/indexfields`                | GET    | List index fields assigned to a folder                                  |
| `/folders/{id}/indexfields/{indexFieldId}` | PUT    | Update folder index field settings (default value, queryId)             |
| `/folders/{id}/documents`                  | GET    | List documents in a folder                                              |
| `/indexfields`                             | GET    | List all index field definitions                                        |
| `/indexfields/{id}/folders/{folderId}`     | PUT    | Assign an index field to a folder                                       |

> **No REST endpoint exists to create global index field definitions** — they must be created via Admin UI → Index Field Admin. Verified 2026-04-24 by exhaustive endpoint probing.

**revisionId vs documentId** (verified 2026-04-24): `POST /documents` returns `{ id: <revisionId> }`. The `/documents/{id}/indexfields` endpoint expects the **stable documentId**, not the revisionId. To resolve: re-list the folder via `GET /folders/{folderId}/documents` and match on `id` to read each row's `documentId` field. Mixing the two surfaces as `meta.status: 400 / "Document not found"` (HTTP 200 envelope — see HTTP-200 envelope pattern below).

**HTTP-200-with-meta-error envelope**: VV REST APIs return HTTP 200 even when the operation logically failed. The real status is in `meta.status` (200 = ok; 400 = bad request) and `meta.errors[]`. Always check `meta.status === 200` after parsing — `resp.ok()` alone is insufficient.

**Index field default values** (verified 2026-04-24, DOC-11): Global index fields support a `defaultValue` set in the field definition (Admin UI → Index Field Admin). Stored naively (no Z suffix) — DOC-BUG-1 extends to defaults. When a fresh document is uploaded into a folder where the field is assigned, the default is auto-applied as a literal byte-for-byte copy (no TZ re-interpretation). Overwritable via PUT.

**Document query (`GET /documents?q=...`)** — verified 2026-04-24:

- **Filter syntax**: ODATA-style `?q=<field> <op> '<value>'`. Supported operators: `eq`, `ne`, `gt`, `lt`, with boolean `and` for composition. Example: `?q=Date gt '2026-03-01' and Date lt '2026-04-01'`.
- **Direct params silently ignored**: `?Date=...`, `?indexFields=...`, `?filter=...`, and even `?folderId=...` all return the unfiltered result set.
- **Null literal not supported**: `Date eq null` errors with `Invalid expression, invalid column: 'null', at loc:8`. Use `Date eq ''` to find documents with an unset Date value.
- **DOC-BUG-1 extends to query**: a value written as `2026-03-15T14:30:00-03:00` is stored as `2026-03-15T17:30:00`. Querying with the original local time returns 0 hits; querying with the stored UTC returns 1. Consumers must search by the server-converted UTC, not the value they wrote.

See `research/date-handling/document-library/matrix.md` for the full test matrix (11 categories, 74 slots) and `testing/specs/date-handling/doc-index-field-dates.spec.js` for 42 data-driven regression tests.

### Auto-Save

The FormViewer localization keys include auto-save strings (`autoSave`, `autoSaveToggle`, `autoSaveInterval`), but **no auto-save implementation exists in the platform**. The save pipeline is always manual (Save button click). `DebouncedSave()` in the form script library calls `window.debouncedSave()` which is customer-injected JavaScript, not platform code. Verified 2026-04-09 by searching the full codebase and localization APIs.

---

## REST API Resources

Discovered via `GET /api/v1/{customer}/{db}/{resource}` on vvdemo, 2026-04-09. All require OAuth bearer token.

### Accessible Resources (200)

| Resource            | Items  | Notes                                                                           |
| ------------------- | ------ | ------------------------------------------------------------------------------- |
| `/users`            | 19     | User accounts                                                                   |
| `/groups`           | 5      | Security groups                                                                 |
| `/sites`            | 1      | Site/location hierarchy (default: "Home")                                       |
| `/formtemplates`    | 89     | Form template definitions                                                       |
| `/documents`        | 145    | Document records                                                                |
| `/folders`          | ?      | Folder hierarchy                                                                |
| `/outsideprocesses` | 43     | Registered microservices                                                        |
| `/customquery`      | ?      | Named SQL queries                                                               |
| `/scripts`          | ?      | Script resources                                                                |
| `/reports`          | 1      | Report definitions                                                              |
| `/configuration`    | object | Service configuration (see [Configuration Discovery](#configuration-discovery)) |
| `/version`          | object | Platform version info (see [Version API Endpoint](#version-api-endpoint))       |
| `/meta`             | object | Lists all 91 data types (entity/control names) in the platform schema           |
| `/indexfields`      | 6      | Document index field definitions                                                |
| `/securitymembers`  | ?      | Security membership records                                                     |
| `/files`            | ?      | File resources                                                                  |
| `/dashboards`       | 0      | Dashboard definitions (empty on demo)                                           |

### Method-Restricted Resources (405)

| Resource     | Status | Notes                                                                      |
| ------------ | ------ | -------------------------------------------------------------------------- |
| `/forms`     | 405    | Exists but GET not supported — must access via `/formtemplates/{id}/forms` |
| `/customers` | 405    | Exists but GET not supported                                               |

### Not Found (404)

These do not exist as top-level REST resources: `documenttemplates`, `scheduledProcess`, `email`, `projects`, `schema`, `notifications`, `workflow`, `workflowinstances`, `processes`, `library`, `databases`, `roles`, `permissions`, `apiapplications`, `dropdownlists`, `menus`, `portals`, `tags`, `audit`, `auditlog`, `sessions`, `tokens`, `search`, `fulltext`, `calendar`, `events`, `widgets`, `exports`, `imports`, `templates`, `revisions`, `histories`.

Note: `scheduledProcess` returns 500 Internal Server Error on vv5dev/WADNR (tested 2026-04-14 via both vvClient httpHelper and direct OAuth+fetch). The client library config.yml defines the endpoint but it does not support GET for listing. `POST /scheduledProcess/{id}` (postCompletion) works and accepts any GUID — even a placeholder like `00000000-...` returns `{ meta: { status: 200 }, data: true }` with no validation. Some of these (e.g., `email`, `projects`) are documented in the client library config.yml but may require different URL patterns.

### Form Relations API

The platform exposes two parallel API surfaces for managing form-to-form relationships. Both were verified via Angular source analysis (2026-04-16).

**REST API (Node.js client library)** — used by server-side scripts via `vvClient.forms`:

| Method | Endpoint                                           | Client Method           | Purpose                          |
| ------ | -------------------------------------------------- | ----------------------- | -------------------------------- |
| PUT    | `/forminstance/{id}/relateForm?relateToId={id}`    | `relateForm()`          | Relate two forms (by revisionId) |
| PUT    | `/forminstance/{id}/unrelateForm?relateToId={id}`  | `unrelateForm()`        | Unrelate two forms               |
| PUT    | `/forminstance/{id}/relateForm?relateToDocId={}`   | `relateFormByDocId()`   | Relate by document ID            |
| PUT    | `/forminstance/{id}/unrelateForm?relateToDocId={}` | `unrelateFormByDocId()` | Unrelate by document ID          |
| GET    | `/forminstance/{id}/forms`                         | `getFormRelatedForms()` | List related forms               |

**FormsAPI (Angular SPA internal)** — used by the FormViewer's Related Forms panel:

| Method | Internal Call                      | Endpoint Pattern                                             | Purpose                                      |
| ------ | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| POST   | `postRelateFormApi(child, parent)` | `POST /FormInstance/Relations {childFormId, parentFormId}`   | Relate forms (child/parent semantics)        |
| DELETE | `delRelateFormApi(child, parent)`  | `DELETE /FormInstance/Relations {childFormId, parentFormId}` | Unrelate forms (used by Related Forms panel) |

The `delRelateFormApi` DELETE endpoint is distinct from the `PUT /unrelateForm` REST API — both achieve the same result but use different HTTP methods and endpoint paths. The DELETE variant is used by the platform's built-in Related Forms tab; the PUT variant is used by the Node.js client library.

**Key behavior** (verified 2026-04-15 on vvdemo Build 20260304.1):

- Relationships are bidirectional: relating A→B makes B appear in A's related forms AND A in B's
- Unrelating from either side removes the relationship
- Double-unrelate is idempotent (returns 200)
- Both relate and unrelate return `{ meta: { status: 200 } }` with no `data` property

### Undocumented Endpoints (discovered via FormViewer network intercept)

These endpoints are called by the FormViewer SPA during page load. They are not in the client library config.yml but work with OAuth bearer tokens.

| Method | Endpoint                                                  | Purpose                                                   |
| ------ | --------------------------------------------------------- | --------------------------------------------------------- |
| GET    | `/formdesigner/outsideprocesses`                          | Microservices filtered for form designer context          |
| GET    | `/Workflow/FormTemplate?name={name}`                      | Workflow configuration for a form template                |
| GET    | `/Workflow/GetTaskForUser?id={formTemplateId}`            | Workflow tasks assigned to current user for a form        |
| GET    | `/FormInstance/{templateDefId}/forms`                     | Form instances (alternate to `/formtemplates/{id}/forms`) |
| GET    | `/users/signatures`                                       | Current user's signature data                             |
| POST   | `/formentity/{templateDefId}/evaluateGroupsAndConditions` | Evaluate group visibility and conditions for a form       |

---

## Localization API

The platform provides a localization/i18n API at `/api/v1/resource/`. Used by FormViewer and the main app for UI string translation.

### Language List

```
GET /api/v1/resource/language
```

Returns all supported languages. As of 2026-04-09:

| Pkey | Language           | Code      |
| ---- | ------------------ | --------- |
| 1    | English            | `en-US`   |
| 2    | Portuguese         | `pt-BR`   |
| 3    | Simplified Chinese | `zh-HANS` |
| 4    | Spanish - Peru     | `es-PE`   |
| 5    | Spanish - Colombia | `es-CO`   |

### Localization Dictionaries

```
GET /api/v1/resource/localization?lang={lang}&area={area}
```

Returns key-value dictionary of UI strings for a given area.

| Area            | en-US Keys | Other Languages | Content                                                         |
| --------------- | ---------- | --------------- | --------------------------------------------------------------- |
| `Common`        | 561        | 554             | Shared strings: workflows, projects, security, documents, email |
| `NewFormViewer` | 497        | 442             | Full Angular FormViewer UI                                      |
| `FormViewer`    | 35         | —               | Legacy FormViewer (error messages only)                         |
| `UserProfile`   | 10         | —               | Culture, language, default customer, rows-per-page              |
| `ControlPanel`  | 1          | —               | Minimal                                                         |

Translation gap: en-US has 55 more `NewFormViewer` keys and 7 more `Common` keys than pt-BR/es-PE/es-CO/zh-HANS — untranslated features.

### Script Localization

```
GET /api/v1/resource/scriptLocalization?lang={lang}&templateId={templateRevisionId}&formChId={templateDefId}
```

Returns per-form-template script localizations. Requires both template IDs.

---

## FormViewer Feature Map

Derived from the 497 `NewFormViewer` localization keys. This represents the **complete feature set** of the current FormViewer Angular SPA. Verified 2026-04-09 on vvdemo.

| Feature Area               | Capabilities                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**               | Complete task, route to users/groups, approve/reject, task due dates, assignments, return to originator/sequence/user, workflow history, continue/end workflow |
| **Documents**              | Archive, delete, download, email, share, upload files, related documents, recycle bin, ID card creation, document actions                                      |
| **Projects**               | Add/relate/modify related projects, project security, folder security, copy contents from project                                                              |
| **Offline Forms**          | Full offline workflow: download templates, sync forms/documents/data rows, online/offline login, refresh                                                       |
| **Signature**              | Canvas signature capture, profile signatures, password-protected stamps, save to profile                                                                       |
| **Export**                 | Excel, Word, XML, PDF, form dashboard export, page range selection                                                                                             |
| **Form Locking**           | Lock/unlock forms, request unlock, auto-unlock timer with countdown, keep locked, send message to lock holder                                                  |
| **Repeating Row Controls** | Data grids within forms, add/save/cancel rows, column properties (visibility in exports/prints)                                                                |
| **Barcode**                | Barcode generation, image types, validation                                                                                                                    |
| **Auto-Save**              | Toggle on/off, configurable interval in minutes                                                                                                                |
| **Batch Print**            | Print multiple forms, print preview                                                                                                                            |
| **Query Filters**          | Form field tokens, common tokens for dashboard filtering                                                                                                       |
| **Revisions**              | Change log, revision history                                                                                                                                   |
| **Related Forms**          | Assign/modify related forms between templates                                                                                                                  |
| **File Upload**            | Drag-and-drop, file type validation, max/min size, image dimension validation, ID card mode                                                                    |
| **Search**                 | Full text search (can be disabled), insert/delete rows                                                                                                         |
| **Stale Form Detection**   | "Save Anyway" option when form data has changed externally                                                                                                     |
| **Navigation**             | Multi-page forms with page navigation, goto page                                                                                                               |

---

## External Documentation

- Official docs: https://docs.visualvault.com/docs
