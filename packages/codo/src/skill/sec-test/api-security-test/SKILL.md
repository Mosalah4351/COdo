---
name: sec-test:api-security-test
hidden: true
description: "OWASP API Security Top 10 checks against a running endpoint — REQUIRES .codo/security-scope.json"
---

# API Security Test

## HARD GATE

This skill is downstream of `sec-test:pentest`'s scope check. Before any request:

1. Read `.codo/security-scope.json`. If missing, return `## PENTEST BLOCKED — no scope file`.
2. Parse + validate expiry + targets exactly like the pentest skill does.
3. Confirm the URL you're about to test is in `targets`. If not, `# PENTEST BLOCKED — target not in scope`.
4. If `allow_active_scan: false`, run *only* the read-only checks below (auth surface, header posture, error leakage) — do NOT send malformed requests.

## Workflow

Map every endpoint to the OWASP API Security Top 10:2023:

- **API1 Broken Object Level Authorization** — try swapped IDs, both in URL (`/users/123` → `/users/124`) and body (`{"userId": ...}`).
- **API2 Broken Authentication** — missing/weak JWT validation? `alg:none` accepted? Short token lifetime on refresh?
- **API3 Broken Object Property Level Authorization** — read/write on hidden or admin-only fields (`isAdmin`, `role`) through PATCH or JSON merge.
- **API4 Unrestricted Resource Consumption** — oversized payload? Pagination bounds? Long-running query without timeout?
- **API5 Broken Function Level Authorization** — call admin endpoints as a regular user.
- **API6 Unrestricted Access to Sensitive Business Flows** — repeated, automated calls to money-moving or quota-consuming routes.
- **API7 SSRF** — does the endpoint fetch URLs supplied by the caller? Test with `?url=http://169.254.169.254/...` and the project's own metadata endpoints.
- **API8 Security Misconfiguration** — stack traces in 500s? `Server:`/`X-Powered-By:` leaking framework version? CORS permissive?
- **API9 Improper Inventory Management** — undocumented v0 endpoints? Stale `/beta/` or `/internal/`?
- **API10 Unsafe Consumption of APIs** — does the project blindly trust third-party API payloads? (Read code for this one — the pentest verifies.)

## Reporting

For each confirmed issue, write a finding with the exact request + response. Path: `.planning/security/findings/YYYY-MM-DD-api-security.md` (persona: sec-pentest).

Return `## PENTEST COMPLETE` with a per-API# finding count.

## Rules

- **The scope file is the contract.** No scope file → no dispatch. No listed target → that target is off-limits regardless of how "obviously internal" it looks.
- **Detection only.** Do not chain into full exploitation beyond confirming reach to the vulnerable code path.
- Log every request exactly once in the evidence field — reproducing the finding must be possible from the report alone.
