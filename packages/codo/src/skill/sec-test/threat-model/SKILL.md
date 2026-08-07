---
name: sec-test:threat-model
hidden: true
description: "STRIDE (or PASTA for high-stakes) threat model against the current design — run through the sec-architect persona"
---

# Threat Model

## Overview

Produce a threat model for a planned feature or major change before code exists. STRIDE by default; PASTA for anything involving money movement, health data, authN/authZ infrastructure, or third-party PII.

## Workflow

1. **Read the project context first.** `.planning/PROJECT.md` is mandatory if present. Then the spec or planning doc the user points you at. You need to know what the feature does before you can enumerate what can go wrong.
2. **Draw the trust boundaries.** Enumerate every boundary the data crosses: user→frontend→backend→DB, backend→third-party API, anything crossing a network or process boundary with different privilege on either side. Each boundary is where most real threats live.
3. **STRIDE each boundary:**
   - **S**poofing — how does the receiver authenticate the sender?
   - **T**ampering — integrity in transit and at rest? Who can write?
   - **R**epudiation — audit trail for every sensitive action? Logs signed/timestamped?
   - **I**nformation disclosure — what's readable by whom, and is the default least-privilege?
   - **D**enial of service — rate limits, resource exhaustion (large uploads, regex bombs, deep recursion)?
   - **E**levation of privilege — can a low-priv user reach an admin path? Can a plugin escalate?
4. **Map to ASVS where applicable.** For each confirmed threat, note the ASVS 5.0 chapter/requirement it violates so implementation has a testable control.
5. **When to switch to PASTA.** If the feature handles regulated data or is business-critical: follow the 7 PASTA stages explicitly — define objectives, define technical scope, application decomposition, threat analysis, vulnerability/weakness analysis, attack modeling, risk/impact. Document each stage.
6. **Write the model.** Path: `.planning/security/threat-models/<slug>.md`. Sections:
   - System description (1 paragraph, diagram-worthy)
   - Trust boundaries (table or list)
   - Threats enumerated (table: ID, boundary, STRIDE category, description, ASVS mapping, mitigations proposed, risk pre/post)
   - Open questions and assumptions
   - Appendix: data-flow diagram (ASCII is fine — ASCII beats no diagram)
7. Return the `## THREAT MODEL COMPLETE` marker.

## Rules

- **Read-only on the source tree.** Your `edit` is allowed only under `.planning/security/`.
- **No false precision on risk.** Use CVSS-style qualitative (Critical/High/Medium/Low); if you don't have exploit data, say "posture assumption".
- Never recommend a control you haven't verified maps to a real requirement (don't invent ASVS requirement IDs — if unsure, cite the chapter).
