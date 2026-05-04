# ws-script-patterns — VV Script Pattern Validation & Expansion

## What This Is

Validate and expand canonical VV script patterns for all platform script types: web services, scheduled processes, and web services for workflows. Patterns mature through `drafts/` → `finals/`, where developers reference them directly when authoring new scripts.

## Scope

| Component                      | Status | Notes                                                                   |
| ------------------------------ | ------ | ----------------------------------------------------------------------- |
| Web service (request/response) | Final  | `finals/ws.js` — refactored, code-reviewed, finalized 2026-04-30        |
| Scheduled process              | Final  | `finals/ws_sch.js` — refactored, finalized 2026-04-30                   |
| Web service for workflow       | Final  | `finals/ws_wf.js` — new pattern, finalized 2026-04-30                   |
| Web service call (client-side) | TBD    | `scripts/templates/web-service-call-pattern.js` — validate              |
| Event-based scripts            | TBD    | `scripts/examples/event-based/` — promote to a pattern if it stabilizes |
| Form scripts                   | TBD    | `scripts/examples/form/` — promote to a pattern if it stabilizes        |

The three finalized patterns share a single state-tracking contract (`output.status` → `logEntry.status` mirror) and identical helpers (`parseRes`, `checkMetaAndStatus`, `checkDataPropertyExists`, `checkDataIsNotEmpty`, `sanitizeLog`).

## Folder Structure

```
research/ws-script-patterns/
  analysis/   # Pattern findings, code review, validation results
  drafts/     # Legacy reference (ws_sch-old.js, ws_wf-old.js) + smoke test matrix (ws_wf-test-matrix.js)
  finals/     # Validated patterns ready for developer use — copy into a project, fill in placeholders
```

`finals/` is the canonical home for ready-to-use patterns. `drafts/` is kept for archeology (the legacy versions the finals replaced) and the workflow smoke test.

## Key Facts

_(Document key facts as they are discovered during investigation.)_

## Confirmed Bugs

_(Add bugs here as they are confirmed, using the index table format:)_

| ID  | Name | Severity | File |
| --- | ---- | -------- | ---- |

Each bug gets its own file in `analysis/` following `docs/standards/bug-report-investigation.md`. See `docs/standards/bug-reporting.md` for the index of formats and when to use which.

## Next Steps

1. Validate `scripts/templates/web-service-call-pattern.js` (client-side WS call) against current VV.
2. Stabilize `scripts/examples/event-based/` and `scripts/examples/form/` — promote to templates if patterns stabilize.
3. Address carry-forward concerns from the code review: `logEntry.parameters: ffCollection` (PII risk), filter-value query interpolation (injection risk in any future `getFormRecords` example), pure helpers defined inside `main` (not unit-testable).
4. Add a runner harness for end-to-end validation of each pattern (I/O contract + error-path coverage).
