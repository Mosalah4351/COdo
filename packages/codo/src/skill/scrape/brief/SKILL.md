---
name: scrape:brief
description: "Plan a scraping run: decompose the request into topics with schema contracts, discover seed URLs, set the politeness budget, and lay out the subagent swarm. Load this before any crawl."
hidden: true
---

# Brief: planning a scrape run

You are turning a user request into an executable extraction plan. Output a brief
the orchestrator and every subagent will follow.

## 1. Topics

Split the request into independent topics (each becomes one parallel subagent):

- One topic per distinct data family. "Delivery cities" and "excluded cities" are
  TWO topics even if they share a source page - their schemas differ.
- For each topic write a **schema contract**: the exact JSON shape rows must
  follow. Example:

```json
{
  "topic": "delivery_cities",
  "row": {
    "city": "string",
    "country": "GB|IE",
    "postcode_prefix": "string|null",
    "source_url": "url",
    "scraped_at": "iso8601"
  },
  "natural_key": ["city", "country", "postcode_prefix"]
}
```

`natural_key` is what the merge stage dedupes on. Choose it deliberately -
wrong keys silently drop real data.

## 2. Seed URLs

For each topic find starting URLs by trying, in order:

1. The site's own search (site search results pages are URL-addressable)
2. `sitemap.xml` / `robots.txt` Sitemap entries
3. Common paths (`/help`, `/faq`, `/delivery`, `/pricing`, `/terms`)
4. Site-internal links discovered while fetching a known page

Record which discovery method produced each seed.

## 3. Politeness budget

Per domain, decide and record:
- Delay between requests: random 2-6s default; 8-15s if the target is large or
  shows any protection signals.
- Max concurrent requests to one domain: **1** for browser rungs, 2 for static.
- robots.txt: **the orchestrator asks the user before anything runs** - honour
  unless the user waives it for this run. Record the answer.

## 4. Auth check

List which topics likely need login (account dashboards, personalized pricing,
anything behind a profile). The ORCHESTRATOR asks the user about account
ownership before these topics start - never attempt login-gated crawling without
that answer recorded in the run manifest under `.codo/scrape/<run-id>/manifest.json`.

## 5. Swarm plan

Output the dispatch list: one row per topic - schema contract, seeds, ladder
reminder, checkpoint path (`.codo/scrape/<run-id>/<topic>.jsonl`), politeness
budget. Topics on DIFFERENT domains always run in parallel; multiple topics on
the SAME domain run sequentially through one shared queue so the domain sees one
polite crawler, not three racing ones.
