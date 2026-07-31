# CONVENTIONS

## Branch / commit / PR

- Branch names: ≤3 hyphen-separated words, no `feat/`/`fix/` prefix, no slashes. Examples: `session-recovery`, `fix-scroll-state`.
- Commit message: `type(scope): summary`. Types: `feat | fix | docs | chore | refactor | test`. Optional scope points at the package or area (`core | opencode | tui | app | desktop | sdk | plugin`).
- Default branch: `dev`.

## Style (see AGENTS.md)

- One function unless composable/reusable; do not extract single-use helpers preemptively.
- Avoid `try/catch`; rely on Effect brakes or `Effect.orDie` for top-level escape hatches.
- No `any`; lean on inference.
- Bun APIs (`Bun.file`, `Bun.spawn`) preferred over `node:fs`-equivalents.
- Destructure at the point of need, not at the top of the function — preserves context.
- `const` over `let`; ternaries or early returns instead of reassignment.
- No `else`; early-return style. (`Good: if (cond) return 1; return 2`)
- No import aliases, no `import * as`. Import namespaces by name (`import { Project } from "@opencode-ai/core/project"`, then `Project.ID`).
- Heavy modules in startup-sensitive entrypoints get dynamic imports (`const { mod } = yield* Effect.promise(() => import("./heavy"))`).

## Effect style

- Service: `interface Interface`, `class Service extends Context.Service<Service, Interface>()("@codo/Foo")`, `layer = Layer.effect(...)`, `defaultLayer` chains `Layer.provide(...)`.
- Bottom-of-file reexport: `export * as Foo from "./foo"` (or `"."` inside `index.ts`).
- 5 sanctioned instance-context APIs: `InstanceRef`, `WorkspaceRef`, `InstanceState.context/directory`, `InstanceStore`, `EffectBridge`. Do not add new ambient globals.
- Errors: `Schema.TaggedErrorClass`, never `Effect.die` for user/IO errors. The service interface stays HTTP-agnostic; mapping to status codes happens at the route boundary.
- `Effect.void` not `Effect.succeed(undefined)`; `yield* new MyError(...)` not `Effect.fail(new ...)`.
- Use `HttpClient.HttpClient` / `FileSystem.FileSystem` / `FSUtil.Service` instead of raw `fetch` / `fs/promises`.
- Use `Effect.sync(() => …)` for fs/JSON reads; `Effect.tryPromise` for anything else.
- Effect schema helpers over `JSON.parse` wrapped in `Effect.try`.

## Drizzle

- snake_case column names so drizzle doesn't need a translation layer (`created_at`, not `createdAt`).

## Testing

- `bun test` (never from repo root — runs an exiting `echo` shim).
- Use `testEffect`, `tmpdirScoped`, `provideInstance`, `provideTmpdirServer` fixtures from `packages/codo/test/lib/effect.ts`.
- Avoid mocks. When impossible, use `Layer.mock`, never `Layer.succeed(Service, Service.of({ ... }))`.
- Don't `Effect.sleep` waiting for fibers; use `pollWithTimeout`, `awaitWithTimeout`, `llm.wait(n)`, `SessionStatus.get`, `BackgroundJob.wait`, `Deferred.await`.
- Tests mirror source in `test/`; suffix `*.test.ts` (one `.tsx` test exists).

## Lint / format / typecheck

- Lint: `oxlint` with type-aware tsgolint. `.oxlintrc.json` (note: it currently has duplicate `"options"` keys — see CONCERNS.md).
- Format: Prettier (`semi: false`, `printWidth: 120`).
- Typecheck: `tsgo --noEmit` per package; aggregate via `bun turbo typecheck`. Do not call `tsc` directly.
- Pre-push hook enforces the typecheck.

## Documentation

- AGENTS.md files at root and each major package.
- `packages/codo/specs/effect/*.md` is the canonical Effect style guide.
- `.github/workflows/review.yml` routes PR review prompts that historically referenced `packages/opencode/src/util/iife.ts` — that path is now stale. See CONCERNS.md.
