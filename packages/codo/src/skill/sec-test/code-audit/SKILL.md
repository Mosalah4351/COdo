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
2. **Run automated tooling when present.** Prefer `semgrep scan --config auto` or `opengrep` with OWASP rulesets. Semgrep CE does not do cross-file taint tracking — for multi-file flows note the limitation and rely on manual review of data-flow boundaries. If CodeQL databases exist, run the security-extended suite.
3. **Manual review of the Top 10.** Walk each OWASP Top 10:2025 category against the diff or tree:
   - A01 Broken Access Control — missing ownership checks on mutations; IDOR on path/body params.
   - A02 Cryptographic Failures — hardcoded keys, weak algorithms (MD5/SHA1/DES/ECB), plaintext secrets in transit.
   - A03 Injection — string-built SQL/shell/LDAP/XPath; template injection; `eval`/`new Function`/`child_process` with user data.
   - A04 Insecure Design — missing rate limits on sensitive endpoints, no abuse-case handling.
   - A05 Security Misconfiguration — debug flags, default creds, permissive CORS (`Access-Control-Allow-Origin: *` with credentials), stack traces to clients.
   - A06 Vulnerable Components — flag suspicious versions; hand off to `sec-test:dependency-audit` for the full pass.
   - A07 Auth Failures — session fixation, missing rotation, weak reset flows, JWT `alg:none` / confusion.
   - A08 Software & Data Integrity Failures — unsigned updates, deserialization of untrusted data (`pickle`, `unserialize`, Java `readObject`).
   - A09 Logging & Monitoring Failures — sensitive actions without audit trail; secrets written to logs.
   - A10 SSRF — server-side fetches from user-controlled URLs without allowlisting.
4. **Secrets sanity check.** If `gitleaks`/`trufflehog` is available and the user asked, defer to `sec-test:secrets-scan`. Otherwise grep for the obvious patterns (AKIA[0-9A-Z]{16}, -----BEGIN.*PRIVATE KEY-----, `password\s*=\s*["']`).
5. **Write the audit report** to `.planning/security/findings/YYYY-MM-DD-<slug>.md` using the finding schema below.
6. Return the `## CODE AUDIT COMPLETE` marker plus a count of findings by severity.

## Finding Schema (YAML frontmatter per finding)

```yaml
id: SEC-YYYY-NNN
persona: sec-appsec
category: A03-injection        # OWASP Top 10 or CWE-###
location: src/api/users.ts:42
confidence: high | medium | low
severity: critical | high | medium | low | info
finding: one-sentence description
evidence: short quoted snippet or request/response
remediation: concrete fix, referencing the project stack
status: open                   # open | fixed | accepted-risk | false-positive
```

## Rules

- **Read-only on application code.** The `edit` tool is permitted ONLY under `.planning/security/`. If the user asks for a fix, dispatch a separate implementer after the audit is recorded.
- **Confidence honesty.** "medium"/"low" confidence is fine; never inflate. Unverified hypotheses go in an `## Open Questions` section, not the findings table.
- **Every finding needs evidence.** A grep hit with a quoted line beats three pages of prose.
