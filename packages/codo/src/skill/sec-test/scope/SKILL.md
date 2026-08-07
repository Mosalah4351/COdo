---
name: sec-test:scope
hidden: true
description: "Create or refresh .codo/security-scope.json — the file that authorizes (and bounds) pentest work"
---

# Security Scope File

## Overview

`.codo/security-scope.json` is the gate that turns pentest from "forbidden by default" into "authorized, bounded, and time-limited". This skill writes or refreshes it. It is the only skill that should touch that file.

## Workflow

1. **Determine authorization context.** Ask the user to confirm (this file is the contract):
   - Which targets are in scope (exact URLs, hosts, or IP ranges — no wildcards)
   - Whether active scanning is permitted (ZAP baseline yes/no — full active scan is separately gated by permission)
   - Expiry — default to 7 days from now for a first engagement, max 90
2. **Draft the file:**

```json
{
  "version": 1,
  "created": "2026-08-06T00:00:00Z",
  "expires": "2026-08-13T00:00:00Z",
  "targets": [
    { "type": "web", "value": "https://staging.example.com", "notes": "staging only" },
    { "type": "api", "value": "https://api.staging.example.com" }
  ],
  "allow_active_scan": false,
  "out_of_scope": [
    "production domains",
    "third-party SaaS",
    "any data-modifying payload"
  ],
  "contact": "user@example.com"
}
```

3. **Before writing:**
   - Show the user the exact JSON and get a yes. Don't silently write it.
   - Never broaden an existing scope without the user explicitly approving the new targets.
   - `allow_active_scan: true` requires an explicit user decision — never default it on.
4. **Write to `.codo/security-scope.json`**. Make sure the directory exists (create `.codo/` if needed).
5. **Update `.gitignore` if applicable** — this file can reveal information about internal targets; some teams prefer it untracked.
6. Return the marker `## SCOPE AUTHORED` plus the expiry timestamp so the orchestrator knows the window.

## Rules

- **Never dispatch pentest yourself.** This skill only creates the authorization; the pentest skill checks it.
- **Refused rotations:** if the user asks to extend the same scope a third time without any findings review, suggest a fresh audit of why nothing surfaced.
- Deleting the file is the user saying "pentest disallowed" — that also should be honored; don't recreate it unprompted.
