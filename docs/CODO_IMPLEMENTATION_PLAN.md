# COdo — Full Implementation Plan

> fork of the OpenCode project · TypeScript/Bun monorepo · ~5 weeks (features) + ~2 weeks (web app)

## Architecture Reference

Before building, understand the actual codebase layout (not the opencode layout):

```
codo
├── packages/codo/                  ← CLI entry point (yargs-based)
│   └── src/
│       ├── index.ts                ← CLI commands registered here
│       ├── cli/cmd/                ← CLI command handlers
│       └── session/llm/            ← LLM execution orchestration
├── packages/core/                  ← Shared core library (Effect-based)
│   └── src/
│       ├── tool/registry.ts        ← Tool dispatch (NOT a switch/case)
│       ├── tool/tool.ts            ← Tool.make() with Effect execution
│       ├── session/                ← SessionV2, store, messages, events
│       ├── config.ts               ← Config.Info (Effect Schema class)
│       ├── provider.ts             ← Provider resolution
│       ├── skill/                  ← Skill discovery & guidance
│       └── permission/             ← PermissionV2 rulesets
├── packages/llm/                   ← Effect Schema-first LLM abstraction
├── packages/tui/                   ← OpenTUI + Solid.js terminal UI
│   └── src/theme/                  ← 34 themes already exist
├── packages/app/                   ← Web UI (broken — needs audit)
├── packages/server/                ← Hono HTTP API
├── packages/desktop/               ← Electron scaffold (opencode template, not working)
├── packages/ui/                    ← Shared UI components
├── packages/plugin/                ← Plugin API
└── packages/sdk/                   ← Generated OpenAPI client
```

### Key Architectural Patterns

- **Effect TypeScript 4.0** — all services use `Effect.gen`, `Layer`, `Schema`, `Context.Service`
- **Tool dispatch** — `ToolRegistry.Service` + `settleWith()`, not a switch/case. To intercept tools, wrap the Effect Layer
- **Session state** — event-sourced via `EventV2`, materialized through projectors. Not raw SQLite reads
- **Config** — `Config.Info` is an Effect Schema class in `packages/core/src/config.ts`. Extend this, not a JSON file
- **Skills** — `SkillV2.Info` with `DirectorySource`/`UrlSource`/`EmbeddedSource`. Not just `SKILL.md` files
- **No GSD files** — `.planning/STATE.md` doesn't exist. Features must use COdo's own session/project data
- **Typecheck after every task** — `bun typecheck` from package directory. Effect type errors are frequent

---

## Phase 1 — Quick Wins (Week 1)

### 1. `codo doctor` — Setup Diagnostics · 🟢 ~3.5h

**What it is**
A new CLI subcommand that runs async checks on the user's environment and prints ✓/✗ for each one. Exits code 1 on failure.

**Where it lives**
```
packages/codo/src/cli/cmd/doctor.ts     ← new file
packages/codo/src/index.ts              ← register command via yargs
```

**Hook point**
Standalone CLI command. No Effect services needed. Pure shell checks using `Bun.$()`.

**Checks to implement**
- Bun version (≥ 1.3)
- API key present (check configured providers)
- Git installed
- Docker running (important for cross-compilation)
- Skills directory exists
- Config file loads without error

**Done when**
`codo doctor` in a misconfigured env exits 1 with red ✗ and hints. Healthy env prints all ✓ and exits 0. Typecheck passes.

---

### 2. `/commit` Skill — Smart Git Commits · 🟢 ~1.5h

**What it is**
A skill that reads `git diff --staged`, sends it to the LLM, generates a conventional commit message, and asks for confirmation.

**Where it lives**
```
packages/core/src/skill/builtins/commit.ts    ← new built-in skill using SkillV2.EmbeddedSource
```

**Hook point**
Add to built-in skills via `SkillV2.EmbeddedSource`. No agent loop changes.

**Done when**
`/commit` with staged changes produces a conventional commit, confirms, and commits on Y. Empty staged diff shows clear error. Typecheck passes.

---

### 3. `/notify` Skill — Task Completion Alert · 🟢 ~1.5h

**What it is**
Fires a native OS notification when the agent finishes a long task. Supports macOS (`osascript`), Linux (`notify-send`), Windows (PowerShell toast). Falls back to terminal bell.

**Where it lives**
```
packages/core/src/skill/builtins/notify.ts    ← new built-in skill
```

**Hook point**
Same as `/commit` — add to built-in skills.

**Done when**
`/notify` fires a native notification on current OS. Terminal bell fires as fallback. Typecheck passes.

---

### 4. `/usage` Skill — Token & Cost Dashboard · 🟢 ~2.5h

**What it is**
Reads `SessionTable` (already has `tokens_input`, `tokens_output`, `cost` columns) and displays token counts plus estimated cost.

**Where it lives**
```
packages/core/src/skill/builtins/usage.ts     ← new built-in skill
```

**Hook point**
Pure SQL query via Effect-managed Drizzle ORM. No schema changes — data is already tracked.

**Done when**
`/usage today` shows token table. `/usage week` shows day-by-day. Typecheck passes.

---

### 5. `/memory` Skill — Persistent Project Memory · 🟢 ~2.5h

**What it is**
Persistent project memory stored in `.codo/memory.md`. Agent can add, list, clear. Auto-loaded into system prompt at session start via the system context system.

**Where it lives**
```
packages/core/src/skill/builtins/memory.ts               ← skill definition
packages/core/src/system-context/builtins/memory.ts       ← system context provider for auto-load
```

**Hook point**
Skill is a built-in. Auto-load uses the existing System Context algebra (`packages/core/src/system-context/`). Append memory to the context epoch at session start.

**Done when**
`/memory add "x"` writes to `.codo/memory.md`. New sessions auto-load memory into system prompt. Typecheck passes.

---

### 6. Web App Audit · 🟡 ~1 day

**What it is**
Diagnose why `packages/app/` doesn't work before committing to a timeline.

**Where it lives**
```
packages/app/    ← audit only, no fixes yet
```

**Checklist**
- Does `bun install` from `packages/app/` succeed?
- Does `bun dev` start without errors? (Vite/Solid.js)
- What's the actual error? Compile? Runtime? Dependency? Config?
- Does it connect to the backend server? What port/endpoint?
- Do the test suites pass? (`bun test`, Playwright)
- Is the module graph correct? (`@codo-ai/core`, `@codo-ai/sdk`, `@codo-ai/ui` deps)
- Are there TypeScript errors? (`bun typecheck` from package dir)

**Done when**
A written audit report with specific findings, estimated fix effort, and a go/no-go recommendation.

---

## Phase 2 — Differentiation (Weeks 2–3)

### 7. COdo REVIVE — Project Re-Immersion · 🟡 ~3.5 days

**What it is**
On `codo` startup after ≥1 day away, prints a structured 10-second briefing: what you were building, last decision, what's incomplete, next step. Unique feature — no other AI coding tool does this.

**Where it lives**
```
packages/core/src/session/revive.ts                    ← new Effect service
packages/codo/src/cli/cmd/revive.ts                    ← CLI wrapper
packages/codo/src/index.ts                             ← call before TUI launch
```

**Hook point**
Reads `SessionTable` via `SessionV2` Effect service. Composes LLM call using existing Effect-based provider system. Hooks into startup flow in `packages/codo/src/index.ts` before TUI initialization.

**Implementation**
1. Create `Revive.Service` — Effect service that reads last session, git history, project state
2. Compose structured LLM prompt from session data (not GSD files)
3. Integrate into startup flow — runs before TUI, prints briefing
4. Handle resume prompt (interactive prompt in Effect context)
5. Config: `revive_threshold_days` extends `Config.Info` schema
6. Tests: state reading from mock session, prompt generation

**Done when**
After ≥1 day away, briefing prints before TUI. Same day skips. Fresh `n` starts clean session. Typecheck + unit tests pass.

---

### 8. COdo TRACE — Session Archaeology · 🟡 ~2.5 days

**What it is**
At session end, sends the transcript to the LLM to extract: decisions, alternatives rejected, weak points, breaking dependencies. Writes to `.codo/traces/[date]-[task].md`. Searchable with `codo trace search`.

**Where it lives**
```
packages/core/src/session/trace.ts                 ← new Effect service
packages/codo/src/cli/cmd/trace.ts                 ← trace search CLI command
packages/codo/src/index.ts                         ← register trace command
```

**Hook point**
Hook into session close in `packages/core/src/session/` (Effect-managed via EventV2 or direct session-end handler). Reads `MessageTable` + `PartTable` for full transcript.

**Implementation**
1. Create `Trace.Service` — subscribes to session-end events
2. Read full transcript from `MessageTable` + `PartTable`
3. Compose structured extraction prompt via Effect LLM call
4. Write `.codo/traces/[date]-[task].md`
5. CLI command: `codo trace search <keyword>`
6. Tests: trace generation from mock session, search correctness

**Done when**
Session end produces `.codo/traces/` file with structured content. `codo trace search` returns relevant snippets. Typecheck + tests pass.

---

### 9. Custom Modes (`/mode`) · 🔴 ~3.5-4.5 days

**What it is**
Named configuration presets combining a system prompt, tool permission set, and behavioral constraints. Switchable mid-session. Ships with `architect` (planning only), `debug` (read-heavy), `review` (read-only, strict).

**Where it lives**
```
packages/core/src/mode/                             ← new module
├── schema.ts                                       ← ModeV2 Effect Schema
├── service.ts                                      ← ModeService
├── builtins/                                       ← built-in mode definitions
packages/core/src/config.ts                         ← extend Config.Info
packages/core/src/tool/registry.ts                  ← tool dispatch check
packages/core/src/skill/builtins/mode.ts            ← /mode skill
```

**Hook point**
Requires new `ModeV2` concept — meta-layer on top of `AgentV2` + `PermissionV2`. Mode definitions extend `Config.Info` schema. Tool dispatch checks active mode before settlement.

**Implementation**
1. Define `ModeV2.ModeInfo` — Effect Schema: name, description, system prompt override, allowed/blocked tool patterns, model override
2. Extend `Config.Info` with `modes: Record<string, ModeInfo>` + `active_mode: string`
3. Built-in modes: `architect`, `debug`, `review` as embedded definitions
4. Hook into `ToolRegistry.Materialization.settle` — before tool execution, check if active mode allows the tool
5. Permission integration via `PermissionV2.Ruleset` (not flat `blocked_tools` list)
6. `/mode` skill for mid-session switching
7. Tests: mode activation, permission enforcement, mode switching

**Done when**
`/mode architect` blocks all `write_file` calls. `/mode review` enables read-only mode. Custom mode files work. Typecheck + tests pass.

---

## Phase 3 — Power Features (Weeks 4–5)

### 10. COdo PULSE — Real-Time Scope Guardian · 🔴 ~5-6 days

**What it is**
The most architecturally complex feature. Runs INSIDE the agent loop and intercepts every file-modifying tool call BEFORE it executes. Checks the target against the active session's task scope. If out of scope, pauses and prompts.

**Where it lives**
```
packages/core/src/tool/pulse.ts                     ← new Effect Layer
packages/core/src/tool/registry.ts                  ← add Pulse layer to ToolRegistry
packages/core/src/config.ts                         ← extend Config.Info with pulse.mode
packages/core/src/skill/builtins/pulse.ts           ← /pulse config skill
```

**Hook point**
Creates an Effect Layer that wraps `ToolRegistry.Materialization.settle`. The interception must happen BEFORE tool execution in the Effect pipeline, not after.

**Implementation**
1. Understand the full service graph: `ApplicationTools.Service`, `ToolRegistry.Service`, `ToolRegistry.Materialization`, `SessionRunner`
2. Create `Pulse.Service` — Effect Layer that wraps the tool settlement pipeline
3. Pre-execution check: before `settleWith` runs, check if target file is in scope
4. Scope detection: parse active task from session metadata (not GSD files — they don't exist)
5. Three modes:
   - `warn` — log warning, allow execution
   - `block` — prompt user: Allow once / Allow session / Block
   - `off` — passthrough
6. Extend `Config.Info` with `pulse: { mode: "warn" | "block" | "off" }`
7. Integration test: verify tool call interception without breaking existing tool execution
8. Typecheck after every Effect layer change

**Done when**
Agent modifying a file outside task scope triggers PULSE alert in `block` mode. `warn` mode logs and continues. `off` mode is a no-op. Integration tests pass. Typecheck passes.

---

### 11. Git Branch-Aware Sessions · 🟡 ~1.5 days

**What it is**
Session list filtered to current git branch by default. Each session tagged with the branch it was created on. Good for multi-branch power users.

**Where it lives**
```
packages/core/src/session/sql.ts          ← DB migration: add git_branch column
packages/core/src/session/store.ts        ← branch-filtered query
packages/tui/src/routes/session-list.tsx  ← branch filter toggle UI
```

**Hook point**
DB migration on `SessionTable` (add `git_branch` column via Drizzle schema). TUI filter uses existing route component.

**Implementation**
1. Add `git_branch` column to session schema
2. Add branch detection at session creation (via `git rev-parse --abbrev-ref HEAD`)
3. Add filter query to `SessionStore`
4. TUI toggle (keyboard shortcut) to show all/current-branch sessions
5. Tests: sessions created on different branches filter correctly

**Done when**
Switching branches shows only relevant sessions by default. Toggle shows all. Typecheck + tests pass.

---

### 12. Ollama Setup Wizard · 🟢 ~4.5h

**What it is**
`codo setup-local` command that detects Ollama, lists available models, recommends by use case, and writes provider config automatically.

**Where it lives**
```
packages/codo/src/cli/cmd/setup-local.ts     ← new file
packages/codo/src/index.ts                   ← register command
```

**Hook point**
Standalone CLI command. Uses existing provider config schema. Writes to the Effect-based `Config.Info` (not a JSON file directly — use config update Effect).

**Implementation**
1. Check Ollama is running at `http://localhost:11434`
2. List installed models
3. Recommend models by use case (coding, fast, balanced, planning)
4. User selects model -> update config with provider settings
5. Auto-set context window based on model

**Done when**
`codo setup-local` with Ollama running configures provider. Without Ollama, shows clear error. Typecheck passes.

---

### 13. Community Skill Hub · 🟡 ~2.5 days

**What it is**
A public GitHub repo (`github.com/Mosalah4351/codo-skills`) as a community marketplace for skills. Users install skills with `codo skill install [name]`.

**Where it lives**
```
packages/codo/src/cli/cmd/skill.ts          ← CLI commands: install, search, list
packages/codo/src/index.ts                  ← register commands
```
And externally: `github.com/Mosalah4351/codo-skills` repo with `registry.json` + skill directories.

**Hook point**
Uses existing `SkillV2.UrlSource` for remote skill loading. CLI commands wrap the skill discovery system.

**Implementation**
1. Create external `codo-skills` repo with `registry.json` index
2. CLI: `codo skill search`, `codo skill install <name>`, `codo skill list`
3. Install downloads to `.codo/skills/<name>/SKILL.md`
4. Skills are immediately discoverable via `SkillDiscovery`

**Done when**
`codo skill search` fetches registry. `codo skill install commit` downloads and activates. Typecheck passes.

---

## Phase 4 — Website & Docs (Week 6)

### 14. Website Updates · 🟢 ~0.5 day

**What it is**
Update the marketing website (`packages/web/`) with COdo-specific content.

**Tasks**
- Add REVIVE + PULSE + TRACE hero section
- Update FAQ — "How is COdo different from Claude Code?"
- Fix any broken references to opencode.ai

**Done when**
Website reflects COdo features. FAQ distinguishes COdo from Claude Code.

### 15. Documentation Audit · 🟢 ~0.5 day

**What it is**
Fix remaining references to opencode.ai and old package names across docs and configs.

**Where**
- `packages/web/` — website copy
- `packages/desktop/package.json` — homepage, author fields
- `README.md` (if exists) — branding
- `docs/` — any remaining docs

**Done when**
No references to `opencode.ai`, `@opencode-ai/*`, or `packages/opencode/` remain.

---

## Build Order — Week by Week

### Week 1 — Quick Wins

| Day | Morning | Afternoon |
|-----|---------|-----------|
| Mon | `codo doctor` (3.5h) | `/commit` skill (1.5h) |
| Tue | `/notify` (1.5h) | `/usage` (2.5h) → `/memory` (2.5h) |
| Wed | **Web App Audit** — diagnose `packages/app/` |
| Thu-Fri | **Web App Fix** (start) — runs parallel with phase 2 |

### Week 2 — Differentiation

| Day | Task |
|-----|------|
| Mon-Wed | **REVIVE** (3.5 days with testing) |
| Thu-Fri | **TRACE** start (2.5 days) |

### Week 3 — TRACE + Modes

| Day | Task |
|-----|------|
| Mon | TRACE finish |
| Tue-Fri | **Custom Modes** (3.5-4.5 days with testing) |

### Week 4 — PULSE

| Day | Task |
|-----|------|
| Mon-Fri | **PULSE** (5-6 days — may spill into week 5) |

### Week 5 — PULSE Finish + Remaining

| Day | Task |
|-----|------|
| Mon-Tue | PULSE finish (if needed) |
| Wed | Branch sessions (1.5 days) |
| Thu | Ollama wizard (4.5h) |
| Fri | Skill Hub start |

### Week 6 — Skill Hub + Website + Docs

| Day | Task |
|-----|------|
| Mon-Tue | Skill Hub finish (2.5 days) |
| Wed | Website hero section + FAQ (0.5 day) |
| Thu | Doc audit (0.5 day) |
| Fri | Integration testing, polish, buffer |

### Parallel: Web App Workstream

| Day | Task |
|-----|------|
| Wed Wk1 | **Audit** — diagnose `packages/app/` scope |
| Thu Wk1 - Wk3 | **Fix** — timeline depends on audit findings |

---

## Summary Table

| Feature | Phase | Effort | Testing | Unique? |
|---------|-------|--------|---------|---------|
| `codo doctor` | 1 | 3h | 0.5h | No |
| `/commit` skill | 1 | 1h | 0.5h | No |
| `/notify` skill | 1 | 1h | 0.5h | No |
| `/usage` skill | 1 | 2h | 0.5h | No |
| `/memory` skill | 1 | 2h | 0.5h | No |
| Web App Audit | 1 | 1d | — | — |
| **REVIVE** | 2 | 3d | 0.5d | **Yes** |
| **TRACE** | 2 | 2d | 0.5d | **Yes** |
| Custom Modes | 3 | 3-4d | 0.5d | No |
| **PULSE** | 3 | 4-5d | 1d | **Yes** |
| Branch sessions | 3 | 1d | 0.5d | No |
| Ollama wizard | 3 | 4h | 0.5h | No |
| Skill Hub | 4 | 2d | 0.5d | No |
| Website updates | 4 | 4h | — | — |
| Doc audit | 4 | 4h | — | — |
| Web App Fix | ∥ | 1-2wk | incl. | — |

**Total features only: ~5 weeks**
**Total including web app: ~7 weeks**

---

## Key Risks

1. **PULSE is highest-risk** — intercepting the Effect tool registry requires deep understanding of the service graph. If the interception point isn't clean, could expand to 1-2 weeks.

2. **Custom Modes is architecturally complex** — `ModeV2` must layer on top of `AgentV2` + `PermissionV2` without duplicating either. Needs careful schema design.

3. **Web app scope is unknown** — "broken" could be config, dependency, or full rewrite. Audit day 1 before committing.

4. **Effect learning curve** — if implementer isn't fluent, features take 30-50% longer. PULSE and Custom Modes are especially Effect-heavy.

5. **Testing Effect code** — Effect services require specific patterns (provide layers, manage scopes). Factor into estimates.

6. **Typecheck overhead** — `bun typecheck` after every task. Effect errors are hard to debug. Budget time.

---

## What We're NOT Building (Yet)

- **TUI Themes** — already have 34 themes in `packages/tui/src/theme/`
- **Desktop App** — scaffold exists but blocked by web app. Deferred.
- **CLI Playground** — depends on working web app. Deferred.
- **Desktop Downloads page** — depends on working desktop. Deferred.
