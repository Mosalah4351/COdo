# STACK

## Toolchain

| Layer | Version | Where declared |
|---|---|---|
| Bun | 1.3.13 | root `package.json` `packageManager` |
| TypeScript | 5.8.2 (catalog) + `@typescript/native-preview` 7.0.0-dev.20251207.1 | root `package.json` catalog |
| Turbo | 2.8.13 | root `package.json` |
| oxlint | 1.60.0 + `oxlint-tsgolint` 0.21.0 | `.oxlintrc.json` + root `package.json` |
| Prettier | 3.6.2 | inline config in root `package.json` |
| Effect | 4.0.0-beta.74 (`effect`, `@effect/platform-node`, `@effect/opentelemetry`, `@effect/sql-sqlite-bun`) | catalog |
| SST | 4.13.1 | root devDeps |
| SolidJS | 1.9.10 | catalog |
| `@solidjs/start` | `pkg.pr.new` preview URL (fragile) | catalog |
| `@lydell/node-pty` | 1.2.0-beta.12 (fork) | catalog |
| OpenTUI | 0.3.4 (core/keymap/solid) | catalog |
| `@hey-api/openapi-ts` | 0.90.10 | `packages/sdk/js/package.json` |
| Node | 20 (dev shell), 24 (CI runners) | `flake.nix:23-29` vs `.github/workflows/*.yml` |

## Native & heavy deps

- **`@opentui/core-{platform}-{arch}`** — prebuilt per-OS binaries; tree-sitter parser worker bundled. Listed in `bunfig.toml:5` `minimumReleaseAgeExcludes`.
- **`@ff-labs/fff-bun`** — fast file finder, prebuilt binaries per platform × libc variant.
- **`@parcel/watcher`** — native file watcher (per platform).
- **tree-sitter / web-tree-sitter / tree-sitter-bash / tree-sitter-powershell** — declared `trustedDependencies` so Bun runs their post-install builds.
- **`@aws-sdk/credential-providers`, `@ai-sdk/*` family** — provider SDKs for Bedrock etc., loaded via dynamic `Effect.promise(() => import(...))`.
- **bun runtime via `Bun.build({compile: true})`** — produces self-contained single-file binaries for 12 targets (linux/darwin/win32 × arm64/x64 × optional baseline × optional musl).

## Build & codegen entry points

- **SDK regen**: `./packages/sdk/js/script/build.ts` — runs `bun dev generate` on `packages/codo`, then `@hey-api/openapi-ts` `createClient`, patches a generated SSE typing bug, runs Prettier + `tsc`, deletes temp `openapi.json`.
- **Schema dump**: `bun --bun ./script/schema.ts schema.json` run from `packages/codo`.
- **CLI compile**: `packages/codo/script/build.ts` — runs `Bun.build({compile})`, embeds the SolidJS app via `createEmbeddedWebUIBundle`.
- **Release pipeline**: root `script/version.ts` → `script/publish.ts` → `packages/codo/script/publish.ts` (npm/optionalDeps + docker GHCR) → `packages/sdk/js/script/publish.ts` → `packages/cli/script/publish.ts` → AUR + Homebrew formula commits.
- **Nix**: `flake.nix` + `nix/{node_modules,opencode,desktop}.nix`. `node_modules.nix` is a fixed-output derivation keyed by `${platform.system}` + `bun.lock` + `patches/`.
- **Pre-push hook**: `.husky/pre-push` runs pinned Bun version + `bun typecheck`.

## Build-time defines (compiled into the CLI binary)

- `CODO_VERSION` — from resolved version
- `CODO_MODELS_DEV` — full models.dev catalog inlined as JSON string
- `OTUI_TREE_SITTER_WORKER_PATH`
- `CODO_WORKER_PATH`
- `CODO_CHANNEL`
- `CODO_LIBC` / `OPENTUI_LIBC` / `FFF_LIBC`

## Tests / typecheck entry points

- Root: `bun turbo typecheck` (per-package `tsgo --noEmit` / `tsgo -b`).
- Tests: `bun test` per-package; root script is an explicit no-op that exits 1.
- E2E: `bun --cwd packages/app test:e2e:local` (Playwright).
- HTTP API exerciser: `bun run test:httpapi` from `packages/codo` (CI gating, Linux-only).
