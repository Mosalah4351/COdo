---
name: scrape:api-discovery
description: "Ladder rung 4: find the site's internal JSON/GraphQL endpoints via network capture, GraphQL persisted-query handling, pagination amplification, and JS-bundle mining. Often the best data source - APIs change less than HTML and expose more fields."
hidden: true
---

# API discovery (rung 4)

Find and replay the target's internal data endpoints. APIs change less often
than HTML layouts, survive redesigns, and frequently expose MORE fields than the
UI renders.

## Harvest first, hunt second

Read the `xhr` event rows already captured opportunistically by browser-render
rungs - zero extra page loads needed. Only if that harvest is empty do ONE warmed
page load with full network recording.

## Methodology (DevTools formalized)

1. Filter to Fetch/XHR requests only; ignore scripts, stylesheets, images.
2. Search within response bodies for a value you can see on the page (a product
   name, a city) - the request containing it is your endpoint.
3. "Clear -> Click -> Catch": clear the network log, perform the UI action once,
   take the first request that appears.
4. Gold vs noise: names containing `api`, `v1`, `query`, `graphql` with 200
   status and structured JSON bodies are gold. `collect`, `sentry`, `telemetry`,
   analytics pixels are noise.
5. Ignore third-party domains (doubleclick, segment, hotjar, analytics) - only
   same-registrable-domain endpoints are candidates.

## GraphQL goldmine

- One door: usually a single `/graphql` endpoint.
- Copy the query from the request Payload tab - never write GraphQL by hand.
- **Persisted queries**: if the payload contains `extensions.persistedQuery` with
  a `sha256Hash`, you CANNOT modify the query text - but you CAN modify
  `variables` (pagination cursors, filters). Replay with the exact hash + your
  variables.
- If variables are pinned too, this operation is a dead end - record it and move
  on.

## Pagination amplification

Before paginating, bump items-per-page parameters (`per_page`, `pageSize`,
`limit`, `size`, `first`) to the largest accepted value - one request at 100
items replaces five at 20. Probe politely: increase gradually, back off on
errors.

## Bundle mining

Scan the site's JavaScript bundles for undiscovered endpoints:
`/\/api\//`, `/\/v[0-9]+\//`, `/\/graphql/`. Endpoints found in bundles but not
yet observed in traffic are candidates to probe once, politely.

## Replay rules

- Replay endpoints via static HTTP (this DEMOTES the topic back to rung-1
  economics for all remaining pages - politeness budget unchanged).
- Mind cookies: some endpoints require session cookies even when responses are
  anonymous-accessible. Test with and without.
- Watch for signed URLs and expiring tokens: if a replayed URL returns 403 after
  working once, re-capture a fresh token via one warmed page load instead of
  retrying the stale URL.

## Stability duty

Pin into checkpoint events: the endpoint URL, method, headers-minus-cookies, and
a sample request/response pair. A future run detects endpoint drift fast by
replaying the pinned sample first.

## SCRAPE-RESULT contract

`## SCRAPE-RESULT topic=<topic> status=<complete|partial|blocked> collected=<n> empty=<n> blocked=<n> checkpoint=<path>`
