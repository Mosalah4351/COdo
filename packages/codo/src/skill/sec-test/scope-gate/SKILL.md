---
name: sec-test:scope-gate
hidden: true
description: "Canonical scope-gate validation procedure — every sec-test skill that touches a live target invokes this rule, never restates it"
---

# Scope Gate (canonical reference)

## Purpose

The single source of truth for "is this test authorized?" Five skills currently reference the gate (pentest, api-security-test, auth-test, exploit-verify, fuzz in live-target mode). None of them re-declare what the gate checks — they all point here.

## The gate (5 checks, in order)

1. **File exists.** `.codo/security-scope.json` must exist in the project root.
2. **Parses as JSON.** No trailing commas, no comments — strict JSON.parse-clean.
3. **Schema validates.** Required fields: `targets` (non-empty array). Each target has `type` ∈ `web|api|host` and `value` (string). Optional: `version`, `created`, `allow_active_scan`, `out_of_scope`, `contact`.
4. **Not expired.** `expires` parses as ISO-8601 and is strictly in the future.
5. **Target named.** The full URL/host being tested must satisfy `targetMatches(scoped, target)` — exact match, or in-origin path-prefix. See "Matching semantics" below.

Any check fails → return `## PENTEST BLOCKED` with the failure reason and a one-line recommendation: what's missing or how to fix. Never proceed.

## Matching semantics

```
targetMatches(scoped, target) = true iff:
  - target === scoped (exact), OR
  - target extends scoped with `/`, `?`, or `#` as the boundary character
    AND the URL origins match exactly (scheme + host + port)
```

What this prevents:

- **Host-suffix bypass:** `staging.example.com.attacker.net` does not extend `staging.example.com` — the boundary character requirement blocks it.
- **Userinfo trick:** `staging.example.com@evil.com/` does not extend `staging.example.com` with an accepted boundary character.
- **Same-host different-protocol:** `http://staging.example.com/...` against `https://staging.example.com` fails origin equality.
- **Case false-negatives:** `STAGING.EXAMPLE.COM` → lowercased before comparison, so legitimate case variation doesn't fail the gate.

Matching is implemented in `packages/codo/src/security/scope-gate.ts` (`evaluateGate` + `targetMatches`). When in doubt, run the test suite at `packages/codo/test/security/scope-gate.test.ts` — it covers 10 cases including the bypass families above.

## The contract for personas

- Every dynamic testing skill MUST call the gate before making any network request, even if the call looks "read-only."
- The gate logic belongs in `scope-gate.ts`. Do not inline re-implementations in skill markdown.
- If the gate behavior changes, change it once here, and the tests will catch any persona that drifts.
