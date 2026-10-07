# COdo Core Features: A Complete Wiki

COdo is an advanced AI-powered coding assistant. This guide covers its four core pillars, their architecture, and how theyLie under the hood.

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Feature 1: `/workflow`](#feature-1-workflow)
4. [Feature 2: `/goal`](#feature-2-goal)
5. [Feature 3: `compose`](#feature-3-compose)
6. [Feature 4: `/scraper`](#feature-4-scraper)
7. [Synergies](#synergies)
8. [Getting Started](#getting-started)

---

## Core Philosophy

COdo is built on augmented engineering intelligence. Key tenets:
- **Context Preservation:** Manage and optimize LLM context
- **Explicit over Implicit:** Structured planning before implementation
- **Verification & Iteration:** Check at every stage
- **Composable Workflows:** Break tasks into verifiable steps

---

## Architecture Overview

### Frontend (TUI)
- **Built with:** Solid.js (reactive framework)
- **Rendering:** Custom terminal with Yoga layout engine
- **Key files:**
  - `packages/tui/src/app.tsx` (main entry)
  - `packages/tui/src/component/prompt/` (input handling)
  - `packages/tui/src/component/dialog-skill.tsx` (skills browser)
  - `packages/tui/src/workflow/` (workflow implementations)

### Core Engine
- **Runtime:** Bun (TypeScript)
- **Architecture:** Effect-TS for async operations
- **Key components:**
  - `packages/opencode/src/session/` (session management)
  - `packages/opencode/src/agent/` (LLM interaction)
  - `packages/opencode/src/config/` (configuration)

### Session Flow
1. **User Input** -> Prompt Handling (checks for `/` commands)
2. **Command Transformation** (e.g., `/scraper` triggers tool)
3. **Session Admission** -> Execution Scheduling
4. **Context Loading** (history + tools)
5. **LLM Streaming**
6. **Tool Execution**
7. **Result Storage & Rendering**

### Skill System
Skills are Markdown files with YAML frontmatter.

**Locations:**
- Workspace: `.opencode/skills/`
- Global: `~/.codo/skills/`

**Format:**
```markdown
---
name: skill-name
description: What it does
---

# Skill instructions here...
```

---\n
## Feature 1: `/workflow` - The Orchestration Engine

The `/workflow` command activates structured execution environments. Available workflows: GSD, Gstack, Speckit, Vibemode.

**Workflow Filtering:**
When selected, skills are filtered by:
- **Name prefix:** `gsd-`, `gstack-`, `speckit-`
- **Description tags:** `(gsd)`, `(gstack)`, `(speckit)`
- **Vibemode:** Shows only universal skills

---

### GSD (Get Shit Done) - Deep Dive

**Concept:** Autonomous workflow for long-running projects. Structures work into Milestones, Slices, and Tasks. Persists state in `.planning/` directory.

**How it works in COdo:**
Invoking `/workflow gsd` initializes the GSD context. It asks for a project goal, then generates `PLAN.md` files, tasks, and begins execution. Can self-correct on failures.

#### Architecture & Directory Structure

All state is plain text Markdown with YAML frontmatter. No SQLite or JSON database - the filesystem IS the database.

**The `.planning/` Directory:**
```
.planning/
├── config.json              # Per-project configuration
├── PROJECT.md               # Living project context
├── ROADMAP.md               # Phased execution roadmap
├── STATE.md                 # Short-term memory
├── REQUIREMENTS.md          # Locked requirements
├── MILESTONES.md            # Archive entries
├── BACKLOG.md               # Deferred ideas
├── LEARNINGS.md             # Captured learnings
├── THREADS.md               # Discussion threads
├── RETROSPECTIVE.md         # Post-milestone retros
├── CLAUDE.md                # Runtime instructions
│
├── phases/                  # Phase directories
│   ├── 01-foundation/
│   │   ├── 01-CONTEXT.md    # Implementation decisions
│   │   ├── 01-SPEC.md       # Phase specification
│   │   ├── 01-01-PLAN.md    # Plan #1
│   │   ├── 01-01-SUMMARY.md # Plan #1 summary
│   │   ├── 01-VERIFICATION.md
│   │   ├── 01-UAT.md        # Testing tracking
│   │   └── 01-USER-SETUP.md # External setup
│   └── 02-features/
│
├── codebase/                # Codebase mapping
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   ├── STACK.md
│   ├── CONVENTIONS.md
│   ├── CONCERNS.md
│   ├── INTEGRATIONS.md
│   └── TESTING.md
│
├── todos/                   # Pending/completed todos
├── debug/                   # Session tracking
├── quick/                   # Quick tasks
├── threads/                 # Discussion threads
├── seeds/                   # Idea seeds
├── research/                # Research artifacts
├── graphs/                  # Knowledge graphs
├── intel/                   # API surface docs
├── milestones/              # Archive files
└── workstreams/             # Isolated workstreams
```

#### Key Files and Their Purpose

**`STATE.md` (The Living Memory):**
- Project's short-term memory
- Read first in every workflow
- Updated after significant actions
- Kept under 100 lines

**`ROADMAP.md` (The Execution Plan):**
- Defines phased execution plan
- Phases numbered: 1, 2, 3 (planned); 2.1, 2.2 (urgent insertions)

**`{NN}-{MM}-PLAN.md` (Executable Plans):**
Core execution documents with YAML frontmatter.

**Frontmatter Schema:**
```yaml
---
phase: in-memory-name
plan: N-shape
type: execute
waves: N
depends_on: []
files_modified: []
autonomous: true
requirements: []
---
```

**Body Structure:**
```markdown
<objective>
[What this plan accomplishes]
Purpose: [Why this matters]
Output: [What artifacts will be created]
</objective>

<tasks>
<task type="auto">
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <read_first>path/to/reference.ext</read_first>
  <action>[Specific implementation]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>
</tasks>

<verification>
- [ ] [Specific test command]
- [ ] [Build/type check passes]
</verification>
```

**Task Types:**
- **auto:** Fully autonomous
- **checkpoint:human-verify:** Pauses for visual/functional verification
- **checkpoint:decision:** Pauses for implementation choices
- **checkpoint:human-action:** Pauses for manual steps

#### The 5-Step Phase Loop

1. **Discuss (discuss-phase):** Capture decisions before planning
2. **Plan (plan-phase):** Research, decompose, verify fit
3. **Execute (execute-phase):** Run in parallel waves with clean context
4. **Verify (verify-phase):** Walk through, diagnose, fix
5. **Ship (ship):** Create PR, archive phase, repeat

#### GSD Skills (The Agent Toolkit)

**Phase & Planning:**
- `gsd:autonomous`: Runs all remaining phases autonomously
- `gsd:plan-phase`: Creates detailed PLAN.md with verification loop
- `gsd:execute-phase`: Executes plans using wave-based parallelization
- `gsd:discuss-phase`: Gathers phase context via adaptive questioning
- `gsd:spec-phase`: Produces SPEC.md with falsifiable requirements
- `gsd:insert-phase`: Inserts urgent work as decimal phase (e.g., 72.1)
- `gsd:remove-phase`: Removes future phase, renumbers rest
- `gsd:add-phase`: Adds phase to current milestone

**Project Intelligence:**
- `gsd:map-codebase`: Analyzes codebase with parallel mappers
- `gsd:intel`: Queries/refreshes codebase intelligence
- `gsd:analyze-dependencies`: Analyzes phase dependencies
- `gsd:stats`: Displays project statistics

**Audit & Review:**
- `gsd:audit-milestone`: Audits milestone completion
- `gsd:audit-fix`: Autonomous audit-to-fix pipeline
- `gsd:audit-uat`: Cross-phase UAT audit
- `gsd:code-review`: Reviews source files
- `gsd:code-review-fix`: Auto-fixes review issues
- `gsd:eval-review`: Retroactively audits evaluation coverage
- `gsd:secure-phase`: Verifies threat mitigations
- `gsd:validate-phase`: Audits Nyquist validation gaps

**Workflow Utilities:**
- `gsd:check-todos`, `gsd:add-todo`, `gsd:note`
- `gsd:add-backlog`, `gsd:review-backlog`
- `gsd:health`, `gsd:cleanup`

**Session Management:**
- `gsd:context-save`, `gsd:context-restore`
- `gsd:pause-work`, `gsd:resume-work`
- `gsd:thread`, `gsd:session-report`

**Shipping:**
- `gsd:ship`, `gsd:pr-branch`, `gsd:sync-skills`

**Advanced:**
- `gsd:debug`, `gsd:forensics`, `gsd:undo`
- `gsd:explore`, `gsd:extract_learnings`
- `gsd:fast`, `gsd:quick`, `gsd:plant-seed`

**When to use:** Large, complex, multi-session projects requiring persistent, auditable plans.

---

### Gstack - Deep Dive

**Concept:** Collection of 23+ role-based tools acting as specialized team members (CEO, Designer, Eng Manager, QA, etc.).

**How it works in COdo:**
`/workflow gstack` transforms COdo into a team of specialists. Invoke rolesicism roles via slash commands.

#### Architecture: The Daemon Model

Core: Long-lived Chromium daemon that CLI talks to over localhost HTTP. Provides sub-second latency and persistent state.

**Why Bun:**
- **Compiled Binaries:** `bun build --compile` produces single ~58MB executable
- **Native SQLite:** Reads Chromium cookie DB directly
- **Native TypeScript:** No compilation step
- **Built-in HTTP Server:** `Bun.serve()` is fast and simple

**Key Components:**
- **CLI (Compiled Binary):** Reads state file, dispatches commands
- **Server (Bun.serve):** Handles HTTP, talks to Chromium via CDP
- **Chromium (Headless):** Persistent tabs, cookies, localStorage. Auto-starts, auto-shuts after 30min idle.

#### Security Model

- **Localhost Only:** Binds to 127.0.0.1
- **Dual-Listener Tunnel:** Separate tunnel listener with restricted allowlist for pair-agent
- **Bearer Token Auth:** Random UUID token per session
- **Cookie Security:** Decrypted in-memory, never written to disk in plaintext

#### The Ref System

Refs (`@e1`, `@e2`, `@c1`) address page elements without CSS selectors or XPath.

1. Agent runs: `$B snapshot -i`
2. Server calls Playwright's `page.accessibility.snapshot()`
3. Parser walks ARIA tree, assigns sequential refs
4. Builds Playwright Locator: `getByRole(role, { name }).nth(index)`
5. Stored in `Map<string, RefEntry>`
6. Later, `$B click @e3` resolves to Locator and clicks

Avoids DOM mutation, works with CSP, React/Vue/Svelte, Shadow DOM.

#### Skill Loading

Skills loaded from `~/.claude/skills/gstack/` or `~/.codo/skills/gstack/`

**SKILL.md Template System:**
Prevents docs from drifting from code:

```
SKILL.md.tmpl (human-written + placeholders)
      |
      v
gen-skill-docs.ts (reads source code)
      |
      v
SKILL.md (committed, auto-generated)
```

Placeholders filled from source at build time.

**Key Gstack Skills:**
- **Strategic & Planning:** `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`
- **Execution:** `/careful`, `/freeze`, `/guard`, `/unfreeze`
- **QA & Testing:** `/qa`, `/qa-only`, `/ios-qa`, `/investigate`, `/benchmark`, `/canary`
- **Security:** `/cso` (Chief Security Officer)
- **Documentation:** `/document-generate`, `/document-release`, `/diagram`, `/make-pdf`
- **Frontend & Design:** `/design-consultation`, `/design-shotgun`, `/design-html`, `/design-review`
- **DevOps:** `/ship`, `/land-and-deploy`
- **Browser:** `/browse`, `/open-gstack-browser`, `/setup-browser-cookies`

**When to use:** Rigorous, multi-perspective review. Perfect for zero-to-one features or critical production changes.

---

### Speckit - Deep Dive

**Concept:** Spec-Driven Development (SDD). Define what to build before building it.

**How it works in COdo:**
`/workflow speckit` initiates SDD process. Sequence:
1. `/speckit.constitution` -> `.specify/memory/constitution.md`
2. `/speckit.specify` -> `specs/<feature>/spec`
3. `/speckit.plan` -> `plan.md`
4. `/speckit.tasks` -> `tasks.md`
5. `/speckit.implement` -> executes tasks
6. `/speckit.converge` -> assesses against spec

#### Directory Structure

After `specify init`:
```
.specify/
├── memory/
│   └── constitution.md
├── scripts/
│   └── bash/
│       ├── check-prerequisites.sh
│       ├── create-new-feature.sh
│       ├── setup-plan.sh
│       └── setup-tasks.sh
└── templates/
    ├── plan-template.md
    ├── spec-template.md
    └── tasks-template.md

specs/
└── <feature-name>/
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    ├── contracts/
    ├── data-model.md
    ├── quickstart.md
    └── research.md

CLAUDE.md
```

**Key Commands:**
- `/speckit.constitution`: Project principles
- `/speckit.specify`: Requirements and user stories
- `/speckit.plan`: Technical implementation
- `/speckit.tasks`: Task breakdown
- `/speckit.implement`: Execute tasks
- `/speckit.converge`: Assess codebase
- `/speckit.clarify`: Clarify underspecified areas
- `/speckit.analyze`: Cross-artifact consistency
- `/speckit.checklist`: Quality checklists

**When to use:** Projects requiring clarity, maintainability, and verifiable requirements. Prevents vibe coding.

---

### Vibemode - Deep Dive

**Concept:** The un-workflow. Pure, reactive coding assistant. No persistent state, no milestones, no planning.

**How it works in COdo:**
`/workflow vibemode` (or default) puts COdo in basic state. Equivalent to ChatGPT/Claude chat interface for coding. Iterates in single session, context lost on exit.

**When to use:**
- **Rapid Prototyping and Spikes:** Test concepts, write quick scripts, explore APIs
- **Single-File Changes:** Small fixes or single functions
- **Non-Code Tasks:** Documentation, analysis, ad-hoc queries

---

## Feature 2: `/goal` - Outcome-Oriented Development

**Concept:** Defines the outcome of what you are trying to achieve. A declarative statement of intent.

**How it works in COdo:**
Define a goal with `/goal` command. COdo associates subsequent tasks, conversations, and code with that goal. Acts as north star for prioritization and focus. Can generate acceptance criteria.

**Commands:**
- `/goal set "[description]"`: Sets primary focus
- `/goal list`: Shows active and completed goals
- `/goal status`: Summary of progress

**Best Scenarios:**
- **Keeping Focus:** Prevents scope creep
- **Measuring Progress:** Turns open-ended into verifiable outcomes
- **Team Collaboration:** Shared understanding of success

---

## Feature 3: `compose` - The Multi-Agent Synthesizer

**Concept:** Orchestrates complex, multi-step tasks spanning multiple files/modules. Defines DAG (Directed Acyclic Graph) of operations.

**How it works in COdo:**
Break down large goals into smaller, parallelizable sub-tasks. COdo manages execution flow, handles dependencies, and parallelizes independent tasks. Powerful with GSD or Gstack.

**How to use:**
Describe complex task. COdo offers to decompose. Or use explicit compose sub-commands.

### Compose Agent Skills

- **`compose:brainstorm`**: Before creative work. Generates ideas and solutions.
- **`compose:plan`**: Before touching code. Creates detailed implementation plan.
- **`compose:tdd`**: Before implementation. Generates failing tests first.
- **`compose:subagent`**: Delegates sub-tasks to specialized agents.
- **`compose:worktree`**: Manages git worktrees for isolated feature work.
- **`compose:parallel`**: For 2+ independent tasks without shared state.
- **`compose:execute`**: For written plans in separate sessions with checkpoints.
- **`compose:debug`**: Systematic investigation before fixing.
- **`compose:feedback`**: Analyzes code review feedback before implementing.
- **`compose:review`**: Final quality gate before completion.
- **`compose:verify`**: Final check before committing or PRs.
- **`compose:merge`**: Intelligently merges feature branches.
- **`compose:report`**: Consolidates spec iterations into final report.
- **`compose:ask`**: When AI needs user decision/clarification.
- **`compose:new-skill`**: For creating/extending COdo skills.

**Best Scenarios:**
- Complex, Multi-File Refactors
- End-to-End Feature Implementation
- Debugging Complex Issues
- Implementing Review Feedback

---

## Feature 4: `/scraper` - Intelligent Data Extraction

**Concept:** Extracts structured/unstructured data from web, files, and APIs. Not just curl - intelligent extraction.

**How it works in COdo:**
Provide target (URL, file path, API endpoint) and description of what to extract. COdo fetches, parses, and processes data.

**Capabilities:**
- **Web Scraping:** Text, links, data from HTML. Handles dynamic content.
- **API Consumption:** REST/GraphQL with formatted responses.
- **Local File Ingestion:** .md, .txt, .csv, .json, etc.
- **Contextual Summarization:** Summarizes, extracts entities, answers questions.

**Legal-First Approach:**
Checks robots.txt and terms of service. Generates local Python scripts if agent tools are blocked.

**Best Practices & Use Cases:**

**Research & Context Gathering:**
- Scenario: "Find latest React 19 changes and summarize"
- Usage: `/scraper https://react.dev/blog react 19 changes`

**Comparative Analysis:**
- Scenario: "Compare cloud provider features"
- Usage: `/scraper https://aws.amazon.com/products/ and https://cloud.google.com/products/ compare features`

**Data Enrichment:**
- Scenario: "Enrich CSV with employee count and industry"
- Usage: `/scraper file:companies.csv enrich with employee count and industry`

**Best Scenarios:**
- **Up-to-Date Information:** When AI training data is stale
- **Large Dataset Ingestion:** Feed external data into context window
- **Automated Research:** Reconnaissance before starting tasks

---

## Synergies: How Features Work Together

1. **`/goal` + `/workflow gsd`:** Set high-level goal, break into milestones/tasks. Goal = why, workflow = how.

2. **`/workflow speckit` + `compose`:** Create rigorous spec, then execute in parallel with sub-agents.

3. **`/scraper` + `compose:tdd`:** Scrape latest API docs, then write tests before implementation.

4. **`/workflow gstack` + `compose:review`:** Use CEO/Eng reviews, then final quality gate before shipping.

---

## Getting Started: A Practical Workflow

1. **Set the Goal:**
   ```
   /goal set "Build user authentication with JWT and refresh tokens"
   ```

2. **Choose Workflow:**
   ```
   /workflow speckit
   ```

3. **Create Specification:**
   ```
   /speckit.specify -> "User logs in with email/password. System issues short-lived JWT and long-lived refresh token..."
   ```

4. **Plan Implementation:**
   ```
   /speckit.plan -> "Use Node.js, Express, Prisma, PostgreSQL..."
   ```

5. **Generate Tasks:**
   ```
   /speckit.tasks -> generates tasks.md
   ```

6. **Execute with Compose:**
   ```
   compose:execute -> "Follow tasks.md to implement authentication"
   ```

7. **Review and Verify:**
   ```
   compose:review
   compose:verify
   ```

8. **Merge:**
   ```
   compose:merge
   ```
