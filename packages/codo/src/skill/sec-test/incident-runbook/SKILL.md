---
name: sec-test:incident-runbook
hidden: true
description: "Draft incident-response runbooks for the project's top security scenarios"
---

# Incident Runbook

## Overview

A runbook is what on-call actually follows when the alert fires. Draft one per scenario class — credential leak, compromised dep, public PII exposure, DDoS, ransomware-touch.

## Workflow

1. **Pick the scenario.** The top three for most web projects:
   - **Leaked credential in git history.** Rotate, purge, audit access logs for the leak window.
   - **Dependency published with malicious code.** Pin, scan, purge caches, redeploy.
   - **PII exposure.** Confirm scope, notify, contain, forensics, disclosure clock.
2. **For each scenario, write the runbook.** Sections in this order:
   - **Trigger** — what alert/user report starts this playbook.
   - **First 15 minutes** — contain (revoke, disable, isolate). NO forensics yet.
   - **First hour** — scope (what did the attacker actually reach? which records, which systems?).
   - **First 24 hours** — rotation + eradication + verify clean.
   - **Disclosure** — who gets notified and when. Legal/leadership sign-off paths.
   - **After-action** — what to update in this runbook, what tooling was missing.
3. **Reference project specifics.** Don't say "rotate the AWS keys" — say `aws iam update-access-key ...` for the exact key IDs the project uses.
4. **Path:** `.planning/security/runbooks/<scenario-slug>.md`.

## Rules

- Runbooks are living docs; the "after-action" section is the most valuable part.
- No hypotheticals — if a step requires infrastructure the project doesn't have, that's a finding for `sec-test:devsecops`, not a runbook step.
- Keep each scenario under 100 lines. Long runbooks are alarm-fatigue generators.

Return `## POSTURE REPORT COMPLETE` with the list of scenarios drafted.
