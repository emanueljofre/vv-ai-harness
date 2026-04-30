# Documentation

Shared documentation for the VisualVault platform — architecture, standards, guides, and reference material.

## Structure

```
docs/
  architecture/          # Platform architecture, component diagrams, data flow
  standards/             # Coding standards, patterns, conventions
  guides/                # How-to guides, onboarding, troubleshooting
  reference/             # API reference, config options, field types
```

## Contents

### Architecture

- [visualvault-platform.md](architecture/visualvault-platform.md) — URL structure, navigation map, admin tools, user menu, Enterprise Tools, Process Design Studio (token-bound launch, i18n fallback, workflow editor tabs, execution variable views, event-source UI), FormsAPI, authentication, version/build discovery, service architecture (per-service behavioral config, FormSettings), dual-app UI framework stack (admin ASP.NET + FormViewer Angular detection), REST API resources, localization API, FormViewer feature map, document index field date handling, auto-save finding, demo + WADNR environment references, Form Designer URL/workflow, template revision lifecycle

### Standards

- [bug-reporting.md](standards/bug-reporting.md) — Index for bug documentation: when to use which format, shared conventions (bug ID, severity rubric, core writing principles, file naming)
- [bug-report-support.md](standards/bug-report-support.md) — Short-form template for filing tickets with VV support or product teams (one page, metadata + repro + evidence)
- [bug-report-investigation.md](standards/bug-report-investigation.md) — Deep-analysis format for defects you're analyzing yourself (9-section structure, root cause, companion fix doc, scope boundary check)
- [form-template-standard.md](standards/form-template-standard.md) — 49 atomic form template standards (naming, accessibility, layout, calendar config, script hygiene, groups, admin override, form controls, dropdown config, label layout, visual consistency, field width) with pass/fail definitions

### Guides

- [dev-setup.md](guides/dev-setup.md) — **Canonical setup guide** — environment setup, Playwright, credentials, code quality, troubleshooting
- [playwright-testing.md](guides/playwright-testing.md) — Playwright patterns, architecture, extension guide
- [scripting.md](guides/scripting.md) — Node.js server data flow, script contracts (form, scheduled, workflow microservice), `postCompletion` API quirks, `vvClient.getBaseUrl()` accessor, `completeWorkflowWebService` API + workflow variable mapping (incl. system-typed variables: `Originator` is a User GUID, `SourceDocId` from event sources is the instance-name string), public-docs vs lib `workflowVariables` type discrepancy, API field casing, date passthrough behavior, FormsAPI access, `response.json()` vs `postCompletion()` execution flow
- [unit-testing.md](guides/unit-testing.md) — Jest unit testing conventions, helpers API, custom matchers, fixture patterns, writing tests for new review rules

### Reference

- [tools.md](reference/tools.md) — Complete CLI tools reference: all scripts in `tools/`, parameters, scope, write behavior, examples, cross-tool workflows, helper module API
- [form-fields.md](reference/form-fields.md) — Calendar field config properties, popup modal behavior, V1/V2 code path, VV.Form console API, known bugs summary
- [vv-form-api.md](reference/vv-form-api.md) — Full VV.Form object structure: properties, methods, sub-objects, field definitions, automation patterns
- [api-date-patterns.md](reference/api-date-patterns.md) — Correct datetime handling for web services: CSV imports, TZ offsets, safe patterns, common pitfalls
- [form-template-xml.md](reference/form-template-xml.md) — Form template XML export format: field types, groups/conditions, script library, built-in control GUIDs, XML vs JSON format comparison
- [formviewer-url-params.md](reference/formviewer-url-params.md) — Complete FormViewer URL parameter catalog: core params, display/navigation, relate-on-create, field pre-population, tab values (extracted from Angular source)
