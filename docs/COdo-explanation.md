# COdo Project Explanation

## What is COdo?

COdo is a **fork of OpenCode** — an AI-powered coding assistant that runs directly in your terminal. It's designed to help developers write code, debug issues, and manage projects through natural language conversations with AI.

## Key Features

### 1. **Terminal-Based AI Assistant**
- Runs entirely in the command line (TUI - Terminal User Interface)
- No need for a separate IDE or editor
- Direct integration with your development workflow

### 2. **Workflow System**
COdo supports multiple development workflows that can be switched on-the-fly:

- **Vibe Mode** (default) - Freeform coding with no workflow constraints
- **GSD (Get Shit Done)** - Spec-driven development with milestones and phases
- **SpecKit** - GitHub's spec-driven toolkit integration
- **GStack** - Garry Tan's 23-tool workflow for startups

Each workflow has its own set of skills and commands that appear in `/skills` when selected.

### 3. **Skills System**
Skills are modular capabilities that extend what COdo can do:
- Located in `.opencode/skills/` (workspace) or `~/.codo/skills/` (global)
- Can be workflow-specific (only show when that workflow is active) or universal
- Examples: web scraping, code review, debugging, testing

### 4. **Slash Commands**
Quick actions triggered by typing `/` in the prompt:
- `/workflow` - Switch between development workflows
- `/skills` - Browse and activate available skills
- `/scraper` - Legal-first web scraping (stays in input field, add query after it)
- `/goal` - Set a development goal
- And many more...

### 5. **Smart Context Management**
- Automatic context compaction when approaching token limits
- Preserves conversation continuity across sessions
- Intelligently manages file reads and code context

## Architecture Highlights

### Frontend (TUI)
- Built with **Solid.js** for reactive UI in the terminal
- Custom terminal rendering engine
- Components in `packages/tui/src/`

### Core Engine
- Built with **Bun** runtime (TypeScript)
- Effect-based architecture for composable async operations
- Session management with V2 architecture supporting resumability
- Located in `packages/opencode/src/`

### Key Directories
```
packages/
├── tui/              # Terminal UI components
│   ├── src/
│   │   ├── app.tsx   # Main app and command registration
│   │   ├── component/
│   │   │   ├── prompt/           # Input handling
│   │   │   ├── dialog-skill.tsx  # Skills browser with workflow filtering
│   │   └── workflow/             # Workflow implementations
├── opencode/         # Core engine
│   └── src/
│       ├── session/  # Session management
│       ├── agent/    # Agent system
│       └── config/   # Configuration
.opencode/
├── skills/           # Workspace-level skills
├── command/          # Custom commands
└── agent/            # Custom agents
```

## How It Works

### 1. **Session Flow**
```
User types message
    ↓
Prompt handling checks for slash commands
    ↓
Command transforms input (e.g., /scraper)
    ↓
Session.prompt() admits durable input
    ↓
SessionExecution schedules processing
    ↓
SessionRunner loads history + tools
    ↓
LLM streams response
    ↓
Tool calls executed
    ↓
Results stored + rendered
```

### 2. **Workflow Filtering**
When you select a workflow (e.g., "GSD"):
- Skills are filtered to show only GSD-specific and universal skills
- Workflow-specific skills are identified by:
  - Name prefix (e.g., `gsd-`, `gstack-`)
  - Description tags (e.g., `(gsd)`, `(gstack)`)
- Vibe Mode shows only universal skills (no workflow tags)

### 3. **Skill Loading**
Skills are markdown files with frontmatter:
```markdown
---
name: skill-name
description: "What it does"
compatibility: "OpenCode (with tools)"
---

# Skill instructions here...
```

When invoked, the entire skill file is loaded into the agent's context.

## Recent Enhancements

### Workflow Selector with Checkmarks
- Visual indicator (✓) next to selected workflow
- Persisted in KV storage
- Accessible via `/workflow` command

### Web Scraping Skill
- Legal-first approach (checks robots.txt, ToS)
- Adaptive HTML parsing (no hard-coded selectors)
- Generates local Python scripts when agent tools are blocked
- Supports any website type (e-commerce, news, jobs, etc.)

### Improved Workflow Filtering
- Fixed skills showing from wrong workflows
- Proper filtering by name prefix AND description tags
- Vibe Mode correctly shows only universal skills

## Technology Stack

- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **UI Framework**: Solid.js (reactive, efficient)
- **Database**: SQLite via Drizzle ORM
- **Effect System**: Effect-TS for functional async operations
- **Terminal**: Custom rendering with Yoga layout engine
- **AI Models**: Multi-provider support (OpenAI, Anthropic, etc.)

## Configuration

### Workspace Config
`.opencode/opencode.jsonc` - Project-specific settings

### User Config
`~/.config/COdo/` - Global user settings

### MCP Servers
`.kiro/settings/mcp.json` - Model Context Protocol server configuration

## Development Workflow

### Running
```bash
cd packages/opencode
bun dev
```

### Type Checking
```bash
cd packages/opencode
bun typecheck
```

### Testing
```bash
cd packages/opencode
bun test
# Note: Cannot run from repo root
```

## Branch Strategy

- **Default branch**: `dev` (not `main`)
- **Branch naming**: Short, 2-3 words, hyphens only
  - ✅ `session-recovery`, `fix-scroll`
  - ❌ `feat/session-recovery`, `fix_scroll`

## Commit Style

Conventional commits: `type(scope): message`

Examples:
- `feat(tui): add workflow selector`
- `fix(core): resolve session timeout`
- `docs: update README`

## Key Principles

1. **Minimal code** - Inline logic unless truly reusable
2. **No over-abstraction** - Single-use helpers are avoided
3. **Type inference** - Let TypeScript infer when possible
4. **Functional style** - Prefer map/filter over loops
5. **Early returns** - Avoid else statements
6. **Effect for side effects** - Pure functions where possible

## Why COdo?

COdo extends OpenCode with:
- Enhanced workflow management
- Better skill organization
- Improved UX for workflow switching
- Custom tools and commands
- Community-driven enhancements

It maintains full compatibility with OpenCode while adding features for specific development workflows and team needs.
