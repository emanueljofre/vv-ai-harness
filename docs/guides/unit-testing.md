# Unit Testing Guide

Unit tests for CLI tools and shared libraries. Separate from Playwright browser tests (`testing/`).

## Quick Start

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode — re-runs on save
npm run test:coverage     # Run with coverage report (output: coverage/)
```

## Stack

| Component  | Tool                                  | Config                 |
| ---------- | ------------------------------------- | ---------------------- |
| Framework  | Jest 30                               | `jest.config.js`       |
| Assertions | Jest built-in + custom matchers       | `__tests__/helpers.js` |
| Lint       | ESLint (Jest globals auto-configured) | `eslint.config.js`     |

## Directory Convention

Tests live **co-located** with their source code in `__tests__/` directories:

```
tools/{tool-name}/
  lib/
    parse-template.js
    report.js
  rules/
    field-naming.js
    accessibility.js
  __tests__/
    fixtures/                    # Test data (XML, JSON)
      minimal-template.xml
      naming-violations.xml
    helpers.js                   # Shared utilities for this tool's tests
    parse-template.test.js       # Tests for lib/parse-template.js
    rule-index.test.js           # Tests for rules/index.js
    rules/
      field-naming.test.js       # Tests for rules/field-naming.js
      accessibility.test.js      # Tests for rules/accessibility.js
```

**File naming:** `{source-module}.test.js` — Jest picks up `*.test.js` files inside `__tests__/` directories under `tools/`.

## Test Helpers (Review Tool)

Import from `__tests__/helpers.js`:

```js
const { loadFixture, buildContext, runRule, runAllRules, findingMatchers } = require('../helpers');
```

### loadFixture(name)

Parse an XML fixture into a review context. Equivalent to calling `parseTemplate()` on a file in `__tests__/fixtures/`.

```js
const ctx = loadFixture('naming-violations');
// ctx.fields, ctx.scripts, ctx.groups, etc.
```

### buildContext(opts)

Build a context from inline data — no XML file needed. Useful for testing specific field configurations.

```js
const ctx = buildContext({
    fields: [
        { name: 'firstName', type: 'FieldTextbox3' },
        { name: 'Last Name', type: 'FieldTextbox3', accessibilityLabel: 'Last Name' },
    ],
    scripts: [{ id: 's1', name: 'onLoad', code: 'var x = 1;', type: 'Function' }],
});
```

All field properties have sensible defaults — only specify what matters for the test.

### runRule(ruleId, context)

Run a single rule by ID and return its findings array. Throws if the rule ID doesn't exist.

```js
const findings = runRule('title-case', ctx);
```

### runAllRules(context)

Run all registered rules and return findings grouped by rule ID.

```js
const results = runAllRules(ctx);
// results['title-case'] → [...]
// results['accessibility-label'] → [...]
```

### Custom Matchers

Register with `expect.extend(findingMatchers)` at the top of your test file.

```js
expect.extend(findingMatchers);

// Check that a rule ID appears in findings
expect(findings).toContainFinding('title-case');

// Check for a specific finding by partial match
expect(findings).toContainFindingMatch({ ruleId: 'title-case', field: 'firstName' });

// Assert exact count of findings for a rule
expect(findings).toHaveFindingCount('title-case', 3);
```

## Writing Tests for a New Rule

When adding a new review rule, follow this pattern:

### 1. Create or update a fixture

If the rule needs specific XML structures, add a fixture to `__tests__/fixtures/`. Name it after the violation category (e.g., `calendar-violations.xml`). Reuse existing fixtures when possible.

### 2. Create the test file

```js
// tools/review/__tests__/rules/{rule-module}.test.js

const { loadFixture, buildContext, runRule, findingMatchers } = require('../helpers');

expect.extend(findingMatchers);

describe('{rule-module} rules', () => {
    describe('{rule-id}', () => {
        it('passes for compliant input', () => {
            const ctx = buildContext({
                fields: [
                    /* compliant fields */
                ],
            });
            const findings = runRule('{rule-id}', ctx);
            expect(findings).toEqual([]);
        });

        it('flags violations', () => {
            const ctx = buildContext({
                fields: [
                    /* violating fields */
                ],
            });
            const findings = runRule('{rule-id}', ctx);
            expect(findings).toContainFindingMatch({
                ruleId: '{rule-id}',
                field: 'expected field name',
            });
        });

        it('handles empty template', () => {
            const ctx = loadFixture('empty-template');
            const findings = runRule('{rule-id}', ctx);
            expect(findings).toEqual([]);
        });
    });
});
```

### 3. Test checklist

Every rule must have tests covering:

- [ ] **Pass case** — compliant input returns no findings
- [ ] **Fail case** — violating input returns correct findings with right ruleId, field, severity
- [ ] **Edge case** — empty template, missing properties, boundary values
- [ ] **Field type filtering** — rule only fires for its declared `appliesTo` types
- [ ] **Fixture validation** — at least one test uses a fixture file (not just inline `buildContext`)

## Writing Tests for Other Modules

### Parser (parse-template.js)

Test that XML is correctly transformed into the context shape:

```js
const ctx = parseTemplate(path.join(FIXTURES, 'some-fixture.xml'));
expect(ctx.fields).toHaveLength(N);
expect(ctx.fields[0]).toMatchObject({ name: '...', type: '...' });
```

### Report Generator (report.js)

Test report functions with pre-built findings arrays:

```js
const report = generateTemplateReport('Test', findings, 40);
expect(report).toContain('# Standards Review: Test');
expect(report).toContain('error');
```

### Rule Registry (rules/index.js)

Test metadata integrity and query helpers:

```js
expect(allRules).toHaveLength(40); // Update when rules are added
expect(rulesForComponent('form-templates').length).toBe(40);
expect(rulesForFieldType('FieldTextbox3')).toContainEqual(expect.objectContaining({ id: 'title-case' }));
```

## Fixtures

### Existing Fixtures

| Fixture                        | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `minimal-template.xml`         | Valid template with one of each major field type            |
| `empty-template.xml`           | Edge case — valid FormEntity with no fields/scripts/groups  |
| `naming-violations.xml`        | Default names, duplicates, empty names, invalid identifiers |
| `accessibility-violations.xml` | Missing labels, required fields without "field Required"    |

### Creating Fixtures

- Keep fixtures **minimal** — only include the XML structures needed for the rules under test
- Add a comment at the top describing what violations the fixture contains
- Name fixtures after the violation category, not the rule name
- Reuse fixtures across rule test files when they contain relevant data

## Coverage

```bash
npm run test:coverage
```

Coverage output goes to `coverage/` (gitignored). The config tracks coverage for all files in `tools/` excluding test files and browser-dependent modules.

## Relationship to Playwright Tests

|                  | Unit Tests (Jest)                   | Browser Tests (Playwright)            |
| ---------------- | ----------------------------------- | ------------------------------------- |
| **What**         | Tool logic, parsers, rules, reports | VV platform behavior in real browsers |
| **Where**        | `tools/*/__tests__/`                | `testing/specs/`                      |
| **Runner**       | `npm test`                          | `npm run test:pw`                     |
| **Speed**        | Fast (ms per test)                  | Slow (seconds per test, needs auth)   |
| **Dependencies** | None (pure logic)                   | VV environment, credentials, browser  |

Both test types coexist. Jest is configured to ignore all Playwright specs.
