# ARCHITECTURE

## Process topology

```
                  codo binary (Bun-compiled)
                  └── src/index.ts (yargs, 26 commands)
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
        tui      serve / web         acp            agent / mcp
        │              │              │
   worker thread   server.ts       ND-JSON stdin/stdout
        │              │
   RPC client     HttpRouter.serve
        │              │
        └─────► AppLayer (45 merged services + InstanceLayer + Observability)
                  ManagedRuntime
                  │
                  ▼
            packages/core (drizzle, schema, events, location, snapshot, plugin, ...)
```

## The Effect Layer stack

- **`AppLayer` = `Layer.mergeAll(45 services…)` + `Ripgrep.defaultLayer` + `InstanceLayer` + `Observability.layer`** — composed in `src/effect/app-runtime.ts:56-108`. Wrapped in a `ManagedRuntime.make(AppLayer, { memoMap })` exposed as `AppRuntime`.
- **`BootstrapLayer`** — the lighter subset (`Config, Plugin, ShareNext, Format, LSP, Vcs, Snapshot, Observability`) used during project bootstrap.
- **`InstanceLayer` (`project/instance-layer.ts`)** — deferred: when materialised it loads instance state via `InstanceStore` and `InstanceBootstrap`.
- **Server has its own DAG**: `server/routes/instance/httpapi/server.ts:202` constructs `LayerNode.group([56 nodes])` covering the same services at a per-request level.

`InstanceStore` is the chokepoint: per-directory cache + scoped cache (`InstanceState.make`) with automatic disposal hooks. Every per-project service registers a finalizer on it.

## ALS / Context bridge

- **`InstanceRef` / `WorkspaceRef`** — Effect `Context.Reference` carried through fibers.
- **`LocalContext`** (Node `AsyncLocalStorage`) and `EffectBridge` keep promise-based and effect-based contexts in sync.
- **`Runner.make`** per-session state machine (`Idle | Running | Shell | ShellThenRun`) orchestrates prompt/shell arbitration.

## Session rendering pipeline

```
CLI/SDK → Session.Service.create / prompt / command
        → SessionPrompt.Service.prompt / loop / command
        → SessionPrompt resolves SystemPrompt.environment + skills
        → SessionReminders.apply
        → Assistant MessageRow inserted
        → SessionProcessor.Service.create returns a Handle
        → LLM.Service.stream(request)
              → provider.getLanguage(model)
              → AI SDK streamText OR native runtime (experimentalNativeLlm)
              → Stream<LLMEvent>
        → PartTable / MessageTable updates (Drizzle)
        → events.publish(SessionV1.Event.*) on GlobalBus
        → Tool executes; permission via Permission.ask (Deferred-based)
        → After: SessionSummary.summarize, SessionCompaction.prune, Snapshot.diffFull
```

V2 events run in parallel as part of an ongoing migration — the processor writes to both MessageV2 and `session.next.step.*` schemas behind 16 TODO dual-write blocks.

## Cross-cutting modules

- **`session/llm.ts`** — provider routing decision (`experimentalNativeLlm`) + ModelV2/ProviderV2 schema loading.
- **`provider/provider.ts`** — registers ~24 providers via dynamic `import()`; per-provider auth, retry, transform.
- **`provider/transform.ts`** — `normalizeMessages` shape-shifts between providers; has TODO about in-place mutation.
- **`tool/`** — built-in tool registry + user-supplied tools scanned from `tools/` or `tool/`; plugin hooks.
- **`skill/`** — discovery + compose:* namespace + GSD cross-pollination + `gsd-installer.ts` (new).
- **`agent/`** — agent registry; `GSD.GSD_AGENTS` merged when `workflow === "gsd"`.
- **`command/`** — slash-command registry. Built-ins: `init`, `review`, `goal`, `workflow` (new).
- **`workflow/`** — pure-function GSD state library (`state-parser`, `state-machine`, `prompt-builder`, `templates/`, `prompts/`). Not yet wired into a slash command; commands flow through `tool/workflow.ts`.
- **`control-plane/`** — workspace sync, sessions warp between workspaces, SSE-relayed event replication.
- **`worktree/`** — git worktree helpers under `~/.local/share/codo/worktree/`.
- **`snapshot/`** — bare-repo snapshot per project; tracks file-state at every turn.
- **`patch/`** — pure-function apply-patch (`*** Begin Patch` …).
- **`mcp/`** — MCP client + OAuth provider + catalog.
- **`lsp/`** — language-server client + servers map + per-project spawn dedup.
- **`server/routes/instance/httpapi/`** — REST + SSE route group definitions.

## Failure domains

- `server/global-lifecycle.ts` — dispose everything cleanly on process exit.
- `session/revert.ts` + `snapshot/index.ts` — git-backed restore points per turn.
- `session/compaction.ts` — token-budget + protected-tool pruning.
- `util/retry.ts` — `retry-after-ms` driven exponential backoff with `FreeUsageLimitError` / `GoUsageLimitError` upsell walls.

## Test architecture

- Per-package tests via `bun test`. `test/lib/effect.ts` provides `testEffect`, `tmpdirScoped`, `provideInstance`, `provideTmpdirServer`.
- LLM-recorded tests under `packages/llm` use `recordedTests({ prefix, requires })` with cassettes per scenario.
- E2E uses Playwright with helpers in `packages/app/e2e/**/*.fixture.ts`.
