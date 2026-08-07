---
name: sec-test:report
hidden: true
description: "Consolidate findings from .planning/security/findings/ into a point-in-time security posture report"
---

# Security Report

## Overview

Roll up findings into a single posture document. Two storage layers cooperate:

- **Markdown finding files** under `.planning/security/findings/**/*.md` — what personas produce today, human-readable, the canonical *source*.
- **`security_finding` SQLite table** — what reports query when the findings have been persisted. The table is the durable, structured store; the markdown is the projection.

## Workflow

1. **Pull markdown findings.** Glob `.planning/security/findings/**/*.md` and parse each finding block (YAML frontmatter). Skip files that aren't finding-shaped (notably templates).
2. **Persist to the table when the runtime supports it** (the orchestrator's session has DB access). For each parsed finding:
   - Compute a fingerprint: `sha1(persona | category | location | normalize(evidence))` — normalize means trim whitespace + lowercase + strip volatile tokens (timestamps, paths to build output).
   - Up-sert keyed on `(project_id, fingerprint)`. If a row already exists with status `fixed` and the incoming finding matches, *leave it fixed* — the scanner didn't rerun, so don't reopen. If the incoming finding matches a `fixed` row **and** the caller confirms a rescan happened, transition back to `open` and set `time_status_changed`.
   - Set `session_id` from the current session. `project_id` from the current project context.
3. **Aggregate** (markdown-parsed rows ∪ matching table rows, deduped by fingerprint). Group by:
   - **Status** — open / fixed / accepted-risk / false-positive
   - **Severity** — critical / high / medium / low / info
   - **Persona** — which phase of the SDLC produced it
   - **Age** — opened >90 days ago and still open is a posture problem regardless of severity
4. **Trend.** Read `.planning/security/posture.md` (the running log) if it exists and compare: are open criticals up or down since the last report? Note the delta.
5. **Write the markdown report** to `.planning/security/reports/YYYY-MM-DD-posture.md`:
   - Header: date, period covered, total findings by status
   - Critical/high open findings table (the must-read section)
   - Severity-by-persona heatmap
   - Delta vs previous report (opened, closed, net change)
   - Recommended next three actions, ordered by (severity × exploitability)
6. Append a one-line entry to `.planning/security/posture.md` recording this report (date, open counts by severity, link to the new report file).
7. Return `## POSTURE REPORT COMPLETE` (same marker as sec-secops — the persona can produce either; orchestrator covers both).

## Status lifecycle

- `open` — default on first insert.
- `fixed` — only when the *scanner* reran clean against the same fingerprint. A hand-edit closure is NOT `fixed`.
- `accepted-risk` — explicit user sign-off. Always include a justification note in `metadata.reason`.
- `false-positive` — same; include why in `metadata.reason`.

Transitions out of `fixed` back to `open` require a fresh scanner run.

## Rules

- **Don't editorialize.** Filters and grouping, not new analysis. If a finding looks wrong, flag it in the "Anomalies" section instead of silently reclassifying.
- **A finding is only `status: fixed` when the scanner reran clean** — not when someone wrote a patch.
- If there are zero findings, say so plainly; an empty report with a date is a perfectly good report.
- Never update rows for a project_id that doesn't match the current project. Cross-project writes are forbidden.

