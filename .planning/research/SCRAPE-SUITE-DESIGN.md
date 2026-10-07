# SCRAPE SUITE — Final Validated Design

Synthesized: 2026-08-22 · Inputs: web-research stream A + `SCRAPE-AGENT-INTEGRATION.md` (stream B, all line refs re-verified against working tree) + the three drafted artifacts (`scrape.txt`, umbrella router, `scrape:brief`).

> **Citation note.** Stream A arrived as findings without URLs. Each citation below is the
> canonical primary source that documents the fact in question (project README, official
> docs, RFC). Where a number is a vendor-reported benchmark it is marked "vendor claim".

---

## 0. Corrections to already-drafted artifacts (apply before implementation)

The three drafted files are approved **with these corrections** — they currently contradict each other:

1. **`src/skill/scrape/scrape/SKILL.md:26-28` (umbrella Rules) ladder is WRONG.** It reads
   `static-fetch → browser-render → browser-render human-pacing → api-discovery → auth-session`.
   There is no "human-pacing" rung and the Patchright rung is missing entirely, while
   `scrape.txt:29-33` correctly has hardened-Patchright as rung 3. Replace with:
   `static-fetch → browser-render (vanilla Playwright) → browser-render hardened (Patchright) → api-discovery → auth-session → blocked`.
2. **`scrape.txt` — add two ladder mechanics** (§2 of this doc): opportunistic XHR capture on every browser rung, and API demotion (once an internal JSON endpoint is found, subsequent fetches for that topic drop back DOWN to static HTTP against the endpoint).
3. **`scrape:brief` §3 politeness numbers** — align to the unified tiers in §3 below (add the missing 1-3s static tier; add "never fixed intervals" as an explicit rule; reference `scrape:politeness` for backoff instead of restating numbers).

---

## 1. Final skill list (9 registered descriptors)

Registration order = array order in `src/skill/scrape-skills.ts`. All frontmatter carry `hidden: true` (suite style; note this flag is inert server-side — see §7 risks). Every sub-skill ends with the terminal-line contract so the orchestrator parses results instead of trusting prose:

```
## SCRAPE-RESULT topic=<topic> status=<complete|partial|blocked> collected=<n> empty=<n> blocked=<n> checkpoint=<path>
```

### 1.1 `scrape` — umbrella router (EXISTS, apply correction 0.1)
Sections: routing table (keep), fixed ladder rule (fix), politeness-always rule, off-topic refusal.
Rule to add: *"Every rung's page load opportunistically records observed XHR/fetch requests as `event` rows — climbing into api-discovery later must cost zero extra page loads."*

### 1.2 `scrape:brief` (EXISTS, apply corrections 0.1/0.3)
Sections kept: Topics & schema contracts (with `natural_key`), Seed URL discovery (search → sitemap → common paths → in-site links, recording discovery method per seed), Politeness budget, Auth check, Swarm plan.
Additions:
- Schema-contract example gains provenance envelope fields (`source_url`, `collected_at`, `http_status`, `parser_version`, `content_sha256`) with a note: *the checkpoints skill adds these automatically; contracts only declare business fields.*
- Politeness tiers table verbatim from §3 of this document.
- New rule: **method diversity at plan time** — never plan one CSS selector as the sole extraction path for a critical field; name a fallback selector or fallback rung per field family (single-selector dependency = total silent failure risk).

### 1.3 `scrape:static-fetch`
Rung 1. Plain HTTP GET + parse, no browser.
Sections:
- **Headers**: send browser-realistic header set (modern Chrome UA + matching `sec-ch-ua*`, `Accept-Language`). Rotating user-agents alone accomplishes nothing — detection is layered across IP reputation, TLS/JA3 fingerprints, HTTP/2 frame ordering, and behavior ([Cloudflare bot concepts](https://developers.cloudflare.com/bots/concepts/bots/), [JA3](https://github.com/salesforce/ja3)). Default Python/curl TLS handshakes are instantly flagged by Cloudflare-class systems; prefer Bun `fetch` (browser-like stack over Node http agents) and never shell out to `curl`/`python requests` for rung 1 ([curl-impersonate exists precisely because of this](https://github.com/lwthiker/curl-impersonate)).
- **Parse**: extract per schema contract; record which selector produced each field.
- **Challenge-page recognition**: markers `__cf_chl_`, "Just a moment", `cf-browser-verification`, PerimeterX/DataDome strings, `<title>` containing challenge words → immediate climb signal, not a parse failure.
- **Exit/climb rules**: see §2 block-signal table.
- **Never** follow honeypot links (hidden elements) discovered in HTML.

### 1.4 `scrape:browser-render` (vanilla + Patchright hardening)
Rungs 2 and 3 share one skill with two modes.
Sections:
- **Mode vanilla (rung 2)**: Playwright headless, session warming mandatory before first target hit (§3.4), human pacing (jittered delays, random scroll/dwell), navigate SPAs via in-site link clicks rather than direct URL loads wherever possible.
- **Mode hardened (rung 3)**: swap import to **Patchright** — drop-in Playwright replacement installable via npm, fixes CDP leaks (e.g. `Runtime.enable`) that vanilla headless exposes; vendor-reported ~67% reduction in headless detections ([github.com/Kaliiiiiiiiii-Vinyzu/patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright), npm package `patchright`). Enter hardening by changing the import + launch call only; keep scripts identical.
- **DEAD END — do not use `playwright-extra`/puppeteer-extra-stealth**: JS-layer patches are evaluated after the TLS handshake and are defeated pre-JavaScript by modern systems; effectively unmaintained since March 2023 ([berstend/puppeteer-extra](https://github.com/berstend/puppeteer-extra); Patchright README documents the bypass rationale). Out-of-scope alternatives recorded but NOT integrated: **Camoufox** (Firefox C++ fork, vendor-reported 0% headless detection on CreepJS, ~200MB heavier per context, Python-only wrapper, slow ~42s bypasses — [camoufox.com](https://camoufox.com/)) and **nodriver** (Python, CDP-minimal — [github.com/ultrafunkamsterdam/nodriver](https://github.com/ultrafunkamsterdam/nodriver)). Node/Bun-first COdo ⇒ Playwright→Patchright is the practical pair.
- **Opportunistic API capture**: attach a response listener on every page; append JSON responses (content-type `application/json`, same registrable domain) as `event` rows `{kind:"xhr", url, status, bytes}`.
- **CAPTCHA policy**: a captcha inside a challenge means STOP — back off, cool down, report `blocked`. Never auto-solve unless the manifest records explicit opt-in; solving services exist (~$1/1000 solves, 2Captcha/Capsolver — [2captcha pricing](https://2captcha.com/pricing), [capsolver.com](https://www.capsolver.com/)) but avoidance beats solving: realistic fingerprint + behavior keeps you under the site's risk threshold.

### 1.5 `scrape:api-discovery`
Rung 4 — often the best data source; APIs change less often than HTML layouts and frequently expose more fields than the UI renders.
Sections:
- **Harvest first, hunt second**: read the `xhr` event rows already captured by rungs 2-3 (zero extra loads). Only if empty, do one warmed page load with network recording.
- **Methodology (DevTools formalized)**: filter to Fetch/XHR, search within response bodies for a known value visible on the page, "Clear → Click → Catch" — clear log, perform the UI action once, take the request that appears ([Chrome DevTools Network docs](https://developer.chrome.com/docs/devtools/network/)).
- **GraphQL goldmine**: single `/graphql` endpoint; copy the query from the payload. Persisted queries address operations by `sha256Hash` — you CANNOT modify the query text, you CAN modify `variables` (pagination, filters) ([Apollo APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/)). If variables are pinned too, api-discovery dead-ends for that operation.
- **Pagination amplification**: bump items-per-page params (`per_page`, `pageSize`, `limit`, `size`) to shrink request counts before paginating.
- **Bundle mining**: scan the site's JS bundles with regexes `/\/api\//`, `/\/v[0-9]+\//`, `/graphql/` for undiscovered endpoints.
- **Ignore third-party analytics domains** (doubleclick, segment, hotjar…) — only same-registrable-domain endpoints are candidates.
- **Demotion rule**: a working endpoint converts the topic back to `static-fetch` economics: plain authenticated-header-less HTTP GETs against the JSON API for all remaining pages.
- **API stability duty**: pin the endpoint URL + a sample request/response pair into the checkpoint events so a future run detects endpoint drift fast.

### 1.6 `scrape:auth-session`
Rung 5, consent-gated.
Sections:
- **Gate**: orchestrator asked the two kickoff questions up-front (`scrape.txt:11-13`); no login attempt unless `manifest.consent.has_account === true` and the topic is listed in `consent.login_topics`.
- **Manual-once pattern**: user logs in manually in a headed (non-headless) browser window; agent saves `storageState` (cookies+localStorage) to `.codo/scrape/<run-id>/auth/<site>.json` (gitignored via §6) and replays it in subsequent headless contexts.
- **Hygiene**: session file deleted at run end unless user asks to keep; never log cookies/tokens into checkpoints — checkpoints carry URLs and statuses only.
- Reuse warmed-context pacing; logged-in sessions get the SAME politeness budget — being logged in does not raise rate limits.

### 1.7 `scrape:politeness`
Cross-cutting; applies to every rung without exception (umbrella rule).
Sections: delay tiers, concurrency caps, jitter law, backoff schedule & cooldowns, session-warming recipe, cache rules, honeypot avoidance, robots.txt handling, off-peak scheduling hint. Full spec = §3 of this document; the SKILL.md carries the operator-facing version.

### 1.8 `scrape:checkpoints`
Durability layer. Sections: directory layout, JSONL row schema, manifest schema, resume semantics, merge/dedupe procedure, dead-letter queue. Full spec = §4.

### 1.9 `scrape:deliver`
QA gate + workbook handoff. Sections: validation gates, coverage report, drift flags, review routing, then load `business:xlsx-official`. Full spec = §5. Workbook layout: one sheet per topic + Sources sheet (provenance columns) + Coverage sheet + Review sheet (low-confidence/conflicted rows routed for human eyes — never silently dropped).

---

## 2. Ladder specification

Fixed order, per target/topic. Log WHY before every climb (an `event` row `{kind:"ladder-climb", from, to, signal}`).

| Rung | Skill | Entry criteria | Exit criteria (success) |
|---|---|---|---|
| 1 | `static-fetch` | Default start for every target | 200 OK + all contracted fields parsed ≥ completeness thresholds |
| 2 | `browser-render` vanilla | Any climb signal at rung 1 (see table) OR page known/pre-detected JS-rendered | Fields collected after warmed load |
| 3 | `browser-render` hardened (Patchright) | Rung 2 got challenged/flagged again post-warming | Fields collected |
| 4 | `api-discovery` | DOM extraction still failing/brittle at rungs 2-3, or fields missing from DOM entirely | Internal endpoint found AND replayable via static HTTP with contracted fields |
| 5 | `auth-session` | Content requires login AND consent recorded | Fields collected with saved session state |
| 6 | — | All above exhausted | Terminal `blocked`; remaining URLs marked blocked with signals |

**Demotion (not climbing)**: once rung 4 yields a working endpoint, all further fetching for the topic runs through rung-1-style static HTTP against the endpoint (with politeness budget unchanged).

### Block-signal table

| Signal observed | Diagnosis | Ladder action | Cooldown before next action |
|---|---|---|---|
| `403 Forbidden` | Fingerprint/header/IP-level rejection | Climb to next rung (headers won't fix TLS-level verdicts) | 60s pause on domain |
| `429 Too Many Requests` | Rate limit — behavioral, NOT fingerprinting | **Do NOT climb.** Same-rung retry on exponential backoff | 30s → 60s → 120s (3 attempts max), then domain sleep 15 min |
| Challenge page (`__cf_chl_*`, "Just a moment…", PX/DataDome markers) | Bot verdict issued pre-content | Immediate climb to next browser rung | No same-rung retry |
| Captcha embedded in challenge | Risk score crossed threshold | **STOP.** Mark blocked; surface unlock options. No solving without manifest opt-in | Domain sleep 24 h default |
| Empty-with-200 (OK but expected selectors absent / zero rows) | JS-rendered content, selector drift, or silent truncation | Climb once to browser-render; if browser ALSO returns empty → this is a DATA problem, mark `empty` with reason, never `blocked` | n/a |
| `503 Service Unavailable` | Overload or soft block | Treat like 429 (backoff schedule above) | as 429 |

**Domain circuit breaker**: 3 consecutive hard blocks (403/challenge/captcha) on one domain ⇒ abandon the domain for this run; all its pending URLs become `blocked` rows citing the breaker. Speed comes from parallelism ACROSS topics/domains, never aggression within one (already committed at `scrape.txt:21`).

---

## 3. Politeness specification (concrete defaults)

Research basis: randomized human-like delays with a minimum floor around 1-5 s; **fixed intervals are themselves a detection signal**, so every delay is uniform-random within its tier; session warming before targets; SPA navigation via in-site links; hidden honeypot links never interacted with; exponential backoff on 429/503; aggressive caching to never refetch; off-peak scheduling helps when the user can wait.

### 3.1 Delay tiers (uniform-random within range, per same-domain request)

| Tier | When | Delay |
|---|---|---|
| T1 static | HTTP GETs (HTML or discovered JSON API) | **1-3 s** |
| T2 browser | Full page loads in Playwright/Patchright | **2-6 s** (brief default, matches draft) |
| T3 protected | Target shows ANY protection signal, or is large/precious | **8-15 s** |
| Dwell | Warming pages, between in-site clicks | 5-15 s + small random scroll |

### 3.2 Concurrency caps
- Browser rungs: **1 in-flight request per domain**, hard.
- Static rung: **max 2 per domain**.
- Different domains: unlimited parallelism (that's where swarm speed comes from).
- Multiple topics sharing one domain run SEQUENTIALLY through one shared queue — the domain sees one polite crawler, not three racers (brief §5, accepted prompt-level-only enforcement; see §7).

### 3.3 Backoff & cooldowns
Exactly the block-signal-table column: 30→60→120 s for 429/503 (then 15-min domain sleep); 60 s after 403; no retry on challenge; 24 h on captcha. After a second separate 429 episode on the same domain in one run, permanently raise that domain to T3.

### 3.4 Session warming (mandatory before first target hit on any domain at browser rungs)
1. Load homepage (or most generic section page).  2. Dwell 5-15 s, small random scroll.  3. Visit 1-2 nav/category pages via in-site links.  4. THEN reach the target — via an in-site link click where the information architecture allows, else direct load.

### 3.5 Honeypot rule
Never click/fetch elements that are visually or semantically hidden: `display:none`, `visibility:hidden`, `opacity:0`, zero-size or off-viewport anchors, background-matching text color, `aria-hidden` links carrying real `href`s. One interaction poisons the whole session's reputation.

### 3.6 Cache rules
- Raw response bytes cached at `.codo/scrape/<run-id>/cache/<sha256(url)>.<ext>` on first success.
- Never refetch a URL that returned 200 within the run; re-parse from cache instead (re-parsing is free, re-fetching is a ban risk).
- Cache doubles as the provenance store: `content_sha256` is computed from the cached bytes; parser upgrades can re-parse old runs offline.

### 3.7 robots.txt & honesty
Honour robots.txt unless the user explicitly waived it for THIS run; record the answer in `manifest.robots_honoured` (kickoff question 2, `scrape.txt:13`). The identify-honestly-vs-blend-in tension is a standing ethics tradeoff; current design choice: blend in technically, be fully honest to the USER about methods and coverage.

---

## 4. Checkpoint format specification

Directory (gitignored — §6): `.codo/scrape/<run-id>/`

```
manifest.json          # plan + consent + budgets (below)
<topic>.jsonl          # append-only checkpoint, one topic per subagent
cache/<sha256(url)>    # raw response bytes (politeness/provenance)
auth/<site>.json       # Playwright storageState, consent-gated, deleted post-run
```

### 4.1 JSONL row schema (five row types)

Common envelope on every line: `type`, `ts` (ISO-8601), `run_id`, `topic`.

```jsonc
{"type":"row","status":"collected","ts":"2026-08-22T10:00:00Z","run_id":"scrape-20260822-a1b2","topic":"delivery_cities",
 "data":{"city":"Leeds","country":"GB","postcode_prefix":"LS"},
 "natural_key":["GB","Leeds","LS"],
 // provenance quintet — mandatory on every collected row:
 "source_url":"https://example.co.uk/help/delivery",
 "collected_at":"2026-08-22T10:00:00Z",
 "http_status":200,
 "parser_version":"brief-v1",            // bumped whenever selectors/logic change mid-run
 "content_sha256":"…",                    // sha256 of raw cached response
 "rung":"static-fetch","selector":"table#zones tr"}   // method diversity evidence

{"type":"row","status":"empty","ts":"…","run_id":"…","topic":"…",
 "target_url":"…","reason":"page has no such section","attempts":["static-fetch","browser-render"]}

{"type":"row","status":"blocked","ts":"…","run_id":"…","topic":"…",
 "target_url":"…","signals":["403","challenge-page"],"cooldown_until":"2026-08-23T10:00:00Z"}

{"type":"event","kind":"ladder-climb|xhr|rate-limit|warming|note", …}   // free-form diagnostics incl. opportunistic API captures

{"type":"dead","reason":"schema-violation|range-violation|duplicate-conflict","payload":{…}}
```

Rules: **append-only, never rewritten** (a killed machine never loses collected data — `scrape.txt:38`). Rows failing QA go to `type:"dead"` (dead-letter queue) — silent drops forbidden. Checkpoints never contain cookies/tokens.

### 4.2 Run manifest schema

```jsonc
{
  "run_id": "scrape-20260822-a1b2",
  "created_at": "2026-08-22T09:55:00Z",
  "robots_honoured": true,
  "captcha_solving_opt_in": false,
  "politeness": {"delay_tier_default":"T2","tiers":{"T1":[1000,3000],"T2":[2000,6000],"T3":[8000,15000]},"max_concurrency_per_domain":{"static":2,"browser":1}},
  "consent": {"has_account": false, "login_topics": []},
  "topics": [
    {"name":"delivery_cities",
     "schema_contract":{"row":{"city":"string","country":"GB|IE","postcode_prefix":"string|null"},"natural_key":["city","country","postcode_prefix"]},
     "seeds":[{"url":"…","discovered_via":"sitemap"}],
     "checkpoint":"delivery_cities.jsonl",
     "status":"pending|running|complete|blocked"}
  ]
}
```

### 4.3 Resume semantics
On restart the orchestrator: reads manifest → for each non-complete topic reads its checkpoint → builds the done-set of `source_url`s (+ blocked URLs with live cooldowns) → re-dispatches the topic subagent with "skip anything in the done-set". Duplicate rows across resume boundaries are harmless: merge dedupes on natural key anyway. The run-id directory is reused, never recreated; manifests are immutable after kickoff except topic `status` transitions.

### 4.4 Merge/dedupe procedure (orchestrator-owned, after all topics settle)
Dedup keying is layered because **URL alone is never the key** (variant/mirrored URLs defeat it):
1. **URL level**: identical `source_url` → keep latest `collected_at`.
2. **Content level**: identical `content_sha256` across different URLs (mirrors/syndication) → collapse, keep earliest source.
3. **Entity level**: group by the contract's `natural_key` → survivors; conflicting non-key fields between group members → keep most recent, route the displaced row(s) to the Review sheet with both values.
Output: merged dataset + dedup report (survivors and collapses per layer).

---

## 5. QA gate specification (pre-delivery, blocks Excel until passed)

Rationale from research: silent data failures surface days late while infra failures surface in minutes — *"a job exiting zero is proof the process ran, not proof data is correct."* Gates applied to the merged dataset:

| # | Gate | Rule | On failure |
|---|---|---|---|
| G1 | Schema conformance | Every row matches its contract (types/enums/nullability) | Row → dead-letter; count reported |
| G2 | Range/semantic checks | Numeric ranges sane (price ≥ 0), enums valid, dates within plausible window | Violating value → dead-letter + flag |
| G3 | Uniqueness | `count(distinct natural_key) == count(rows)` post-merge | Merge bug — halt delivery |
| G4 | Completeness (silent-truncation guard) | Critical fields (contract-marked, e.g. price) non-null **≥ 99 %**; secondary fields ≥ 90 % warn, < 50 % investigate | Critical shortfall HALTS delivery pending investigation |
| G5 | Method diversity | No single selector/run may account for > 80 % of a topic's rows | Warn + name the dependency in the report |
| G6 | Freshness | `min(collected_at)` within acceptable staleness for the ask (default 24 h) | Stale warning on Coverage sheet |
| G7 | Drift vs prior run (if previous manifest exists) | Flag all three drift types: **schema/structural** (fields appeared/vanished), **semantic** (values still fit type but meaning shifted, e.g. currency flip), **distributional** (coverage %/value distribution shifts beyond ±5 pp) | Drift flags listed on Coverage sheet; delivery proceeds with warnings |

### Coverage report (rendered to user + Coverage sheet)

Per topic and total — percentages sum to 100:

```
topic           requested   collected      empty       blocked   dominant signal   unlock path
delivery_cities      120    114 (95%)    4  (3%)     2  (2%)   challenge-page    Patchright rung / manual login
```

Plus: dead-letter count, review-sheet count, gates G1-G7 outcomes, and "what would unlock the blocked portion (login / different rung / manual step)" — the honesty contract's closing promise (`scrape.txt:42-46`).

Delivery then loads `business:xlsx-official`: one sheet per topic + Sources sheet (the provenance quintet as columns) + Coverage sheet + Review sheet.

---

## 6. Integration steps (ordered; blueprint-verified against working tree 2026-08-22)

> ### ⚠️ PROMINENT WARNING — permission field is REQUIRED
> `Agent.Info.permission: PermissionV1.Ruleset` (`agent.ts:50`) is mandatory. Omitting
> `permission:` from the scrape agent registration caused a production 500 crash in a
> prior incident. Every registration below MUST include the full
> `Permission.merge(defaults, Permission.fromConfig({...}), user)` shape — never a bare
> config object, never `permission` omitted. Merge order is load-bearing (`findLast`,
> src/permission/index.ts:39-45): defaults → overrides → user last.

**Create**
1. `packages/codo/src/skill/scrape/static-fetch/SKILL.md` — §1.3.
2. `packages/codo/src/skill/scrape/browser-render/SKILL.md` — §1.4 (vanilla + Patchright modes, CAPTCHA stop-rule).
3. `packages/codo/src/skill/scrape/api-discovery/SKILL.md` — §1.5.
4. `packages/codo/src/skill/scrape/auth-session/SKILL.md` — §1.6.
5. `packages/codo/src/skill/scrape/politeness/SKILL.md` — §3 operator version.
6. `packages/codo/src/skill/scrape/checkpoints/SKILL.md` — §4.
7. `packages/codo/src/skill/scrape/deliver/SKILL.md` — §5.
8. Apply §0 corrections to the three existing artifacts.
9. `packages/codo/src/skill/scrape-skills.ts` — mirror `business-skills.ts:1-71`: text imports `with { type: "text" }`, descriptor array `{name, description, content}` (9 entries: umbrella + 8), export `scrapeSkills`, `SCRAPE_SKILL_NAMES = new Set(...)`, registry-backed `isScrapeSkill(name){ return SCRAPE_SKILL_NAMES.has(name) }` (prefix checks are insufficient — sec-test-skills.ts:194-203).
10. `packages/codo/src/agent/scrape-topic.ts` — Sec-style spec module exporting ONE generic persona `scrape-topic` (mode `subagent`, no per-rung personas — rung selection stays dynamic in-prompt). Its `withPrompt(ctx.directory)` bakes: working dir, checkpoint-path convention, firstSkill, allowed skills (`scrape:*` minus brief/deliver), toolchain line, and the `SCRAPE-RESULT` terminal contract. Permission: bash/webfetch allow, `edit:{"*":"deny", ".codo/scrape/*":"allow"}` (**single-star literal, forward slashes** — globstar form silently denied top-level writes, sec.ts:15-41), todowrite/task deny.
11. `packages/codo/src/scrape/tool-presence.ts` — sibling module (do NOT extend security's TOOLS list): probe `node --version`, `python --version`, `npx patchright --version`. **Async `Bun.spawn` + timeout + blanket catch ONLY** — spawnSync probing on Windows blocked the thread seconds-per-tool (tool-presence.ts:16-30 canonical warning); EPERM on locked binaries surfaces as `available:false`; use a longer cap (~15 s) since npx may resolve packages; fire-and-forget priming, undefined-until-settled line.
12. `packages/codo/test/agent/scrape-registry.test.ts` — mirror sec-test-registry.test.ts: registration presence/mode/native, firstSkill reachable, `expect(scrapeSkills).toHaveLength(9)` + `SCRAPE_SKILL_NAMES.size === 9` (**array-scoped only** — other suites' counts are untouched), frontmatter `name:` equals descriptor name, `can()` checks for `.codo/scrape/*` edits + task grant.

**Modify**
13. `packages/codo/src/skill/index.ts` — import at ~line 43; registration loop AFTER the business block (~line 380) with location tag `<built-in:scrape:${ss.name}>` (builtins register before disk discovery so user skills override).
14. `packages/codo/src/agent/agent.ts` — `import PROMPT_SCRAPE from "./prompt/scrape.txt"` (~line 16); entry after `business` (~line 270):

```ts
scrape: {
  name: "scrape",
  color: "#4d9e6a", // verified unused across agent.ts/gsd.ts/sec.ts palettes
  description: "Web-extraction orchestrator. Plans runs (scrape:brief), dispatches a parallel topic-subagent swarm, climbs the escalation ladder, checkpoints to .codo/scrape/<run-id>/, delivers Excel via business:xlsx-official.",
  options: {},
  // ⚠️ permission REQUIRED — omitting it 500-crashes production (Agent.Info schema)
  permission: Permission.merge(
    defaults,
    Permission.fromConfig({
      question: "allow",
      skill: "allow",
      task: "allow", // REQUIRED — enables the TaskTool swarm
    }),
    user,
  ),
  prompt: PROMPT_SCRAPE,
  mode: "primary",
  native: true,
},
```
Spread `scrape-topic` personas like `Sec.SEC_AGENTS` (agent.ts:277-286) with merged permissions.

15. Root `.gitignore` — add `.codo/scrape/` (checkpoints/cache/auth states are transient machine data; `.codo/` itself is currently untracked-but-unignored, verified).
16. TUI cleanup — retire/re-point legacy hardcoded `/scraper` command (tui/src/app.tsx:916-924; rewrite handler tui/src/component/prompt/index.tsx:981-988) now that real `/scrape` auto-exists via skill→command mapping (src/command/index.ts:164-175).
17. Decision point (recommended YES): add compose-style NAME filter for `scrape:*` in session/system.ts:119-120 so other primary agents don't list scrape internals in `available_skills`.

No SDK regeneration needed (`app.skills`/`app.agents` routes exist). Foreground parallel task dispatches only; background mode stays behind `CODO_EXPERIMENTAL_BACKGROUND_SUBAGENTS`.

---

## 7. Open risks

1. **Politeness serialization is prompt-discipline only** — no runtime queue enforces same-domain caps; two racing subagents could double-hit a domain despite instructions. Accepted (blueprint §6), revisit if bans occur.
2. **`hidden: true` is inert server-side** — `isSkillFrontmatter` reads only name/description (skill/index.ts:60-66 area); scrape:* will appear in Skills dialog + other agents' lists unless step 17 lands.
3. **Shadowing**: a user-disk skill named `scrape` silently overrides the builtin umbrella (index.ts:346-353, log-warning only).
4. **Patchright supply-chain/maintenance risk** — single-maintainer project; mitigation: vanilla Playwright remains the base rung, hardening degrades gracefully if probe reports unavailable; Camoufox/nodriver documented as Python-only escape hatch.
5. **GraphQL persisted queries with pinned variables** dead-end api-discovery for those operations (cannot modify query NOR variables).
6. **CAPTCHA solving integration deferred** — manifest opt-in flag exists; no service wiring shipped. Ethical/ToS exposure deliberately minimized.
7. **Identify-honestly vs blend-in** is unresolved policy; current stance: technical blending, user-facing honesty. Legal/ToS review NOT performed; robots-honour default is the main mitigations.
8. **Windows Agent.list flake** predates this suite (docs/sec-test/03-IMPLEMENTATION.md §7) — expect occasional registry-test noise.
9. **Cross-suite coupling**: delivery depends on `business:xlsx-official` staying registered; its absence breaks only the final handoff, checkpoints preserve data.
10. **Empty-vs-blocked misclassification** is the subtle failure mode: an empty DOM after successful browser render is a DATA finding, not a blocking signal — misclassifying it hides selector drift. G4/G5 are the backstop; reviewers should watch this.
