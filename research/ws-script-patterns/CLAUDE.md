# ws-script-patterns — VV Script Pattern Validation & Expansion

## What This Is

Validate and expand the canonical VV script templates used as references for all platform script types: web services, scheduled processes, and web services for workflows. Result feeds back into `scripts/templates/` so every new script in any project starts from a verified pattern.

## Scope

| Component                      | Status | Notes                                                                              |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| Web service (request/response) | TBD    | `scripts/templates/webservice-pattern.js` — validate against current VV            |
| Scheduled process              | TBD    | `scripts/templates/scheduledprocess-pattern.js` — runner exists (`run-sp-test.js`) |
| Web service for workflow       | TBD    | New pattern — not yet templated                                                    |
| Web service call (client-side) | TBD    | `scripts/templates/web-service-call-pattern.js` — validate                         |
| Event-based scripts            | TBD    | `scripts/examples/event-based/` — promote to template if pattern stabilizes        |
| Form scripts                   | TBD    | `scripts/examples/form/` — promote to template if pattern stabilizes               |

## Folder Structure

```
research/ws-script-patterns/
  analysis/   # Pattern findings, validation results, gaps in current templates
```

As work progresses, add `matrix.md` (pattern coverage), `test-cases/` (per-pattern reproducible specs), and per-pattern subfolders if needed.

## Key Facts

_(Document key facts as they are discovered during investigation.)_

## Confirmed Bugs

_(Add bugs here as they are confirmed, using the index table format:)_

| ID  | Name | Severity | File |
| --- | ---- | -------- | ---- |

Each bug gets its own file in `analysis/` following `docs/standards/bug-report-investigation.md`. See `docs/standards/bug-reporting.md` for the index of formats and when to use which.

## Next Steps

1. Inventory existing templates in `scripts/templates/` and examples in `scripts/examples/` — what each covers and what gaps exist.
2. Define the validation methodology: how to prove a pattern is correct (runner harness, expected I/O, error-path coverage).
3. Validate each existing template against current VV behavior; record findings in `analysis/`.
4. Identify missing patterns (e.g., web service for workflow) and draft new templates.
5. Promote validated patterns back into `scripts/templates/` as the canonical references.
