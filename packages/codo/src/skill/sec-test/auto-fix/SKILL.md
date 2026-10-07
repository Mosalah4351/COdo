---
name: sec-test:auto-fix
hidden: true
description: "Full scan → triage → fix → verify → regression-guard → rescan pipeline for vibecoders — 'make my project secure', 'scan and fix everything', 'harden my app'"
---

# Auto-Fix Pipeline

## Overview

Entry point when a non-expert user says something like "make my project secure", "scan and fix everything", or "harden my app". They don't want a 40-page audit — they want the obvious holes closed without drowning in jargon.

This skill is **dispatched by the sec-test orchestrator**, which coordinates the personas. The orchestrator runs this sequence itself; the skill defines it.

The division of labor follows the security model: detection personas (`sec-appsec`, `sec-devsecops`, `sec-qa`) stay read-only on production code; the **orchestrator applies every fix itself** in the working tree with the user's full authority.

## Pipeline

### 1. SCAN

Dispatch `sec-appsec` (code-audit + secrets-scan + dependency-audit) and — if CI configs exist (`.github/workflows/`, `.gitlab-ci.yml`, etc.) — `sec-devsecops` (pipeline-harden). Parallel dispatch is fine; both are read-only personas. Collect findings from the `sec_finding` store plus their markdown reports under `.planning/security/findings/`.

### 2. TRIAGE

Rank findings by severity first, then exploitability. **Cap the first pass at the top 10 actionable findings** — the user is a vibecoder, not an analyst; ten fixed holes beat fifty listed ones. Anything below the cut stays open in the store for a later pass.

### 3. FIX

For each triaged finding, the orchestrator applies the fix directly in the working tree. Every fix must come with a **one-line plain-English explanation of the risk it closes** ("anyone could read other users' orders by changing the number in the URL"). Work in small batches so verification stays tight.

### 4. VERIFY

After each batch of fixes, dispatch `sec-qa` (test-generate / regression-guard) to prove the fix works and lock it in with a regression test. An unverified fix is a maybe, not a fix.

### 5. RESCAN

Re-dispatch `sec-appsec` against the diff to confirm findings close. Fingerprints move to `fixed` in the `sec_finding` store — never deleted — so the history survives and a regression reopens the finding automatically.

### 6. REPORT

Summarize in plain English:

- What was broken (in human terms)
- What was fixed (and how you know — the tests)
- What still needs a human decision (e.g., rotating a leaked key, choosing a rate-limit policy)

## Hard rules

- **Finding before edit.** Never auto-fix anything that isn't recorded in the `sec_finding` store first. No finding, no edit.
- **Never rotate credentials or touch `.env` values automatically.** Flag them for the human instead.
- **Secrets leaks always require human rotation.** Removing the committed secret from code does not un-leak it — say so explicitly.
- **Destructive actions are flagged, never executed.** Deleting files, dropping tables, resetting databases: propose, don't run.
- **If a fix is uncertain, propose it and skip rather than guess.** A wrong "fix" can be worse than the hole.
