---
name: sec-test:brief
hidden: true
description: "Triage the user's security request, pick the right persona(s), and prepare the dispatch prompt skeleton"
---

# Security Brief

## Overview

Entry point when the user says something like "audit this", "is this safe", "check for vulnerabilities". Clarify the target, severity bar, and which persona(s) should fire — then hand off. Never run findings tools directly; that's the personas' job.

## Workflow

1. **Identify the request type.** Map to SDLC phase:
   - "before we build X" / "in design phase" → `sec-architect` (threat-model)
   - "audit this diff / file / PR" → `sec-appsec` (code-audit, optionally secrets-scan)
   - "check the pipeline / CI / release flow" → `sec-devsecops` (pipeline-harden)
   - "pen test / dynamic scan / try to break it" → `sec-pentest` AFTER scope-file check
   - "audit COdo / our skills / plugins" → `sec-secops` (agent-surface-audit)
   - "where do we stand / posture / what are the risks" → `sec-secops` (posture report)
2. **One clarifying question if genuinely ambiguous** (e.g. "this repo" — which directory? Or "do we have authorization for active scanning?"). Don't ask just to pad; ask only when dispatch would be wrong without the answer.
3. **If pentest is the answer, verify scope FIRST** via `read .codo/security-scope.json`:
   - Missing → tell the user to create it; show them the template shape.
   - Present → check targets/expiry/allow_active_scan. Any failure → stop, `## PENTEST BLOCKED`.
4. **Draft the dispatch prompt** with the standard skeleton: `Task / Target / Standards / Context / Deliverable`. The more concrete the target (exact file path, exact URL), the better the downstream audit.
5. **Dispatch** via the `task` tool. For read-only personas a parallel batch is fine (architect + appsec + devsecops on the same feature can run concurrently). Pentest is always solo.

## Rules

- The user must never see framework codes ("we'll run STRIDE then ASVS L2") as the headline. Translate first: "I'll have the architect map what could go wrong at design time."
- Multiple personas on the same target is fine and often correct for a complete picture.
- **Never dispatch pentest in parallel with anything else** — a mid-scan finding changes what the other personas should look at.
