---
name: sec-test:report
hidden: true
description: "Consolidate findings from .planning/security/findings/ into a point-in-time security posture report"
---

# Security Report

## Overview

Roll up every finding under `.planning/security/findings/` into a single posture document. This is the user-facing answer to "where do we stand?" — not a new audit.

## Workflow

1. **Read all finding files.** Glob `.planning/security/findings/**/*.md` and parse each finding block (YAML frontmatter). Skip files that aren't finding-shaped (notably templates).
2. **Aggregate.** Group by:
   - **Status** — open / fixed / accepted-risk / false-positive
   - **Severity** — critical / high / medium / low / info
   - **Persona** — which phase of the SDLC produced it
   - **Age** — opened >90 days ago and still open is a posture problem regardless of severity
3. **Trend.** Read `.planning/security/posture.md` (the running log) if it exists and compare: are open criticals up or down since the last report? Note the delta.
4. **Write the report** to `.planning/security/reports/YYYY-MM-DD-posture.md`:
   - Header: date, period covered, total findings by status
   - Critical/high open findings table (the must-read section)
   - Severity-by-persona heatmap
   - Delta vs previous report (opened, closed, net change)
   - Recommended next three actions, ordered by (severity × exploitability)
5. Append a one-line entry to `.planning/security/posture.md` recording this report (date, open counts by severity, link to the new report file).
6. Return `## POSTURE REPORT COMPLETE` (same marker as sec-secops — the persona can produce either; orchestrator covers both).

## Rules

- **Don't editorialize.** Filters and grouping, not new analysis. If a finding looks wrong, flag it in the "Anomalies" section instead of silently reclassifying.
- **A finding is only `status: fixed` when the scanner reran clean** — not when someone wrote a patch.
- If there are zero findings, say so plainly; an empty report with a date is a perfectly good report.
