---
name: scrape:static-fetch
description: "Ladder rung 1: plain HTTP GET with browser-realistic headers, no browser. Cheapest rung; only works where no TLS-level bot detection exists. Detect challenge pages and climb immediately."
hidden: true
---

# Static fetch (rung 1)

Plain HTTP GET + parse. No browser. Always the first attempt for every target -
it is orders of magnitude cheaper than every other rung.

## Headers

Send a browser-realistic header set on every request: modern Chrome User-Agent,
matching `sec-ch-ua*` client hints, `Accept-Language` matching the target
region. Rotating user-agents alone accomplishes nothing - detection is layered
across IP reputation, TLS/JA3 fingerprints, HTTP/2 frame ordering, and behavior.

Prefer Bun `fetch` for rung-1 requests. **Never shell out to `curl` or Python
`requests` here**: their default TLS handshakes are instantly flagged by
Cloudflare-class systems (curl-impersonate exists precisely because of this).

## Parse

- Extract fields per the topic's schema contract.
- Record which selector/expression produced each field (method-diversity
  evidence - the QA gate flags topics where one selector produces >80% of rows).
- Write each collected row to the topic checkpoint immediately (append JSONL).
- Cache raw response bytes at `.codo/scrape/<run-id>/cache/<sha256(url)>` on
  first success. Never refetch a URL that returned 200 this run - re-parse from
  cache instead (re-parsing is free, re-fetching is a ban risk).

## Challenge-page recognition

These markers mean a bot verdict was issued BEFORE content - an immediate climb
signal, not a parse failure:

- Response body contains `__cf_chl_`, `cf-browser-verification`
- `<title>` or body contains "Just a moment", "Checking your browser",
  "Attention Required", PerimeterX/DataDome strings
- 200 OK but expected selectors absent AND challenge markers present

## Honeypot rule

Never follow links that are visually or semantically hidden (`display:none`,
`visibility:hidden`, `opacity:0`, zero-size anchors, `aria-hidden` links with
real hrefs). One interaction poisons the whole session's reputation.

## Exit rules

Follow the block-signal table in your dispatch prompt: 403 climbs after a 60s
pause; 429/503 back off in place (30s -> 60s -> 120s, then domain sleep);
challenge pages climb immediately without retry.

## SCRAPE-RESULT contract

End every dispatch with:
`## SCRAPE-RESULT topic=<topic> status=<complete|partial|blocked> collected=<n> empty=<n> blocked=<n> checkpoint=<path>`
