# Central Admin — Settings Scope Hierarchy

## Summary

**VV customer settings cascade through three scopes:**

| Scope         | Where configured                                                         | Access pattern                                                              |
| ------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Environment** | Platform-wide (instance/server level)                                  | *Not discovered via `/ca/` navigation — location still TBD*                 |
| **Customer**   | `/ca/ConfigureCustomerDetails?customerid=...&tab=ConfigSettings`        | Central Admin → Customer Details → Settings → Configuration Settings tab   |
| **Database**   | `/ca/ConfigureCustomerDatabaseDetails?customerid=...&customerdatabaseid=...&tab=DatabaseSettings` | Central Admin → Customer Details → Databases → [Main] → Database Settings tab |

Each scope shares the **same settings surface**: a toolbar dropdown labeled **"Configuration Sections"** with 15 options. The **database scope wins** over customer scope when values differ. Environment scope presumably sits above both.

## The 15 Configuration Sections

Selectable from the RadToolBar at the top of both Customer-scope and Database-scope settings pages:

| # | Section             | Scope support         |
|---|---------------------|-----------------------|
| 1 | General             | customer + database   |
| 2 | Add-In Profile 1    | customer + database   |
| 3 | Add-In Profile 2    | customer + database   |
| 4 | Add-In Profile 3    | customer + database   |
| 5 | Add-In Profile 4    | customer + database   |
| 6 | Document Library    | customer + database   |
| 7 | Email Configuration | customer + database   |
| 8 | Forms               | customer + database   |
| 9 | Intelligent Objects | customer + database   |
| 10| Other               | customer + database   |
| 11| Server Farm         | customer + database   |
| 12| Service Tasks       | customer + database   |
| 13| SociaVault PG       | customer + database   |
| 14| Timecard            | customer + database   |
| 15| User Interface      | customer + database   |

The "General" section is what the captures in [tabs/04-settings.json](tabs/04-settings.json) document. The 13 sub-section headings in that file (Content Providers, Culture And Time, Database, Logs and Paths, Performance and Timeouts, Resource Scheduler, Security and Login, Training, User Portal Settings, Users, Workflow, plus Customer Billing Settings and Content Providers) are **sub-sections within the "General" Configuration Section** — not the top-level sections themselves. My initial capture conflated the two.

## Landmark Finding — V1/V2 Calendar Cascade

Runtime probe (`tools/explore/probe-v1-v2-flag.js`) reported `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true` on vv5dev/EmanuelJofre. That's V2 active.

Investigation of the Forms section at each scope:

| Scope    | Use Updated Calendar Control Logic | Convert Date Fields to Customer Timezone | Prevent Conversion For Dates Ignoring Timezones |
| -------- | ---------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| Customer | ☐ false                            | ☐ false                                  | ☐ false                                         |
| Database | **☑ true**                         | ☐ false                                  | ☐ false                                         |

The **database scope has V2 enabled**, overriding the customer scope's unchecked default. This is what `setUserInfo()` picks up and pushes to the client — explaining why bare template loads report V2 active without URL triggers (no `ObjectID=`, no `modelId`).

**Implication for every date-handling test done so far on vv5dev/EmanuelJofre:** they were running V2 code paths, not V1 like vvdemo. Compare carefully.

## Forms Section — Full Date-Handling Flag Inventory

From [config-sections/forms.json](config-sections/forms.json) (customer-scope capture). Database-scope values differ only where noted.

| Flag                                                    | Customer | Database |
| ------------------------------------------------------- | -------- | -------- |
| Use Updated Calendar Control Logic                      | ☐        | **☑**    |
| Convert Date Fields to Customer Timezone                | ☐        | ☐        |
| Prevent Conversion For Dates Ignoring Timezones         | ☐        | ☐        |
| Calendar Field Default Mask                             | ""       | (same)   |

Other Forms flags worth knowing about (customer-scope, database identical in spot-checks):

- Use Beta Form Viewer: ☑
- Use Beta Form Optimizations: ☑
- Form Designer Render Optimization: ☑
- Use Offline Forms 2.0: ☑
- Open Form Viewer in New Tab: ☑
- Parse JSON Dropdownlist Values: ☑
- Try to Parse Data Lookup Values as Numeric: ☑
- Disable External Script File Caching: ☑

## Open Questions (Need User Confirmation)

1. **Where does env-scope config live?** Tried guessing URLs (`/ca/ConfigureEnvironment`, `/ca/SystemSettings`, `/ca/ConfigureFarm`, `/ca/ConfigureInstance`, etc.) — all redirect to `SelectDatabase`. Is env-scope configured outside the `/ca/` UI (e.g., web.config / appsettings), or under a CA URL I haven't found?
2. **Precedence rule** — is it strictly DB > Customer > Env, or only certain settings cascade? (Expected: DB overrides Customer; Env is baseline default.)

## Full Enumeration — All 15 Configuration Sections

Captured 2026-04-20 at both customer and database scope (structurally identical for most sections; differences called out per-section). Individual JSON files under [config-sections/](config-sections/):

| #  | Section             | File                                    | Inputs | Checkboxes | Dropdowns | Purpose                                                              |
|----|---------------------|-----------------------------------------|--------|------------|-----------|----------------------------------------------------------------------|
| 1  | General             | [general-database-scope.json](config-sections/general-database-scope.json) + customer in [../tabs/04-settings.json](tabs/04-settings.json) | 29 | 39 (db) / 44 (cust) | 4 | Culture/time, logs, perf, security, users, workflow, training, billing |
| 2  | Add-In Profile 1-4  | [add-in-profiles.json](config-sections/add-in-profiles.json) | 43 each | 16 each | 0 | QuickBase/SalesForce/Outlook integration slots (4 identical)         |
| 3  | Document Library    | [document-library.json](config-sections/document-library.json) | 99 | 111 | 8 | Doc storage (S3), viewer, annotations, e-sign, indexing, purge perms  |
| 4  | Email Configuration | [email-configuration.json](config-sections/email-configuration.json) | 19 | 11 | 0 | SMTP, AWS bounce check, transmittals, subscription digest             |
| 5  | **Forms**           | [forms.json](config-sections/forms.json) (cust) + [forms-database-scope.json](config-sections/forms-database-scope.json) (db) | 17 | 23 | 4 | **V1/V2 calendar logic lives here** — DB=☑, Customer=☐                |
| 6  | Intelligent Objects | [intelligent-objects.json](config-sections/intelligent-objects.json) | 0 | 2 | 0 | Feature-flag only                                                     |
| 7  | Other               | [other.json](config-sections/other.json) | 23 | 6 | 1 | **Scripting Server URL** (harness), eFax/vFax, SNS, VVConnect, GitHub |
| 8  | Server Farm         | [server-farm.json](config-sections/server-farm.json) | 26 | 2 | 0 | Endpoint URLs, TZ cache minutes (20), process server locations        |
| 9  | Service Tasks       | [service-tasks.json](config-sections/service-tasks.json) | 4 | 21 | 0 | Background jobs: doc audit, purge, reindex, user/password lifecycle   |
| 10 | SociaVault PG       | [sociavault-pg.json](config-sections/sociavault-pg.json) | 18 | 0 | 0 | Behavioral-health vertical: URL + form-template mapping               |
| 11 | Timecard            | [timecard.json](config-sections/timecard.json) | 32 | 1 | 0 | Time-card vertical: pay periods (2005-01-01 / 14 days), task sequences |
| 12 | User Interface      | [user-interface.json](config-sections/user-interface.json) | 3 | 33 | 1 | Legacy vs new admin pages, menu hide flags, beta task list            |

**Totals:** ~386 settings per scope (customer or database), ~772 for both combined.

### Cross-Section Findings Worth Remembering

1. **V1/V2 calendar logic** — DB overrides Customer. Resolved at `setUserInfo()`. Forms section only.
2. **Scripting Server URL** (`Other` section) points to `https://nodejs-preprod.visualvault.com` for vv5dev — that's our harness base.
3. **TZ caching**: `Minutes to Cache Time Zone Value = 20` in Server Farm. Client-side TZ value refresh interval.
4. **Legacy UI** is on for Menus/Fields/Dropdowns/Sites/Groups/Form Lists. Matches what we see when scraping admin pages.
5. **Vertical modules** (SociaVault PG, Timecard) are disabled (`Enable = false`) but their config slots are filled with product-specific URLs and form-template names — they were seeded but not activated.
6. **Workflow flags**: `Allow Legacy Workflow = false`, `Use Numeric Comparisons = true`, `Check Previous Workflow Conditions = true`. Matches the post-legacy workflow platform state.
7. **Customer-only checkboxes** (on General section): Allow Public Shares, Enable External Authentication, Enable Session End Notification, Require Multi-factor Authentication, Verbose Login. These 5 don't appear at DB scope.

### Capture Methodology

The RadToolBar items for the 15 sections are accessed via Telerik's `window.$find(<toolbarId>).get_allItems()` API. `item.click()` triggers ASP.NET postback that re-renders `#ctl00_ContentBody_{ConfigSettings|DatabaseSettings}_userControl_repeaterSectionSettings`. Small-batch (≤2 sections per CDP call) prevents the 45s Chrome DevTools timeout; busy-wait loops must be bounded.

Helpers installed in [probe-central-admin.js](../../../tools/explore/probe-central-admin.js) stop at `/ca/SelectDatabase` for non-CA accounts. A CA-authenticated browser session (Chrome extension) is required to reach these pages.
