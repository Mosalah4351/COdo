# Scrape Orchestrator Agent — Integration Blueprint

Researched: 2026-08-22 · Codebase root: D:\COdo (read-only) · All line numbers verified against working tree.

---

## 0. Current state: half-scaffolded already

Three scrape artifacts EXIST but are wired to nothing:

| Artifact | State |
|---|---|
| `packages/codo/src/agent/prompt/scrape.txt` | Complete orchestrator prompt (ladder, swarm, honesty contract, `business:xlsx-official` handoff, `.codo/scrape/<run-id>/` checkpoints) |
| `packages/codo/src/skill/scrape/scrape/SKILL.md` | Umbrella router (`name: scrape`, `hidden: true`) — routes to 7 sub-skills that DON'T exist yet |
| `packages/codo/src/skill/scrape/brief/SKILL.md` | `scrape:brief` planning skill (`hidden: true`) |

Missing entirely: no agent registration in `agent.ts`, no `scrape-skills.ts` module, no registration loop in `skill/index.ts`, and 7 sub-skill SKILL.md files (`static-fetch`, `browser-render`, `api-discovery`, `auth-session`, `politeness`, `checkpoints`, `deliver`).

---

## 1. The three orchestrator precedents

### Registration shape (required fields)

Schema `Agent.Info` — `packages/codo/src/agent/agent.ts:41-62`:
`name`*, `description?`, `mode`* (`subagent|primary|all`), `native?`, `hidden?`, `topP?`, `temperature?`, `color?`, `permission`* (Ruleset), `model?`, `variant?`, `workflow?`, `prompt?`, `options`* (Record<string,unknown>), `steps?`.
(* = required in practice; every builtin supplies `options: {}`.)

All three orchestrators are registered inline in the `agents:` record inside `Agent.state` (agent.ts:152-370):

- **compose** (agent.ts:210-233): `{ name, color:"#a7a3d8", description, options:{}, permission, prompt: PROMPT_COMPOSE, mode:"primary", native:true }`. Permission grants `question/skill/workflow: allow` + external_directory allows for global skill trees.
- **sec-test** (agent.ts:234-252): same shape, color `"#e0715a"`. Permission adds **`task: "allow"`** — the dispatch enabler. `prompt: PROMPT_SEC_TEST`.
- **business** (agent.ts:253-270): color `"#c98a3d"`, `skill: "allow"` but NO `task` grant — hands-on light orchestrator that executes skills itself (business.txt:4 "orchestrator with hands"), routing table business.txt:17-31.

### Permission merge pattern (identical in all)

```ts
permission: Permission.merge(defaults, Permission.fromConfig({ ...overrides }), user)
```
`defaults` = agent.ts:131-148 ("*" allow + env-read guards + whitelisted dirs); `user` config merged last. Merge order is load-bearing: `Permission.evaluate` resolves via `findLast` (src/permission/index.ts:39-45), so later rulesets win; within one map, narrowing sub-keys must follow `"*": "deny"` (sec.ts:69-75 comment).

### Persona-spec module variant (sec.ts)

`packages/codo/src/agent/sec.ts` defines `SecAgentSpec` (lines 92-110: name/description/color/prompt/**phase**/**deliverable**/**skills[]**/**firstSkill**) and spreads six personas into the registry via `Sec.SEC_AGENTS.map(...)` at agent.ts:277-286, calling `a.withPrompt(ctx.directory)` to bake an `<execution_context>` preamble (sec.ts:389-423) that names working dir, deliverable path, first skill, allowed skills, SEC-RESULT contract. GSD does the identical thing (`gsd.ts:479-543`). This baking is what stops personas free-styling.

### UI surfaces

| Surface | Filter | File:line |
|---|---|---|
| Agents dialog / cycle | `mode !== "subagent" && !hidden` → sec-test/business/compose appear; personas don't | tui/src/context/local.tsx:74 |
| `@` autocomplete | `!hidden && mode !== "primary"` → only subagents (sec-* personas, general, explore) | tui/src/component/prompt/autocomplete.tsx:391-393 |
| Slash/palette commands | EVERY registered skill auto-becomes a command (`source:"skill"`, template=content) → `/scrape`, `/scrape:brief` free once registered | src/command/index.ts:164-175 |
| Skills dialog | `sdk.client.app.skills()` returns ALL skills unfiltered (handlers instance.ts:84-86); TUI workflow-filters only | tui/src/component/dialog-skill.tsx:18-21; server route groups/instance.ts:159-168 |
| Default-first primary | `defaultInfo()` prefers `sec-test` (agent.ts:444-450); list() sorts sec-test→compose→alpha (agent.ts:426-431). New "scrape" slots alphabetically; default unchanged |

Legacy conflict: a hardcoded `/scraper` palette command exists (tui/src/app.tsx:916-924) that rewrites input to "Use web-scraping skill for: …" (tui/src/component/prompt/index.tsx:981-988). Should be removed or re-pointed when the real `/scrape` lands.

## 2. Skill suite mechanics

- **Import-as-text**: `import X from "./scrape/<n>/SKILL.md" with { type: "text" }` (business-skills.ts:1-10, compose-skills.ts:1-16).
- **Module shape**: descriptor array `{ name, description, content }` + exported `*_SKILL_NAMES = new Set(names)` (+ optional registry-backed `is*Skill` — see sec-test-skills.ts:192-202 for why prefix-checks are insufficient).
- **Registration**: loop in `skill/index.ts` state init — compose at :355-362, sec-test at :363-371, business at :372-380, standalone at :381-389; location tag `<built-in:<suite>:<name>>`. Builtins register BEFORE disk discovery so user-disk skills override (index.ts:346-353).
- **Frontmatter conventions**: frontmatter `name` MUST equal descriptor name (registry test asserts `s.content` contains `name: ${s.name}`, test/agent/sec-test-registry.test.ts:343-345). Umbrellas are `name: <suite>` + `hidden: true`; all sec-test:* carry `hidden: true`; business:* sub-skills do NOT. **The `hidden` frontmatter flag is inert server-side** — `isSkillFrontmatter` reads only name/description (index.ts:60-66); no code parses skill hiddenness.
- **Visibility consequence**: only `compose:*` is filtered from non-compose agents' system-prompt `available_skills` by NAME (session/system.ts:119-120); everything else is permission-gated and defaults allow (`"*":"allow"` in defaults). So scrape:* skills will appear in every primary agent's skill list unless you add a compose-style name filter or deny rules.
- **Loading**: `skill` tool injects content + sibling-file listing (src/tool/skill.ts:35-61); helper scripts colocated with SKILL.md are auto-listed.

## 3. Task dispatch mechanics (swarm feasibility: YES)

`TaskTool` (src/tool/task.ts):
- Params: `description`, `prompt`, `subagent_type`, optional `task_id` (resume same child session), optional `background` (:56-62, gated by `CODO_EXPERIMENTAL_BACKGROUND_SUBAGENTS`, :98-102).
- Permission ask on `("task", [subagent_type])` against orchestrator+session merged ruleset (:104-114) — hence sec-test's `task:"allow"`.
- Child session created with `deriveSubagentSessionPermission` (src/agent/subagent-permissions.ts:14-27): parent session's deny + external_directory rules carried over; child's OWN ruleset governs capabilities; todowrite/task auto-denied unless the child grants them.
- Foreground result = child's last text part (:199, renderOutput wraps `<task_result>`). Parallel foreground dispatches are proven (sec-test.txt:15 lets architect+appsec+devsecops run concurrently; different sessions run concurrently per V2 Session Core notes).
- Result contract precedent: SEC-RESULT single machine-parsable line (sec-test.txt:68-85), parsed by src/security/result.ts (gated on SEC_TEST_SKILL_NAMES membership).

Scrape reuse: the drafted scrape.txt swarm paragraph (:36-38) maps 1:1 onto this mechanism — one `task` call per topic carrying schema contract, seeds, ladder, politeness caps, checkpoint path. Checkpoint JSONL files make results crash-durable even if the child dies mid-run.

## 4. Capability probe precedent

`packages/codo/src/security/tool-presence.ts`:
- Probes via **async `Bun.spawn([tool,"--version"])` with 5s kill timer + try/catch → unavailable** (:14-30). Comment :16-18 records the bug: spawnSync probing missing tools on Windows blocked the thread seconds per tool, starving every timer.
- Fire-and-forget once-per-process snapshot (`primeToolPresence` :65-73); `toolchainLine(persona)` returns undefined while cold (:81-88) so preambles degrade gracefully.
- Mapping gate: `PERSONA_TOOLS` (:50-53) decides who gets the line; consumed by secExecutionContext (sec.ts:395,409).
- EPERM note: probing a locked/in-use binary throws synchronously inside spawn setup — the blanket catch converts it to `available:false`; keep that catch-all, never let a probe throw into the preamble builder.

Scrape equivalent: extend the TOOLS list or add a parallel module probing `node --version`, `python --version`, `npx playwright --version` (longer timeout — npx may resolve packages), wire as `toolchain:` line in a scrape execution-context builder. Same constraints: async, timeout-capped, fire-and-forget priming, undefined-until-settled.

## 5. File-output workspace conventions

- `.planning/` is git-TRACKED at this repo's root (codebase map committed, e9c510c et al.). Planning docs are meant to be committed.
- `.codo/` is NOT gitignored anywhere; repo root has no `.codo/` yet. Precedents: `.codo/security-scope.json` (pentest scope gate, docs/sec-test/03-IMPLEMENTATION.md §3.5), `.codo/security-baseline.json` (suppressions), `.codo/plans/*.md` (plan-agent edit allowlist, agent.ts:201), `.codo/gsd/*` read whitelist (agent.ts:120).
- So `.codo/scrape/<run-id>/{manifest.json,<topic>.jsonl}` follows the established runtime-artifact slot. Recommendation: add `.codo/scrape/` to root `.gitignore` — checkpoints are transient machine data, unlike `.planning/` prose.
- Edit-permission glob gotcha (sec.ts:15-41): use single-star patterns (`.codo/scrape/*`) — one star crosses separators under `Wildcard.match`; the old globstar form silently denied top-level writes. Forward slashes in literal patterns; `path.join` bakes platform separators.

## 6. Integration blueprint (exact changes)

### Create
1. `packages/codo/src/skill/scrape/{static-fetch,browser-render,api-discovery,auth-session,politeness,checkpoints,deliver}/SKILL.md` — umbrella already promises these names (scrape/scrape/SKILL.md:16-22). Frontmatter: `name: scrape:<slug>`, description, `hidden: true` to match suite style.
2. `packages/codo/src/skill/scrape-skills.ts` — mirror business-skills.ts: text imports, `scrapeSkills: ScrapeSkill[]`, `SCRAPE_SKILL_NAMES`, optional `isScrapeSkill` (registry-membership form).
3. Optional: `packages/codo/src/agent/scrape-topic-personas.ts` OR extend sec-style spec module — one generic topic persona (see §7).
4. Probe extension in `packages/codo/src/security/tool-presence.ts` (or sibling `src/scrape/tool-presence.ts`): node/python/playwright probes, async-only.
5. `packages/codo/test/agent/scrape-registry.test.ts` — mirror sec-test-registry.test.ts: registration presence, mode/native, firstSkill reachable, own-count assertions (`toHaveLength(<N>)` scoped to the scrape array only), frontmatter-name match, permission can() checks for `.codo/scrape/*` edits and rung bash/webfetch grants.

### Modify
6. `packages/codo/src/skill/index.ts` — import `scrapeSkills` (~line 42) + registration loop after business block (~line 380): location `<built-in:scrape:${ss.name}>`.
7. `packages/codo/src/agent/agent.ts` — `import PROMPT_SCRAPE from "./prompt/scrape.txt"` (~line 16) + entry after `business` (~line 270):

```ts
scrape: {
  name: "scrape",
  color: "#4d9e6a", // pick unused hex
  description: "Web-extraction orchestrator. Plans runs (scrape:brief), dispatches a parallel topic-subagent swarm, climbs the escalation ladder, checkpoints to .codo/scrape/<run-id>/, delivers Excel via business:xlsx-official.",
  options: {},
  permission: Permission.merge(
    defaults,
    Permission.fromConfig({
      question: "allow",
      skill: "allow",
      task: "allow",          // REQUIRED for the swarm
    }),
    user,
  ),
  prompt: PROMPT_SCRAPE,
  mode: "primary",
  native: true,
},
```

If topic subagents go the spec-module route, spread them like Sec.SEC_AGENTS (agent.ts:277-286) with `withPrompt(ctx.directory)` baking run-dir + checkpoint-path + first-skill context.

8. Root `.gitignore` — add `.codo/scrape/`.
9. TUI cleanup (optional but recommended): retire/re-point the legacy `/scraper` command (tui/src/app.tsx:916-924; prompt/index.tsx:981-988) now that `/scrape` becomes real via Command-service skill mapping.

No SDK regeneration needed: `app.skills`/`app.agents` routes already exist (server/routes/instance/httpapi/groups/instance.ts:149-168).

### Risks
- **Test count assertions break ONLY their own arrays**: secTestSkills `toHaveLength(30)`/`toBe(30)` (test/agent/sec-test-registry.test.ts:335-336) and GSD `===33` (test/agent/gsd-agents.test.ts:38) are untouched by scrape additions. Bump them only if you touch those suites (docs/sec-test/03-IMPLEMENTATION.md §6.1 documents the recipe). No total-agent-count or total-builtin-count assertions exist elsewhere (verified across test/).
- **spawnSync regression hazard**: any new availability probe MUST be async Bun.spawn + timeout + catch-all (tool-presence.ts:16-30 is the canonical warning; EPERM on locked binaries must surface as available:false).
- **Wildcard single-star semantics** for edit allows (sec.ts:15-41).
- **Invisible-hidden assumption**: `hidden: true` frontmatter does nothing server-side; scrape:* skills will appear in Skills dialog and other agents' available_skills. Either accept (business precedent) or add a compose-style name filter in session/system.ts:119-120.
- **Duplicate/shadow naming**: disk skill named `scrape` overrides the builtin umbrella with only a log warning (index.ts:132-138, 346-353).
- **Same-domain politeness serialization** (scrape:brief §5) is prompt-level discipline only — no runtime queue enforces it; accepted limitation.
- **Windows Agent.list flake** documented in docs/sec-test/03-IMPLEMENTATION.md §7 predates sec-test; expect occasional noise in registry tests under load.

## 7. Architectural recommendation

Use **full `task` subagents** for topics (sec-test pattern), not skill-guided inline work (business pattern):
- The drafted prompt already commits to a parallel swarm with per-topic checkpoints; inline work cannot honor "a killed machine never loses collected data" across topics.
- Register ONE generic topic persona (e.g. `scrape-topic`) via a spec-module map granting ALL rung skills (`scrape:static-fetch/-browser-render/-api-discovery/-auth-session/-politeness/-checkpoints`) plus webfetch/bash-for-node-python/playwright and edit-allow on `.codo/scrape/*`. Rung selection stays dynamic in-prompt (the ladder), unlike sec personas whose phase pins their skill — so per-rung personas would over-engineer.
- Bake an `<execution_context>` naming: working dir, checkpoint file path convention, firstSkill (`scrape:brief` for the planner step; the persona prompt carries the ladder), toolchain line, and a `## SCRAPE-RESULT` terminal-line contract mirroring SEC-RESULT (status=complete/blocked/partial + counts + checkpoint path) so the orchestrator parses instead of trusting prose.
- Orchestrator keeps `task:"allow"`, asks the two consent questions up-front (scrape.txt:11-13), merges/dedupes/QAs checkpoints itself, then loads `business:xlsx-official` for the workbook (one sheet per topic + Sources sheet) exactly as business.txt's chain pattern prescribes.
- Foreground parallel task calls are sufficient; background mode stays off unless CODO_EXPERIMENTAL_BACKGROUND_SUBAGENTS is enabled.
