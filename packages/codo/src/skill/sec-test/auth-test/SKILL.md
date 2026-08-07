---
name: sec-test:auth-test
hidden: true
description: "Validate authentication and session management on a running target — REQUIRES .codo/security-scope.json"
---

# Auth Test

## HARD GATE

Same scope gate as `sec-test:pentest` and `sec-test:api-security-test`. Read + parse + validate before any traffic.

## Workflow

- **Session issuance.** Does login issue a fresh session id? Reused id after login = session fixation (CWE-384).
- **Cookie attributes.** `HttpOnly`, `Secure`, `SameSite=Lax` (or Strict) present? On a non-HTTPS deployment (dev) `Secure` may be off, but production must have it.
- **Token hygiene (JWTs).** Check the signing algorithm — must NOT be `none` or `HS256` when an asymmetric key is expected. `exp` present and reasonable (<24h for access, <30d for refresh)?
- **Refresh rotation.** Does refresh rotate the refresh token itself (one-time use) or issue a static long-lived one? Static refresh = finding.
- **Logout.** Does it invalidate the session server-side, or is the cookie just dropped? Dropped-only = logout is fake.
- **Rate limiting on auth.** Repeated bad password attempts should hit a 429 within ~5 tries (configurable). No limit = A07 risk.
- **MFA state.** If MFA is enabled, can the second factor be skipped by direct URL? (Common.)
- **Password reset.** Token entropy, expiry, one-time use, account enumeration via existing-email response differences.

## Reporting

Path: `.planning/security/findings/YYYY-MM-DD-auth-test.md` (persona: sec-pentest, category: `A07-authentication-failures` or `WSTG-ATHN-##`).

Return `## PENTEST COMPLETE` with a session-management finding count.

## Rules

- Never actually log in as a test user unless the scope file's `targets[].notes` explicitly names a test account; otherwise stop at "auth surface exists, here are the checks to run with credentials".
- Rate-limit testing means <20 requests — not brute force.
