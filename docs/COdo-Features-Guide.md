# COdo Features Guide — Complete Reference

> The definitive reference for COdo's four major workflow systems: `/workflow`, `/goal`, Compose Agent, and `/scraper`. This guide covers every feature, every skill, every command, and every use case in detail.

---

## Table of Contents

1. [`/workflow` — External Workflow Engines](#1-workflow--external-workflow-engines)
   - [GSD (Get Stuff Done)](#gsd-get-stuff-done)
   - [Gstack](#gstack)
   - [Speckit](#speckit)
   - [Vibemode](#vibemode)
2. [`/goal` — Stop-Condition Goals](#2-goal--stop-condition-goals)
3. [Compose Agent](#3-compose-agent)
   - [Agent Overview](#agent-overview)
   - [Core Philosophy](#core-philosophy)
   - [All Compose Skills (16 total)](#all-compose-skills)
   - [Self-Extension System](#self-extension-system)
4. [`/scraper` — Legal Web Scraping](#4-scraper--legal-web-scraping)
5. [Quick Reference Matrix](#5-quick-reference-matrix)

---

## 1. `/workflow` — External Workflow Engines

COdo's `/workflow` command integrates external structured development workflows. Instead of free-form prompting, these systems enforce **explicit plans, clean execution contexts, real verification, and git history that tells the truth**.

### How `/workflow` Works in COdo

The `/workflow` command accepts an argument specifying which engine to use:

```
/workflow gsd
/workflow gstack
/workflow speckit
```

Each engine runs as a separate skill system within COdo, providing slash commands and structured processes that enforce quality at every step.

---

### GSD (Get Stuff Done)

#### What is GSD?

GSD is a **meta-prompting, context-engineering, and spec-driven development system** that enables AI agents to work autonomously for long periods without losing the big picture. It is developed by the Open GSD project.

**Key stats:** 738 GitHub stars, MIT licensed, v1.3.0 latest release.

#### GSD Pi: The Autonomous Agent

GSD Pi is a **local-first coding agent** that combines:

- **Guided terminal agent** — Start with `gsd`, configure providers, run planned or quick sessions
- **Autonomous project workflow** — Break work into milestones, slices, tasks; let auto mode plan, implement, verify, advance
- **Worktree-aware Git automation** — Keep implementation isolated while preserving reviewable main
- **Local project memory** — Store requirements, decisions, runtime notes, plans, summaries, validation evidence under `.gsd/`
- **Multi-provider model routing** — Use the provider your team already has, configurable defaults and per-phase model preferences
- **Extension surface** — Add project-specific commands, tools, skills, UI integrations
- **Terminal and web surfaces** — TUI by default, `gsd --web` for visual control plane

#### GSD Pi: Key Commands

| Command | Description |
|---------|-------------|
| `gsd` | Start the guided session, choose provider, open project |
| `/gsd config` | Configure settings (provider, model, preferences) |
| `/gsd auto` | Autonomous mode — plan, implement, verify, advance automatically |
| `/gsd quick "task"` | Quick task execution without full planning |
| `/gsd status` | Show project status, current milestone, pending tasks |
| `gsd upgrade` | Upgrade to latest version |
| `gsd --web` | Launch web UI for visual project management |

#### GSD Pi: Installation

**Guided installer (recommended):**
```bash
npx @opengsd/gsd-pi@latest
```

**Direct npm install:**
```bash
npm install -g @opengsd/gsd-pi@latest
```

**pnpm:**
```bash
pnpm setup
exec $SHELL -l
pnpm dlx @opengsd/gsd-pi@latest
```

**Windows PowerShell:**
```powershell
npm uninstall -g gsd-pi @opengsd/gsd-pi
Remove-Item "$env:USERPROFILE\.gsd\.update-check" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\.gsd\agent\managed-resources.json" -Force -ErrorAction SilentlyContinue
npx @opengsd/gsd-pi@latest
```

#### GSD Pi: Project State

All project state is stored locally under `.gsd/`:
- **Requirements** — what the project needs
- **Decisions** — architectural and design choices made
- **Runtime notes** — observations during implementation
- **Generated plans** — structured task graphs
- **Summaries** — progress reports
- **Validation evidence** — test results, verification output

This state is **durable** — it survives session restarts and can be loaded by the next run.

#### GSD: Repository Layout

| Path | Purpose |
|------|---------|
| `src/` | Core runtime resources and bundled extensions |
| `packages/` | CLI, agent, TUI, RPC, native bridge packages |
| `native/` | Native engine packaging and platform binaries |
| `studio/` | Desktop studio app |
| `web/` | Web UI and API surface |
| `docs/` | User and developer documentation |
| `scripts/` | Build, release, migration, maintenance |

#### Best Scenario for GSD

- **Long-running projects** with multiple milestones and deliverables
- **Teams needing durable project state** across sessions
- **Projects requiring structured verification** and evidence capture
- **Autonomous sprints** with human checkpoints
- **Multi-provider environments** where different phases use different models

#### Source

- Website: [opengsd.net](https://www.opengsd.net/)
- Docs: [docs.opengsd.net](https://docs.opengsd.net/)
- GitHub: [open-gsd/gsd-pi](https://github.com/open-gsd/gsd-pi)
- Discord: [discord.gg/8NnkKuepmQ](https://discord.gg/8NnkKuepmQ)
- License: MIT

---

### Gstack

#### What is Gstack?

Gstack is **Garry Tan's (YC CEO) opinionated collection of 23+ specialist tools** that turn Claude Code into a virtual engineering team. It's not a collection of tools — it's a **process** that follows the sprint order: **Think → Plan → Build → Review → Test → Ship → Reflect**.

**Key stats:** 114K GitHub stars, 16.9K forks, MIT licensed.

#### The Philosophy

> "I don't think I've typed like a line of code probably since December." — Andrej Karpathy

Garry Tan's 2026 run rate is **~810x his 2013 pace** (11,417 vs 14 logical lines/day). Year-to-date through April 18, 2026 has produced **240x the entire 2013 year**. AI wrote most of it.

Gstack is how he does it. It turns Claude Code into:
- A **CEO** who rethinks the product
- An **eng manager** who locks architecture
- A **designer** who catches AI slop
- A **reviewer** who finds production bugs
- A **QA lead** who opens a real browser
- A **security officer** who runs OWASP + STRIDE audits
- A **release engineer** who ships the PR

#### Installation

**Requirements:** Claude Code, Git, Bun v1.0+, Node.js (Windows only)

**Step 1: Install on your machine**
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

**Step 2: Team mode (auto-update for shared repos)**
```bash
(cd ~/.claude/skills/gstack && ./setup --team) && ~/.claude/skills/gstack/bin/gstack-team-init required && git add .claude/ CLAUDE.md && git commit -m "require gstack for AI-assisted work"
```

**Supported AI Agents (10 total):**

| Agent | Flag | Skills install to |
|-------|------|------------------|
| OpenAI Codex CLI | `--host codex` | `~/.codex/skills/gstack-*/` |
| COdo | `--host opencode` | `~/.config/opencode/skills/gstack-*/` |
| Cursor | `--host cursor` | `~/.cursor/skills/gstack-*/` |
| Factory Droid | `--host factory` | `~/.factory/skills/gstack-*/` |
| Slate | `--host slate` | `~/.slate/skills/gstack-*/` |
| Kiro | `--host kiro` | `~/.kiro/skills/gstack-*/` |
| Hermes | `--host hermes` | `~/.hermes/skills/gstack-*/` |
| GBrain (mod) | `--host gbrain` | `~/.gbrain/skills/gstack-*/` |

#### The Sprint: Skills in Order

Gstack skills run in the order a sprint runs. Each feeds into the next.

##### THINK Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/office-hours` | YC Office Hours | Six forcing questions that reframe your product before code. Pushes back on framing, challenges premises, generates implementation alternatives. Writes design doc that feeds every downstream skill. | **Start here.** Always. |
| `/plan-ceo-review` | CEO / Founder | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. | After `/office-hours` |
| `/plan-eng-review` | Eng Manager | Lock in architecture, data flow, diagrams (ASCII), edge cases, tests. Forces hidden assumptions into the open. | After CEO review |
| `/plan-design-review` | Senior Designer | Rates each design dimension 0-10, explains what a 10 looks like, edits plan to get there. AI Slop detection. Interactive — one question per design choice. | After eng review |
| `/plan-devex-review` | Developer Experience Lead | Interactive DX review: developer personas, competitor TTHW benchmarks, magical moment design, friction point tracing. 20-45 forcing questions. | For developer tools/APIs |
| `/design-consultation` | Design Partner | Build complete design system from scratch. Researches landscape, proposes creative risks, generates realistic product mockups. | Before implementation |
| `/spec` | Spec Author | Turn vague intent into precise, executable spec in five phases (why, scope, technical, draft, file). Quality gate blocks below 7/10. | For complex features |
| `/autoplan` | Review Pipeline | One command, fully reviewed plan. Runs CEO → design → eng review automatically. Surfaces only taste decisions for approval. | Quick planning |

##### BUILD Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/design-shotgun` | Design Explorer | Generate 4-6 AI mockup variants, open comparison board in browser, collect feedback, iterate. Taste memory learns what you like. | Explore design options |
| `/design-html` | Design Engineer | Turn mockup into production HTML/CSS. Pretext computed layout: text reflows, heights adjust, dynamic layouts. 30KB, zero deps. Detects React/Svelte/Vue. | After design approval |
| `/browse` | QA Engineer | Real Chromium browser, real clicks, real screenshots. ~100ms per command. | When agent needs eyes |
| `/pair-agent` | Multi-Agent Coordinator | Share browser with any AI agent. Scoped tokens, tab isolation, rate limiting, activity attribution. | Cross-agent work |

##### REVIEW Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/review` | Staff Engineer | Find bugs that pass CI but blow up in production. Auto-fixes obvious ones. Flags completeness gaps. | After every task/feature |
| `/investigate` | Debugger | Systematic root-cause debugging. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, stops after 3 failed fixes. | When debugging |
| `/design-review` | Designer Who Codes | Same audit as `/plan-design-review`, then fixes what it finds. Atomic commits, before/after screenshots. | After shipping UI |
| `/devex-review` | DX Tester | Live developer experience audit. Tests onboarding, navigates docs, times TTHW, screenshots errors. Compares against `/plan-devex-review` scores. | After shipping DX |
| `/codex` | Second Opinion | Independent code review from OpenAI Codex CLI. Three modes: review (pass/fail gate), adversarial challenge, open consultation. Cross-model analysis. | For important changes |

##### TEST Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/qa` | QA Lead | Test app in real browser, find bugs, fix with atomic commits, re-verify. Auto-generates regression tests for every fix. | After staging deploy |
| `/qa-only` | QA Reporter | Same methodology as `/qa` but report only. Pure bug report without code changes. | When you want bugs only |

##### SHIP Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/ship` | Release Engineer | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if missing. Auto-invokes `/document-release`. | Ready to merge |
| `/land-and-deploy` | Release Engineer | Merge PR, wait for CI and deploy, verify production health. One command from "approved" to "verified in production." | After PR approval |
| `/canary` | SRE | Post-deploy monitoring loop. Watches for console errors, performance regressions, page failures. | After production deploy |
| `/benchmark` | Performance Engineer | Baseline page load times, Core Web Vitals, resource sizes. Compare before/after on every PR. | Performance-sensitive work |

##### REFLECT Phase

| Skill | Specialist | What it does | When to use |
|-------|-----------|-------------|-------------|
| `/document-release` | Technical Writer | Update all project docs to match shipped code. Catches stale READMEs. Builds Diataxis coverage map. | After every ship |
| `/document-generate` | Documentation Author | Generate missing docs from scratch using Diataxis framework. Researches codebase first. | When docs are missing |
| `/retro` | Eng Manager | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. `/retro global` runs across all projects. | Weekly |
| `/learn` | Memory | Manage what gstack learned across sessions. Review, search, prune, export project-specific patterns. | Ongoing |

##### SAFETY Tools

| Skill | What it does | When to use |
|-------|-------------|-------------|
| `/careful` | Safety guardrails — warns before destructive commands (rm -rf, DROP TABLE, force-push) | When working near production |
| `/freeze` | Edit lock — restrict file edits to one directory | During debugging |
| `/guard` | Full safety — `/careful` + `/freeze` combined | Maximum safety for prod work |
| `/unfreeze` | Remove the `/freeze` boundary | After debugging |

##### UTILITY Tools

| Skill | What it does | When to use |
|-------|-------------|-------------|
| `/setup-browser-cookies` | Import cookies from real browser into headless session | Testing authenticated pages |
| `/setup-deploy` | One-time setup for `/land-and-deploy` | First deploy setup |
| `/setup-gbrain` | GBrain onboarding — PGLite local, Supabase, or remote | Persistent agent memory |
| `/sync-gbrain` | Re-index repo code into gbrain | After code changes |
| `/gstack-upgrade` | Self-updater — upgrade gstack to latest | Periodic updates |
| `/make-pdf` | Markdown in, publication-quality document out | Documentation |
| `/diagram` | English in, editable diagram out (mermaid + excalidraw + SVG/PNG) | Visual documentation |

#### Gstack: Power Tools

| Tool | What it does |
|------|-------------|
| `gstack-model-benchmark` | Cross-model benchmark — run same prompt through Claude, GPT, Gemini; compare latency, tokens, cost |
| `gstack-taste-update` | Design taste learning — writes approvals/rejections into persistent per-project taste profile |
| `gstack-ios-qa-daemon` | iOS QA daemon — Mac-side broker for iPhone over USB CoreDevice |
| `gstack-ios-qa-mint` | iOS allowlist manager — owner-grant CLI for tailnet allowlist |

#### Gstack: Continuous Checkpoint Mode

Set `gstack-config set checkpoint_mode continuous` and skills auto-commit work as you go with `WIP:` prefix and structured `[gstack-context]` body (decisions, remaining work, failed approaches). Survives crashes and context switches.

- `/context-restore` reads WIP commits to reconstruct session state
- `/ship` filter-squashes WIP commits before PR (preserving non-WIP commits)
- Push is opt-in via `checkpoint_push=true` — default is local-only

#### Gstack: Parallel Sprints

Gstack works well with one sprint. It gets interesting with ten running at once via [Conductor](https://conductor.build):

- One session running `/office-hours` on a new idea
- Another doing `/review` on a PR
- A third implementing a feature
- A fourth running `/qa` on staging
- Six more on other branches
- **Practical max: 10-15 parallel sprints**

#### Gstack: Review Routing Guide

| Building for... | Plan stage (before code) | Live audit (after shipping) |
|----------------|-------------------------|----------------------------|
| End users (UI, web app, mobile) | `/plan-design-review` | `/design-review` |
| Developers (API, CLI, SDK, docs) | `/plan-devex-review` | `/devex-review` |
| Architecture (data flow, perf, tests) | `/plan-eng-review` | `/review` |
| All of the above | `/autoplan` | — |

#### Best Scenario for Gstack

- **Solo founders** shipping products rapidly
- **Teams wanting structured review** on every PR
- **Projects needing design-to-code pipeline**
- **iOS development** with real device testing
- **Cross-agent coordination** (OpenClaw, Hermes, Codex, Cursor)
- **When you want "virtual team of 20" productivity**

#### Source

- GitHub: [garrytan/gstack](https://github.com/garrytan/gstack)
- License: MIT

---

### Speckit

#### What is Speckit?

Speckit is **GitHub's open-source toolkit for Spec-Driven Development (SDD)** — a methodology that puts specifications at the center of AI-assisted software development. Instead of jumping straight to code, you describe *what* to build, refine it through structured phases, and let your AI coding agent implement it.

**Key stats:** 115K GitHub stars, 10.2K forks, MIT licensed, 200+ contributors.

#### The SDD Philosophy

Spec-Driven Development **flips the script** on traditional software development. For decades, code was king — specifications were scaffolding we built and discarded. SDD changes this: **specifications become executable**, directly generating working implementations.

**Core principles:**
- **Intent-driven development** — specifications define the "what" before the "how"
- **Rich specification creation** — using guardrails and organizational principles
- **Multi-step refinement** — rather than one-shot code generation
- **Heavy reliance** on advanced AI model capabilities for specification interpretation

#### The 4-Phase Workflow

| Phase | Focus | Key Activities |
|-------|-------|---------------|
| **Spec** | Define what to build | Requirements, user stories, acceptance criteria |
| **Plan** | Technical implementation | Tech stack, architecture, data models, API contracts |
| **Tasks** | Actionable breakdown | Ordered task list with dependencies and parallel markers |
| **Implement** | Build it | Execute tasks following TDD, verify, ship |

#### Installation

**Requirements:** Linux/macOS/Windows, supported AI coding agent, Python 3.11+, Git

**Install with uv (recommended):**
```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

**Or with pipx:**
```bash
pipx install specify-cli --from git+https://github.com/github/spec-kit.git
```

#### Core Commands

| Command | Description |
|---------|-------------|
| `/speckit.constitution` | Create or update project governing principles and development guidelines |
| `/speckit.specify` | Define what you want to build (requirements and user stories) |
| `/speckit.clarify` | Clarify underspecified areas (recommended before `/speckit.plan`) |
| `/speckit.plan` | Create technical implementation plan with chosen tech stack |
| `/speckit.tasks` | Generate actionable task list from implementation plan |
| `/speckit.taskstoissues` | Convert task list into GitHub issues for tracking |
| `/speckit.implement` | Execute all tasks to build the feature |
| `/speckit.converge` | Assess codebase against spec/plan/tasks, append remaining work |
| `/speckit.analyze` | Cross-artifact consistency & coverage analysis |
| `/speckit.checklist` | Generate custom quality checklists |

#### Initialization

```bash
# New project
specify init my-project --integration copilot

# Current directory
specify init . --integration copilot

# With skills mode
specify init my-project --integration codex --integration-options="--skills"

# Force merge into non-empty directory
specify init . --force --integration copilot
```

#### Supported Integrations (30+)

Spec Kit works with 30+ AI coding agents:
- GitHub Copilot
- Claude Code
- Gemini CLI
- Codex CLI
- Cursor
- Windsurf
- Zed
- Forge
- Kiro
- OpenCode
- And many more

Run `specify integration list` to see all available integrations.

#### Extensions & Presets

**Extensions** add new capabilities:
```bash
specify extension search
specify extension add <extension-name>
```

**Presets** customize existing workflows:
```bash
specify preset search
specify preset add <preset-name>
```

**Bundles** package role-based setups:
```bash
specify bundle search
specify bundle install <bundle-id>
specify bundle list
```

Community presets include: AIDE (7-step lifecycle), Canon (baseline-driven), Product Forge (product-management), FX→.NET (.NET migration), MAQA (multi-agent QA).

#### Project Structure After Init

```
.
├── .specify
│   ├── memory
│   │   └── constitution.md
│   ├── scripts
│   │   └── bash/
│   │       ├── check-prerequisites.sh
│   │       ├── common.sh
│   │       ├── create-new-feature.sh
│   │       ├── setup-plan.sh
│   │       └── setup-tasks.sh
│   └── templates/
│       ├── CLAUDE-template.md
│       ├── plan-template.md
│       ├── spec-template.md
│       └── tasks-template.md
└── specs/
    └── 001-feature-name/
        ├── spec.md
        ├── plan.md
        ├── tasks.md
        ├── research.md
        └── contracts/
```

#### Development Phases

| Phase | Focus | Key Activities |
|-------|-------|---------------|
| **0-to-1 (Greenfield)** | Generate from scratch | High-level requirements → specs → plan → build |
| **Creative Exploration** | Parallel implementations | Multiple tech stacks, architecture experiments, UX patterns |
| **Iterative Enhancement (Brownfield)** | Modernize | Add features iteratively, modernize legacy, adapt processes |

#### Best Scenario for Speckit

- **Enterprise projects** with compliance requirements
- **Teams wanting structured specifications** before code
- **Projects needing traceable requirements**-to-implementation mapping
- **When you want quality gates** at every phase
- **Multi-agent environments** where different agents handle different phases

#### Source

- GitHub: [github/spec-kit](https://github.com/github/spec-kit)
- Docs: [github.github.com/spec-kit](https://github.github.com/spec-kit/)
- License: MIT

---

### Vibemode

#### What is Vibemode?

Vibemode is the **default free-form coding mode** in COdo — no structured workflow, no explicit plans, just you and the AI coding together. It's the "vibe coding" approach where you describe what you want and the AI implements it.

#### How it Works

- When no specific workflow is active, COdo operates in vibemode
- You describe what you want, the AI implements it
- No mandatory planning phases, no verification gates
- Fast iteration, but less structured

#### When to Use

- **Quick prototyping** and exploration
- **Small fixes** and one-off tasks
- **When you know exactly** what you want and just need it coded
- **Personal projects** where speed matters more than structure

#### When NOT to Use

- **Large features** (use GSD/Gstack/Speckit instead)
- **Team projects** (lack of verification is risky)
- **Production code** (no built-in review gates)
- **When you need accountability** (no evidence trail)

---

## 2. `/goal` — Stop-Condition Goals

#### What is `/goal`?

`/goal` is a per-session stop-condition system that keeps the AI running until an independent judge model decides the condition is satisfied (or genuinely impossible).

#### How it Works

1. **Set a goal:** `/goal <condition>`
2. **AI works continuously** toward that condition
3. **Judge evaluates** after each response using a separate model call
4. **Judge returns verdict:**
   - `{"ok": true, "reason": "evidence from transcript"}` — condition met, stop
   - `{"ok": false, "reason": "what's missing"}` — not yet met, continue
   - `{"ok": false, "impossible": true, "reason": "why"}` — genuinely unachievable
5. **AI continues** until judge approves or goal is declared impossible
6. **Clear:** `/goal clear`

#### Technical Implementation

The goal system is implemented in `packages/codo/src/session/goal.ts`:

- **State:** Lives in InstanceState (per project instance), keyed by sessionID
- **Judge model:** Separate model call that only reads the transcript
- **Re-entry counter:** Bounded by MAX_GOAL_REACT to prevent infinite loops
- **Judge system prompt:** Uses a strict JSON schema for verdicts
- **Temperature:** 0 for consistent evaluations
- **Telemetry:** Optional OpenTelemetry tracing for judge calls

#### The Judge System

The judge is a **separate model call** that:
- Only reads the transcript (not the working agent's context)
- Prevents "optimism bias" — the working agent can't fool the judge
- Uses a strict JSON schema for verdicts
- Quotes specific text from the transcript as evidence
- Only uses "impossible" when the condition is genuinely unachievable

**Judge system prompt excerpt:**
```
You are evaluating a stop-condition hook in COdo. Read the conversation
transcript carefully, then judge whether the user-provided condition
is satisfied.

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from transcript>"}
- {"ok": false, "reason": "<quote what is missing>"}
- {"ok": false, "impossible": true, "reason": "<explain why>"}
```

#### Example Usage

```
/goal All tests pass with 100% coverage
/goal The API returns correct data for all edge cases
/goal The UI matches the design mockup exactly
/goal The function handles all error cases documented in the README
/goal clear   (abort current goal)
```

#### Goal Events

The goal system publishes events via EventV2Bridge:
- `session.goal` — broadcast when goal changes (set, judged, cleared)
- TUI mirrors this to render active-goal indicator and latest judge verdict
- `goal: undefined` means no active goal

#### Best Scenario for `/goal`

- **Autonomous sprints** where you want the AI to keep working until a specific condition is met
- **Complex tasks** that need iterative refinement
- **When you want objective verification** without watching the process
- **Tasks where "done" is clearly defined** by a testable condition
- **Long-running tasks** that benefit from automated stopping criteria

---

## 3. Compose Agent

#### Agent Overview

The Compose Agent is COdo's built-in **orchestration agent** that manages complex development workflows with structured skills. It's a **project manager** that coordinates specialists (skills) to complete features.

**Activate:** Switch to the `compose` agent in COdo's agent selector.

**Color:** `#a7a3d8` (purple)

**Permissions:** Full tool access with `question: allow`, `skill: allow`

#### Core Philosophy

The Compose Agent follows these principles (from `packages/codo/src/agent/prompt/compose.txt`):

1. **No code before design** — every feature goes through brainstorming first
2. **TDD always** — write failing test first, then implement
3. **Evidence before claims** — verify before claiming completion
4. **Systematic debugging** — root cause before fixes
5. **Fresh context per task** — subagents get isolated context
6. **Structured decisions** — use `question` tool, not prose
7. **Simplicity** — minimum code that solves the stated problem

**Instruction Priority:**
1. User's explicit instructions (AGENTS.md, direct requests) — highest
2. Compose skills — override default system behavior
3. Default system prompt — lowest

#### Skill Invocation Flow

1. Receive user message
2. Check: does a skill clearly apply?
   - Yes → invoke the skill tool, announce "Using [skill] to [purpose]"
   - No → respond directly
3. If the skill has a checklist → create a task per item, follow in order
4. If no checklist → follow the skill's guidance directly

**Red Flags (skills you should have invoked but didn't):**

| Thought | Check |
|---------|-------|
| "I need more context first" | Skill check comes BEFORE clarifying questions |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first |
| "This doesn't need a formal skill" | If a skill exists and matches, use it |
| "I remember this skill" | Skills evolve. Read current version |
| "The skill is overkill" | If it matches, invoke it — skip parts that don't apply |

#### Brainstorm Skip Condition

Skip `compose:brainstorm` when ALL true:
- Task is a specific bug fix or well-specified change
- Requirements are fully stated (no design ambiguity)
- No architectural decisions needed

In these cases, proceed directly to `compose:debug`, `compose:tdd`, or implementation tools.

---

### All Compose Skills

#### `compose:brainstorm`

**Use when:** You MUST use this before any creative work — creating features, building components, adding functionality, or modifying behavior.

**Location:** `packages/codo/src/skill/compose/brainstorm/SKILL.md`

**The Process:**

1. **Explore project context** — check files, docs, recent commits
2. **Offer visual companion** (if topic involves visual questions)
3. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
4. **Propose 2-3 approaches** — with trade-offs and your recommendation
5. **Present design** — in sections scaled to complexity, get user approval after each
6. **Write design doc** (optional, multi-step features only) — save to `docs/compose/specs/YYYY-MM-DD-<topic>-design.md`
7. **Spec self-review** — check for placeholders, contradictions, ambiguity, scope
8. **User reviews written spec** — ask user to review before proceeding
9. **Transition to implementation** — invoke `compose:plan`

**Key Rules:**
- Do NOT write any code until the user approves the design
- One question per tool call
- Scale design sections to complexity (few sentences if straightforward, up to 200-300 words if nuanced)
- YAGNI ruthlessly — remove unnecessary features

**HARD-GATE:** No implementation until design is approved. Autonomous override: when no user available, skip approval and proceed.

---

#### `compose:plan`

**Use when:** You have a spec or requirements for a multi-step task, before touching code.

**Location:** `packages/codo/src/skill/compose/plan/SKILL.md`

**The Process:**

1. **Scope check** — if spec covers multiple independent subsystems, break into separate plans
2. **Map file structure** — which files created/modified, each with one clear responsibility
3. **Create bite-sized tasks** — each step is one action (2-5 minutes):
   - "Write the failing test" — step
   - "Run it to make sure it fails" — step
   - "Implement the minimal code to make the test pass" — step
   - "Run the tests and make sure they pass" — step
   - "Commit" — step
4. **Save plans to:** `docs/compose/plans/YYYY-MM-DD-<feature-name>.md`
5. **Self-review** — spec coverage, placeholder scan, type consistency
6. **Execution handoff** — ask user preference (subagent vs inline)

**Plan Document Header (required):**
```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended)
> or compose:execute to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]
```

**Task Structure:**
```markdown
### Task N: [Component Name]

**Covers:** [S3, S7]
**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
```

**No Placeholders:** Every step must contain actual content. These are plan failures:
- "TBD", "TODO", "implement later"
- "Add appropriate error handling"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code)

---

#### `compose:execute`

**Use when:** You have a written implementation plan to execute in a separate session with review checkpoints.

**Location:** `packages/codo/src/skill/compose/execute/SKILL.md`

**The Process:**

1. **Load and review plan** — read plan file, review critically, raise concerns
2. **Execute tasks** — mark in_progress, follow each step exactly, run verifications
3. **Complete development** — after all tasks, use `compose:report` then `compose:merge`

**Key Rules:**
- Follow plan steps exactly
- Don't skip verifications
- Stop when blocked, don't guess
- Never start on main/master without explicit user consent

---

#### `compose:subagent`

**Use when:** Executing implementation plans with independent tasks in the current session.

**Location:** `packages/codo/src/skill/compose/subagent/SKILL.md`

**The Process:**

1. **Read plan and extract tasks** — create a task per plan task
2. **Per task: Dispatch implementer** — fresh subagent with isolated context
3. **Per task: Two-stage review:**
   - Phase 1: Spec compliance review (git diff ONLY, no implementer report)
   - Phase 2: Code quality review (only if phase 1 flagged anything)
4. **Per task: Mark done** — only when both reviews pass
5. **Repeat for all tasks**
6. **Final review** — dispatch reviewer for entire implementation
7. **Merge** — use `compose:merge`

**Model Selection:**
- Mechanical tasks → fast, cheap model
- Integration tasks → standard model
- Architecture/design/review → most capable model

**Handling Implementer Status:**
- DONE → proceed to review
- DONE_WITH_CONCERNS → read concerns before review
- NEEDS_CONTEXT → provide missing context, re-dispatch
- BLOCKED → assess: context problem? more reasoning? too large? plan wrong?

---

#### `compose:parallel`

**Use when:** Facing 2+ independent tasks that can be worked on without shared state.

**Location:** `packages/codo/src/skill/compose/parallel/SKILL.md`

**The Pattern:**

1. **Identify independent domains** — group failures by what's broken
2. **Create focused agent tasks** — one clear problem, specific scope, clear goal
3. **Dispatch in parallel** — one concurrent tool call per problem domain
4. **Review and integrate** — read summaries, verify no conflicts, run full suite

**When NOT to use:**
- Failures are related (fix one might fix others)
- Need full context (understanding requires seeing entire system)
- Shared state (agents would interfere)

---

#### `compose:tdd`

**Use when:** Implementing any feature or bugfix, before writing implementation code.

**Location:** `packages/codo/src/skill/compose/tdd/SKILL.md`

**The Iron Law:**
```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**The Cycle:**

1. **RED — Write Failing Test**
   - One minimal test showing what should happen
   - One behavior, clear name, real code (no mocks unless unavoidable)

2. **Verify RED — Watch It Fail (MANDATORY)**
   - Confirm: test fails (not errors), failure message is expected, fails because feature missing

3. **GREEN — Minimal Code**
   - Write simplest code to pass the test
   - Don't add features, refactor, or "improve" beyond the test

4. **Verify GREEN — Watch It Pass (MANDATORY)**
   - Confirm: test passes, other tests still pass, output pristine

5. **REFACTOR — Clean Up**
   - Remove duplication, improve names, extract helpers
   - Keep tests green, don't add behavior

6. **Repeat** — next failing test for next feature

**If you wrote code before the test:** Delete it. Start over.

---

#### `compose:debug`

**Use when:** Encountering any bug, test failure, or unexpected behavior, before proposing fixes.

**Location:** `packages/codo/src/skill/compose/debug/SKILL.md`

**The Iron Law:**
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

**The Four Phases:**

**Phase 1: Root Cause Investigation**
1. Read error messages carefully
2. Reproduce consistently
3. Check recent changes (git diff, commits)
4. Gather evidence in multi-component systems
5. Trace data flow

**Phase 2: Pattern Analysis**
1. Find working examples in same codebase
2. Compare against references
3. Identify differences
4. Understand dependencies

**Phase 3: Hypothesis and Testing**
1. Form single hypothesis
2. Test minimally (smallest possible change)
3. Verify before continuing
4. If don't know → say so, ask for help

**Phase 4: Implementation**
1. Create failing test case (use `compose:tdd`)
2. Implement single fix
3. Verify fix
4. If fix doesn't work:
   - < 3 attempts: return to Phase 1
   - >= 3 attempts: **question the architecture**

**Red Flags — STOP and Follow Process:**
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "One more fix attempt" (when already tried 2+)

---

#### `compose:review`

**Use when:** Completing tasks, implementing major features, or before merging.

**Location:** `packages/codo/src/skill/compose/review/SKILL.md`

**When to Request Review:**
- **Mandatory:** After each task in subagent-driven development, after completing major feature, before merge to main
- **Optional:** When stuck (fresh perspective), before refactoring, after fixing complex bug

**The Process:**
1. Get git SHAs (`BASE_SHA`, `HEAD_SHA`)
2. Dispatch code reviewer subagent with crafted context
3. Act on feedback:
   - Critical → fix immediately
   - Important → fix before proceeding
   - Minor → note for later
   - Wrong → push back with reasoning

---

#### `compose:feedback`

**Use when:** Receiving code review feedback, before implementing suggestions.

**Location:** `packages/codo/src/skill/compose/feedback/SKILL.md`

**The Response Pattern:**
1. READ — complete feedback without reacting
2. UNDERSTAND — restate requirement in own words
3. VERIFY — check against codebase reality
4. EVALUATE — technically sound for THIS codebase?
5. RESPOND — technical acknowledgment or reasoned pushback
6. IMPLEMENT — one item at a time, test each

**Forbidden Responses:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" (before verification)

**When to Push Back:**
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack

---

#### `compose:verify`

**Use when:** About to claim work is complete, fixed, or passing, before committing or creating PRs.

**Location:** `packages/codo/src/skill/compose/verify/SKILL.md`

**The Iron Law:**
```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

**The Gate Function:**
1. IDENTIFY — what command proves this claim?
2. RUN — execute the FULL command (fresh, complete)
3. READ — full output, check exit code, count failures
4. VERIFY — does output confirm the claim?
5. ONLY THEN — make the claim with evidence

---

#### `compose:merge`

**Use when:** Implementation is complete, all tests pass, and you need to decide how to integrate.

**Location:** `packages/codo/src/skill/compose/merge/SKILL.md`

**The Process:**

1. **Verify tests** — run project's test suite
2. **Detect environment** — normal repo vs worktree
3. **Determine base branch** — main or master
4. **Present options:**
   - Merge locally
   - Create PR
   - Keep as-is
   - Discard
5. **Execute choice** — handle merge, push, or cleanup
6. **Cleanup workspace** — only for Options 1 and 4

---

#### `compose:worktree`

**Use when:** Starting feature work that needs isolation from current workspace.

**Location:** `packages/codo/src/skill/compose/worktree/SKILL.md`

**The Process:**

1. **Detect existing isolation** — check if already in worktree
2. **Ask user preference** — always/never/this time
3. **Create isolated workspace** — native tools first, git worktree fallback
4. **Project setup** — auto-detect and run (npm install, cargo build, etc.)
5. **Verify clean baseline** — run tests

---

#### `compose:ask`

**Use when:** You need a decision, clarification, or approval from the user.

**Location:** `packages/codo/src/skill/compose/ask/SKILL.md`

**The Rule:** Route every decision through the `question` tool. Never stop the loop with natural-language questions.

**When No User Available:**
1. Question tool absent → decide and proceed directly
2. `[Never-Ask]` response → re-pick from options, state choice and reasoning

**Autonomous Decision Principles:**
- Prefer text-only over visual/interactive paths
- Prefer non-interactive over anything needing user present
- Prefer minimal-scope path
- When approval is the only thing requested → treat as granted
- **Exception:** Destructive/irreversible actions never auto-approve

---

#### `compose:report`

**Use when:** After implementation is verified and before merge.

**Location:** `packages/codo/src/skill/compose/report/SKILL.md`

**The Process:**
1. Identify all related specs and plans
2. Read implemented code (code is truth, not specs)
3. Draft main sections: What Was Built, Architecture, Usage, Verification
4. Draft Journey Log — brief flat bullet list, max 5 items
5. Assemble report with frontmatter
6. Self-review — verify against code, check for placeholders
7. Mark specs and plans with NOTE headers
8. Commit and transition to `compose:merge`

**Report Structure:**
```markdown
---
feature: <feature-name>
status: delivered
specs:
  - docs/compose/specs/<spec-1>.md
plans:
  - docs/compose/plans/<plan>.md
branch: <branch-name>
commits: <first-sha>..<last-sha>
---

# [Feature Name] — Final Report

## What Was Built
## Architecture
### Design Decisions
## Usage
## Verification
## Journey Log
## Source Materials
```

---

#### `compose:new-skill`

**Use when:** Creating new skills, editing existing skills, or verifying skills work before deployment.

**Location:** `packages/codo/src/skill/compose/new-skill/SKILL.md`

**The Iron Law:**
```
NO SKILL WITHOUT A FAILING TEST FIRST
```

**TDD Mapping for Skills:**

| TDD Concept | Skill Creation |
|-------------|----------------|
| Test case | Pressure scenario with subagent |
| Production code | Skill document (SKILL.md) |
| Test fails (RED) | Agent violates rule without skill |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes while maintaining compliance |

---

#### `self-extend`

**Use when:** You want to evolve your own capabilities — create new tools, hooks, skills, or override built-in tools.

**Location:** `packages/codo/src/skill/compose/self-extend/SKILL.md`

**File Locations:**

| Type | Path | Hot-reload |
|------|------|-----------|
| Tools | `.codo/tools/*.ts` | next turn |
| Hooks | `.codo/hooks/*.ts` | next turn |
| Skills | `.codo/skills/*/SKILL.md` | next turn |

**Tool Example:**
```ts
import { tool } from "@codo/plugin"

export default tool({
  description: "What this tool does",
  args: {
    param1: tool.schema.string().describe("Parameter description"),
  },
  async execute(args, ctx) {
    return `Result: ${args.param1}`
  },
})
```

**Hook Events:**

| Event | Capability |
|-------|-----------|
| `tool.execute.before` | Modify args or cancel=true to block |
| `tool.execute.after` | Modify tool output |
| `tool.definition` | Modify tool description/parameters |
| `chat.params` | Modify temperature, topP, maxOutputTokens |
| `experimental.chat.system.transform` | Append to system prompt |
| `experimental.chat.messages.transform` | Modify message list sent to LLM |
| `permission.ask` | Auto-allow/deny permission requests |
| `shell.env` | Inject environment variables |

**Tool Override:** A custom tool with the same id as a built-in replaces it.

---

## 4. `/scraper` — Legal Web Scraping

#### What is `/scraper`?

The `/scraper` skill is a **compliance-first, adaptive web scraping system** that enforces legal and ethical guidelines before any data extraction. It's built into COdo at `.opencode/skills/web-scraping.md`.

#### How it Works

The scraper follows a strict 6-step process:

##### Step 0 — MANDATORY: Legal & Ethical Checklist

**Before touching any target page, run ALL four checks:**

**0-A: Read `robots.txt`**
```
WebFetch: https://www.{target-domain}/robots.txt
```

Parse directives:

| Directive | Action |
|-----------|--------|
| `User-agent: *` | Rules that apply to every bot — this includes you |
| `Disallow: /path` | **Must not** fetch that path or anything under it |
| `Allow: /path` | Explicitly permitted even if parent Disallow applies |
| `Crawl-delay: N` | Wait at least N seconds between every request |
| `Sitemap: URL` | Use this for URL discovery |

**If target URL is blocked:**
1. State which Disallow rule applies (quote exactly)
2. Offer site's official API if one exists
3. Generate a local Python script the user can run
4. Do not repeat refusal more than once

**0-B: Check Terms of Service**
```
WebSearch: "{domain}" terms of service automated access scraping bots
```

| Signal | Action |
|--------|--------|
| "no automated access", "no bots" | **STOP** — inform user, suggest API |
| "personal / non-commercial use only" | Proceed but note limitation |
| No relevant clause found | Proceed conservatively |

**0-C: URL Discovery via Sitemap**
```
WebFetch: https://www.{domain}/sitemap.xml
```

Common variants (try in order):
1. `/sitemap.xml`
2. `/sitemap_index.xml`
3. `/sitemap.xml.gz`
4. The `Sitemap:` value in robots.txt

**0-D: Rate Limiting**

| Situation | Max rate |
|-----------|----------|
| `Crawl-delay: N` in robots.txt | Honour exactly |
| No delay, small dataset (<20 pages) | 1 request per 2 seconds |
| No delay, large dataset (20-50 pages) | 1 request per 5 seconds |
| More than 50 pages | STOP — suggest API or bulk export |
| JSON/REST API endpoint | Up to 1 request per second |

##### Step 1 — Find the Right URL

**Strategy A — WebSearch (fastest)**
```
WebSearch: site:{domain} {topic the user wants}
```

**Strategy B — Sitemap scan** — filter `<loc>` entries by URL pattern

**Strategy C — Homepage navigation** — scan `<nav>`, `<header>` links

**Prefer:** search/category URL → sitemap URL → navigation URL → homepage

##### Step 2 — Fetch & Diagnose the Page

```
WebFetch: {URL from Step 1}
```

**Diagnose response:**

| What you see | Diagnosis | Next step |
|-------------|-----------|-----------|
| Visible text content | Static HTML or SSR | → Parse directly |
| `<div id="root"></div>` | SPA / client-side JS | → Step 2-B |
| `<script id="__NEXT_DATA__">` | SSR with embedded JSON | → Extract JSON |
| `{"data":` or `{"results":` | API/JSON response | → Parse JSON |
| CAPTCHA page | Bot detection | STOP |
| HTTP 401/403 | Access denied | STOP |
| HTTP 429 | Rate limited | Wait 30s, retry once |
| Login redirect | Auth required | STOP |

**JS-Rendered Sites (SPA Fallback Ladder):**

1. **Embedded JSON** — look for `__NEXT_DATA__`, `__NUXT_DATA__`, `window.__INITIAL_STATE__`
2. **Exposed API** — look for `/api/products`, `/graphql` endpoints
3. **SSR search URL** — try `/search?q=`, `/products?search=`
4. **Playwright code** — offer to write script, don't run

##### Step 3 — Parse & Extract

**3-A: JSON in Script Tags**
```python
import json, re
patterns = [
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    r'window\.__INITIAL_STATE__\s*=\s*({.*?})(?:;|\n)',
]
```

**3-B: JSON/REST API Response**
```python
data = json.loads(raw)
for key in ['data', 'results', 'items', 'products', 'listings']:
    if key in data: items = data[key]
```

**3-C: HTML Parsing — Adaptive Selector Discovery**

Never hard-code selectors. Use fingerprinting:
1. Find repeating item container (class appearing 5-50 times)
2. Find titles (h1-h4 or class containing 'title', 'name', 'heading')
3. Find prices (currency symbols or digit patterns)
4. Find links (path segments like `/product`, `/item`, `/dp/`)
5. Find images (`<img src>`, `<img data-src>`)

**3-D: Content-Type Aware Extraction**

| Content type | Core fields | Extra fields |
|-------------|-------------|--------------|
| Products | title, price, currency, URL | rating, reviews, image, availability |
| Articles | title, date, author, URL | excerpt, category, reading time |
| Job listings | title, company, location, URL | salary, type, posted date |
| Real estate | title, price, location, URL | area, bedrooms, bathrooms |
| Directory | name, address, phone, URL | hours, rating, category |
| Events | title, date, venue, URL | price, organiser, description |

##### Step 4 — Resolve & Validate

- Resolve relative URLs to absolute
- Clean prices and text
- Deduplicate by URL

##### Step 5 — Output Format

```markdown
## Results: {user's query} — {N} items found
> Source: {URL} | Scraped: {date} | Pages fetched: {X}

| # | {Field 1} | {Field 2} | {Field 3} | Link |
|---|-----------|-----------|-----------|------|
| 1 | ...       | ...       | ...       | [View](...) |
```

##### Step 6 — Error Handling

| Problem | What to do |
|---------|-----------|
| robots.txt disallows | State rule once, suggest API, generate local script |
| ToS prohibits | Paraphrase once, suggest API, generate local script |
| HTTP 403 | Generate Playwright local script |
| HTTP 429 | Wait 30s, retry once |
| CAPTCHA | Generate `headless=False` Playwright script |
| Login redirect | Stop, note auth requirement, offer Playwright script |
| SPA shell | Offer Playwright script |
| 0 items | Log container class count, re-run fingerprinting |

##### Local Script Fallback

When direct fetching is blocked, generate local Python scripts:

**Static sites:**
```python
import requests
from bs4 import BeautifulSoup
# requests + BeautifulSoup
```

**JS-heavy sites:**
```python
from playwright.async_api import async_playwright
# Playwright with real browser
```

#### What NOT to Do

- Do not use own fetch tools on robots.txt-blocked paths
- Do not spoof or rotate User-Agent strings
- Do not solve or bypass CAPTCHAs programmatically
- Do not scrape pages requiring authentication
- Do not collect personal data without legal basis
- Do not fire requests faster than Crawl-delay
- Do not re-attempt 403 by tweaking headers
- Do not scrape more than 50 pages in one session
- Do not assume selectors from one site work on another
- Do not repeat refusal more than once

#### Best Scenario for `/scraper`

- **Price monitoring** and comparison shopping
- **Competitive analysis** and market research
- **Content aggregation** from news sites
- **Job listing collection**
- **Real estate data** gathering
- **Any scenario** where structured data needs extraction from websites

---

## 5. Quick Reference Matrix

| Scenario | Recommended Tool |
|----------|-----------------|
| Quick fix or prototype | Vibemode (default) |
| Complex feature with clear condition | `/goal` |
| Long-running project with milestones | GSD |
| Solo founder shipping fast | Gstack |
| Enterprise with compliance | Speckit |
| Need orchestration + TDD | Compose Agent |
| Extract data from websites | `/scraper` |
| Team project with reviews | Gstack `/review` or Compose |
| Autonomous sprint | `/goal` + GSD or Gstack |
| Design-to-code pipeline | Gstack `/design-shotgun` → `/design-html` |
| Security audit | Gstack `/cso` |
| iOS development | Gstack `/ios-qa` |
| Cross-agent coordination | Gstack `/pair-agent` |
| Persistent agent memory | Gstack `/setup-gbrain` |
| Structured specifications | Speckit `/speckit.specify` |
| Bug fixing with root cause | Compose `compose:debug` |
| Test-driven development | Compose `compose:tdd` |
| Parallel task execution | Compose `compose:parallel` |

---

*Last updated: June 2026*
*COdo v2.0.0 — Complete Features Guide*
