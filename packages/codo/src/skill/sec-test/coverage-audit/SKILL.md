---
name: sec-test:coverage-audit
hidden: true
description: "Measure coverage and separate executed lines from actually-verified behavior — run through the sec-qa persona"
---

# Coverage Audit

## Overview

Report what the suite actually verifies. Line coverage measures which lines *ran*, not which behaviors are *checked* — a branch executed with no assertion on its effect is uncovered in every sense that matters. This skill reports both numbers and never conflates them.

## Workflow

1. **Find the coverage tooling.** `bun test --coverage`, `vitest run --coverage`, `jest --coverage`, `pytest --cov`, `go test -cover`, `cargo llvm-cov`, or `nyc`/`c8` wrapping the runner. **If none is configured, say so explicitly in `<coverage>` and fall back to manual branch review** — do not silently report a guessed percentage.
2. **Collect line AND branch coverage.** Branch is the more honest metric; report both and lead with branch.
3. **Rank uncovered regions by risk**, using the same ordering as `sec-test:test-plan`: auth, authorization, money, deletion, parsing, crypto, then the rest. Sort by risk, never by uncovered-line count.
4. **Audit for assertion-free execution.** This is the part a coverage tool cannot tell you. For the highest-risk covered modules, check whether the test actually asserts the outcome or merely calls the function. Patterns that count as uncovered:
   - a call with no `expect`/`assert` on its return or side effect
   - `expect(fn()).toBeDefined()` on a function whose contract is a specific value
   - a snapshot asserted against output nobody has reviewed
   - a `try/catch` that swallows the assertion failure
   - an assertion inside a callback that never runs
5. **Distinguish "not covered" from "not worth covering."** Generated files, type-only modules, and thin re-export barrels are noise. Exclude them and say that you did.
6. **Report the delta** if a previous coverage number exists in `.planning/testing/` or the findings store. A trend is worth more than an absolute.
7. **Record findings** (`QA-NO-COVERAGE`, `QA-WEAK-ASSERTION`) and write the report to `.planning/testing/<slug>-coverage.md`.

## Report format

```markdown
## Coverage
| Metric | Value | Note |
|---|---|---|
| Branch | 61% | leading metric |
| Line | 78% | execution only |
| Tooling | `bun test --coverage` | |

## Uncovered, by risk
| Module | Branch | Risk | What ships broken |
|---|---|---|---|
| src/permission/index.ts | 12% | critical | rule-ordering regressions are invisible |

## Executed but unverified
| Test | Problem |
|---|---|
| permission.test.ts:40 | calls evaluate() but asserts only `toBeDefined()` |
```

## Rules

- **Never present line coverage as the headline number.** Lead with branch, and state plainly that neither measures correctness.
- **Never recommend a coverage target percentage.** Recommend specific tests for specific risks.
- **Do not fabricate numbers.** If the tool did not run, there is no number.
- **Read-only on production source.**

## Structured return

```
## SEC-RESULT skill=sec-test:coverage-audit status=complete findings=<n> critical=<n> high=<n> doc=.planning/testing/<slug>-coverage.md
```

Then prose: branch/line coverage, the tool used (or that none exists), the top uncovered risks, and how many "executed but unverified" cases you found.
