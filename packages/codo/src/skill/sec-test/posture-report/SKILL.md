---
name: sec-test:posture-report
hidden: true
description: "Weekly/monthly security posture summary for leadership — combines finding trends, posture.md movement, and pending risk"
---

# Posture Report

## Overview

The user-facing output of the secops loop. Distinct from `sec-test:report` which is per-scan; this one is the periodic digest.

## Workflow

1. **Inputs:**
   - `security_finding` table (current open counts by severity/persona).
   - `.planning/security/posture.md` (trend line).
   - `.planning/security/reports/*.md` (recent scan timestamps).
2. **Build the digest:**
   - **Headline.** One plain-English sentence: "7 open criticals, stable since last week" or "Criticals down from 4 → 1".
   - **By severity.** Open/closed/added-since-last digest table.
   - **By persona.** Where are the findings concentrated — code? pipeline? dependencies?
   - **Overdue.** Findings open > 90 days. Any critical open > 7 days.
   - **Upcoming.** Scope files expiring within 48h. SBOMs older than the last release.
3. **Output:** `.planning/security/reports/YYYY-MM-DD-posture-digest.md` plus an appended line in `posture.md`.
4. **Scatter to leadership context.** Recommendations stay business-readable — "rotate keys", "tighten rate limits on /auth" — not "fix CWE-798".

Return `## POSTURE REPORT COMPLETE` with the digest path.

## Rules

- **Never invent counts.** Every number in the digest must trace to either the table or a finding file. If the table is empty and there are no finding files, the digest says "no data collected yet" — honest zero.
- Keep it under 50 lines. Long digests don't get read.
