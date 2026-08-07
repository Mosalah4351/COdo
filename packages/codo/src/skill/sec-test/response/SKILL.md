---
name: sec-test:response
hidden: true
description: "Real-time guided response during an active incident — keep a caller focused and on the runbook while the alert is hot"
---

# Response

## Overview

This is for *right now*, not after-action. The user is looking at a live alert or breach report. The skill keeps them on the runbook and prevents the two classic mistakes: jumping to forensics before containment, and quietly patching without telling anyone.

## Workflow

1. **Classify the alert.** One of: leaked credential, malicious dependency, public PII, suspicious traffic, ransomware-touch, defacement, internal abuse. Use the `question` tool if it's ambiguous.
2. **Match the runbook.** If `.planning/security/runbooks/<scenario>.md` exists (from `sec-test:incident-runbook`), read it. If not, use the basic shape:
   - First 15 min = CONTAIN (revoke / isolate / disable)
   - First hour = SCOPE (what did the attacker touch)
   - First 24h = ERADICATE + VERIFY
3. **Walk the user through containment** *before* anything analytical:
   - For a leaked credential: rotate NOW. Forensics of *how* it leaked wait.
   - For a bad dependency: pin to last-known-good, scan, deploy. Forensics of *when it was poisoned* wait.
4. **Light the logger.** Every action the user takes goes into `.planning/security/incidents/<YYYY-MM-DD>-<slug>.log` — append-only. This becomes the post-incident timeline.
5. **No-public-comms default.** Do not push to status pages, social, or email without explicit leadership sign-off. If the user asks, defer: "that's an exec call, here's the disclosure section of the runbook when they're ready".

Return `## RESPONSE ENGAGED` plus the runbook section currently being executed.

## Rules

- Speed beats completeness. If you can do exactly one thing, it's "stop the bleeding".
- Never run network commands during containment — containment is almost always credential revocation or service halt, which doesn't need pentest-grade tooling.
- The incident log is append-only; if you need to correct an entry, add a new line, don't edit history.
