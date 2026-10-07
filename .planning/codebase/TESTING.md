# TESTING

## Commands

| Where | Command | Notes |
|---|---|---|
| Repo root | — | `bun test` exits 1 with "do not run tests from root" |
| `packages/codo` | `bun test --timeout 30000 --only-failures` | Effect-based; uses fixtures in `test/fixture` and `test/lib` |
| `packages/app` | `bun test --only-failures --preload ./happydom.ts ./src` | SolidJS unit tests |
| `packages/app` | `bun test:e2e:local` | Playwright; uses `packages/app/e2e/{regression,smoke}/` |
| `packages/codo` | `bun run test:httpapi` | HttpApi gating; runs in CI on Linux |
| `packages/tui` | `bun test --timeout 30000 --only-failures` | small suite; typecheck via `tsgo --noEmit` |
| `packages/desktop` | — | currently no tests; only 4-line AGENTS.md placeholder |
| `packages/cli` | `bun test` | small |
| `packages/llm` | `bun test` | `recordedTests` cassettes |
| `packages/sdk/js` | — | regen driven, not direct unit tests |
| `packages/core` | — | mostly library code covered by codo tests |

## Fixtures (packages/codo/test/lib/effect.ts)

- `testEffect({ layer })` builds the wrapper; tests use `const it = testEffect(...)`.
- `tmpdirScoped` creates a tmp `Effect.Directory`.
- `provideInstance(dir)` and `provideTmpdirInstance(dir)` supply an InstanceRef.
- `provideTmpdirServer` boots a server against a tmp dir.

## Anti-patterns (see `packages/codo/test/AGENTS.md`)

- No mocks (`Layer.mock` only).
- No `Effect.sleep(N)` fiber waiting; use the polling helpers or `Deferred.await`.
- No custom `ManagedRuntime` / manual `attach`.
- No `Layer.succeed(Service, Service.of({ ... }))`.
- No live HTTP in provider tests unless gated on `RECORD=true` + API keys (llm package convention).

## Test gaps on this branch

The un-committed GSD/workflow feature set had no test coverage when written:
- `packages/codo/src/agent/gsd*.ts` (prompt files + agent registry entries)
- `packages/codo/src/skill/gsd-local.ts` (PowerShell patcher)
- `packages/codo/src/skill/gsd-installer.ts` (new — needs `install.test.ts` and `transform.test.ts`)
- `packages/codo/src/tool/workflow.ts`
- `packages/codo/src/workflow/*` (the 29-file library)
- `packages/codo/src/cli/cmd/browser.ts`
- `packages/codo/src/session/processor.ts` — 16 dual-write blocks with no per-branch tests.

The mouse-tracking fix in `packages/tui/src/terminal-cleanup.ts` is best covered by a new test that captures stdout/stderr writes during an `Effect.runPromise` teardown — add later.

## Flaky-test history

- PR #27622 cited in test/AGENTS.md as the reason `Effect.sleep` based tests were banned.
- `session/processor.ts` "dual-write TODO" tests are pending the V2 migration completing.
