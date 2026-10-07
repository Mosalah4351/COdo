---
name: sec-test:test-plan
hidden: true
description: "Risk-ranked test plan for an untested or under-tested surface — run through the sec-qa persona"
---

# Test Plan

## Overview

Decide **what to test and in what order** before writing a single test. Produces a risk-ranked plan, not tests. This is the skill that prevents the most common failure mode in agent-written tests: 40 trivial tests on a formatting helper while the permission check stays uncovered.

## Workflow

1. **Learn the project's conventions first.** Locate the runner (`package.json` scripts, `bunfig.toml`, `pytest.ini`, `go.mod`, `Cargo.toml`), the assertion style, and the fixture helpers. Read any `AGENTS.md`, `CONTRIBUTING.md`, or `test/AGENTS.md` testing guidance and treat it as binding — a correct test in the wrong idiom gets rejected.
2. **Inventory what exists.** Map test files to source modules. Note the current pyramid shape (unit / integration / e2e counts) and search for `\.skip`, `\.only`, `retry`, and fixed `sleep`/`setTimeout` calls — each is a latent flake.
3. **Rank untested surface by blast radius, not by line count.** In descending order: authentication, authorization/ownership checks, money movement, data deletion, input parsing and validation, cryptography, permission evaluation, then everything else. A 12-line uncovered permission check outranks a 400-line uncovered view helper.
4. **For each ranked item, state the test level and why.** Unit when the logic is pure; integration when the risk lives in the seam (DB, filesystem, HTTP); e2e only when the risk is genuinely cross-process. Default to the cheapest level that can actually fail for the right reason.
5. **Name the specific cases, including the negative ones.** For every happy path, name at least one failure path and one boundary. "Rejects an expired token" is a case; "tests auth" is not.
6. **Flag untestable items explicitly.** If a test needs a seam that does not exist (no export, hard-coded singleton, direct `Date.now()`, unmockable global), record it as a `QA-UNTESTABLE` finding naming the missing seam. Do NOT plan a source refactor — you cannot write production code.
7. **Write the plan** to `.planning/testing/<slug>-plan.md` and record findings via `sec_finding`.

## Plan format

```markdown
## Coverage inventory
| Module | Tests | Level | Risk | Gap |
|---|---|---|---|---|
| src/permission/index.ts | 0 | — | critical | evaluate() ordering untested |

## Ranked plan
1. `src/permission/index.ts` — **unit** — `evaluate()` last-match-wins ordering
   - allow-then-deny resolves to deny
   - deny-then-allow resolves to allow
   - pattern miss falls through to the wildcard rule
   - **why unit:** pure function, no seam involved
```

## Rules

- **Plan only.** Do not write tests in this skill; that is `sec-test:test-generate`.
- **Never plan a coverage percentage as the goal.** Percentages measure execution, not verification. Rank by risk and say what each test would *catch*.
- **Never plan to change production source.** Missing seams are findings.
- **Be honest about the runner.** If no test runner is configured at all, say so in `<coverage>` and stop — recommend the user pick one rather than guessing.

## Structured return

```
## SEC-RESULT skill=sec-test:test-plan status=complete findings=<n> critical=<n> high=<n> doc=.planning/testing/<slug>-plan.md
```

Then prose: the pyramid shape you found, the top three risks, and anything untestable without a source change.
