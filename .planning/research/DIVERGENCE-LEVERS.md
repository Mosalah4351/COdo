# Fork-Divergence Recon — COdo vs opencode perception levers

Fresh reconnaissance only. No code changed. `not-a-fork-roadmap.md` deliberately not read.

## 1. Major subsystems mapped

| # | Subsystem | Where | Identity vs plumbing |
|---|-----------|-------|----------------------|
| 1 | Session core + durability engine | `packages/codo/src/session/` (~22 files: session, execution-with-status, run-state, processor, message/message-v2, compaction, prompt, retry, revert, overflow, reminders, goal, summary, status, todo, tools, system, instruction, llm/) + `packages/core` Drizzle/SQLite schema + `SessionRunner`, `SessionExecution`, EventV2 replay | Invisible plumbing. Defines reliability, not identity. |
| 2 | Provider / LLM layer | `packages/llm/` (Effect Schema-first: `schema/`, `route/` protocol+endpoint+auth+framing, `protocols/` openai-chat/responses/anthropic-messages/gemini/bedrock-converse, `providers/` facades) + `packages/codo/src/session/llm/` orchestration (AI-SDK default path + native route runtime) + `packages/codo/src/provider/provider.ts` | Invisible plumbing — except wire/config fork-tells (see §3). |
| 3 | Agent prompts + personas | `packages/codo/src/agent/` (`agent.ts` ~610 lines, `sec.ts` ~445 lines, `gsd.ts`) + `packages/codo/src/agent/prompt/*.txt` (~48 files: `compose.txt`, `sec-test.txt`, 6× `sec-*.txt`, `business/explore/compaction/summary/title/scrape/generate`, ~35× `gsd-*.txt`) | **Core identity.** The voice users hear. `sec-*` + `compose` already diverged; generic prompts likely still opencode-flavored. |
| 4 | Tool registry | `packages/codo/src/tool/*.ts` (~25: read/edit/write/shell/grep/glob/lsp/todo/question/skill/workflow/plan/task + `sec_finding`/`sec_probe`) | Half-identity: mechanics are plumbing, but names/descriptions/help are daily-touch surface. |
| 5 | TUI | `packages/tui/` (SolidJS + OpenTUI; `app.tsx`, `logo.ts` already COdo violet `#9400e4`/green `#00FF66`, keymap, dialogs, toasts, spinners) | **Core identity.** First thing every user sees. Logo done; layout/flows still opencode-shaped. |
| 6 | Web workbench + desktop | `packages/app/` (SolidJS + Vite + Tailwind; `codo web`) + `packages/desktop/` (Electron shell over app) | Visible identity (GUI face), medium cost to reskin. |
| 7 | CLI command surface | `packages/codo/src/cli/cmd/*.ts` (~25: tui/serve/run/session/mcp/agent/models/providers/web/acp/attach/browser/export/github/plug/account/upgrade/uninstall…) | **Core identity.** Command vocabulary + `/help` text is how users describe the product. Binary already `codo`. |
| 8 | Install / packaging / infra | `install` (`APP=codo`, `REPO=Mosalah4351/COdo`, `codo.run`), npm `codo-ai` native binary, `electron-builder`, `sst`, `turbo` | Already mostly diverged; residue is dependency names + metadata. |
| 9 | Config/state paths + runtime tags | `.codo` primary with `.opencode` read-only fallback (`config/paths.ts`, `config/config.ts`, `config/tui.ts`), `Flag.CODO_CONFIG_DIR`, `.gsd-runtime` file, `GSD_RUNTIME`, `initSpecKit()`, `zen` gateway UA/headers | Hidden fork-tells. Contributors, dotfiles, and packet sniffers see them. |
| 10 | Plugin / SDK / server | `packages/plugin/`, `packages/server/`, generated JS SDK (OpenAPI spec-first), `packages/ui/`, `packages/session-ui/` | Plumbing. Keep shared. |

README is already repositioned (security-native agent, six `@sec-test` personas, findings store, scope gate, `compose` orchestrator). That positioning is an asset — the levers below make the product feel like it.

## 2. Per-subsystem: what breaks "fork" perception vs what can stay

- **Session core — keep.** Rewrite = maximum risk, near-zero perception. Nobody identifies a product by its inbox-drain semantics. Preserve `SessionV2.prompt`, `SessionExecution`, runner, compaction, EventV2 replay verbatim.
- **Provider/LLM matrix — keep mechanics, rename tells.** The 4-axis route decomposition (protocol/endpoint/auth/framing) and AI-SDK compat path are pure plumbing wins. What must change is only the opencode-branded surface on the wire: `ZEN_USER_AGENT = opencode/1.18.32`, `x-opencode-project/session/request/client` headers, `providerID.startsWith("opencode")` branches, `opencode` Zen-gating comment. Rename (cheap string-level change), do not re-architect.
- **Agent prompts — rewrite, don''t rename.** Prompts are the product voice. `sec-*`/`compose` are already COdo-owned — protect and extend. The generic set (`compaction`, `summary`, `title`, `explore`, `business`, `generate`) plus the ~35 `gsd-*` workflow prompts are where "this feels like opencode" leaks through in long sessions. Rewrite voice + defaults (default agent lineup led by `compose`/`@sec-test`), keep schema/shape.
- **Tools — rename/describe, keep mechanics.** Execution semantics stay; user-facing tool names, descriptions, and permission-copy get COdo voice. `sec_finding`/`sec_probe` stay as differentiators.
- **TUI — redesign, don''t replace.** OpenTUI+SolidJS stack stays. What changes: theme/tokens, first-run/onboarding, `/help`, command palette ordering, empty states, keybind cheatsheet, status/footer. Layout-pattern changes read as "different product"; a widget swap does not.
- **Web/desktop — reskin, don''t rebuild.** App shell, router, and Electron IPC stay. Landing, settings, empty states, titles, icons, and the `codo web` proxy landing get COdo-first design.
- **CLI — rename/rescope, keep engine.** Subcommand names, help text, examples, and flags are cheap and high-visibility. Command implementations stay.
- **Install/packaging — rename residue.** Binary/repo/domain already diverged. Remaining: `opencode-gitlab-auth` / `opencode-poe-auth` imports (`plugin/index.ts`), `http-recorder/package.json` repo/homepage/bugs URLs pointing at `anomalyco/opencode`, console sitemap generator referencing `opencode/script/schema.ts`. Fork-rename or vendor; keep build mechanics.
- **Config/runtime tags — stop writing opencode, keep reading it.** Keep `.opencode` fallback reads (migration kindness), but never create/write opencode paths or values again: `.gsd-runtime` content (`tui/workflow/gsd.ts`, `skill/gsd-local.ts` write `"opencode"`), `GSD_RUNTIME="opencode"`, `initSpecKit("opencode")` (`tui/app.tsx`), `@$HOME/.config/opencode/` rewrite rules that still mention opencode. Small diffs, outsized contributor perception.
- **Plugin/SDK/server/infra — keep.** Typed plugin API, spec-first SDK generation, turbo/sst build graph: nobody attributes these to a fork.

## 3. Prioritized divergence levers (perception impact per effort)

| Rank | Lever | Change kind | Effort | Perception | Why this rank |
|------|-------|-------------|--------|------------|---------------|
| 1 | TUI first-run experience: theme, landing, onboarding, `/help`, palette order, empty states | Redesign | M | Highest | Every user''s first 60 seconds. Logo is done; flows are not. |
| 2 | Generic agent-prompt voice rewrite (`compaction/summary/title/explore/business/generate` + `compose` tone) + default lineup (`compose` + `@sec-test` heroic) | Rewrite | S–M | Highest | The voice users spend hours with; generic prompts are the long-session leak. |
| 3 | CLI vocabulary + help reskin (`codo` verbs, `codo sec report`, examples, flags) | Rename | S | High | How users describe and demo the product. |
| 4 | Wire/config fork-tell scrub (`ZEN_USER_AGENT`, `x-opencode-*` headers, `opencode` providerID branches, `.gsd-runtime`/`GSD_RUNTIME`/`initSpecKit` values, write-paths to `.opencode`) | Rename | S | Med–High | Anyone sniffing traffic, reading dotfiles, or onboarding contributors spots a fork here instantly. Keep read-fallbacks. |
| 5 | Web workbench landing + desktop shell branding | Redesign | M | Med–High | The GUI face; cheap relative to a rebuild. |
| 6 | Dependency-identity residue (`opencode-gitlab-auth`, `opencode-poe-auth`, `http-recorder` URLs, console schema-script ref) | Replace/rename | S–M | Medium | Supply-chain and `node_modules` perception; also removes confusion in lockfiles. |
| 7 | Docs/site surface (console/app docs, `codo dev web` proxy target copy, sitemap/schema refs) | Rename | S | Medium | README already diverged — finish the second layer users actually open. |

Explicitly out of scope (keep shared, nobody cares): session durability semantics, LLM protocol matrix, tool execution mechanics, SQLite/Drizzle engine, SDK generation pipeline, turbo/sst/electron-builder mechanics, Effect v4 service patterns.

## 4. Smallest set that makes a new user never think "opencode"

1. TUI first-run redesign (lever 1) — kills it in the first minute.
2. Generic prompt voice + default lineup (lever 2) — kills it over the first hour.
3. CLI help/vocabulary (lever 3) + fork-tell scrub (lever 4) — kills it for evaluators who poke (`--help`, dotfiles, network tab).

Those four are the minimum deep-change set. Levers 5–7 finish the job for GUI users, contributors, and docs readers.
