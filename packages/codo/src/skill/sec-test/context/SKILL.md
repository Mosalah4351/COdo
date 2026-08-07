---
name: sec-test:context
hidden: true
description: "Hydrate the current session with project + security context before dispatching any sec persona"
---

# Security Context

## Overview

The front door to any security workflow. Reads `.planning/` artifacts (PROJECT.md, REQUIREMENTS.md, recent finding reports) and produces a single context block that downstream personas (and the orchestrator) can consume without re-reading everything.

## Workflow

1. **Read project context** if present:
   - `.planning/PROJECT.md` — what the project is and who ships it.
   - `.planning/REQUIREMENTS.md` — security-relevant constraints (PII? PCI? HIPAA?).
   - `.planning/security/posture.md` — the running trend line.
2. **Read recent findings.** Glob `.planning/security/findings/**/*.md` and pick the most recent one per persona. Note: what's open, what's recurring, what was recently fixed.
3. **Summarize into a single context block.** Format:

```
Project: <name of project>
Type: <web api | cli | library>
Compliance scope: <none | PCI | HIPAA | SOC2 | other>
Open criticals: <N>  Open highs: <N>
Most recent scan: <date> by <persona>; finding count <N>
Recurring patterns: <e.g. "third A03 finding this sprint — input validation still thin">
```

4. **Cache in session state** so the next persona call doesn't reread everything. The orchestrator passes this block in the `Context:` field of every dispatch.

Return `## CONTEXT COMPLETE` with the rendered block.

## Rules

- This is a *read* skill. No writes anywhere, including under `.planning/security/`.
- If no `.planning/` exists, the context block contains only "No prior security context — fresh engagement." Personas run their own bootstrap on first dispatch.
- Never fabricate counts — if no scans exist yet, say "0 findings, no scans run."
