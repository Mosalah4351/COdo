# STRUCTURE

## Top-level

```
D:\COdo\
├─ .agents\skills\           # local agent skills installed by gsd-local.ts (gsd-*)
├─ .github\                  # workflows/, actions/, ISSUE_TEMPLATE/, CODEOWNERS, TEAM_MEMBERS
├─ .husky\                   # pre-push hook pins bun version + runs typecheck
├─ .planning\                # GSD planning artifacts (codebase/, config.json)
├─ packages\
│   ├─ codo\                 # The Bun/Effect-TS kernel (main package that builds to the CLI binary)
│   │   ├─ src\              # ~70 top-level dirs
│   │   ├─ test\             # Effect-based test suite
│   │   ├─ script\           # build.ts, publish.ts, generate.ts, run-workspace-server
│   │   ├─ migration\        # drizzle SQL migrations
│   │   ├─ specs\            # effect-guide + behavior contracts (12 docs)
│   │   └─ package.json
│   ├─ core\                 # @codo-ai/core (shared types, droplet sqlite, locations, snapshots)
│   ├─ tui\                  # @codo-ai/tui (Solid + opentui TUI, runs as Worker thread from codo)
│   ├─ desktop\              # Electron renderer+main
│   ├─ app\                  # @codo-ai/app (SolidJS web console, embeddable in the codo bin)
│   ├─ ui\                   # @codo-ai/ui (design system)
│   ├─ sdk\                  # js (TypeScript SDK) + openapi.json (regen output)
│   ├─ plugin\               # @codo-ai/plugin (plugin SDK)
│   ├─ llm\                  # @codo-ai/llm (LLM runtime abstractions)
│   ├─ cli\                  # codo CLI entrypoint
│   ├─ console\              # SST web console (app/ + core/ + function/ + mobile/infra)
│   ├─ slack, share, stats, web\ # surrounding web bits
│   └─ util\, script\, opencode-legacy\, identity\, session-ui/
├─ docs, .github\, infra\, github\, nix\, packages\, patches\, script\
└─ package.json + bun.lock + bunfig.toml + turbo.json + .oxlintrc.json + flake.nix + install (shell)
```

## Module organization inside packages/codo/src

Each subdirectory is self-contained. Leaf modules expose the Effect-style service contract when they have state:
- `Interface` describes the public shape.
- `Service` extends `Context.Service<...>("@codo/<name>")`.
- `layer` is the base `Layer.effect(...)` constructor.
- `defaultLayer` pipes in dependencies.
- `node` is the LayerNode manifest for composition.
- Bottom-of-file self-reexport: `export * as Foo from "./foo"` so consumers do `import { Session } from "@/session/session"`.

Multi-sibling dirs (e.g. `session/`, `config/`) **do not** re-export via a barrel (`session/index.ts` doesn't aggregate); each file gets its own self-reexport. The AGENTS.md docs cover this convention in detail.

## Where things live

| Concern | Path |
|---|---|
| CLI command implementations | `packages/codo/src/cli/cmd/` |
| TUI thread worker + RPC | `packages/codo/src/cli/tui/worker.ts` |
| Agent definitions + prompts | `packages/codo/src/agent/` |
| Skill discovery + compose:* + gsd | `packages/codo/src/skill/` |
| Slash commands | `packages/codo/src/command/` |
| Workflow state lib | `packages/codo/src/workflow/` |
| Server / routes / handlers | `packages/codo/src/server/` |
| Session pipeline | `packages/codo/src/session/` |
| Provider routing | `packages/codo/src/provider/` |
| Tool registry + builtins | `packages/codo/src/tool/` |
| Per-subsystem docs/specs | `packages/codo/specs/effect/*.md`, `packages/codo/specs/v2/*.md` |
| Migrations | `packages/codo/migration/` |
| Tests | `packages/codo/test/` (mirrors src structure) |
| Build driver | `packages/codo/script/build.ts` |
