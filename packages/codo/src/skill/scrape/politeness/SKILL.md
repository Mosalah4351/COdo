---
name: scrape:politeness
description: "Cross-cutting ban-avoidance rules: delay tiers, concurrency caps, jitter law, backoff schedule, session warming, honeypot avoidance, cache rules, robots.txt handling. Applies to every rung without exception."
hidden: true
---

# Politeness (applies to every rung, no exceptions)

Getting the IP banned loses 100% of future data to save 10 minutes now. That
trade is never worth it. Modern detection layers IP reputation, TLS/HTTP2
fingerprints, browser fingerprints, AND behavior - fixed intervals are
themselves a signal.

## Delay tiers (uniform-random within range, per same-domain request)

| Tier | When | Delay |
|---|---|---|
| T1 static | HTTP GETs (HTML or discovered JSON API) | **1-3 s** |
| T2 browser | Full page loads in Playwright/Patchright | **2-6 s** |
| T3 protected | Target shows ANY protection signal, or is large/precious | **8-15 s** |
| Dwell | Warming pages, between in-site clicks | 5-15 s + small random scroll |

Never use fixed intervals. Always uniform-random within the tier.

## Concurrency caps

- Browser rungs: **1 in-flight request per domain** - hard.
- Static rung: max 2 per domain.
- Different domains: unlimited parallelism (this is where swarm speed comes
  from).
- Multiple topics sharing one domain run SEQUENTIALLY through one shared queue -
  the domain sees one polite crawler, not three racers.

## Backoff & cooldowns

| Signal | Action | Cooldown |
|---|---|---|
| `429 Too Many Requests` | Do NOT climb rungs - same-rung retry | 30s -> 60s -> 120s (3 attempts max), then domain sleep 15 min |
| `503 Service Unavailable` | Treat exactly like 429 | as 429 |
| `403 Forbidden` | Climb to next rung (headers won't fix TLS verdicts) | 60s pause on domain |
| Challenge page (`__cf_chl_*`, "Just a moment") | Immediate climb, no same-rung retry | none |
| Captcha in challenge | STOP. Mark blocked; surface unlock options. No solving without manifest opt-in | Domain sleep 24 h default |

Second separate 429 episode on the same domain in one run -> permanently raise
that domain to T3.

**Domain circuit breaker**: 3 consecutive hard blocks (403/challenge/captcha)
on one domain -> abandon it for this run; pending URLs become blocked rows
citing the breaker.

## Session warming

Before first target hit on any domain at browser rungs: homepage (or generic
section) -> dwell 5-15s with small random scroll -> 1-2 nav pages via in-site
links -> THEN the target via in-site click where possible.

## Honeypot rule

Never interact with visually or semantically hidden elements: `display:none`,
`visibility:hidden`, `opacity:0`, zero-size or off-viewport anchors,
background-matching text color, `aria-hidden` links carrying real hrefs. One
interaction poisons the session's reputation.

## Cache

Cache raw response bytes at `.codo/scrape/<run-id>/cache/<sha256(url)>` on first
success; re-parse from cache instead of refetching. The cache doubles as the
provenance store (`content_sha256`).

## robots.txt

**Ask the user first - before doing anything.** The orchestrator asks at
kickoff (together with the account question) whether to honour robots.txt for
this run. Never start a crawl without the answer recorded in
`manifest.robots_honoured`. If the user does not care, honour by default.
