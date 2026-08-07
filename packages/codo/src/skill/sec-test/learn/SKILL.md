---
name: sec-test:learn
hidden: true
description: "Distill a completed finding, runbook execution, or incident into lessons that update posture.md and project guidance"
---

# Learn

## Overview

The close-the-loop step. After a scan, an incident, or a report that produced real changes, distill the *generalizable* lesson into the places future personas read.

## Workflow

1. **Pick the source:**
   - A single finding (postmortem on *how it slipped in*).
   - A runbook execution (what worked, what was missing).
   - A completed report (cross-cutting pattern).
2. **Write the lesson.** Format:
   - **What happened** — one sentence.
   - **Why it slipped through** — process gap? Tooling gap? Knowledge gap?
   - **What we changed** — code change, rule addition, runbook update.
   - **Prevention** — what would have caught this at the earliest possible phase (design? code? build?).
3. **Append to `.planning/security/posture.md`** under a `## Lessons` heading with the date.
4. **Cross-link when applicable**:
   - If the lesson is "input validation missed X again", suggest `sec-architect` revisit the trust boundaries.
   - If it's "log flooded with secrets", `sec-test:logging-audit` should re-run.
   - If it's "CI signed the artifact but the key was cached", `sec-test:supply-chain-attest` adds a check.
5. **No size inflation.** Each lesson ≤ 6 lines. The goal is pattern recognition, not documentation.

Return `## POSTURE REPORT COMPLETE` (same marker as the other secops skills — orchestrator covers all three).

## Rules

- Don't re-litigate blame. The lesson is what *we* change going forward.
- If a lesson requires a new control (e.g. "we should add a CSP header"), that's a finding — write it to `security_finding` AND reference the lesson from there.
- Skip learnings that are unactionable ("be more careful").

