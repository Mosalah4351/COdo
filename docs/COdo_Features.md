# COdo Core Features: A Complete Guide

COdo is an advanced AI-powered coding assistant designed for maximum developer productivity. It transcends simple code completion by integrating structured workflows, goal-oriented tracking, and a sophisticated multi-agent architecture. This guide provides a comprehensive encyclopedia of COdo's four core pillars, explaining their functionality, synergies, and best practices for professional software engineering.

## Table of Contents

1.  [Core Philosophy](#core-philosophy)
2.  [Feature 1: `/workflow` - The Orchestration Engine](#feature-1-workflow---the-orchestration-engine)
    -   [GSD (Get Shit Done)](#gsd-get-shit-done)
    -   [Gstack](#gstack)
    -   [Speckit](#speckit)
    -   [Vibemode](#vibemode)
3.  [Feature 2: `/goal` - Outcome-Oriented Development](#feature-2-goal---outcome-oriented-development)
4.  [Feature 3: `compose` - The Multi-Agent Synthesizer](#feature-3-compose---the-multi-agent-synthesizer)
5.  [Feature 4: `/scraper` - Intelligent Data Extraction](#feature-4-scraper---intelligent-data-extraction)
6.  [Synergies: How Features Work Together](#synergies-how-features-work不同意
7.  [Getting Started: A Practical Workflow](#getting-started-a-practical-workflow)

---

## Core Philosophy

COdo is built on the principle of **augmented engineering intelligence**. It doesn't replace the developer but acts as a force multiplier. The core philosophy is structured around several key tenets:

*   **Context Preservation:** AI has a limited context window. COdo's primary goal is to manage and optimize the context fed to the LLM, ensuring that at every step, the AI has the *exact* right information needed to perform a task.
*   **Explicit over Implicit:** Vague prompts lead to vague results. COdo encourages structured, explicit planning and specification before implementation.
*   **Verification & Iteration:** Code that compiles isn't enough. COdo integrates verification at every stage, from planning to post-implementation testing.
*   **Composable Workflows:** Complex tasks are broken down into smaller, manageable, and verifiable steps (compositions) that can be run, debugged, and reused independently.

---

## Feature 1: `/workflow` - The Orchestration Engine

The `/workflow` command is the entry point to COdo's structured execution environments. It allows you to select and activate a predefined or custom workflow that dictates how COdo will approach your task. A workflow is essentially a high-level strategy that orchestrates the AI's behavior. COdo integrates several powerful workflow philosophies, primarily **GSD**, **Gstack**, and **Speckit**, along with a lightweight mode called **Vibemode**.

### GSD (Get Shit Done)

**Concept:**
GSD is a terminal-native, autonomous workflow engine designed for long-running, complex projects. It structures work into **Milestones**, **Slices**, and **Tasks**. It maintains persistent project state in a local `.gsd/` directory, making it resilient to context loss. When you select the GSD workflow, COdo becomes a project manager, breaking down your high-level request into an actionable, trackable plan.

**How it works in COdo:**
When you invoke `/workflow gsd`, COdo initializes the GSD context. It will ask you to define a project goal or a milestone. It then uses its internal planning engine to generate a `plan.md`, a series of tasks, and begins execution. GSD is particularly powerful because it can self-correct: if a task fails, it will attempt to debug, re-plan, and continue.

**GSD Skills (The Agent Toolkit):**
GSD is not just one monolithic process; it's a collection of specialized "skills" that the agent can invoke. These are high-level capabilities that represent common software engineering tasks. You can think of them as high-level macros or super-commands. Here is a comprehensive list of the GSD skills and their descriptions:

*   **Phase & Planning Management:**
    *   `gsd:autonomous`: Runs all remaining phases autonomously, managing the discussion, planning, and execution per phase.
    *   `gsd:plan-phase`: Creates a detailed phase plan (`PLAN.md`) with a verification loop.
    *   `gsd:execute-phase`: Executes all plans in a phase using wave-based parallelization.
    *   `gsd:discuss-phase`: Gathers phase context through adaptive questioning before planning.
    *   `gsd:spec-phase`: Produces a `SPEC.md` with falsifiable requirements before implementation begins.
    *   `gsd:ai-integration-phase`: Generates an AI design contract (`AI-SPEC.md`) for building AI systems.
    *   `gsd:insert-phase`: Inserts urgent work as a decimal phase (e.g., `72.1`) between existing phases.
    *   `gsd:remove-phase`: Removes a future phase from the roadmap and renumbers subsequent phases.
    *   `gsd:add-phase`: Adds a phase to the end of the current milestone in the roadmap.

*   **Project Intelligence & Analysis:**
    *   `gsd:map-codebase`: Analyzes the codebase with parallel mapper agents to produce `.planning/codebase/` documents.
    *   `gsd:intel`: Queries, inspects, or refreshes codebase intelligence files in `.planning/intel/`.
    *   `gsd:analyze-dependencies`: Analyzes phase dependencies and suggests `Depends on` entries for `ROADMAP.md`.
    *   `gsd:stats`: Displays project statistics such as phases, plans, requirements, git metrics, and timeline.

*   **Audit, Review & Quality Assurance:**
    *   `gsd:audit-milestone`: Audits milestone completion against original intent before archiving.
    *   `gsd:audit-fix`: An autonomous audit-to-fix pipeline that finds issues, classifies them, fixes them, tests them, and commits.
    *   `gsd:audit-uat`: Cross-phase audit of all outstanding UAT (User Acceptance Testing) and verification items.
    *   `gsd:code-review`: Reviews source files changed during a phase for bugs, security issues, and code quality.
    *   `gsd:code-review-fix`: Auto-fixes issues found in `REVIEW.md` by spawning a fixer agent.
    *   `gsd:eval-review`: Retroactively audits an executed AI phase's evaluation coverage and produces an actionable `EVAL-REVIEW.md`.
    *   `gsd:secure-phase`: Retroactively verifies threat mitigations for a completed phase.
    *   `gsd:validate-phase`: Retroactively audits and fills Nyquist validation gaps for a completed phase.
    *   `gsd:ui-review`: Retroactive 6-pillar visual audit of implemented frontend code.

*   **Workflow Management & Utilities:**
    *   `gsd:check-todos`: Lists pending todos and selects one to work on.
    *   `gsd:add-todo`: Captures an idea or task as a todo from the current conversation context.
    *   `gsd:note`: A zero-friction idea capture tool. Append, list, or promote notes to todos.
    *   `gsd:add-backlog`: Adds an idea to the backlog parking lot (`999.x` numbering).
    *   `gsd:review-backlog`: Reviews and promotes backlog items to active milestones.
    *   `gsd:health`: Diagnoses planning directory health and optionally repairs issues.
    *   `gsd:cleanup`: Archives accumulated phase directories from completed milestones.

*   **Session & Context Management:**
    *   `gsd:context-save`: Saves the current working context.
    *   `gsd:context-restore`: Restores a working context saved earlier.
    *   `gsd:pause-work`: Creates a context handoff when pausing work mid-phase.
    *   `gsd:resume-work`: Resumes work from a previous session with full context restoration.
    *   `gsd:thread`: Manages persistent context threads for cross-session work.
    *   `gsd:session-report`: Generates a session report with token usage, work summary, and outcomes.

*   **Shipping & Collaboration:**
    *   `gsd:ship`: Creates a PR, runs a review, and prepares for merge after verification passes.
    *   `gsd:pr-branch`: Creates a clean PR branch by filtering out `.planning/` commits.
    *   `gsd:sync-skills`: Syncs managed GSD skills across runtime roots.

*   **Advanced & Debugging:**
    *   `gsd:debug`: Systematic debugging with persistent state across context resets.
    *   `gsd:forensics`: A post-mortem investigation tool for failed GSD workflows.
    *   `gsd:undo`: Safe git revert that rolls back phase or plan commits using the phase manifest.
    *   `gsd:explore`: Socratic ideation and idea routing before committing to plans.
    *   `gsd:extract_learnings`: Extracts decisions, lessons, patterns, and surprises from completed phase artifacts.
    *   `gsd:fast`: Executes a trivial task inline with no subagents or planning overhead.
    *   `gsd:quick`: Like `gsd:fast`, but with GSD guarantees like atomic commits and state tracking.
    *   `gsd:plant-seed`: Captures a forward-looking idea with trigger conditions for future milestones.

**When to use:**
Use GSD for large, complex projects that will take multiple sessions. It's ideal when you need a persistent, auditable plan that survives context loss. For example, "Implement the entire user authentication system" or "Refactor the database layer."

### Gstack

**Concept:**
Gstack is the brainchild of Garry Tan (President & CEO of Y Combinator) and represents a "virtual engineering team" living inside your terminal. It's a collection of 23+ opinionated, role-based tools that act as specialized team members (CEO, Designer, Eng Manager, QA, etc.). When you select the Gstack workflow, COdo gains access to these personas.

**How it works in COdo:**
Activating `/workflow gstack` transforms COdo from a generic assistant into a team of specialists. You can then invoke specific roles using slash commands (e.g., `/office-hours` for planning, `/review` for code quality checks). Gstack is deeply integrated with Claude Code's native capabilities and other AI agents.

**Key Gstack Skills (Roles):**
*   **Strategic & Planning:** `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`.
*   **Execution & Implementation:** `/careful`, `/freeze`, `/guard`, `/unfreeze`.
*   **Quality Assurance & Testing:** `/qa`, `/qa-only`, `/ios-qa`, `/investigate`, `/benchmark`, `/canary`.
*   **Security & Analysis:** `/cso` (Chief Security Officer).
*   **Documentation & Reporting:** `/document-generate`, `/document-release`, `/diagram`, `/make-pdf`.
*   **Frontend & Design:** `/design-consultation`, `/design-shotgun`, `/design-html`, `/design-review`.
*   **DevOps & Shipping:** `/ship`, `/land-and-deploy`.
*   **Agent & Browser Management:** `/browse`, `/open-gstack-browser`, `/setup-browser-cookies`.

**When to use:**
Use Gstack when you want a rigorous, multi-perspective review of your work. It's perfect for "zero-to-one" features or critical production changes where you need the AI to "think bigger" and catch issues before they ship. It is the gold standard for high-quality, production-grade development.

### Speckit

**Concept:**
Speckit is a toolkit for **Spec-Driven Development (SDD)**. It's a formal methodology that asserts you should "define what to build before building it." Instead of jumping straight to code, Speckit guides you through a structured process of creating a detailed specification, which then becomes the blueprint for implementation.

**How it works in COdo:**
Invoking `/workflow speckit` initiates the SDD process. COdo will guide you through its core commands, which emitted by the `specify` CLI tool, which typically follow this sequence:
1.  **`/speckit.constitution`**: Establishes the project's governing principles and technical standards.
2.  **`/speckit.specify`**: Creates the functional specification (`spec.md`), focusing on *what* and *why*.
3.  **`/speckit.plan`**: Generates a technical implementation plan (`plan.md`), where you specify the *how* (tech stack, architecture).
4.  **`/speckit.tasks`**: Breaks the plan down into a granular, actionable task list (`tasks.md`).
5.  **`/speckit.implement`**: Executes the tasks in order, following the specified plan.
6.  **`/speckit.converge`**: Assesses the final codebase against the original spec and appends any remaining work as new tasks.

**Key Speckit Commands:**
*   **`/speckit.constitution`**: Creates project principles and development guidelines.
*   **`/speckit.specify`**: Defines what to build (requirements and user stories).
*   **`/speckit.plan`**: Creates technical implementation plans.
*   **`/speckit.tasks`**: Generates an actionable task list.
*   **`/speckit.implement`**: Executes all tasks to build the feature.
*   **`/speckit.converge`**: Assesses the codebase against the spec.
*   **`/speckit.clarify`**: Clarifies underspecified areas before planning.
*   **`/speckit.analyze`**: Cross-artifact consistency and coverage analysis.
*   **`/speckit.checklist`**: Generates custom quality checklists.

**When to use:**
Use Speckit for projects where clarity, maintainability, and adherence to requirements are paramount. It's excellent for team projects, complex features with many edge cases, or when you need a formal, verifiable paper trail of why a feature was built a certain way. It prevents "vibe coding" by enforcing a spec-first discipline.

### Vibemode

**Concept:**
Vibemode is the "un-workflow." It strips away all the structure, planning, and verification of GSD, Gstack, and Speckit. In Vibemode, COdo operates as a pure, reactive coding assistant. You give it a prompt, and it generates code. There is no persistent state, no milestone tracking, and no multi-step planning.

**How it works in COdo:**
`/workflow vibemode` (or simply not selecting a workflow) puts COdo in its most basic state. It's equivalent to using a standard ChatGPT or Claude chat interface for coding. You iterate in a single session, and the context is lost when the session ends (unless you manually save it).

**When to use:**
Despite the name, Vibemode is not useless. It is the perfect tool for:
*   **Rapid Prototyping and Spikes:** When you need to test a concept, write a quick script, or explore an API. This is its ultimate strength.
*   **Single-File Changes:** For small, isolated fixes or generating a single function.
*   **Non-Code Tasks:** Writing documentation, analysis, or ad-hoc queries that don't require a project plan.

---

## Feature 2: `/goal` - Outcome-Oriented Development

**Concept:**
While a workflow defines the *process* of how you build something, `/goal` defines the *outcome* of what you are trying to achieve. It's a mechanism for tracking high-level objectives and ensuring that the code being generated is actually moving the project toward a defined target. A goal is a declarative statement of intent, such as `Improve the performance of the user dashboard by 50%` or `Implement a secure login system that supports 2FA`.

**How it works in COdo:**
You define a goal using the `/goal` command. From there, COdo can associate subsequent tasks, conversations, and generated code with that goal. The power of `/goal` lies in its ability to provide persistent context. Even as you switch between files, tasks, or even different workflows, the active goal acts as a north star, helping COdo prioritize suggestions and maintain focus. It can also be used to automatically generate acceptance criteria from your goal statement.

**Commands and Usage:**
*   `/goal set "[Your goal description]"`: Sets the primary focus for the current session.
*   `/goal list`: Displays all active and completed goals for the project.
*   `/goal status`: Provides a summary of progress toward the current goal, based on completed tasks and code changes.

**When to use / Best Scenarios:**
*   **Keeping Focus in Large Projects:** Prevents "scope creep" and keeps the AI focused on the immediate deliverable.
*   **Measuring Progress:** Turns an open-ended project into a series of verifiable outcomes.
*   **Team Collaboration:** A clear goal provides a shared understanding of success for both the developer and the AI agent.

---

## Feature 3: `compose` - The Multi-Agent Synthesizer

**Concept:**
`compose` is COdo's advanced feature for orchestrating complex, multi-step tasks that span multiple files, modules, or even different parts of a workflow. It allows you to break down a large goal into smaller, parallelizable, and sometimes sequential sub-tasks, assigning each to a specialized agent or process. It's the engine behind true "agentic" development.

**How it works in COdo:**
When you use `compose`, you are essentially defining a DAG (Directed Acyclic Graph) of operations. You can specify which files or concepts each operation depends on, and COdo will manage the execution flow, handling dependencies and parallelizing independent tasks. This is particularly powerful when combined with GSD or Gstack, as it allows the AI to tackle different aspects of a problem (e.g., writing the frontend component, the API endpoint, and the database migration) simultaneously.

**How to use it in COdo:**
You engage `compose` by describing a complex task. COdo will then offer to decompose it. You can also use the explicit `compose` sub-commands to manage this process.

### Compose Agent Skills

The following are the core skills within the `compose` ecosystem. Each is designed to be invoked at a specific stage of the software development lifecycle.

*   **`compose:brainstorm`**
    *   **Description:** *MUST* be used before any creative work. This includes creating features, building components, adding functionality, or modifying behavior.
    *   **When to Use:** At the very beginning of a new feature or when you're not sure how to approach a problem. It generates a wide range of ideas and potential solutions.
    *   **Scenario:** "I need a new way to handle user notifications."

*   **`compose:plan`**
    *   **Description:** Use when you have a spec or requirements for a multi-step task, *before* touching code. It creates a detailed implementation plan.
    *   **When to Use:** After brainstorming and when the implementation path is clear but complex.
    *   **Scenario:** "We have the spec for the new dashboard. Create a plan to implement it."

*   **`compose:tdd`** (Test-Driven Development)
    *   **Description:** Use when implementing any feature or bugfix, *before* writing implementation code. It generates the failing tests first.
    *   **When to Use:** As a strict discipline to ensure code is testable and meets requirements from the start.
    *   **Scenario:** "Implement the user registration endpoint."

*   **`compose:subagent`**
    *   **Description:** Use when executing implementation plans with independent tasks in the *current session*. It delegates sub-tasks to specialized agents.
    *   **When to Use:** When a `compose:plan` has been created and you are ready to execute it.
    *   **Scenario:** "Execute the plan for the new dashboard."

*   **`compose:worktree`**
    *   **Description:** Use when starting feature work that needs isolation from the current workspace or before executing implementation plans. It manages git worktrees.
    *   **When to Use:** To work on a new feature or bugfix in a clean, isolated environment without affecting your main working branch.
    *   **Scenario:** "Start working on the `feature/new-payment-gateway` branch."

*   **`compose:parallel`**
    *   **Description:** Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies.
    *   **When to Use:** To maximize efficiency by leveraging parallel processing for unrelated tasks.
    *   **Scenario:** "Implement the frontend for the settings page and the backend API for it."

*   **`compose:execute`**
    *   **Description:** Use when you have a written implementation plan to execute in a *separate session* with review checkpoints.
    *   **When to Use:** For very large tasks that should not be done in one go, or when you want a fresh AI context for the execution phase.
    *   **Scenario:** "Follow the plan in `plan.md` to implement the full authentication system."

*   **`compose:debug`**
    *   **Description:** Use when encountering any bug, test failure, or unexpected behavior, *before* proposing fixes.
    *   **When to Use:** As the first step in any debugging process. It forces a systematic investigation.
    *   **Scenario:** "The payment integration test is failing."

*   **`compose:feedback`**
    *   **Description:** Use when receiving code review feedback, *before* implementing suggestions.
    *   **When to Use:** To properly analyze and plan the integration of feedback, rather than blindly applying it.
    *   **Scenario:** "Apply the suggestions from the PR review."

*   **`compose:review`**
    *   **Description:** Use when completing tasks, implementing major features, or before merging to verify work meets requirements.
    *   **When to Use:** As a final quality gate before a task is considered complete.
    *   **Scenario:** "Review the code for the new search feature before I merge it."

*   **`compose:verify`**
    *   **Description:** Use when about to claim work is complete, fixed, or passing, *before* committing or creating PRs.
    *   **When to Use:** The final check to ensure all tests pass and the code is in a shippable state.
    *   **Scenario:** "Verify that all tests pass and the feature is ready to be committed."

*   **`compose:merge`**
    *   **Description:** Use when implementation is complete, all tests pass, and you need to decide how to integrate the work.
    *   **When to Use:** To intelligently merge changes from a feature branch back into the main branch.
    *   **Scenario:** "Merge the `feature/new-dashboard` branch into `main`."

*   **`compose:report`**
    *   **Description:** Use after implementation is verified and before merge. It consolidates multiple spec iterations into a single final-state report.
    *   **When to Use:** To create a final summary of the work done, useful for PR descriptions or team updates.
    *   **Scenario:** "Generate a report on the changes made in this feature branch."

*   **`compose:ask`**
    *   **Description:** Use whenever you need a decision, clarification, or approval from the user.
    *   **When to Use:** When the AI has multiple valid options and needs human input to proceed.
    *   **Scenario:** "Should we use Redis or Memcached for the caching layer?"

*   **`compose:new-skill`**
    *   **Description:** Use when creating new skills, editing existing skills, or verifying skills work before deployment.
    *   **When to Use:** When extending COdo's own capabilities by creating new reusable agents or workflows.
    *   **Scenario:** "Create a new skill to analyze database query performance."

**When to use / Best Scenarios for `compose`:**
*   **Complex, Multi-File Refactors:** When a change touches many interconnected parts of a codebase.
*   **End-to-End Feature Implementation:** Building a full user story from the database to the UI.
*   **Debugging Complex Issues:** When a bug's root cause is buried in a chain of dependencies.
*   **Implementing Review Feedback:** When feedback requires changes across multiple files and tests.

---

## Feature 4: `/scraper` - Intelligent Data Extraction

**Concept:**
`/scraper` is COdo's tool for extracting structured and unstructured data from the web, local files, and APIs. In the context of an AI agent, a "scraper" is not just a simple `curl` command; it's an intelligent data extraction utility that understands the context of the request and can transform raw data into a usable format for the AI.

**How it works in COdo:**
When you use `/scraper`, you provide a target (a URL, a file path, or an API endpoint) and a description of what you want to extract. COdo will then fetch the data, parse it (e.g., using HTML parsing for web pages, JSON parsing for APIs, or reading text from local files), and then process it to answer your question or feed it into the current context.

**Capabilities:
*   **Web Scraping:** Extracts text, links, and data from HTML pages. It can handle dynamic content and can be configured to follow links.
*   **API Consumption:** Fetches data from REST or GraphQL APIs and formats the response for the AI to understand.
*   **Local File Ingestion:** Reads and processes local files (`.md`, `.txt`, `.csv`, `.json`, etc.) to add them to the AI's context.
*   **Contextual Summarization:** Instead of dumping the raw text, it can summarize the scraped content, extract key entities, or answer specific questions based on the data.

**Best Practices & Use Cases:**

*   **Research & Context Gathering:**
    *   *Scenario:* "Find the latest changes in the React 19 documentation and summarize them for me."
    *   *Usage:* `/scraper https://react.dev/blog react 19 changes`.
    *   *Use Case:* Use this to quickly get up to speed on new library versions, framework updates, or third-party API changes without leaving your coding environment.

*   **Comparative Analysis:**
    *   *Scenario:* "Compare the features of two different cloud providers."
    *   *Usage:* `/scraper https://aws.amazon.com/products/ and https://cloud.google.com/products/ compare features`.
    *   *Use Case:* Use this when making architectural decisions or researching new technologies by extracting structured data for side-by-side comparison.

*   **Data Enrichment:**
    *   *Scenario:* "I have a list of companies in a CSV file. Enrich this data with their current employee count and industry."
    *   *Usage:* `/scraper file:companies.csv enrich with employee count and industry`.
    *   *Use Case:* Use this to populate databases, generate reports, or add metadata to existing datasets by scraping public sources.

**When to use / Best Scenarios:**
*   **Up-to-Date Information:** When the AI's training data is stale, and you need real-time data.
*   **Large Dataset Ingestion:** When you need to feed a large amount of external data into the AI's context window without manual copy-pasting.
*   **Automated Research:** When you want the AI to perform reconnaissance on a topic before starting a task.

---

## Synergies: How Features Work Together

The true power of COdo is realized when these features are used in concert. Here are a few powerful combinations:

1.  **`/goal` + `/workflow gsd`:** Start by setting a high-level goal. Then, use the GSD workflow to break that goal into milestones and tasks. The goal provides the "why," and the workflow provides the "how."
2.  **`/workflow speckit` + `compose`:** Use Speckit to create a rigorous specification. Then, use `compose` to execute that spec in parallel, assigning different parts of the implementation to sub-agents.
3.  **`/scraper` + `compose:tdd`:** Scrape the latest API documentation for a library. Then, use `compose:tdd` to write tests based on that newly ingested documentation before writing a single line of implementation code.
4.  **`/workflow gstack` + `compose:review`:** After using Gstack's `/plan-ceo-review` and `/plan-eng-review`, use `compose:review` as a final quality gate before shipping your code.

---

## Getting Started: A Practical Workflow

Here is a simple, repeatable workflow for starting a new project with COdo:

1.  **Set the Goal:**
    `/goal set "Build a user authentication system with JWT and refresh tokens."`

2.  **Choose the Workflow:**
    `/workflow speckit` (For a spec-driven, disciplined approach)

3.  **Create the Specification:**
    `/speckit.specify` -> "A user can log in with their email and password. The system should issue a short-lived JWT access token and a long-lived refresh token..."

4.  **Plan the Implementation:**
    `/speckit.plan` -> "Use Node.js with Express, Prisma for the ORM, and PostgreSQL for the database..."

5.  **Generate Tasks:**
    `/speckit.tasks` -> COdo generates `tasks.md`

6.  **Execute with Compose:**
    `compose:execute` -> "Follow the plan in `tasks.md` to implement the authentication system."

7.  **Review and Verify:**
    `compose:review`
    `compose:verify`

8.  **Merge:**
    `compose:merge`