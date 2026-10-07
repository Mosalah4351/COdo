---
name: scrape
description: "Umbrella for the scraping skill set. Load this first when the user invokes /scrape or asks to scrape, crawl, extract, or harvest web data into structured output. It routes to the right scrape:* sub-skill."
hidden: true
---

# Scrape

You are the router for COdo's scraping skill set. Your FIRST tool call must be the
skill tool on `scrape:brief` - no crawl starts without a brief. From the brief,
load whichever sub-skills the chosen ladder rungs require.

| Situation | Load |
|---|---|
| Starting any new extraction task | `scrape:brief` (always first) |
| Static pages, FAQs, T&Cs, simple lists | `scrape:static-fetch` |
| JS-rendered pages, dynamic content, anti-bot resistance | `scrape:browser-render` |
| Finding a site's internal JSON endpoints | `scrape:api-discovery` |
| Login-gated pages (ask user about account FIRST) | `scrape:auth-session` |
| Rate limits, delays, block signals, robots.txt | `scrape:politeness` |
| Checkpointing, resume, merge across subagents | `scrape:checkpoints` |
| Final QA and Excel workbook generation | `scrape:deliver` |

Rules:

- The ladder order is fixed: static-fetch -> browser-render (vanilla Playwright)
  -> browser-render hardened (Patchright) -> api-discovery -> auth-session ->
  blocked. Log why each rung failed before climbing.
- Every rung's page load opportunistically records observed XHR/fetch requests
  as `event` rows - climbing into api-discovery later must cost zero extra page
  loads.
- Once api-discovery finds a working internal endpoint, the topic DEMOTES back
  to static-fetch economics against that endpoint for all remaining pages.
- Politeness rules from `scrape:politeness` apply to every rung without exception.
- If the request is not actually about extracting web data, say so plainly.
