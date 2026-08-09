---
name: sec-test:code-audit
hidden: true
description: "Static security audit of application code against OWASP Top 10:2025 and CWE Top 25 — run through the sec-appsec persona"
---

# Code Audit

## Overview

Systematic read-only audit of application source for the OWASP Top 10:2025 categories and the CWE Top 25. Detection only — never edit code as part of this skill; fixes are proposed, not applied.

## Workflow

1. **Scope the surface.** Glob the target tree (`src/**/*.{ts,tsx,js,jsx,py,go,rs,java,rb,php}` etc.). Skip `node_modules`, `dist`, `build`, `*.min.*`, vendored dirs.
2. **Run automated tooling when present.** Prefer `semgrep scan --config auto` or `opengrep` with OWASP rulesets. Semgrep CE does not do cross-file taint tracking — for multi-file flows note the limitation and rely on manual review of data-flow boundaries. If CodeQL databases exist, run the security-extended suite. **If no scanner is available, say so explicitly in `<coverage>`,** walk the Top 10 manually, and flag the reduced coverage.
3. **Manual review of the Top 10 (2025).** Walk each category. **Do not invent letter codes — these are the actual 2025 mappings:**
   - **A01 Broken Access Control** — missing ownership checks on mutations; IDOR on path/body params; **also absorbs what 2021 listed as A10 SSRF** — server-side fetches from user-controlled URLs without allowlisting.
   - **A02 Security Misconfiguration** — debug flags, default creds, permissive CORS (`Access-Control-Allow-Origin: *` with credentials), stack traces shipped to clients, missing security headers.
   - **A03 Software Supply Chain Failures** *(new in 2025)* — unsigned/unpinned dependencies, install scripts running on postinstall, registry hijack patterns (recently transferred maintainers, typosquats), unpinned action SHAs in CI. Hand off deep dives to `sec-test:dependency-audit` and `sec-test:supply-chain-attest`.
   - **A04 Cryptographic Failures** — hardcoded keys, weak algorithms (MD5/SHA1/DES/ECB), plaintext secrets in transit, JWT `alg:none` still accepted.
   - **A05 Injection** — string-built SQL/shell/LDAP/XPath; template injection; `eval`/`new Function`/`child_process` with user data.
   - **A06 Insecure Design** — missing rate limits on sensitive endpoints, no abuse-case handling, missing threat-model coverage.
   - **A07 Authentication Failures** — session fixation, missing rotation, weak reset flows, MFA bypass.
   - **A08 Software & Data Integrity Failures** — unsigned updates, deserialization of untrusted data (`pickle`, `unserialize`, Java `readObject`), untrusted CI/CD artifact promotion.
   - **A09 Security Logging & Alerting Failures** *(formerly "logging & monitoring")* — sensitive actions without audit trail; secrets written to logs; no alerting on anomalous events.
   - **A10 Mishandling of Exceptional Conditions** *(new in 2025)* — swallow-then-continue exception handlers, uncaught promise rejections leaking stack frames, error-handling that exposes internals.
4. **Secrets sanity check.** If `gitleaks`/`trufflehog` is available and the user asked, defer to `sec-test:secrets-scan`. Otherwise grep for the obvious patterns (AKIA[0-9A-Z]{16}, -----BEGIN.*PRIVATE KEY-----, `password\s*=\s*["']`).
5. **Write the audit report** to `.planning/security/findings/YYYY-MM-DD-<slug>.md` using the finding schema below.
6. Return the `## CODE AUDIT COMPLETE` marker plus a count of findings by severity.

## Finding schema (YAML frontmatter per finding)

Match the persistence layer exactly — this is what `security_finding` stores.

```yaml
id: <app-generated, e.g. "fin_cuid_xyz">      # DO NOT mint your own — the runtime assigns
persona: sec-appsec
category: A05-injection                       # OWASP A01..A10 (2025) or CWE-###
location: src/api/users.ts:42                  # file:line (relative to project root) or URL
confidence: high | medium | low
severity: critical | high | medium | low | info
finding: one-sentence description
evidence: short quoted snippet or request/response
remediation: concrete fix, referencing the project stack
status: open                                   # open | fixed | accepted-risk | false-positive
cvss_score: 9.8                                # optional
cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"   # optional
epss_score: 0.94                                # optional, 0.0-1.0
```

## Rules

- **Read-only on application code.** The `edit` tool is permitted ONLY under `.planning/security/`. If the user asks for a fix, dispatch a separate implementer after the audit is recorded.
- **Confidence honesty.** "medium"/"low" confidence is fine; never inflate. Unverified hypotheses go in an `## Open Questions` section, not the findings table.
- **Every finding needs evidence.** A grep hit with a quoted line beats three pages of prose.
- **Tool-missing is not silent.** If `semgrep` (or your preferred scanner) isn't installed, state that in the report's coverage section and walk the Top 10 manually. Do not silently degrade.
