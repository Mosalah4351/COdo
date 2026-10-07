# Graduation Project Proposal

## COdo: A Terminal-Native AI Coding Assistant with Structured Workflow Orchestration

---

**Presented by:**
- Mohamed Salah (247151)

**Department of Computer Science, MSA University**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Literature Review](#4-literature-review)
5. [System Architecture](#5-system-architecture)
6. [Technical Stack](#6-technical-stack)
7. [Core Features & Design](#7-core-features--design)
   - 7.1 [/workflow — The Orchestration Engine](#71-workflow--the-orchestration-engine)
   - 7.2 [/goal — Stop-Condition Goal System](#72-goal--stop-condition-goal-system)
   - 7.3 [/scraper — Intelligent Data Extraction](#73-scraper--intelligent-data-extraction)
   - 7.4 [/skills — Skill System](#74-skills--skill-system)
   - 7.5 [/compose — Multi-Agent Orchestration](#75-compose--multi-agent-orchestration)
   - 7.6 [All Slash Commands (Complete Reference)](#76-all-slash-commands-complete-reference)
   - 7.7 [Built-in Agents](#77-built-in-agents)
   - 7.8 [Built-in Tools](#78-built-in-tools)
   - 7.9 [Theme System](#79-theme-system)
   - 7.10 [Internationalization](#710-internationalization)
8. [Implementation Details](#8-implementation-details)
9. [Package Architecture](#9-package-architecture)
10. [AI Provider Integration](#10-ai-provider-integration)
11. [Workflow System Deep Dive](#11-workflow-system-deep-dive)
12. [Plugin System](#12-plugin-system)
13. [Session & State Management](#13-session--state-management)
14. [Configuration System](#14-configuration-system)
15. [LSP Integration](#15-lsp-integration)
16. [Testing & Quality Assurance](#16-testing--quality-assurance)
17. [Deployment & Infrastructure](#17-deployment--infrastructure)
18. [Results & Evaluation](#18-results--evaluation)
19. [Future Work](#19-future-work)
20. [References](#20-references)

---

## 1. Executive Summary

**COdo** is a terminal-native AI coding assistant built as an advanced fork of [OpenCode](https://github.com/anomalyco/opencode). It operates entirely within the command line (TUI — Terminal User Interface) and helps developers write code, debug issues, and ship projects through natural language conversations with AI models.

Unlike traditional AI coding tools that provide basic code completion, COdo introduces a **structured workflow orchestration layer** with four distinct workflow modes (GSD, GStack, Speckit, Vibemode), a modular skill system, a multi-agent architecture, and support for 20+ LLM providers — all running within a single terminal session.

The project is implemented as a **monorepo of 27+ TypeScript packages**, built on the **Bun** runtime, using **Effect-TS** for functional service composition, **Solid.js** for terminal and web rendering, and **SQLite** for local persistence. It is published as an open-source npm package (`@codo-ai/cli`) with a MIT license.

**Key Achievements:**

| Metric | Achieved |
|--------|----------|
| LLM Provider Integrations | 20+ (OpenAI, Anthropic, Google, NVIDIA, etc.) |
| Workflow Modes | 4 (GSD, GStack, Speckit, Vibemode) |
| Specialized Skills | 16+ (40+ in GSD alone) |
| Built-in Terminal Themes | 35+ |
| Internationalization Languages | 17 |
| LSP Language Support | 30+ |
| Built-in Tools | 13 |
| Plugin Lifecycle Hooks | 30+ |
| CLI Commands | 24+ |
| Total Packages | 27+ |

---

## 2. Problem Statement

### 2.1 The Current Landscape

AI coding assistants have become essential tools in modern software development. However, existing solutions suffer from several limitations:

| Problem | Description |
|---------|-------------|
| **Context Loss** | Most tools lose context between sessions, forcing developers to repeat instructions |
| **No Workflow Structure** | Tools provide raw code generation without project-level planning or verification |
| **Vendor Lock-in** | Tools are tied to specific AI providers, limiting flexibility and cost optimization |
| **GUI Dependency** | Most assistants require a browser tab or separate IDE, causing context-switching overhead |
| **No Persistent State** | Project progress, goals, and decisions are lost when the tool is closed |
| **Limited Extensibility** | Fixed feature sets with no way to add domain-specific capabilities |

### 2.2 Research Gap

There is no existing open-source tool that combines:

- A terminal-native interface (no browser/IDE required)
- Multi-provider AI support (20+ providers)
- Structured workflow orchestration (planning → execution → verification → shipping)
- Persistent project state across sessions
- A modular skill system for extensibility
- Multi-agent collaboration (build, plan, explore, compose agents)

**COdo addresses this gap** by providing a complete, structured development environment that runs entirely in the terminal.

---

## 3. Objectives

### 3.1 Primary Objectives

| # | Objective | Measurable Target |
|---|-----------|-------------------|
| 1 | Build a terminal-native AI coding assistant | Functional TUI with real-time LLM streaming |
| 2 | Support multiple AI providers | 20+ providers (OpenAI, Anthropic, Google, NVIDIA, etc.) |
| 3 | Implement structured workflow modes | 4 modes (GSD, GStack, Speckit, Vibemode) |
| 4 | Create a modular skill system | 16+ specialized skills |
| 5 | Ensure persistent session state | Sessions survive terminal restarts via SQLite |
| 6 | Provide cross-platform support | Windows, macOS, Linux compatibility |
| 7 | Enable third-party extensibility | Plugin system with 30+ lifecycle hooks |
| 8 | Integrate language intelligence | LSP support for 30+ languages |

### 3.2 Secondary Objectives

| # | Objective | Target |
|---|-----------|--------|
| 1 | Web-based UI alternative | Solid.js SPA with browser access |
| 2 | Desktop application | Electron wrapper for native experience |
| 3 | Internationalization | 17 languages supported |
| 4 | Open-source publication | npm package + GitHub repository |
| 5 | Documentation site | Comprehensive docs with examples |

---

## 4. Literature Review

### 4.1 AI-Assisted Software Development

The field of AI-assisted coding has evolved significantly:

- **GitHub Copilot (2021):** First mainstream AI pair programmer. Uses OpenAI Codex for code suggestions. Limited to IDE integration; no workflow orchestration.
- **Cursor (2023):** AI-first IDE with chat-based interaction. Powerful but requires switching away from existing development environments.
- **Aider (2023):** Terminal-based AI coding tool. Supports multiple providers but lacks structured workflow management and persistent state.
- **Claude Code / Codex CLI (2025):** Anthropic and OpenAI's terminal agents. Provider-locked; no multi-provider support or workflow modes.

### 4.2 Functional Programming in TypeScript

COdo adopts **Effect-TS** (Effect 4.0.0-beta.74), a typed functional programming library for TypeScript. Effect provides:

- **Type-safe dependency injection** via `Layer` and `Context`
- **Structured error handling** with typed failures (no `try/catch`)
- **Composable async operations** with `Effect.gen` generators
- **Schema-first data modeling** with `Effect.Schema`
- **Resource management** with scoped lifecycles

This approach is inspired by ZIO (Scala) and algebraic effects research, bringing similar guarantees to the TypeScript ecosystem.

### 4.3 Event Sourcing

COdo's session system uses **event sourcing** — a pattern where state is derived from a sequence of immutable events rather than direct database mutations. This provides:

- Complete audit trail of all session actions
- Ability to replay and reconstruct state
- Natural support for undo/redo operations
- Resilience to crashes (events can be replayed)

### 4.4 Terminal User Interfaces (TUIs)

Modern TUI frameworks have evolved beyond ncurses. COdo uses:

- **Solid.js** (reactive UI library) rendered to the terminal via `@opentui/solid`
- **Yoga layout engine** for CSS-like flexbox in the terminal
- This approach enables component-based UI architecture similar to React, but in a terminal environment

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                               │
│  Solid.js TUI + Web UI + Electron Desktop                       │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │ Workflow  │ Goal      │ Skills    │ Compose   │              │
│  │ Engine    │ Anchor    │ System    │ Agent     │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ Effect-TS Services   ↓ Tool Registry               │
├─────────────────────────────────────────────────────────────────┤
│                      CORE LAYER                                 │
│  TypeScript + Bun + Effect-TS                                   │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │ Session   │ LLM       │ Skill     │ Plugin    │              │
│  │ V2        │ Router    │ Registry  │ System    │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ SQLite (Drizzle ORM)  ↓ MCP SDK                    │
├─────────────────────────────────────────────────────────────────┤
│                      PROVIDER LAYER                             │
│  20+ LLM Providers (OpenAI, Anthropic, Google, NVIDIA, etc.)    │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │  OpenAI   │ Anthropic │  Google   │  NVIDIA   │              │
│  │  Adapter  │ Adapter   │  Adapter  │  Adapter  │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Three-Layer Architecture

COdo follows a strict three-layer separation:

| Layer | Package | Responsibility |
|-------|---------|----------------|
| **Core** | `packages/core` | Domain schemas, database, filesystem, git, permissions, tool definitions |
| **Application** | `packages/codo` | Session orchestration, provider transforms, tool implementations, CLI |
| **Presentation** | `packages/tui`, `packages/app`, `packages/desktop` | User interfaces (terminal, web, desktop) |

### 5.3 Data Flow

```
User types message
    ↓
Prompt handling checks for / commands
    ↓
Command transforms input (e.g., /scraper, /workflow)
    ↓
Session.prompt() admits durable input
    ↓
SessionExecution schedules processing
    ↓
SessionRunner loads history + tools
    ↓
LLM streams response
    ↓
Tool calls executed (parallel where possible)
    ↓
Results stored (SQLite) + rendered (TUI)
```

### 5.4 V2 Session Lifecycle

The session system is the most architecturally sophisticated component:

1. **Durable Prompt Admission:** User inputs are stored as `session_input` rows in SQLite before execution
2. **Session Execution:** Process-global `SessionExecution` coordinates processing
3. **Run Coordination:** `SessionRunCoordinator` joins resumes, coalesces concurrent wakes
4. **Model Execution:** `SessionRunner` loads history, prepares tools, and calls the LLM
5. **Tool Dispatch:** Tools are executed with typed schemas and permission checks
6. **Event Publishing:** State changes are published as typed events via `EventV2`
7. **State Projection:** Projectors update derived state within SQLite transactions

---

## 6. Technical Stack

### 6.1 Core Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Language** | TypeScript | 5.8.2 | Primary language (strict, ESM) |
| **Runtime** | Bun | 1.3.13 | Fast TypeScript execution, package management |
| **Monorepo** | Turborepo | 2.8.13 | Build orchestration across packages |
| **Effect System** | Effect-TS | 4.0.0-beta.74 | Functional composition, typed DI, error handling |
| **Database** | SQLite | via Drizzle ORM | Local persistence for sessions, messages, config |
| **ORM** | Drizzle ORM | 1.0.0-rc.2 | Type-safe SQL queries |
| **TUI Framework** | @opentui/solid + Solid.js | 0.3.4 / 1.9.10 | Terminal UI rendering |
| **AI SDK** | Vercel AI SDK | 6.0.168 | Multi-provider LLM integration |
| **HTTP Server** | Hono | 4.10.7 | REST API for web/desktop clients |
| **Desktop** | Electron | 42.3.3 | Native desktop wrapper |
| **Web Build** | Vite | 7.1.4 | Web application bundling |
| **Docs Site** | Astro + Starlight | — | Documentation website |
| **Linting** | oxlint | 1.60.0 | Fast Rust-based linter |
| **Testing** | Bun test + Playwright | — | Unit + E2E testing |
| **Observability** | OpenTelemetry + Honeycomb | — | Distributed tracing |
| **Infrastructure** | SST (Serverless Stack) | 4.13.1 | Cloud deployment (Cloudflare + AWS) |

### 6.2 Why These Choices?

| Choice | Rationale |
|--------|-----------|
| **Bun over Node.js** | 10x faster startup, native TypeScript execution, built-in test runner, SQLite support |
| **Effect-TS over async/await** | Type-safe dependency injection, composable error handling, resource management via scopes |
| **Solid.js over React** | Fine-grained reactivity (no virtual DOM), smaller bundle, works in both browser and terminal |
| **SQLite over PostgreSQL** | Zero-configuration, portable, sufficient for single-user local persistence, file-based |
| **Drizzle ORM over Prisma** | Lighter weight, better Effect integration, SQL-like API, smaller bundle |
| **Turborepo over Nx** | Simpler configuration, Bun-native support, sufficient for this monorepo size |
| **Hono over Express** | Smaller footprint, better TypeScript support, built for edge environments |
| **Electron over Tauri** | Existing Solid.js renderer reuse, faster prototyping, larger ecosystem |

---

## 7. Core Features & Design

### 7.1 `/workflow` — The Orchestration Engine

The `/workflow` command is the **core differentiator** of COdo. It selects a predefined development strategy that adapts the **entire agent** — its tools, skills, behavior, and conversation flow — to match a specific way of working.

#### How It Works Internally

When a user invokes `/workflow`, the TUI opens a selection dialog with four options. Upon selection:

1. **KV Store** updates: `kv.set("selected_workflow", workflow)`
2. **File persists** to `~/.codo/workflow.json` so the backend can detect it
3. **Workflow-specific initialization** runs (skill installation, CLI checks, etc.)
4. **Skill filtering** activates — the skill dialog immediately shows only relevant skills

#### The Four Workflows

##### 1. GSD (Get Shit Done) — Full State Machine

**Philosophy:** Spec-driven, milestone-based development for large, complex projects spanning multiple sessions.

**What happens when you select it:**

1. TUI prompts: Local scope (`.agents/skills/`) or Global scope (`~/.agents/skills/`)
2. Downloads `@opengsd/gsd-core@latest` via npm pack (or falls back to `git clone`)
3. Copies GSD skills (each containing `SKILL.md`) to the target directory
4. Copies GSD core tools (`bin/gsd-tools.cjs`) to `~/.codex/get-shit-done/`

**The 5-Step Phase Loop:**

| Step | Skill | What It Does |
|------|-------|-------------|
| 1. **Discuss** | `gsd:discuss-phase` | Adaptive questioning to capture decisions and context before planning |
| 2. **Plan** | `gsd:plan-phase` | Research, decompose into milestones → slices → tasks, verify fit |
| 3. **Execute** | `gsd:execute-phase` | Run in parallel waves with clean context per task |
| 4. **Verify** | `gsd:audit-milestone` | Walk through deliverables, diagnose issues, fix |
| 5. **Ship** | `gsd:ship` | Create PR, archive phase, repeat |

**The `.planning/` Directory (Persistent State):**

```
.planning/
├── STATE.md           # Active phase/milestone/slice/task tracking (YAML frontmatter)
├── ROADMAP.md         # Phased execution plan with risk, dependencies, demo lines
├── PROJECT.md         # Living current-state document
├── REQUIREMENTS.md    # Active capability contract
├── DECISIONS.md       # Append-only decision register
├── KNOWLEDGE.md       # Append-only knowledge register
├── CODEBASE.md        # Auto-refreshed codebase map
├── OVERRIDES.md       # Configuration overrides
├── QUEUE.md           # Future milestones queue
├── runtime/           # System-managed runtime data
├── activity/          # Activity logs
├── worktrees/         # Git worktrees for isolation
└── phases/
    └── 01-foundation/
        ├── 01-CONTEXT.md       # Vision, success criteria, key risks
        ├── 01-RESEARCH.md      # Research findings
        ├── 01-ROADMAP.md       # Milestone roadmap with slices
        ├── 01-VALIDATION.md    # Validation results
        ├── 01-SUMMARY.md       # Completion summary
        ├── 01-LEARNINGS.md     # Extracted lessons
        ├── 01-01-PLAN.md       # Slice plan with task checkboxes
        ├── 01-01-SUMMARY.md    # Slice summary
        └── 01-01-UAT.md        # User acceptance testing
```

**State Machine (Unit Lifecycle):**

```
pending → planning → ready → executing → verifying → completed
                     ↓
                   failed → planning | executing (retry)
```

Units: **Milestone** → **Slice** → **Task** (hierarchical decomposition).

**Context Budget System (Prevents Context Overflow):**

The GSD engine allocates the LLM's context window proportionally:

| Budget Slice | Percentage | Purpose |
|-------------|-----------|---------|
| Summary | 15% | Dependency/prior-task summaries |
| Inline Context | 40% | Plans, decisions, code snippets |
| Verification | 10% | Verification sections in prompts |
| Reserved | 35% | Executor working space |

Per-unit-type adjustments:
- **Milestone:** 10% summary, 45% inline, 5% verification, 40% reserved
- **Slice:** 15% summary, 40% inline, 10% verification, 35% reserved
- **Task:** 10% summary, 35% inline, 15% verification, 40% reserved

Task count limits by context window: 500K → max 8 tasks, 200K → 6, 128K → 5, smaller → 3.

Truncation uses `truncateAtSectionBoundary()` which splits on `### ` headings and `---` dividers, greedily keeping whole sections that fit. Never cuts mid-section (which would produce invalid markdown).

**Verification Pipeline:**

1. **Command Discovery** (first-non-empty-wins):
   - Task plan verify field
   - Explicit preference commands
   - `package.json` scripts (typecheck, lint, test)
   - Python pytest markers (pytest.ini, pyproject.toml)

2. **Evidence Collection:** Spawns commands via `spawnSync`, captures exit codes, stdout, stderr, duration. Cross-platform (cmd on Windows, sh elsewhere). Max 10KB output per command.

3. **Quality Gates:**
   - `verification-commands`: All commands must pass (exit code 0)
   - `verification-discovery`: Warns if no verification commands found
   - `output-quality`: Informational warning on large stderr

4. **Failure Formatting:** Produces markdown blocks with command, exit code, and truncated output. Capped at 10K chars total failure context.

**Rework System:**

Generates actionable fix instructions from failed verification:
- Converts failed evidence to findings (severity: blocking)
- Converts failed quality gates to findings (severity: blocking for task scope, major for slice/milestone)
- Extracts fix instructions by pattern matching: TypeScript errors, test failures, lint errors
- Renders as markdown with severity icons and summary counts

**Doctor System:**

Health validation for `.planning/` directory:
- Checks: `.planning/` exists, STATE.md exists and has content, ROADMAP.md exists, `phases/` directory exists, phase structure (CONTEXT.md + ROADMAP.md per phase), `templates/` directory exists, `.gitignore` includes `.planning/`

**GSD Complete Skill Catalog (40+ skills):**

| Category | Skills |
|----------|--------|
| **Phase Lifecycle** (7) | spec-phase, discuss-phase, plan-phase, execute-phase, code-review, verify-work, ship |
| **Phase Management** (23+) | progress, next, stats, health, manager, add-phase, insert-phase, remove-phase, add-backlog, review-backlog, complete-milestone, cleanup, milestone-summary, add-tests, validate-phase, audit-uat, audit-milestone, audit-fix, plan-milestone-gaps, analyze-dependencies, plan-review-convergence, list-phase-assumptions, research-phase, ai-integration-phase, ui-phase, ui-review, secure-phase, eval-review |
| **Ideation & Discovery** (11) | explore, spike, sketch, note, plant-seed, add-todo, check-todos, inbox, ingest-docs, map-codebase, scan |
| **Configuration** (9) | settings, settings-advanced, settings-integrations, set-profile, profile-user, update, sync-skills, from-gsd2, reapply-patches |
| **Workspace** (5) | new-workspace, remove-workspace, list-workspaces, workstreams, import |
| **Recovery** (6) | debug, forensics, undo, pause-work, resume-work, thread |
| **Synthesis** (5) | session-report, extract-learnings, docs-update, spike-wrap-up, sketch-wrap-up |
| **Orchestration** (1) | autonomous |

**Skill Activation (Automatic Context Matching):**

Skills are automatically activated based on:
- **Unit type:** milestone → plan-phase + spec-phase + discuss-phase; task → execute-phase + fast
- **Context keywords:** testing → add-tests + validate-phase; debug → debug + forensics; ui → ui-phase + ui-review + sketch
- **Auto-matching:** by name/description against context tokens (3+ character tokens)

Output produces XML blocks injected into prompts:
```xml
<skill_activation>Load 'gsd:execute-phase' from <available_skills> and follow its instructions.</skill_activation>
<skill_recommendations unit="task">For this unit type, also consider reading these installed skill files...</skill_recommendations>
```

**GSD Prompt Templates (11 templates):**

| Template | Purpose | Lines |
|----------|---------|-------|
| `system.md` | GSD persona as "craftsman-engineer who co-owns the project" | 168 |
| `execute-task.md` | Task execution with working directory, overrides, verification | 84 |
| `plan-milestone.md` | Milestone planning with decompose, strategic questions, vertical slices | 121 |
| `plan-slice.md` | Slice planning with validation, task decomposition, safety rules | 62 |
| `complete-slice.md` | Slice closeout with verification, UAT, decisions | 61 |
| `complete-milestone.md` | Milestone closeout with success criteria, learnings, requirements | 97 |
| `verify.md` | Verification specialist with evidence collection | 66 |

##### 2. GStack — Virtual Engineering Team

**Philosophy:** Garry Tan's (Y Combinator CEO) opinionated 23+ specialist role-based workflow.

**What happens when you select it:**

1. Checks if `~/.codo/skills/gstack` exists
2. If yes: runs `git pull` to update
3. If no: clones `https://github.com/garrytan/gstack.git`

**The Sprint Skills (in order):**

| Phase | Skill | Role | What It Does |
|-------|-------|------|-------------|
| THINK | `/office-hours` | YC Office Hours | Six forcing questions that reframe your product |
| THINK | `/plan-ceo-review` | CEO / Founder | Rethink the problem, find the 10-star product |
| THINK | `/plan-eng-review` | Eng Manager | Lock in architecture, data flow, diagrams, edge cases |
| THINK | `/plan-design-review` | Senior Designer | Rates design dimensions 0–10, AI slop detection |
| BUILD | `/careful` | Cautious Engineer | Careful implementation with explicit verification |
| BUILD | `/design-html` | Frontend Dev | Translates design specs to production-ready HTML/CSS |
| REVIEW | `/qa` | QA Lead | Opens real browser, runs acceptance tests, logs failures |
| REVIEW | `/cso` | Security Officer | OWASP + STRIDE security audit, threat modelling |
| REVIEW | `/investigate` | Inspector | Root-cause analysis of any bug or unexpected behavior |
| SHIP | `/ship` | Release Engineer | Prepares and ships clean PR with changelog |

##### 3. SpecKit — Spec-First Development

**Philosophy:** Define what to build before building it.

**What happens when you select it:**

1. Checks if `specify` CLI is installed (`specify --version`)
2. If not: throws error with install instructions (`uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`)
3. Runs `specify init --here --integration opencode --ignore-agent-tools --force` with auto-confirmation

**Command Sequence:**

| Step | Command | Output |
|------|---------|--------|
| 1 | `/speckit.constitution` | `.specify/memory/constitution.md` — governing principles |
| 2 | `/speckit.specify` | `spec.md` — functional spec (what and why) |
| 3 | `/speckit.plan` | `plan.md` — technical implementation plan (how) |
| 4 | `/speckit.tasks` | `tasks.md` — granular, actionable tasks |
| 5 | `/speckit.implement` | Executes tasks in order |
| 6 | `/speckit.converge` | Assesses final codebase against original spec |

Additional commands: `/speckit.clarify` (clarifies underspecified areas), `/speckit.analyze` (cross-artifact consistency), `/speckit.checklist` (quality checklists)

##### 4. Vibemode — Pure Reactive

**What happens:** No initialization. Toast: "Vibe mode activated — no workflow constraints." All workflow-tagged skills are hidden from the skill dialog. The agent operates with raw skills only — no planning, no persistence, no verification.

#### Workflow Skill Filtering Logic

When a workflow is active, `/skills` auto-filters:

| Workflow | Skills Shown |
|----------|-------------|
| `null` (none) | All skills, unfiltered |
| `gsd` | GSD-tagged skills + non-workflow skills |
| `gstack` | GStack-tagged skills + non-workflow skills |
| `speckit` | SpecKit-tagged skills + non-workflow skills |
| `vibe` | Only non-workflow-tagged skills (all workflow skills hidden) |

Detection is by name substring (`name.includes("gsd")`) or description tag (`desc.includes("(gsd)")`).

#### Workflow Comparison Matrix

| Feature | GSD | GStack | Speckit | Vibemode |
|---------|-----|--------|---------|----------|
| **Structure** | Milestones → Phases | Sprint roles | Spec-driven | None |
| **Persistence** | `.planning/` directory | Session-only | `.specify/` directory | None |
| **Multi-session** | Yes | No | Yes | No |
| **Verification** | Built-in audit pipeline | QA + Security reviews | Convergence checks | None |
| **Skill Count** | 40+ | 23+ | 8+ | 0 workflow skills |
| **State Machine** | Full (pending→completed) | None | None | None |
| **Context Budget** | Proportional allocation | None | None | None |
| **Best for** | Large projects | Startup shipping | Enterprise/compliance | Quick fixes |

---

### 7.2 `/goal` — Stop-Condition Goal System

#### What It Is

A **stop-condition enforcement system**. Once a goal is set, the session's main loop **will not terminate** until an independent judge model decides the condition has been met (or is genuinely impossible).

#### How It Works (Step by Step)

**Setting a Goal:**
```
/goal Build user authentication with JWT and refresh tokens
```

1. Backend stores `{ condition: "Build user...", react: 0 }` in per-session state
2. Event published: `session.goal` with the goal condition
3. TUI shows active goal indicator in sidebar

**During Every LLM Turn (The Goal Gate):**

```
LLM finishes turn
    ↓
Check for active goal
    ↓
Increment react counter (safety: max 20)
    ↓
Run independent judge model call:
  - Judge reads FULL conversation transcript
  - Judge uses temperature: 0 (deterministic)
  - Judge returns Verdict: { ok: boolean, impossible?: boolean, reason: string }
    ↓
Act on verdict:
  - ok → goal achieved, clear goal, exit loop
  - impossible → goal unachievable, clear goal, exit loop
  - otherwise → inject synthetic message:
    "[Goal check — attempt N/20] The goal condition has not been met yet.
     Verdict: <reason>. Please continue working toward the goal."
  → Continue loop
```

#### The Judge System

The judge is an **independent LLM call** with a dedicated system prompt that:
- Reads the full conversation transcript (including tool calls/results/images)
- Only evaluates evidence from the transcript — it does not do the work itself
- Uses `temperature: 0` for deterministic judgment
- Uses `generateObject` with the `Verdict` schema

**Judge System Prompt:**
> "If the transcript does not contain clear evidence that the condition is satisfied, return `{ok: false, reason: 'insufficient evidence in transcript'}`."
> "The assistant claiming the goal is impossible is evidence, not proof; independently confirm the condition is genuinely unachievable rather than deferring to the assistant's self-assessment."

**Verdict Schema:**
```typescript
const Verdict = z.object({
  ok: z.boolean(),
  impossible: z.boolean().optional(),
  reason: z.string(),
})
```

Three possible outcomes: satisfied (`ok: true`), not met (`ok: false`), or impossible (`ok: false, impossible: true`).

#### System Prompt Injection (on every LLM call)

```xml
<goal_state>
  <condition>Build user authentication with JWT</condition>
  <react_count>3</react_count>
  <instructions>
    You are working toward a user-defined stop-condition goal.
    The session will not stop until the goal is achieved or declared impossible.
    Keep working until the condition is clearly satisfied.
  </instructions>
</goal_state>
```

#### Safety Mechanisms

- Maximum 20 react cycles (`MAX_GOAL_REACT`)
- Goals are auto-cleared on session compaction (judge would see stale context)
- Three judge outcomes: satisfied, not met, impossible
- Event broadcasting via `session.goal` for TUI sync

#### Commands

- `/goal <condition>` — Set a new goal
- `/goal` or `/goal clear` or `/goal reset` — Clear the active goal

---

### 7.3 `/scraper` — Intelligent Data Extraction

#### What It Is

A **prompt-transform slash command** that converts user input into a skill-loading prompt, leveraging the web tools and LLM reasoning.

#### How It Works

**Input Transformation:**
```
User types: /scraper https://react.dev/blog react 19 changes
    ↓
TUI transforms to: "Use web-scraping skill for: https://react.dev/blog react 19 changes"
    ↓
LLM receives this as a user message
    ↓
LLM uses webfetch (URL fetching) + websearch (web search) tools
    ↓
LLM processes and structures the extracted data
```

#### Underlying Tools

**webfetch Tool:**
- Fetches URLs with HTTP GET
- Converts HTML to markdown using TurndownService
- Three output formats: `markdown`, `text`, `html`
- 5MB response size limit
- Chrome User-Agent; falls back to honest `COdo` User-Agent if blocked by Cloudflare
- Images as base64 attachments
- Configurable timeout (30s default, 120s max)

**websearch Tool:**
- Two providers: **Exa** and **Parallel** (session-based deterministic selection)
- Can be overridden via `CODO_WEBSEARCH_PROVIDER` environment variable
- Parameters: `query`, `numResults`, `livecrawl` (fallback/preferred), `type` (auto/fast/deep), `contextMaxCharacters`

#### Legal-First Approach

| Signal | Action |
|--------|--------|
| "no automated access" in ToS | STOP — suggest API alternative |
| CAPTCHA detected | Generate `headless=False` Playwright script |
| HTTP 403 / 429 | Generate local fallback script |
| More than 50 pages needed | Suggest bulk export or official API |
| Normal static HTML | Fetch and parse directly |

---

### 7.4 `/skills` — Skill System

#### What It Is

A **modular instruction system** — Markdown files with YAML frontmatter that load into the agent's context when invoked.

#### Skill Format

```markdown
---
name: my-skill
description: "What it does (workflow-tag)"
compatibility: "COdo (with tools)"
---

# Skill Instructions

Your skill instructions here.
These become part of the agent's context when this skill is activated.
```

#### Skill Discovery Pipeline

Skills are discovered from **6 sources** (in order):

1. `.claude/skills/**/SKILL.md` (Claude Code compatibility)
2. `.agents/skills/**/SKILL.md` (project-local)
3. `~/.agents/skills/**/SKILL.md` (global)
4. COdo config directories: `{skill,skills}/**/SKILL.md`
5. Config-specified paths (`config.skills.paths`)
6. Remote skill URLs (`config.skills.urls`) — fetched with `index.json` + cached

#### Built-in Skills

- **customize-COdo**: Teaches the LLM how to edit COdo's own config files
- **16 Compose Skills**: Orchestration skills (brainstorm, plan, execute, debug, review, etc.)

#### The `skill` Tool (How the LLM Loads Skills)

The LLM calls `skill({ name: "gsd:execute-phase" })`. The tool:
1. Resolves the skill from the Skill service
2. Finds supporting files via ripgrep (excluding SKILL.md)
3. Returns XML-wrapped content:

```xml
<skill_content name="gsd:execute-phase">
# Skill: gsd:execute-phase
[markdown content]

Base directory: file:///path/to/skill/dir
<skill_files>
<file>/path/to/file1</file>
<file>/path/to/file2</file>
</skill_files>
</skill_content>
```

#### Skills as Slash Commands

Every discovered skill automatically becomes a `/skill-name` slash command in the TUI.

---

### 7.5 `/compose` — Multi-Agent Orchestration

#### What It Is

The compose agent is a **primary orchestrator** that coordinates specialized skills into coherent workflows. It doesn't implement directly — it delegates to skills and subagents.

#### 16 Compose Skills

| Skill | Purpose |
|-------|---------|
| `compose:brainstorm` | Before creative work — explores intent, requirements, design |
| `compose:plan` | Creates detailed implementation plans with bite-sized tasks |
| `compose:tdd` | Test-Driven Development with Red-Green-Refactor cycle |
| `compose:subagent` | Delegates sub-tasks to specialized agents |
| `compose:worktree` | Manages git worktrees for isolated feature work |
| `compose:parallel` | Dispatches parallel agents for independent tasks |
| `compose:execute` | Executes a written plan with review checkpoints |
| `compose:debug` | Four-phase systematic debugging |
| `compose:feedback` | Processes code review feedback with technical rigor |
| `compose:review` | Final quality gate — verifies work meets requirements |
| `compose:verify` | Pre-commit verification — evidence before assertions |
| `compose:merge` | Intelligent merge with conflict resolution |
| `compose:report` | Consolidates spec iterations into final-state reports |
| `compose:ask` | Routes decisions/clarifications to the user |
| `compose:new-skill` | Creates new skills using TDD methodology |
| `compose:self-extend` | Evolves COdo's own capabilities |

#### GSD Routing Table (When GSD is Active)

Every compose skill redirects to its GSD equivalent:

| Compose Skill | → GSD Skill |
|---------------|-------------|
| `compose:brainstorm` | `gsd:new-project` or `gsd:explore` + `gsd:spec-phase` |
| `compose:plan` | `gsd:plan-phase` |
| `compose:execute` | `gsd:execute-phase` |
| `compose:debug` | `gsd:debug` |
| `compose:review` | `gsd:code-review` or `gsd:review` |
| `compose:tdd` | `gsd:add-tests` or `gsd:validate-phase` |
| `compose:verify` | `gsd:verify-work` |
| `compose:merge` | `gsd:ship` or `gsd:pr-branch` |
| `compose:feedback` | `gsd:code-review-fix` |
| `compose:parallel` | `gsd:execute-phase` (wave system) |
| `compose:subagent` | `gsd:autonomous` or `gsd:execute-phase` |
| `compose:report` | `gsd:milestone-summary` or `gsd:session-report` |
| `compose:new-skill` | `gsd:spike-wrap-up` or `gsd:sketch-wrap-up` |
| `compose:worktree` | `gsd:new-workspace` |
| `compose:ask` | **Stays native** (no GSD equivalent) |

---

### 7.6 All Slash Commands (Complete Reference)

#### Global Commands

| Slash | Aliases | Description |
|-------|---------|-------------|
| `/sessions` | `/resume`, `/continue` | Switch session |
| `/new` | `/clear` | New session |
| `/workspaces` | — | Manage workspaces |
| `/models` | `/mo` | Switch model |
| `/agents` | — | Switch agent |
| `/mcps` | — | Toggle MCP servers |
| `/variants` | — | Switch model variant |
| `/connect` | — | Connect AI provider |
| `/status` | — | View status |
| `/themes` | — | Switch theme |
| `/help` | — | Help |
| `/workflow` | — | Select development workflow |
| `/goal` | — | Set stop-condition goal |
| `/scraper` | — | Web scraper (prompt command) |
| `/editor` | — | Open external editor for prompt |
| `/skills` | — | Browse and load skills |
| `/exit` | `/quit`, `/q` | Exit |

#### Session Commands

| Slash | Description |
|-------|-------------|
| `/share` | Share session |
| `/unshare` | Unshare session |
| `/rename` | Rename session |
| `/timeline` | Jump to message |
| `/fork` | Fork session |
| `/compact` | Compact session (alias: `/summarize`) |
| `/undo` | Undo previous message |
| `/redo` | Redo |
| `/copy` | Copy session transcript |
| `/export` | Export session transcript |
| `/timestamps` | Toggle timestamps display |
| `/thinking` | Toggle thinking expansion |

#### Workspace Commands

| Slash | Description |
|-------|-------------|
| `/warp` | Change workspace for session |
| `/move` | Move session to different workspace |
| `/diff` | Open diff viewer (VCS) |

#### Backend Commands

| Slash | Description |
|-------|-------------|
| `/init` | Guided AGENTS.md setup |
| `/review` | Review changes (commit/branch/PR) |
| `/<skill-name>` | All discovered skills (auto-registered) |
| `<mcp>:<prompt>` | MCP server prompts |

---

### 7.7 Built-in Agents

| Agent | Mode | Color | Permissions | Purpose |
|-------|------|-------|------------|---------|
| `build` | primary | — | Full tool access, question, plan | Default agent for code editing |
| `plan` | primary | — | Read-only, deny edits, allow plan writes | Planning agent |
| `compose` | primary | `#a7a3d8` | Question, skill, .codo/*, .agents/skills/* | Workflow orchestrator |
| `general` | subagent | — | Inherits from parent | Multi-purpose parallel execution |
| `explore` | subagent | — | Grep, glob, read, webfetch (read-only) | Codebase exploration specialist |
| `compaction` | hidden | — | — | Session compaction (summarization) |
| `title` | hidden | — | — | Session title generation |
| `summary` | hidden | — | — | Session summary generation |

**Agent Generation:** The `build` agent can generate new agent configurations from natural language descriptions via `Agent.generate()` using `generateObject()` with a schema.

---

### 7.8 Built-in Tools

| Tool | Permission | Description |
|------|-----------|-------------|
| `bash` | `bash` | Execute shell commands with platform-aware profiles (bash, PowerShell, cmd.exe) |
| `read` | `read` | Read file contents with line range support |
| `write` | `write` | Create/overwrite files |
| `edit` | `edit` | Targeted string replacements in files |
| `apply_patch` | `apply_patch` | Apply unified diff patches |
| `grep` | `grep` | Search file contents with regex |
| `glob` | `glob` | Find files by pattern |
| `webfetch` | `webfetch` | Fetch and parse web content (HTML→markdown) |
| `websearch` | `websearch` | Search the web via Exa/Parallel providers |
| `question` | `question` | Ask the user for input/decisions |
| `skill` | `skill` | Load a skill into context |
| `todowrite` | — | Manage task lists (SQLite-backed) |
| `task` | — | Spawn sub-agents for parallel execution |

**Shell Tool Profiles:** Three platform-specific prompt generators produce different instructions for bash, PowerShell 7+/5.1, and cmd.exe — including correct syntax, path handling, and verification patterns.

---

### 7.9 Theme System

35+ built-in themes including:

| Category | Themes |
|----------|--------|
| **Dark & Brooding** | Dracula, AMOLED, One Dark, Cobalt2, Nightowl |
| **Cozy & Aesthetic** | Catppuccin, Rose Pine, Aura, Tokyo Night, Palenight |
| **Nature-Coded** | Everforest, Gruvbox, Nord, Kanagawa, Flexoki |
| **Chaotic Energy** | Synthwave84, Matrix, Osaka Jade, Lucent Orange |
| **Calm & Minimal** | Vesper, Zenburn, Mercury, GitHub, Solarized |
| **Custom** | codo (default COdo theme) |

### 7.10 Internationalization

Full support for 17 languages across the TUI, web app, and documentation site.

---

## 8. Implementation Details

### 8.1 Effect-TS Service Pattern

Every domain module follows this consistent pattern:

```typescript
// Self-reexport at top
export * as MyModule from "./my-module"

// Schema types
export class Info extends Schema.Class<Info>("MyModule.Info")({ ... }) {}

// Service interface
export interface Interface {
  readonly method: (input: Input) => Effect.Effect<Output, Error>
}

// Service tag
export class Service extends Context.Service<Service, Interface>()("@codo/MyModule") {}

// Layer construction
export const layer = Layer.effect(Service, Effect.gen(function* () { ... }))

// Default composed layer
export const defaultLayer = layer.pipe(Layer.provide(...))
```

This pattern ensures:
- **Type-safe dependency injection** — no `new` or constructor injection
- **Testability** — services can be mocked via `Layer.mock()`
- **Tree-shaking** — self-reexports enable efficient bundling
- **Composability** — layers compose vertically and horizontally

### 8.2 LLM Abstraction Layer

The LLM package implements a **four-axis route decomposition**:

```
Protocol (API contract) + Endpoint (URL) + Auth (credentials) + Framing (wire format) = Route
```

**Supported Protocols:**
- OpenAI Chat Completions
- OpenAI Responses API
- Anthropic Messages
- Google Gemini
- AWS Bedrock Converse
- OpenAI-compatible (generic)

**Provider Facades:** Each provider (OpenAI, Anthropic, Google, Azure, Bedrock, xAI, OpenRouter, Cloudflare, GitHub Copilot) is a thin configured facade over route values, enabling 5-15 line provider definitions instead of 300-400 line clones.

### 8.3 Cross-Platform Support

| Platform | Implementation |
|----------|---------------|
| **Windows** | Path normalization (Git Bash, Cygwin, WSL translation), `taskkill` for process cleanup |
| **macOS** | Native Bun support, Apple Silicon compatible |
| **Linux** | Primary development platform, Docker support |
| **WSL** | Full integration via desktop app |
| **Browser** | Web app via Solid.js SPA |

---

## 9. Package Architecture

### 9.1 Dependency Graph

```
CLI (codo) ──→ Core (domain engine)
CLI ──→ TUI (terminal UI)
CLI ──→ Server (HTTP API)
CLI ──→ LLM (model protocols)
CLI ──→ Plugin (SDK types)
CLI ──→ SDK (JS SDK)
Core ──→ LLM
Core ──→ Effect-Drizzle-SQLite
App (web SPA) ──→ UI (shared components)
Desktop (Electron) ──→ App
```

### 9.2 Package Summary (27 packages)

| Package | Purpose |
|---------|---------|
| `core` | Domain engine, schemas, DB, tools (79 source files) |
| `codo` | CLI, session orchestration, providers, 24+ commands |
| `llm` | LLM protocols, providers, routing (6 wire protocols) |
| `tui` | Terminal UI (Solid.js, 50+ files) |
| `app` | Web application (Solid.js SPA, 40+ files) |
| `desktop` | Electron wrapper (30+ files) |
| `server` | HTTP API (17 route groups, Hono) |
| `sdk` | JavaScript SDK (auto-generated from OpenAPI spec) |
| `plugin` | Plugin type definitions (30+ hooks) |
| `ui` | Shared UI component library (30+ files) |
| `session-ui` | Session viewer components |
| `web` | Documentation site (Astro + Starlight) |
| `console` | Admin console |
| `enterprise` | Enterprise features (SolidStart + Hono) |
| `browser` | Browser automation agent |
| `slack` | Slack integration |
| `cli` | npm-published CLI wrapper |
| `function` | Cloudflare Workers serverless functions |
| `effect-drizzle-sqlite` | Effect wrapper for Drizzle + SQLite |
| `effect-sqlite-node` | Effect wrapper for SQLite on Node |
| `http-recorder` | HTTP request/response recorder for testing |
| `script` | Shared build/release scripts |
| `containers` | Docker container definitions |
| `stats` | Analytics dashboard |
| `identity` | Identity/branding assets |
| `storybook` | Component storybook |
| `docs` | Mintlify documentation content |

---

## 10. AI Provider Integration

### 10.1 Supported Providers (20+)

| Provider | Models | Auth |
|----------|--------|------|
| **OpenAI** | GPT-4o, GPT-4.1, o1, o3, o4-mini | API Key |
| **Anthropic** | Claude 3.5/4 Sonnet, Claude 3 Opus | API Key |
| **Google** | Gemini 2.5 Pro/Flash | API Key |
| **NVIDIA** | Llama, Mistral (free tier) | API Key |
| **xAI** | Grok 3 | API Key |
| **AWS Bedrock** | Claude, Llama, Mistral | IAM |
| **Azure OpenAI** | GPT-4o, GPT-4.1 | API Key + Endpoint |
| **OpenRouter** | All major models | API Key |
| **Cloudflare** | Workers AI models | API Token |
| **GitHub Copilot** | Copilot models | OAuth |
| **Groq** | Llama, Mixtral | API Key |
| **Mistral** | Mistral Large/Small | API Key |
| **TogetherAI** | Llama, Mixtral | API Key |
| **Perplexity** | Sonar models | API Key |
| **Cerebras** | Llama 3 | API Key |
| **DeepInfra** | Various open models | API Key |
| **Alibaba** | Qwen models | API Key |
| **Cohere** | Command R+ | API Key |
| **Venice** | Various models | API Key |
| **GitLab** | Code Completion | OAuth |

### 10.2 BYOK (Bring Your Own Key)

COdo does not lock users into any AI provider. Users can:
- Switch models mid-project
- Use free-tier APIs (NVIDIA NIM provides free access)
- Configure per-project provider preferences
- Use any OpenAI-compatible endpoint

### 10.3 Provider Transformations

Each provider requires specific message format transformations (52KB of transform code):

- **Anthropic:** Thinking block signatures, cache points, adaptive thinking (empty text preservation between signed reasoning blocks)
- **Google:** Grounding metadata
- **OpenAI:** Responses API format
- **Bedrock:** Image-only media in tool results
- **General:** Surrogate character sanitization, media extraction for providers that don't support media in tool results

---

## 11. Workflow System Deep Dive

### 11.1 GSD State Machine (Backend)

The backend state machine (`packages/codo/src/workflow/state-machine.ts`) manages unit lifecycle transitions with strict validation:

```
pending → planning → ready → executing → verifying → completed
                     ↓
                   failed → planning | executing (retry)
```

Invalid transitions throw errors. STATE.md is rendered with YAML frontmatter:

```yaml
---
active_phase: "01-foundation"
active_milestone: "M01"
active_slice: "S01"
active_task: "T03"
last_updated: "2026-07-27T10:30:00Z"
---
```

### 11.2 Context Budget Allocation

The proportional allocation engine prevents context window overflow:

**Default Budget Ratios (from GSD-Pi):**
- Summary: 15% — dependency/prior-task summaries
- Inline context: 40% — plans, decisions, code snippets
- Verification: 10% — verification sections in prompts
- Reserved: 35% — executor working space

**Per-Unit-Type Adjustments:**
- **Milestone:** 10% summary, 45% inline, 5% verification, 40% reserved (more inline for roadmap/requirements)
- **Slice:** 15% summary, 40% inline, 10% verification, 35% reserved (balanced)
- **Task:** 10% summary, 35% inline, 15% verification, 40% reserved (more verification)

### 11.3 Context Injector

Selects and composes context for each unit type:
- **Milestone context:** Roadmap excerpt, requirements (active only), decisions table, milestone context (vision, success criteria, risks)
- **Slice context:** Slice plan, task plans, prior work summaries (max 2500 tokens), dependency summaries (forward intelligence)
- **Task context:** Task plan, slice excerpt, prior task summaries

All blocks go through budget-aware truncation at section boundaries.

### 11.4 Prompt Builder

Constructs complete dispatch prompts for each unit type:
1. Loads the appropriate template
2. Injects context via `injectContext()`
3. Fills `{{variable}}` placeholders with 50+ template variables
4. Returns `{ prompt, context, budget }`

### 11.5 Compose Agent System Prompt Structure

The compose agent's 352-line system prompt contains:

1. **GSD Workflow Detection** (EXTREMELY-IMPORTANT block): Checks `~/.codo/workflow.json`
2. **GSD Routing Table:** Maps every compose skill to its GSD equivalent (18 mappings)
3. **Brainstorm Scope Check:** Skips brainstorm for specific bug fixes
4. **Context Injection Instructions:** Budget constraints, verification pipeline, rework briefs
5. **Instruction Priority:** User > Compose skills > Default system prompt
6. **Skill Catalog:** 70+ GSD skills organized into 8 categories
7. **Simplicity Rules:** Minimum code, no over-engineering, YAGNI, TDD
8. **Completion Requirements:** Code changes + verification evidence + minimal scope

---

## 12. Plugin System

### 12.1 Plugin Types

| Type | Target | Use Case |
|------|--------|----------|
| Server Plugin | Backend | Auth providers, custom tools, message transforms |
| TUI Plugin | Frontend | Routes, keymaps, themes, dialogs, KV storage |

### 12.2 30+ Lifecycle Hooks

| Category | Hooks |
|----------|-------|
| **Chat** | `chat.message`, `chat.params`, `chat.headers` |
| **Tools** | `tool.execute.before`, `tool.execute.after`, `tool.definition` |
| **Permissions** | `permission.ask` |
| **Shell** | `shell.env` |
| **Auth** | `auth.*` (OAuth, API key flows) |
| **Provider** | `provider.*` (model registration) |
| **Experimental** | `experimental.chat.messages.transform`, `experimental.chat.system.transform`, `experimental.session.compacting`, `experimental.compaction.autocontinue`, `experimental.text.complete` |

### 12.3 Plugin Loading Pipeline

1. **Plan:** Resolve plugin configurations from config
2. **Resolve:** Auto-install npm packages via `Npm.add()`, detect entrypoints, check compatibility
3. **Load:** Import modules, apply hooks sequentially

Individual plugin failures are logged but do not crash the system. Each hook trigger catches and logs errors independently.

### 12.4 Built-in Plugins

Codex auth, Copilot auth, GitLab auth, Poe auth, Cloudflare auth, Azure auth, DigitalOcean auth, xAI auth.

---

## 13. Session & State Management

### 13.1 Session Lifecycle

```
User Input → SessionV2.prompt()
    → Admit durable session_input row (SQLite)
    → SessionExecution.wake(sessionID)
    → SessionRunCoordinator joins/coalesces concurrent wakes
    → SessionRunner loads history + tools
    → llm.stream(request) — one call per provider turn
        → Stream events: reasoning, tool-input, tool-call, tool-result, text, step-finish
        → SessionProcessor handles each event:
            - Creates/updates/removes session parts
            - Applies permission checks
            - Detects doom loops (3+ identical tool calls)
            - Checks overflow
        → Returns: "continue" | "compact" | "stop"
    → SessionCompaction.process (if overflow)
        - Selects messages to compact vs. retain (tail preservation)
        - Builds compaction prompt
        - Sends to LLM for summarization
        - Auto-continues if configured
    → SessionSummary.summarize (forked to background)
```

### 13.2 Doom Loop Detection

After every `tool-call` event, checks if the last 3 tool calls were identical (same tool name + same input). If so, asks for `doom_loop` permission — prevents the LLM from getting stuck in a loop.

### 13.3 Session Compaction

When context overflows:
1. **Tail Turn Preservation:** Keeps last 2 turns (or 25% of usable context, min 2K, max 8K tokens)
2. **Tool Output Pruning:** Walks backwards marking older outputs as `"[Old tool result content cleared]"`. Protects most recent 40K tokens of tool output. Always preserves `skill` tool outputs.
3. **Compaction Prompt:** Sends to LLM with no tools, produces summary
4. **Auto-Continue:** If configured, injects synthetic "Continue if you have next steps" message

### 13.4 Session Revert/Undo

Full revert support:
- `revert()`: Finds target message, restores snapshot before that point, computes diffs
- `unrevert()`: Restores the snapshot stored in revert metadata
- Uses `assertNotBusy()` to prevent concurrent modifications

### 13.5 Session Fork

Copies messages from an existing session into a new one, remapping message and part IDs. Stops copying at the fork point if specified.

### 13.6 Retry System

- Exponential backoff starting at 2s, doubling each attempt
- Respects `retry-after` and `retry-after-ms` response headers
- Special COdo free tier upsell messages
- Context overflow errors are never retried
- 5xx errors are always retried

### 13.7 Event Sourcing

Sessions are fully event-sourced:
1. Events defined with `EventV2.define()` — typed, versioned, with sync support
2. Published atomically inside SQLite transactions
3. Projectors run synchronously within the transaction
4. PubSub notifies listeners after commit
5. Replay supports sync across devices

---

## 14. Configuration System

### 14.1 Hierarchical Config Merge

Config is merged from multiple sources (lowest to highest priority):

1. **Global config:** `~/.config/codo/config.json`
2. **Project config:** `.codo/opencode.jsonc` (searched upward from CWD)
3. **Legacy fallback:** `.opencode/opencode.jsonc`
4. **Managed config:** Remote/enterprise configuration
5. **Runtime flags:** CLI arguments

### 14.2 Config Modules (14 sub-configs)

| Module | Purpose |
|--------|---------|
| `agent` | Per-agent overrides and custom agent definitions |
| `mcp` | Model Context Protocol servers (local + remote) |
| `lsp` | Language Server Protocol servers |
| `provider` | Custom model providers with cost/limit definitions |
| `plugin` | External plugin packages |
| `attachments` | File attachment settings |
| `compaction` | Session compaction behavior (auto, prune, keep, buffer) |
| `command` | Custom commands |
| `formatter` | Code formatting rules |
| `watcher` | Filesystem watching behavior |
| `skills` | Skill paths and URLs |
| `references` | External git repositories as context |
| `experimental` | Feature flags and policies |
| `tui` | TUI-specific settings (themes, keybinds, plugins) |

### 14.3 TUI Config (Detailed)

| Setting | Purpose |
|---------|---------|
| `theme` | Terminal color theme (35+ options) |
| `keybinds` | Keyboard shortcut customization |
| `leader_key` | Vim-style leader key with timeout |
| `attention_sounds` | Sound notifications (with sound packs) |
| `prompt_sizing` | Prompt input sizing |
| `scroll_speed` | Scroll speed and acceleration |
| `diff_style` | Diff rendering style |
| `mouse` | Mouse support toggle |

---

## 15. LSP Integration

### 15.1 Supported Language Servers (30+)

| Language | Server | Auto-Download |
|----------|--------|---------------|
| TypeScript/JavaScript | tsserver | Built-in |
| Go | gopls | `go install` |
| Rust | rust-analyzer | GitHub releases |
| Python | Pyright / Ty | npm / GitHub |
| Java | JDTLS | Eclipse |
| C/C++ | clangd | GitHub releases |
| C# | Roslyn | NuGet |
| Kotlin | kotlin-ls | — |
| Swift | SourceKit | — |
| Ruby | Rubocop | gem |
| Elixir | ElixirLS | — |
| Zig | zls | — |
| Lua | lua-language-server | — |
| PHP | phpactor | — |
| Dart | Dart Analysis Server | — |
| OCaml | ocamllsp | — |
| Bash | bash-language-server | npm |
| Terraform | terraform-ls | — |
| LaTeX | TexLab | — |
| YAML | yaml-language-server | npm |
| Dockerfile | dockerfile-langserver | npm |
| Svelte | svelte-language-server | npm |
| Astro | astro-ls | npm |
| Vue | vue-language-server | npm |
| Biome | biome | npm |
| ESLint | vscode-eslint | npm |
| Oxlint | oxlint | — |
| Prisma | prisma-language-server | npm |
| Gleam | gleam-ls | — |
| Clojure | clojure-lsp | — |
| Nix | nil | — |
| Deno | deno | — |
| Typst | typst-lsp | — |

### 15.2 Features

- Diagnostic push/pull (LSP 3.17)
- Hover, definition, references, implementation
- Document symbols, workspace symbols
- Call hierarchy (prepare, incoming, outgoing)
- Auto-download when binary not found
- Root detection per language (finds `go.mod`, `Cargo.toml`, `package.json`, etc.)
- 150ms debounce for diagnostics
- Config-driven: servers can be enabled/disabled, overridden with custom commands

---

## 16. Testing & Quality Assurance

### 16.1 Testing Framework

| Type | Tool | Scope |
|------|------|-------|
| **Unit Tests** | Bun test runner | Individual functions and services |
| **Integration Tests** | Bun test + Effect helpers | Service interactions |
| **E2E Tests** | Playwright | Web application flows |
| **Type Checking** | TypeScript + tsgo | Static analysis |
| **Linting** | oxlint | Code quality rules (type-aware) |

### 16.2 Test Patterns

```typescript
// Effect-based testing
it.effect("should do something", () =>
  Effect.gen(function* () {
    const service = yield* MyService
    const result = yield* service.doSomething(input)
    expect(result).toBe(expected)
  }).pipe(Effect.provide(testLayer))
)

// Temporary directory fixtures
it.live("should work with real files", () =>
  Effect.gen(function* () {
    const dir = yield* tmpdir()
    // test with real filesystem
  })
)
```

### 16.3 Code Quality Rules

- **No `any` type** — strict TypeScript throughout
- **No `try/catch`** — errors modeled as Effect failures
- **No star imports** — explicit imports only
- **No unnecessary destructuring** — dot notation preferred
- **`const` over `let`** — immutable by default
- **Early returns** — no `else` statements
- **snake_case** for database fields — consistent with SQL conventions

---

## 17. Deployment & Infrastructure

| Component | Technology |
|-----------|-----------|
| npm package | `@codo-ai/cli` via npmjs |
| GitHub | Public repo, MIT License |
| Docs site | Astro + Starlight on Cloudflare |
| API | Cloudflare Workers |
| Sync server | Cloudflare Durable Objects |
| Desktop | Electron (macOS, Windows, Linux) |
| Docker | Multi-arch Alpine (amd64/arm64) |
| Monitoring | OpenTelemetry + Honeycomb |
| Database | SQLite (local persistence) |
| Infrastructure | SST 4.13.1 (Cloudflare + AWS) |
| CI/CD | GitHub Actions |

---

## 18. Results & Evaluation

### 18.1 Feature Coverage

| Metric | Target | Achieved |
|--------|--------|----------|
| LLM Providers | 10+ | **20+** |
| Workflow Modes | 2 | **4** (GSD, GStack, Speckit, Vibemode) |
| Specialized Skills | 10 | **16+** (40+ in GSD alone) |
| Built-in Themes | 20 | **35+** |
| i18n Languages | EN | **17** |
| LSP Languages | 5 | **30+** |
| Built-in Tools | 8 | **13** |
| Plugin Hooks | 10 | **30+** |
| CLI Commands | 10 | **24+** |
| Total Packages | 10 | **27+** |

### 18.2 Code Metrics

| Metric | Value |
|--------|-------|
| Total packages | 27+ |
| Core source files | 79 files / 29 directories |
| Largest file | `provider.ts` (76KB) |
| Session orchestrator | `prompt.ts` (75KB) |
| Provider transforms | `transform.ts` (52KB) |
| Model processor | `processor.ts` (44KB) |
| TypeScript strict mode | Yes |
| Effect-TS adoption | Pervasive across core and application layers |
| GSD workflow engine | 10+ modules, 11 prompt templates, 40+ skills |

### 18.3 User Experience

- **Zero-config first run** — COdo guides through provider setup on first launch
- **Slash commands** — `/workflow`, `/goal`, `/scraper`, `/skills` for quick access
- **Command palette** — Fuzzy search for all available commands
- **Real-time streaming** — LLM responses appear character by character
- **Permission system** — Ask/allow/deny for tool execution with saved rules
- **Session persistence** — Resume exactly where you left off
- **Goal tracking** — Independent judge ensures goals are achieved
- **Doom loop detection** — Prevents LLM from getting stuck
- **Automatic compaction** — Manages context window overflow

---

## 19. Future Work

### 19.1 Short-term (3-6 months)

| # | Feature | Description |
|---|---------|-------------|
| 1 | VS Code Extension | Full IDE integration with COdo's workflow capabilities |
| 2 | Plugin Marketplace | Community-driven skill and workflow sharing ecosystem |
| 3 | Enhanced Local Model Support | Improved Ollama integration for offline development |
| 4 | Session Branching | Fork sessions to explore alternative approaches |

### 19.2 Medium-term (6-12 months)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Team Collaboration | Multi-user session sharing with conflict resolution |
| 2 | Visual Workflow Builder | GUI for creating custom workflow modes |
| 3 | CI/CD Integration | GitHub Actions and GitLab CI plugins |
| 4 | Cost Optimization | Automatic model selection based on task complexity and cost |

### 19.3 Long-term (12+ months)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Autonomous Coding Agent | Fully autonomous project completion with minimal human intervention |
| 2 | Cross-project Knowledge | Learn patterns across projects for better suggestions |
| 3 | Enterprise Dashboard | Team management, usage analytics, and policy enforcement |
| 4 | Mobile Companion | React Native app for session monitoring and quick commands |

---

## 20. References

1. Anomaly. (2025). *OpenCode: Terminal-native AI coding assistant.* GitHub. https://github.com/anomalyco/opencode
2. Effect-TS. (2025). *Effect: A fully-fledged functional effect system for TypeScript.* https://effect.website
3. Vercel. (2025). *AI SDK: Build AI-powered applications with React, Svelte, Vue, and Solid.* https://sdk.vercel.ai
4. SolidJS. (2025). *SolidJS: A declarative, efficient, and flexible JavaScript library.* https://solidjs.com
5. Drizzle ORM. (2025). *Drizzle ORM: TypeScript ORM that feels like writing SQL.* https://orm.drizzle.team
6. Bun. (2025). *Bun: An incredibly fast JavaScript runtime, bundler, test runner, and package manager.* https://bun.sh
7. SST. (2025). *SST: Build modern full-stack applications on AWS.* https://sst.dev
8. OpenAI. (2025). *GPT-4 Technical Report.* arXiv:2303.08774
9. Anthropic. (2025). *Claude: A family of large language models.* https://anthropic.com
10. Google. (2025). *Gemini: A family of highly capable multimodal models.* https://deepmind.google/technologies/gemini
11. Model Context Protocol. (2025). *MCP: A protocol for connecting AI assistants to tools.* https://modelcontextprotocol.io
12. Language Server Protocol. (2025). *LSP: Language Server Protocol specification.* https://microsoft.github.io/language-server-protocol
13. GSD-Pi. (2025). *Spec-driven development system for AI agents.* https://github.com/open-gsd/gsd-pi
14. Garry Tan. (2025). *GStack: 23-tool startup workflow.* https://github.com/garrytan/gstack
15. GitHub. (2025). *SpecKit: Spec-driven development toolkit.* https://github.com/github/spec-kit

---

## Appendix A: Installation & Quick Start

```bash
# Install globally
npm install -g @codo-ai/cli

# Launch in any project
codo

# Set a goal
/goal set "Build user authentication with JWT"

# Choose a workflow
/workflow gsd

# Start working
```

## Appendix B: Configuration Example

```jsonc
// .codo/opencode.jsonc
{
  "model": "claude-sonnet-4-5",
  "provider": "anthropic",
  "maxTokens": 8192,
  "contextWindow": 200000,
  "tools": {
    "webSearch": true,
    "codeExecution": true
  }
}
```

## Appendix C: Development Setup

```bash
git clone https://github.com/Mosalah4351/COdo
cd COdo
bun install

# Run TUI in dev mode
cd packages/opencode
bun dev

# Type-check
bun typecheck

# Run tests (from package dir, NOT repo root)
bun test
```

## Appendix D: Links

| Resource | URL |
|----------|-----|
| GitHub Repository | https://github.com/Mosalah4351/COdo |
| npm Package | https://www.npmjs.com/package/@codo-ai/cli |
| Documentation | https://codo-ai.vercel.app |
| OpenCode (Upstream) | https://github.com/anomalyco/opencode |
| GSD-Pi | https://github.com/open-gsd/gsd-pi |
| Contact | Mosalah4351@gmail.com |

---

