---
name: scrape:deliver
description: "QA gates + Excel workbook generation. Validates the merged dataset (schema, ranges, uniqueness, completeness, method diversity, freshness, drift) before delivery - a job exiting cleanly is not proof the data is correct."
hidden: true
---

# Deliver (QA gate + workbook)

Apply every gate to the merged dataset. Delivery is BLOCKED until the gates
pass or failures are explicitly routed. Rationale: silent data failures surface
days late while infra failures surface in minutes - "a job exiting zero is
proof the process ran, not proof the data is correct."

## Gates

| # | Gate | Rule | On failure |
|---|---|---|---|
| G1 | Schema conformance | Every row matches its contract (types/enums/nullability) | Row -> dead-letter; count reported |
| G2 | Range/semantic checks | Numeric ranges sane (price >= 0), enums valid, dates plausible | Violating value -> dead-letter + flag |
| G3 | Uniqueness | `count(distinct natural_key) == count(rows)` post-merge | Merge bug - HALT delivery |
| G4 | Completeness (silent-truncation guard) | Critical fields (contract-marked) non-null **>= 99%**; secondary >= 90% warn; < 50% investigate | Critical shortfall HALTS delivery pending investigation |
| G5 | Method diversity | No single selector/rung may account for > 80% of a topic's rows | Warn + name the dependency in the report |
| G6 | Freshness | `min(collected_at)` within acceptable staleness (default 24 h) | Stale warning on Coverage sheet |
| G7 | Drift vs prior run (if previous manifest exists) | Flag schema drift (fields appeared/vanished), semantic drift (meaning shifted, e.g. currency flip), distributional drift (coverage/value shifts > +-5pp) | Drift flags listed on Coverage sheet; delivery proceeds with warnings |

Failed rows go to the dead-letter queue (`type:"dead"` checkpoints) - never
silently dropped.

## Workbook layout

Then load `business:xlsx-official` and produce:

- **One sheet per topic** - merged rows with business fields.
- **Sources sheet** - the provenance quintet as columns: source_url,
  collected_at, http_status, parser_version, content_sha256.
- **Coverage sheet** - per-topic and total coverage table (below) + gate
  outcomes G1-G7 + dead-letter and review counts.
- **Review sheet** - low-confidence/conflicted rows routed for human eyes,
  never silently dropped.

## Coverage report

Render to the user AND the Coverage sheet - percentages sum to 100:

```
topic           requested   collected      empty       blocked   dominant signal   unlock path
delivery_cities      120    114 (95%)    4  (3%)     2  (2%)   challenge-page    Patchright rung / manual login
```

Close with the honesty contract: what would unlock the blocked portion (login,
different rung, manual step).

## SCRAPE-RESULT contract

`## SCRAPE-RESULT topic=<run-id> status=<complete|partial> collected=<n> empty=<n> blocked=<n> checkpoint=<workbook path>`
