---
name: sec-test:logging-audit
hidden: true
description: "Audit logging + monitoring coverage — what's written, what's leaked, what's missing — for security-relevant events"
---

# Logging Audit

## Overview

OWASP A09 says: insufficient logging & monitoring. This skill checks what the application records for security events and whether it accidentally leaks sensitive data into logs.

## Workflow

1. **Find the logger calls.** Grep for `console.log`, `logger.`, `log.info/error/warn/debug`, structured loggers (winston, pino, bunyan, zap, slog). Group by file.
2. **Security-relevant event inventory** (must be present):
   - Authentication success + failure
   - Authorization denial (403)
   - Privilege changes (role grants, admin actions)
   - Sensitive data writes (password change, payment update, PII edit)
   - Rate-limit hits
   - Token issuance + revocation
3. **Leak check** — what do logs contain that they shouldn't:
   - Headers including `Authorization`, `Cookie`
   - Passwords, even hashed
   - Credit card / SSN / national ID
   - Session IDs (log the session hash, not the value)
   - Full request body on auth endpoints
4. **Log integrity.** Are logs append-only? Can an attacker who gets app-write access erase their trail? Centralized logging beats local files; timestamped + signed entries beat mutable text.
5. **Alerting.** Are anomalous events surfaced to ops? (100 failed logins from one IP, large data export, admin action outside business hours.)

## Reporting

Path: `.planning/security/findings/YYYY-MM-DD-logging-audit.md` (persona: sec-secops, category: `A09-logging-monitoring-failures`).

Return `## POSTURE REPORT COMPLETE` with a "logging coverage by event type" table.

## Rules

- **Read-only on application code** — findings only.
- The "delete logs" test from a pentest belongs to `sec-test:pentest`, not here.
