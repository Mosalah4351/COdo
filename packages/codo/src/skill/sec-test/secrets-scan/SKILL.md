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
4. **Classify each hit** into the canonical `confidence` vocabulary — there is no separate classification field, so map straight onto it:
   - `confidence: high` — the scanner's own verifier confirmed the credential is live. Never try credentials yourself; only a built-in verifier earns `high`.
   - `confidence: medium` — high-entropy match in a secrets-shaped context (assigned key name, plausible format, not obviously a fixture).
   - `confidence: low` — pattern match only, needs human confirmation.
   - Test fixtures and documented examples (`EXAMPLE_`, `YOUR_KEY_HERE`, `xxxx`) are not a separate confidence level — record them with `status: false-positive` and a `metadata.reason` saying which fixture, or omit them entirely if they are obviously placeholders.
5. **Write results** to `.planning/security/findings/YYYY-MM-DD-secrets-scan.md` using the finding schema from `sec-test:code-audit`. Category is `A02-cryptographic-failures` or `CWE-798`. `persona` is assigned by `sec_finding` — don't set it.
6. Return `## SEC-RESULT skill=sec-test:secrets-scan status=complete findings=<n> critical=<n> high=<n> doc=<path>` plus the breakdown by confidence.

## Rules

- **Never use or verify a found credential against a live service yourself.** `confidence: high` only comes from a verifier built into the scanner.
- Every high/medium finding remediation starts with **rotate the credential first**, then purge history. Name `git filter-repo` or BFG as the operator's next step — neither is on this persona's allow-list, so you describe them, you don't run them.
- `.env.example` with placeholder values is NOT a finding; `.env.example` with real-looking values IS.
- If neither `gitleaks` nor `trufflehog` is installed, say so and return `status=partial reason=scanner-missing`. The grep fallback finds format-matched strings only — it cannot verify, so nothing from it earns `confidence: high`.
