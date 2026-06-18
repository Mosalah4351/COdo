# COdo

> **Your terminal asked for an AI assistant. We gave it a whole personality.**

COdo is a terminal-native AI coding assistant — a fork of [OpenCode](https://github.com/anomalyco/opencode) that adds structured, workflow-driven development to your CLI. Less "chat with AI, pray it understands you", more "tell it what you're building and watch it actually get it done."

No browser tab. No separate app. No context-switching. Just you, your terminal, and an AI that knows what phase of the project you're in.

---

## Install

One command. Seriously, that's it:

```bash
npm i -g @codo-ai/cli
```

Then open any terminal or PowerShell window and type:

```bash
codo
```

It just runs. No YAML config ritual. No 47-step setup guide. No sacrificing a `package.json` to the void.

---

## Why COdo?

Because "AI chat box in your IDE" stopped being impressive approximately 6 months after it was invented.

Most AI coding tools give you a place to type questions. COdo gives you a **system**. Different problems need different approaches — vibing on a side project is not the same as shipping a spec-driven feature with milestones and a deadline. COdo lets you switch modes on the fly and actually keeps up with how real development works.

Think of it as the difference between *asking* an AI to code and *working with* one.

---

## The Good Stuff

### `/workflow` — Stop Vibing. Start Shipping.

This is the whole reason COdo exists.

Type `/workflow` and pick how you want to work today:

| Workflow | The vibe |
|---|---|
| **Vibe Mode** | Freeform chaos. Great for 2am side projects. No rules. |
| **GSD** *(Get Shit Done)* | Spec → milestones → phases → shipped. No detours. |
| **SpecKit** | GitHub's own spec-driven toolkit, baked right in. |
| **GStack** | Garry Tan's 23-tool startup playbook. For when you mean business. |

When you switch workflows, the `/skills` menu auto-filters to only show tools that make sense for that mode. Because seeing a "startup pitch deck" skill while you're debugging a null pointer is nobody's idea of helpful.

```
/workflow → "GSD" selected
              ↓
        COdo enters spec-driven mode
        /skills shows only GSD tools
        Agent follows your milestone plan
        You actually ship the thing
```

> **Pro tip:** Start with GSD if you're building something from scratch. Set the spec, define the goal, and let COdo drive phase by phase. It's weirdly satisfying.

---

### `/goal` — Tell It What You're Building Before It Goes Rogue

Before your AI coding assistant decides to "helpfully" refactor your entire folder structure when you just asked it to fix a button color — set a goal:

```
/goal Build a real-time notification system with WebSockets
```

Now every suggestion, every tool call, every line of code is anchored to *that*. No drift. No surprise architecture rewrites. Just focused progress toward the thing you actually want.

---

### `/scraper` — Pull Data Off the Web Like a Civilized Person

Need data from a site? Don't write a scraper from scratch. Just:

```
/scraper get product listings from example.com/shop
```

COdo's scraper has manners — it checks `robots.txt` and Terms of Service before touching anything (so you don't accidentally become a legal case study). It uses adaptive HTML parsing so it doesn't break the second a website updates their CSS class names. And if direct tool access is blocked, it just generates a standalone Python script you can run locally.

Works on e-commerce, news sites, job boards, wherever. Legal-first, always.

---

### Compose Agent — Multiple AIs, One Brain

Why use one agent when you can have a whole team of them?

Define specialized agents in `.opencode/agent/`, chain them together, and run multi-agent pipelines where each agent handles what it's best at — spec writing, code review, testing, whatever you need. Stack them with workflows for a fully automated development pipeline that would make your past self genuinely confused and impressed.

---

## BYOK — Your Keys, Your Models, Your Rules

COdo doesn't lock you into one AI provider. **Bring Your Own Key** — plug in OpenAI, Anthropic, NVIDIA, or whatever you prefer. Switch models mid-project. No subscriptions forced on you. No platform owning your workflow.

### Get a Free API Key Right Now

Seriously, free. Go to:

**https://build.nvidia.com/**

NVIDIA's NIM platform gives you free-tier access to production-quality models (Llama, Mistral, and more) that plug straight into COdo. Zero dollars. Zero excuses not to try this.

Once you've got the key, drop it in your config:

- **Windows:** `C:\Users\<you>\.codo\config.json`
- **Mac/Linux:** `~/.codo/config.json`

```json
{
  "providers": {
    "nvidia": {
      "apiKey": "YOUR_NVIDIA_KEY_HERE"
    }
  }
}
```

---

## VS Code Extension

Not a terminal person? Fair enough, we don't judge (we judge a little).

COdo also ships as a **VS Code extension** — same assistant, same workflows, same power, just inside your editor. Available in `sdks/vscode/`.

---

## Themes

35+ built-in themes, because your terminal should look good while the AI writes your code. Includes a custom `codo` theme and all the classics:

| The Taste | Themes |
|---|---|
| Dark & brooding | Dracula, AMOLED, One Dark, Cobalt2, Nightowl |
| Cozy & aesthetic | Catppuccin, Rose Pine, Aura, Tokyo Night, Palenight |
| Nature-coded | Everforest, Gruvbox, Nord, Kanagawa, Flexoki |
| Chaotic energy | Synthwave84, Matrix, Osaka Jade, Lucent Orange |
| Calm & minimal | Vesper, Zenburn, Mercury, GitHub, Solarized |

---

## All Commands

| Command | What it does |
|---|---|
| `/workflow` | Switch modes — GSD, SpecKit, GStack, or Vibe |
| `/goal` | Set the mission so nothing goes off-script |
| `/scraper` | Scrape websites like a law-abiding citizen |
| `/skills` | Browse tools available for your current workflow |

---

## Skills System

Skills are modular superpowers — markdown files loaded into the agent's context when you need them.

**Where they live:**
- `.opencode/skills/` — project-specific (checked into your repo)
- `~/.codo/skills/` — global (follows you everywhere)

Skills can be **workflow-specific** (only show up in the right mode) or **universal** (always there). Write your own in 10 seconds:

```markdown
---
name: my-skill
description: "Does the thing I always forget how to do"
compatibility: "OpenCode (with tools)"
---

# Instructions for the agent here
```

---

## Project Structure

```
COdo/
├── packages/
│   ├── tui/                  # Terminal UI (Solid.js)
│   │   └── src/
│   │       ├── app.tsx
│   │       ├── component/
│   │       ├── theme/        # 35+ built-in themes
│   │       │   └── themes/   # amoled, dracula, tokyonight, codo, ...
│   │       └── workflow/
│   └── web/                  # Docs site (Astro + Starlight)
│       └── src/
│           └── content/
│               └── docs/     # i18n docs (17 languages)
│                   ├── ar/ bs/ da/ de/ es/ fr/ it/
│                   └── ja/ ko/ pl/ pt-br/ ru/ th/ tr/ zh-cn/ zh-tw/
├── sdks/
│   └── vscode/               # VS Code extension
├── specs/                    # Architecture & feature specs
├── script/                   # Build, publish, release scripts
├── patches/                  # Package patches
└── .opencode/
    ├── skills/               # Workspace-level skills
    ├── command/              # Custom commands
    └── agent/                # Custom agents
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| UI Framework | Solid.js |
| Docs Site | Astro + Starlight |
| Database | SQLite via Drizzle ORM |
| Async System | Effect-TS |
| Terminal Layout | Yoga layout engine |
| AI Providers | Multi-provider (OpenAI, Anthropic, NVIDIA, etc.) |
| i18n | 17 languages — because code is universal, docs should be too |

---

## Configuration

| File | Purpose |
|---|---|
| `.opencode/opencode.jsonc` | Project-specific settings |
| `~/.codo/config.json` | Global config (`C:\Users\<you>\.codo\config.json` on Windows) |
| `~/.codo/skills/` | Global skills directory |
| `.kiro/settings/mcp.json` | MCP server config |

---

## Running Locally

```bash
# Fire up the dev server
cd packages/opencode
bun dev

# Check your types (do this before you embarrass yourself)
bun typecheck

# Run tests (from the package dir — not the root, trust us)
bun test
```

---

## Contributing

We keep it simple:

**Branches** — short, 2–3 words, hyphens only:
```
✅ session-recovery   fix-scroll   workflow-filter
❌ feat/session-recovery   fix_scroll   iHopeThisWorks
```

**Commits** — conventional style:
```
feat(tui): add workflow selector
fix(core): resolve session timeout
docs: update README (make it funny)
```

**Default branch:** `dev` (not `main`, don't ask)

---

## Core Principles

The code that runs COdo follows a few hard rules:

- **Minimal** — inline it unless you're actually reusing it
- **No over-engineering** — if it's only used once, it doesn't need its own file
- **Type inference** — TypeScript is smart, let it be smart
- **Functional** — `map` and `filter` over `for` loops, always
- **Early returns** — flatten the logic, skip the `else`
- **Pure where possible** — side effects go through Effect, not everywhere

---

## License

COdo is an open-source fork of [OpenCode](https://github.com/anomalyco/opencode). See `LICENSE` for details.

---

*Built for developers who are tired of AI tools that feel like a fancy autocomplete. COdo is for people who want to actually ship things.*
