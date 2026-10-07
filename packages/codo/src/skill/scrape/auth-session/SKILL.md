---
name: scrape:auth-session
description: "Ladder rung 5, consent-gated: authenticated pages via a manually-created browser session (user logs in once, agent stores storageState). Never attempt without recorded user consent."
hidden: true
---

# Auth session (rung 5)

Authenticated crawling. **Consent-gated**: the orchestrator asked the two kickoff
questions up-front. No login attempt unless the run manifest records
`consent.has_account === true` AND this topic is listed in
`consent.login_topics`.

## Manual-once pattern

1. Launch a HEADED (non-headless) Playwright browser window on the user's
   machine.
2. Navigate to the platform's login page; hand control to the user.
3. The user logs in themselves - including any 2FA. The agent NEVER types,
   reads, or stores credentials.
4. Once the user confirms login, save `storageState` (cookies + localStorage) to
   `.codo/scrape/<run-id>/auth/<site>.json`.
5. All subsequent headless contexts launch with that stored state.

## Hygiene

- The session file is gitignored and deleted at run end unless the user asks to
  keep it.
- Never log cookies, tokens, or session contents into checkpoints or reports -
  checkpoints carry URLs and statuses only.
- If the session expires mid-run (login page detected instead of content), stop
  the topic, mark remaining URLs `blocked` with signal `auth-expired`, and ask
  the user to refresh the session.

## Politeness unchanged

Being logged in does NOT raise rate limits. Warmed-context pacing, delay tiers,
and concurrency caps apply identically. A banned logged-in session burns your
real account - treat authenticated crawling as strictly more fragile, not less.

## Scope honesty

If consent was never given for a login-gated topic, it does not run. List it in
the coverage report as blocked with unlock path "user login required".

## SCRAPE-RESULT contract

`## SCRAPE-RESULT topic=<topic> status=<complete|partial|blocked> collected=<n> empty=<n> blocked=<n> checkpoint=<path>`
