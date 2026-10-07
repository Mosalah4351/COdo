---
name: sec-test:regression-guard
hidden: true
description: "Turn a fixed bug or a security finding into a permanent regression test — run through the sec-qa persona"
---

# Regression Guard

## Overview

A bug that shipped once will ship again unless something fails when it returns. This skill converts a specific defect — a resolved incident, a closed security finding, or a fresh bug report — into the narrowest test that fails on the old behavior and passes on the new one.

## Workflow

1. **Get the defect precisely.** Pull it from the findings store (`sec_finding` records carry `location`, `evidence`, and `remediation`), from `.planning/security/findings/`, or from the user. You need the exact input that triggered it and the exact wrong output.
2. **Reproduce the failure first, in a test.** Write the test against the *current* code and confirm what it does. If the bug is already fixed, temporarily assert the OLD (wrong) expectation to prove the test can fail — then invert it to the correct expectation. A regression test never validated against the failing state is not a regression test; it is a guess.
3. **Make the test minimal and named after the defect.** Include the finding id or issue number in the test name so the link survives: `rejects token with alg:none (fin_...)`. One test per defect.
4. **Assert the specific behavior, not the surrounding shape.** For a security fix, assert the request is *rejected* — not merely that a 200 became a 403 on one route. Assert the property the fix established.
5. **Pin the boundary.** If the fix introduced a limit (length cap, expiry window, rate), test just inside and just outside it. Off-by-one reintroductions are the most common regression.
6. **Do not delete or weaken any existing test** to accommodate the new one. If an existing test asserted the buggy behavior, that is a finding — report it rather than silently editing it away.
7. **Run the suite** and confirm green.
8. **Close the loop.** When the regression test passes, the originating finding may move to `fixed` — but only via `sec_finding` with `rescan: true`, and only because a test now proves it. A code change alone never closes a finding.

## Security-finding specifics

When guarding a security finding, the test must encode the *control*, not the symptom:
- authorization bug → assert a non-owner is refused, not that one specific id 403s
- injection → assert the payload is neutralized/parameterized, not that one string fails
- secret leak → assert the field is absent or redacted in the serialized output
- expiry bug → assert an expired artifact is rejected at the boundary

## Rules

- **The test must have failed once.** Prove it, in writing, in the report.
- **Test-shaped paths only.** No production source edits.
- **Never mark a finding `fixed` on the strength of a code diff.** Only a passing regression test plus `rescan: true` justifies it.
- **Keep it narrow.** A broad e2e test that happens to cover the bug will be deleted in six months; a named unit test survives.

## Structured return

```
## SEC-RESULT skill=sec-test:regression-guard status=complete findings=<n> critical=<n> high=<n> doc=.planning/testing/<slug>-regression.md
```

Then prose: the defect guarded, the finding id, proof the test failed against the old behavior, and the suite result.
