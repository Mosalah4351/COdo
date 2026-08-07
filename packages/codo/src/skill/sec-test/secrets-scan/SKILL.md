---
name: sec-test:secrets-scan
hidden: true
description: "Scan tracked code and git history for committed secrets — keys, tokens, private certs, connection strings"
---

# Secrets Scan

## Overview

Detect credentials committed to the repository — present and historical. A secret deleted in a later commit is still leaked; only rotation closes the finding.

## Workflow

1. **Prefer dedicated tooling.** In order of preference:
   - `gitleaks detect --source . --verbose` (fast, tuned rules)
   - `trufflehog git file://. --only-verified` (verified hits only = fewer false positives)
   - Fallback grep: `AKIA[0-9A-Z]{16}` (AWS), `ghp_[A-Za-z0-9]{36}`, `sk-[A-Za-z0-9]{20,}`, `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`, `(?i)(password|passwd|api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{8,}`.
2. **Cover history, not just HEAD.** `gitleaks detect --log-opts="--all"` or `trufflehog git` walk the full DAG. A `git log -p` review of config/env-ish files (`.env*`, `*.pem`, `config/*.yml`) is a good manual supplement.
3. **Deduplicate.** Same secret in N commits = one finding listing all commit SHAs.
4. **Classify each hit:**
   - `confirmed` — verified live (only if the tool verified it; never try credentials yourself)
   - `likely` — high-entropy match in a secrets-shaped context
   - `possible` — pattern match, needs human confirmation
   - `false-positive` — test fixtures, documented examples (`EXAMPLE_`, `YOUR_KEY_HERE`, `xxxx`)
5. **Write results** to `.planning/security/findings/YYYY-MM-DD-secrets-scan.md` (finding schema from `sec-test:code-audit`, `persona: sec-appsec`, category `A02-cryptographic-failures` or `CWE-798`).
6. Return `## CODE AUDIT COMPLETE` marker and the count by classification.

## Rules

- **Never use or verify a found credential against a live service yourself.** "Confirmed" only comes from a verifier built into the scanner.
- Every confirmed/likely finding remediation starts with **rotate the credential first**, then purge history (`git filter-repo`, BFG).
- `.env.example` with placeholder values is NOT a finding; `.env.example` with real-looking values IS.
