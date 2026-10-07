---
name: scrape:browser-render
description: "Ladder rungs 2-3: Playwright headless rendering with session warming and human pacing (vanilla mode), escalating to Patchright hardened mode when flagged. Includes opportunistic API capture and the CAPTCHA stop rule."
hidden: true
---

# Browser render (rungs 2-3)

Full browser rendering for JS-heavy pages. Two modes share this skill:

- **Vanilla (rung 2)**: stock Playwright, headless.
- **Hardened (rung 3)**: **Patchright** - drop-in Playwright replacement
  (`npm i patchright`, change the import and launch call only; scripts stay
  identical). Fixes CDP leaks (e.g. `Runtime.enable`) that vanilla headless
  exposes. Enter hardening when rung 2 got challenged or flagged again after
  warming.

**Dead end - never use `playwright-extra` / puppeteer-extra-stealth**: JS-layer
patches are evaluated after the TLS handshake and are defeated pre-JavaScript by
modern systems; unmaintained since March 2023. (Camoufox and nodriver exist as
Python-only escape hatches for extreme targets - document them in the report,
do not wire them.)

## Session warming (mandatory before first target hit on a domain)

1. Load the homepage or most generic section page.
2. Dwell 5-15s with a small random scroll.
3. Visit 1-2 nav/category pages via in-site links.
4. THEN reach the target - via an in-site link click where the information
   architecture allows, else direct load.

Warming mimics a real browsing session and materially lowers risk scores.

## Human pacing

- Randomized delays between page loads per the politeness tier (never fixed
  intervals - fixed intervals are themselves a detection signal).
- Scroll gradually instead of jumping; random dwell times.
- Navigate SPAs via in-site link clicks rather than direct URL loads wherever
  possible.
- Concurrency: exactly ONE in-flight request per domain at browser rungs.

## Honeypot rule

Never click or fetch hidden elements: `display:none`, `visibility:hidden`,
`opacity:0`, zero-size/off-viewport anchors, `aria-hidden` links carrying real
hrefs. One interaction poisons the session's reputation.

## Opportunistic API capture

Attach a response listener on EVERY page load. Record JSON responses
(content-type `application/json`, same registrable domain) to the checkpoint as
event rows: `{"type":"event","kind":"xhr","url":...,"status":...,"bytes":...}`.
Climbing into api-discovery later must cost zero extra page loads.

## CAPTCHA policy

A captcha inside a challenge means STOP: back off, cool down (24h domain sleep
default), report `blocked`. Never auto-solve unless the run manifest records
explicit opt-in for a solving service. Avoidance beats solving - realistic
fingerprint plus human pacing keeps you under the site's risk threshold.

## Cache

Cache rendered HTML/screenshots per URL like static-fetch. Never reload a page
you already captured successfully this run.

## SCRAPE-RESULT contract

`## SCRAPE-RESULT topic=<topic> status=<complete|partial|blocked> collected=<n> empty=<n> blocked=<n> checkpoint=<path>`
