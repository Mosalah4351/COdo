# INTEGRATIONS

## Build-time / publish-time

- **models.dev** — model catalog fetched and inlined into the binary (`MODELS_DEV_API_JSON` env overrides on Nix).
- **npm registry** — `codo-ai` meta-package + per-platform optional deps under `@codo-ai/cli-{platform}-{arch}{,-baseline,-musl}`.
- **GitHub Releases** — primary binary distribution; `install` script curls `https://github.com/Mosalah4351/COdo/releases/...`.
- **GitHub Actions runners** — blacksmith (`ubuntu-2404`, `windows-2025`) + macOS 15/26 (both Intel and arm).
- **GHCR** — `ghcr.io/Mosalah4351/COdo` multi-arch docker images from `packages/codo/script/publish.ts`.
- **AUR** — `codo-bin` PKGBUILD pushed over SSH via `AUR_KEY` secret.
- **Homebrew** — formula commits to `Mosalah4351/homebrew-tap`.
- **Azure Trusted Signing** — Windows binary codesign in `publish.yml:155-174`.
- **Apple codesign + notarize** — macOS via `apple-actions/import-codesign-certs` and `APPLE_API_KEY*` secrets.
- **Sentry** — desktop builds embed `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `VITE_SENTRY_DSN`.

## Runtime services called by `packages/codo`

- **models.dev** — against API when `MODELS_DEV_API_JSON` not set.
- **provider LLMs** — Anthropic, OpenAI, Bedrock, VertexAI, Gemini, OpenRouter, GitLab Duo, sap-ai-core, etc.
- **npm registry** — for `Installation.latest` checks.
- **api.github.com** — release checks during install/upgrade.

## Inter-process boundaries

| Boundary | Medium | Notes |
|---|---|---|
| HTTP server | effect-platform `NodeHttpServer` on `127.0.0.1:4096` (default) | per-request `x-codo-directory` header selects project |
| Web UI (Vite/Solid) | same server, embedded via `COdo-web-ui.gen.ts` | proxies to `https://app.codo.ai` when not embedded |
| SSE event bus | `GET /global/event` | effectively the only inbound real-time channel |
| TUI ↔ Worker | JSON-RPC over `worker.postMessage` | envelopes `rpc.request | rpc.result | rpc.event` |
| ACP bridge | nd-JSON over stdin/stdout | `AgentSideConnection` |
| MCP | stdio / SSE / streamable-HTTP / OAuth | per-session OAuth via `oauth-provider.ts` |
| LSP | JSON-RPC over stdio | per-language server, per project root |
| Desktop sidecar | Electron child process | spawned by `main/sidecar.ts`, password in env |
| Plugin hooks | in-process function calls | `Plugin.Service` triggers `event`, `tool.execute.before`, `tool.execute.after`, etc. |

## OS-specific

- **Windows codesign**: Azure Trusted Signing cert; leaf cert change needs publish.yml secret rotation.
- **WSL**: deep integration in `packages/app/src/pages/servers/wsl/*` — runs `wsl.exe --status` / `--list --online` / starts a server inside the distro.
- **AVX2 detection**: install script probes `/proc/cpuinfo` on Linux, `hw.optional.avx2_0` on macOS, `IsProcessorFeaturePresent(40)` on Windows; falls back to `-baseline` binaries.
- **musl detection**: `/etc/alpine-release` or `ldd --version | grep musl`.
- **Rosetta**: macOS `/usr/sbin/sysctl -n sysctl.proc_translated`.

## Auth store

- `~/.local/share/codo/auth.json` (mode 0o600) via `@codo-ai/core/auth`; `CODO_AUTH_CONTENT` env can pre-seed it.
- Provider-level auth in `src/provider/auth.ts` — handles OAuth flows and API keys.
- Account-level device-flow OAuth in `src/account/account.ts` with 5-min refresh threshold.
