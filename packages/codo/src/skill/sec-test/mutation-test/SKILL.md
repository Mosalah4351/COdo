---
name: sec-test:mutation-test
hidden: true
description: "Measure whether tests would actually fail on a regression, via mutation testing — run through the sec-qa persona"
---

# Mutation Test

## Overview

The only metric that answers the question coverage cannot: **would this suite fail if the code broke?** Mutation testing changes the source in small ways (flip a comparison, negate a condition, drop a statement) and reports how many mutants the suite killed. A surviving mutant is a regression that would ship silently.

## Workflow

1. **Check for tooling.** `stryker` (JS/TS), `mutmut` or `cosmic-ray` (Python), `go-mutesting` (Go), `cargo-mutants` (Rust), `PIT` (Java). **If none is installed, say so in `<coverage>` and switch to the manual protocol in step 6** — do not report a fabricated score.
2. **Scope tightly.** Mutation runs are expensive: the suite runs once per mutant. Target the single highest-risk module from the coverage audit, not the whole repo. Set an explicit timeout.
3. **Establish a green baseline first.** Mutation results are meaningless if the suite already fails. If it is red, stop and report that.
4. **Run the mutation tool** against the scoped module and capture the score plus the surviving mutants.
5. **Triage every survivor into one of three buckets:**
   - **Real gap** — the mutation changes behavior and no test noticed. This is a `QA-MUTATION-SURVIVED` finding. Write the missing test.
   - **Equivalent mutant** — the mutation is semantically identical to the original (e.g. reordering independent operations). Not a gap; note and dismiss.
   - **Not worth killing** — the mutated line is logging, telemetry, or a defensive branch that cannot be reached. Note and dismiss with the reason.
6. **Manual fallback when no tool exists.** For each critical branch, mentally apply one mutation and ask which assertion fails. Concretely: flip a boundary comparison (`>` to `>=`), invert a guard, and make a validator return `true` unconditionally. If no test would fail, that is a real gap — record it. Say clearly in the report that this was manual sampling, not a measured score.
7. **Record findings** and write the report to `.planning/testing/<slug>-mutation.md`.

## Severity mapping

A surviving mutant's severity is the severity of the bug it represents:
- `critical` — survivor in an authentication, authorization, or permission-evaluation path
- `high` — survivor in input validation, parsing, or a cryptographic control
- `medium` — survivor in business logic
- `low` — survivor in formatting or presentation

## Rules

- **Never leave a mutant applied.** Mutation tools revert automatically; if you mutated by hand, confirm `git diff` is clean on production source before finishing. You do not have write permission on source, so a lingering mutation should be impossible — verify anyway.
- **Never report a score you did not measure.** Manual sampling is sampling; label it.
- **Do not chase 100%.** Equivalent mutants make that unreachable. Report the score, the survivors that matter, and stop.

## Structured return

```
## SEC-RESULT skill=sec-test:mutation-test status=complete findings=<n> critical=<n> high=<n> doc=.planning/testing/<slug>-mutation.md
```

Then prose: the tool used (or that sampling was manual), the score, the module scoped, and each real survivor with the test that should exist.
