# Tools — General-Purpose Workspace Tooling

Standalone CLI utilities for working with VV environments. Not tied to Playwright test execution — used for development, analysis, debugging, reviews, and workflow automation.

## Subfolders

| Folder        | Purpose                                                       | Example usage                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extract/`    | Extract data from any VV environment                          | `node tools/extract/extract.js --output projects/wadnr/extracts`                                                                                                                                                                           |
| `runners/`    | Execute workflows, WS/SP/FormsAPI harness, debug              | `node tools/runners/run-ws-test.js --action WS-2`, `node tools/runners/run-sp-test.js`, `node tools/runners/run-forminstance-test.js` (forminstance-pattern research)                                                                      |
| `audit/`      | Verify platform behaviors in browser                          | `node tools/audit/audit-bug5-fake-z.js`                                                                                                                                                                                                    |
| `inventory/`  | Analyze extracted project data                                | `node tools/inventory/inventory-fields.js`                                                                                                                                                                                                 |
| `generators/` | Create structured artifacts from test results                 | `node tools/generators/generate-artifacts.js`                                                                                                                                                                                              |
| `explore/`    | Platform exploration + version monitoring                     | `npm run explore:headed`, `npm run version:snapshot`                                                                                                                                                                                       |
| `analysis/`   | Derived views + V2-baseline management over project artifacts | `npm run build:timeline`, `npm run task:status`, `npm run rebaseline:v2`, `npm run audit:v2`, `npm run tag:v2`, `npm run audit:ws:v2`, `npm run matrix:ws:v2` (each takes `--project <name>`)                                              |
| `admin/`      | Create/manage VV admin objects (Playwright UI or REST)        | `node tools/admin/create-ws.js --project emanueljofre-vvdemo --name myWS` (Playwright); `node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev` (REST, idempotent)                                                       |
| `review/`     | Standards compliance review + reports                         | `node tools/review/review.js --project wadnr`, `review.js --matrix`                                                                                                                                                                        |
| `helpers/`    | Shared libraries used by tools                                | `vv-admin.js`, `vv-templates.js`, `vv-formsapi.js`, `vv-probes.js`, `vv-sync.js`, `build-context.js`, `build-fingerprint.js`, `ws-slot-id.js`, `ws-matrix-compare.js`, `ws-results-path.js`, `sp-results-path.js`, `forms-results-path.js` |

## Explore Commands

```bash
npm run explore              # Run exploration specs (headless)
npm run explore:headed       # Run with visible browser
npm run explore:report       # Open HTML report with artifacts
npm run version:snapshot     # Capture current platform version state
npm run version:diff         # Compare two most recent snapshots
npm run version:list         # List available snapshots
npm run env:profile          # Generate environment profile (HTTP only, ~3s)
npm run env:profile:browser  # Generate profile with browser probes (~12s)
```

Environment profiles are saved to `projects/{customer}/environment.json`. Use `--project <name>` to target a specific customer, `--print` for stdout only. Browser probes capture front-end library versions (jQuery, Kendo, Telerik, Angular) from both the Admin app and FormViewer SPA — including Kendo v1/v2 variant detection.

## Write Safety

Tools connect to live VV environments. See root `CLAUDE.md` § "Write Safety" for the full policy.

- **Extract tools are read-only by design.** All extract components set `readOnly: true` on their API clients. Do not add write operations to extract components.
- **Explore specs are read-only.** They navigate and inspect — never click Save, Edit, or Delete in admin panels.
- **Runners (`run-ws-test.js`)** respect `readOnly` and `writePolicy` from `.env.json`. The WS harness can invoke web services that create/modify forms — it is governed by the same write policy.
- **Audit scripts** that create test records (e.g., `audit-bug2-db-evidence.js`) should use `saveFormOnly()` from `testing/helpers/vv-form.js` so the write-policy guard applies. New audit scripts that write data require explicit user approval.
- **Do not modify** `lib/VVRestApi/VVRestApiNodeJs/common.js` (the API-layer write guard) without explicit user approval.

## Unit Testing

All tools must have unit tests. Tests live co-located with each tool using `__tests__/` directories. Framework: **Jest** (configured in root `jest.config.js`).

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode (re-run on file changes)
npm run test:coverage     # Run with coverage report
```

### Directory Convention

```
tools/{tool-name}/
  __tests__/
    fixtures/             # XML, JSON, or other test data
    helpers.js            # Shared test utilities for this tool
    {module}.test.js      # Tests for lib/{module}.js
    rules/
      {rule-module}.test.js  # Tests for rules/{rule-module}.js
```

### Writing Tests

- **One test file per source module** — `rules/field-naming.js` → `__tests__/rules/field-naming.test.js`
- **Use helpers** — `loadFixture()` for XML fixtures, `buildContext()` for inline data, `runRule()` for single-rule execution
- **Use custom matchers** — `toContainFinding()`, `toContainFindingMatch()`, `toHaveFindingCount()`
- **Test both pass and fail cases** — every rule needs tests for clean inputs and violation inputs
- **Test edge cases** — empty templates, missing fields, boundary values
- See [Unit Testing Guide](../docs/guides/unit-testing.md) for full conventions and patterns.

## Conventions

1. **Environment-agnostic.** Tools work for any VV customer/environment, not just WADNR. Customer-specific references belong in `projects/`, not here.
2. **Parameterized output.** Export and inventory tools accept `--output` flags to direct results to the appropriate `projects/{customer}/` folder.
3. **Shared.** All tools are committed to the team repo — they benefit every developer.
4. **Helpers split.** `tools/helpers/` has libraries used by tools (vv-admin, vv-templates, vv-probes, vv-sync, ws-api). Test-specific helpers (vv-form, vv-calendar) stay in `testing/helpers/`.
5. **Unit tests.** Helper and component tests live in `tests/` and run via `npm test` (Jest). Playwright specs live in `testing/specs/`.
6. **Environment profiles are read-only.** They only GET data via HTTP and navigate browser pages — no writes to VV environments.
