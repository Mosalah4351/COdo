<div align="center">

<img src="assets/codo-agent-logo.png" width="128" alt="COdo agent logo"/>

# \>_ COdo

**One agent. The entire job.**

Plans your project. Builds your code. Finds your security flaws **before** you
ship them. Then writes the docs, the deck, and the research paper too.

**Plan it. Build it. Secure it. Ship it.**

[Website](https://codo-ai.vercel.app/) · [Documentation](https://codo-ai.vercel.app/docs) · [Report an issue](https://github.com/Mosalah4351/COdo/issues)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#)
[![npm](https://img.shields.io/npm/v/codo-ai)](https://www.npmjs.com/package/codo-ai)

![COdo TUI — main screen showing the pixel logo, input prompt, and keyboard shortcuts](assets/screenshot-main.png)

</div>

---

## Install in 10 seconds

```bash
npm install -g codo-ai
cd my-project
codo
```

Works on **macOS, Linux, Windows**. Any API key — Anthropic, OpenAI, Google,
NVIDIA free tier, or your Copilot / ChatGPT subscription. Free to try.

---

## The pitch

Most AI coding tools are a chat box with opinions. COdo is a **whole working
loop** that runs from your terminal:

| You want to… | COdo does it |
|---|---|
| **Plan** | Workflow engines that lay out your whole project — GSD, spec-first, or pure vibes (`/workflow`), with state that survives context resets |
| **Build** | `/compose` splits big tasks into a team of specialist agents and runs them **in parallel** — planner, builder, security engineer, test engineer, all at once |
| **Secure** | Sec-Test: 6 security personas that threat-model your design *before code exists*, audit every diff, and hand you working fixes with proof — not 400 lint warnings |
| **Ship** | `/goal` gates the stop conditions (no self-approval), and the built-in skills write your Word docs, Excel models, slide decks, PDFs, research papers, even MP4 videos |
| **Pull data** | `/scraper` gets you what you need, and it *asks permission first* — robots.txt, ToS, crawl delays, all enforced |

One terminal. No browser tabs. No extra apps. No "oops I shipped a vulnerability."

---

## The brag sheet

- 🛡️ **Security before code exists.** Threat modeling in the planning phase. Real-time SAST on every diff. Scope-gated live probing. Every finding comes with an ID, severity, evidence, and a working fix.
- ⚡ **Parallel everything.** Complex features become DAGs. Specialist agents execute in waves while you watch.
- 🎯 **Goals, not tasks.** Declare the outcome (`>80% coverage, zero HIGH CVEs`). An independent judge model verifies it. The builder never grades its own homework.
- 🧠 **75+ LLM providers** through [Models.dev](https://models.dev), including local models. Use your existing Copilot or ChatGPT subscription. Or try [COdo Zen](https://codo-ai.vercel.app/docs/zen) — models tested and verified to work well.
- 🧰 **40+ built-in skills.** 24 security skills (`threat-model`, `code-audit`, `secrets-scan`, `fuzz`, `mutation-test`, `sbom`…) + 17 business skills: `deep-research`, `super-research`, `arxiv`, `frontend-design`, `design-blueprint`, `product-design`, `data-analytics`, `xlsx` / `docx` / `pptx` / `pdf`, `html-to-video-pipeline`, `sales`, and more. Type `/skills` to see them all.
- 🔁 **Crash-proof sessions.** Your plan and progress live in durable state files. Context resets happen; you don't lose work.
- 🖥️ **Everywhere you work.** Native themeable TUI (35+ themes) · Desktop app · VS Code extension · LSP auto-loading · parallel sessions · shareable session links.

---

## Best practices (the good vibes version)

1. **Match the workflow to the scale.** Quick fix → `vibemode`. Something real → `gsd` plans it into phases.
2. **Plan before build.** The plan anchors everything — agent gets confused, state stays true.
3. **Let Sec-Test gate your commits.** Audit the diff before you commit. Every time. That's the whole point.
4. **Compose the parallel stuff.** Big feature = one `/compose`. Security runs in wave one, not after the merge.
5. **Declare outcomes with `/goal`.** You say what "done" means. The judge decides when it's done.
6. **One concern, one session.** Run parallel agents; don't make one agent do everything.

---

## Under the hood

- **Install:** `npm install -g codo-ai` (or one-time: `npx codo-ai`). Requires Node 18+ or Bun.
- **Models:** any provider key, or log in with GitHub / OpenAI for your existing subscription (`/connect`).
- **Docs:** everything — personas, skills, workflows, permission modes — lives at [codo-ai.vercel.app](https://codo-ai.vercel.app/).
- **Built in the open:** COdo is an independent project — core engine and TUI portions derived from [OpenCode](https://github.com/anomalyco/opencode) (MIT). See [NOTICES.md](NOTICES.md) for attribution details.

**PRs welcome** — `main` branch, conventional commits.

Found a security issue? Please don't open a public issue — email `mosalah4351@gmail.com` with a proof-of-concept.

---

<div align="center">

**Stop vibing blind.** ⚡ **Vibe with proof.**

`npm install -g codo-ai`

</div>
