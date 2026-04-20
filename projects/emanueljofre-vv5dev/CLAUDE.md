# EmanuelJofre-vv5dev Project — Personal Sandbox on vv5dev

## Environment

| Setting      | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Server       | vv5dev                                                    |
| Customer     | EmanuelJofre                                              |
| Database     | Main                                                      |
| Base URL     | https://vv5dev.visualvault.com                            |
| Read-Only    | No (enforced in `.env.json`)                              |
| Write Policy | `unrestricted` — development sandbox, all writes allowed  |

Full environment profile (platform versions, services, front-end stack): [`environment.json`](environment.json) — generate with `npm run env:profile -- --project emanueljofre-vv5dev`.

## Write Safety

Development sandbox — all writes allowed. See root `CLAUDE.md` § "Write Safety" for the guard architecture.

## Extracts

All data extracted via `tools/extract/` from the EmanuelJofre admin panels on vv5dev.

| Component          | Count | Location                     |
| ------------------ | ----- | ---------------------------- |
| Web Services       | —     | `extracts/web-services/`     |
| Scheduled Services | —     | `extracts/schedules/`        |
| Global Functions   | —     | `extracts/global-functions/` |
| Form Templates     | —     | `extracts/form-templates/`   |
| Custom Queries     | —     | `extracts/custom-queries/`   |

Last full extraction: not yet run.

## Commands

```bash
# Capture environment profile
npm run env:profile -- --project emanueljofre-vv5dev              # HTTP only (~3s)
npm run env:profile:browser -- --project emanueljofre-vv5dev      # + browser probes (~12s)

# Export all components
node tools/extract/extract.js --project emanueljofre-vv5dev

# Dry-run
node tools/extract/extract.js --project emanueljofre-vv5dev --dry-run
```

## Analysis

No analysis files yet. Run exports first, then use:

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Repo

Deployable code lives in `repo/` (independent git repo — [emanueljofre/EmanuelJofre-vv5dev](https://github.com/emanueljofre/EmanuelJofre-vv5dev), private).

## Related

- Sister sandbox on vvdemo: [`../emanueljofre-vvdemo/`](../emanueljofre-vvdemo/CLAUDE.md)
