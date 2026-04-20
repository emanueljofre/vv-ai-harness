# Central Admin — vv5dev/EmanuelJofre snapshot

Configuration captured from the VV Central Admin panels on **2026-04-20**.

> **Start here:** [SCOPE-HIERARCHY.md](SCOPE-HIERARCHY.md) documents the three-scope cascade (env / customer / database) and the V1/V2 calendar-logic resolution — this is the most important finding and changes how every date-handling test on this environment should be interpreted.

## Access Note

Central Admin requires a CA-privileged account. The `apivv5` service account used
by the Playwright harness is **not** CA-enabled — a call to `/ca/ConfigureCustomerDetails`
redirects via `/ca/centraladmin → /ca/SelectDatabase`. This snapshot was taken using
the Claude-in-Chrome extension against an already-authenticated CA session (Emanuel's
personal account).

## URL Pattern

```
/ca/ConfigureCustomerDetails?customerid=<guid>&tab=<tabParam>
```

| Order | Label in Menu         | `tab=` value        | File                          |
| ----- | --------------------- | ------------------- | ----------------------------- |
| 1     | Customer Details      | `Details`           | [tabs/01-details.json](tabs/01-details.json)                   |
| 2     | Users                 | `Users`             | [tabs/02-users.json](tabs/02-users.json)                       |
| 3     | Databases             | `CustomerDatabases` | [tabs/03-customer-databases.json](tabs/03-customer-databases.json) |
| 4     | Configuration Settings| `ConfigSettings`    | [tabs/04-settings.json](tabs/04-settings.json)                 |
| 4     | Settings (landing)    | `Settings`          | (renders ConfigSettings)      |
| 5     | Security Settings     | `SecuritySettings`  | [tabs/05-security-settings.json](tabs/05-security-settings.json) |
| 6     | Customer Administrators| `Administrators`   | [tabs/06-administrators.json](tabs/06-administrators.json)     |
| 7     | Customer Billing      | `CustomerBilling`   | [tabs/07-customer-billing.json](tabs/07-customer-billing.json) |

Tabs 4 and 5 are sub-tabs under a parent **Settings** tab. Navigating to
`tab=Settings` lands on Configuration Settings by default.

## Key Environment Facts

| Setting                  | Value                                       |
| ------------------------ | ------------------------------------------- |
| Platform DB version      | **v3041**                                   |
| Server Timezone          | **(UTC) Coordinated Universal Time**        |
| Culture                  | English (United States)                     |
| Language                 | English                                     |
| Default Auth             | `VisualVaultDatabase`                       |
| SQL Server               | `use1d-vvdevsql1`                           |
| App DB                   | `vv5dev_EmanuelJofre_Main`                  |
| Form DB                  | `vv5dev_EmanuelJofre_Main_FormData`         |
| Web Session Timeout      | 600 min                                     |
| Idle / Warning           | 1200 / 30 sec                               |
| Login Token Expiration   | 5 min                                       |
| Max Row Count            | 1000                                        |
| Password Rules           | all minimums `0` (no policy enforced)       |
| Password Expiration      | 180 days                                    |
| MFA Required             | No                                          |
| Roles & Permissions      | Off                                         |
| Request Throttling       | Off                                         |
| Legacy Workflow Allowed  | No                                          |
| Use Numeric Comparisons  | **Yes**                                     |
| Work Week                | Mon–Fri                                     |

## Why This Matters

These are customer-scoped toggles that change platform behavior. Anything we test
on this environment is implicitly running against **this exact configuration**. When
a behavior differs from what's documented on vvdemo/EmanuelJofre or WADNR, check
these flags first.

Date-handling relevance:
- Server TZ = **UTC** (vs BRT on vvdemo, UTC-7 on vv5dev/WADNR per platform doc)
- Culture = `English (United States)` → MM/DD/YYYY format on server-rendered dates
- `Use Numeric Comparisons = true` → affects sort/compare behavior for numeric-looking
  form values (relevant to tie-breaking in date-value sorts)

Security relevance:
- No MFA, no roles-and-permissions, no throttling — this is a sandbox with permissive
  defaults. Don't extrapolate password/lockout behavior to customer envs.
