---
name: scrape:checkpoints
description: "Durability layer: JSONL checkpoint schema, run manifest, resume semantics, merge/dedupe procedure. Append-only - a killed machine never loses collected data."
hidden: true
---

# Checkpoints (durability layer)

Directory (gitignored): `.codo/scrape/<run-id>/`

```
manifest.json          # plan + consent + budgets
<topic>.jsonl          # append-only checkpoint, one topic per subagent
cache/<sha256(url)>    # raw response bytes (politeness/provenance)
auth/<site>.json       # Playwright storageState, consent-gated, deleted post-run
```

## JSONL row schema (five row types)

Common envelope on every line: `type`, `ts` (ISO-8601), `run_id`, `topic`.

```jsonc
{"type":"row","status":"collected","ts":"…","run_id":"…","topic":"…",
 "data":{"city":"Leeds","country":"GB","postcode_prefix":"LS"},
 "natural_key":["GB","Leeds","LS"],
 // provenance quintet — mandatory on every collected row:
 "source_url":"https://example.co.uk/help/delivery",
 "collected_at":"2026-08-22T10:00:00Z",
 "http_status":200,
 "parser_version":"brief-v1",
 "content_sha256":"…",
 "rung":"static-fetch","selector":"table#zones tr"}

{"type":"row","status":"empty","ts":"…","run_id":"…","topic":"…",
 "target_url":"…","reason":"page has no such section","attempts":["static-fetch","browser-render"]}

{"type":"row","status":"blocked","ts":"…","run_id":"…","topic":"…",
 "target_url":"…","signals":["403","challenge-page"],"cooldown_until":"…"}

{"type":"event","kind":"ladder-climb|xhr|rate-limit|warming|note", …}

{"type":"dead","reason":"schema-violation|range-violation|duplicate-conflict","payload":{…}}
```

Rules: **append-only, never rewritten**. Rows failing QA go to `type:"dead"`
(dead-letter queue) - silent drops are forbidden. Checkpoints never contain
cookies or tokens.

## Run manifest

`manifest.json` records: run_id, created_at, `robots_honoured`,
`captcha_solving_opt_in`, politeness budgets, consent (`has_account`,
`login_topics`), and per-topic entries: name, schema_contract, seeds (with
discovery method), checkpoint path, status. Immutable after kickoff except topic
status transitions.

## Resume semantics

On restart: read manifest -> for each non-complete topic read its checkpoint ->
build the done-set of `source_url`s (+ blocked URLs with live cooldowns) ->
re-dispatch the subagent with "skip anything in the done-set". Duplicate rows
across resume boundaries are harmless - merge dedupes anyway. The run-id
directory is reused, never recreated.

## Merge/dedupe (orchestrator-owned, after all topics settle)

Dedup keying is layered because **URL alone is never the key** (variant and
mirrored URLs defeat it):

1. **URL level**: identical `source_url` -> keep latest `collected_at`.
2. **Content level**: identical `content_sha256` across different URLs (mirrors,
   syndication) -> collapse, keep earliest source.
3. **Entity level**: group by the contract's `natural_key`; conflicting non-key
   fields -> keep most recent, route displaced rows to the Review sheet with both
   values.

Output: merged dataset + dedup report (survivors and collapses per layer).
