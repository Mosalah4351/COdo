# CONCERNS

Issues found in the deep read. P1..P6 have been fixed in this session; the rest are tracked here for future work.

## Fixed

| # | Severity | File | Symptoms / fix |
|---|----------|------|---------------|
| P1 | high | `packages/codo/src/cli/cmd/addons/manage.ts:53,75,106` | Literal `"~/.config/codo"` was passed to `path.join`, creating a literal tilde directory under cwd. Fixed by switching to `Global.Path.config` consistent with `install.ts`. |
| P2 | high | `packages/desktop/src/main/ipc.ts:166-177` | Renderer could `shell.openExternal("file://...")` or `execFile(<anything>, [path])`. Fixed by scheme allowlist + per-platform app-name enum. |
| P3 | high | `packages/codo/src/provider/provider.ts:299,559` | Provider creds (Bedrock / SAP AI Core) were being persisted into ambient `process.env` where the `shell` tool's child processes inherit them. Documented why ambient mutation is required by the SDK construction; added comments noting user-supplied env takes precedence. |
| P4 | high | CI / nix / AGENTS.md | Stale `packages/opencode` references broke CI `working-directory`, Nix filesets, and several AGENTS.md guides. All retargeted to `packages/codo`. |
| P5 | high | `install` | Installer pointed at `anomalyco/opencode` upstream; would have shipped the wrong binary on install. Repointed to `Mosalah4351/COdo` and hardened `sysctl` use. |
| P6 | high | `packages/tui/src/app.tsx:185-…`, `packages/codo/src/cli/cmd/tui.ts:145-153` | SGR mouse-tracking flood on Windows exit. Fixed by single `terminal-cleanup.ts` module that flushes win32 input buffer + emits `?1000/?1002/?1003/?1006/?1015/?1016/?1049` for both streams, registered at SIGINT/SIGTERM/SIGHUP/uncaughtException/exit + alt-screen-leave ordering. |
| P10 | med | `.github/actions/setup-git-committer/action.yml:42` | GH token embedded in remote URL persisted to `.git/config`. Replaced with `http.https://github.com/.extraheader`. |

## Open

| # | Severity | File | Notes |
|---|----------|------|-------|
| P7 | med | `packages/codo/src/tool/webfetch.ts:35-40` | No SSRF guard; can hit internal subnets / metadata IPs. 5MB cap is enforced only after the body has been buffered. |
| P8 | med | `packages/codo/src/provider/transform.ts:64-130` | `normalizeMessages` mutates the caller-visible message array. TODO comment in source calls itself out. Needs to clone. |
| P9 | med | `packages/codo/src/session/processor.ts` | 16 dual-write TODOs (`// TODO(v2): Temporary dual-write while migrating session messages to v2 events.`). Each is gated on `mirrorAssistant`; if the flag toggles mid-stream v1/v2 go out of sync. Needs a SLA flip. |
| P11 | low | `packages/codo/src/plugin/index.ts:248-254` | `void hook["event"]?.(...)` swallows plugin errors and drops backpressure. |
| P12 | low | `.oxlintrc.json` | Three duplicate `"options"` keys plus `//` comments inside strict JSON. Linter honors the last block. |
| P13 | low | `packages/codo/src/control-plane/workspace.ts:488` | `Effect.catch` swallows workspace-sync errors; sync loop never fails so it keeps running zombie-style. |
| P14 | med | `packages/codo/src/tool/websearch.ts:36` | Deterministic per-session A/B between Exa and Parallel — silent provider choice driven by session ID checksum. |
| P15 | med | `packages/desktop/src/main/sidecar.ts:51-…` | Sidecar password passed via env; on Linux `/proc/<pid>/environ` reveals it to the same UID. |
| P16 | low | `packages/codo/src/tool/shell.ts:299-316` | When shell is PowerShell, command tree-sitter parsing runs before shell interpretation — here-strings may parse wrong. |
| P17 | low | `packages/codo/src/account/account.ts:423` | Multi-org TODO. |
| P18 | low | `packages/codo/src/cli/cmd/github.handler.ts:169` | "add guide for copilot, for now just hide it" — hidden UX without docs pointer. |
| P19 | med | `packages/codo/src/agent/agent.ts:418` | OpenAI OAuth branching inside a generic service layer; provider-specific logic is bleeding. |
| P20 | low | `packages/codo/src/agent/agent.ts:431-444` | Interpolating `input.description` raw into a user message — quote escaping not handled. |
| P21 | med | `packages/codo/src/session/session.ts:446` | Reasoning tokens are billed as output tokens because models.dev lacks separate pricing. |
| P22 | low | `packages/tui/src/parsers-config.ts:153, 287` | "Injections not working for some reason" + "Replace with official tree-sitter-nix WASM". |
| P23 | med | `packages/app/src/pages/session.tsx:124` | `TODO(session-timeline): switch this to core cursor-based part pagination when that API lands.` Hand-rolled polling may end early. |

## Larger migration concerns

- The legacy `@codo-ai/*` package identity was renamed from `opencode`. Several internal references — `@opencode-ai/core/project` import paths in comments, `nix/node_modules.nix:34`'s `@opencode-ai/script` TEAM_MEMBERS comment, the `install` usage examples referencing `opencode.ai/install` — still use the old branding and need a sweeping rename pass separately from the path fixes.
- The runtime pairing between `AppLayer` (45 services) and the server's `LayerNode.group([56 nodes])` is a manual sync risk; adding a service to one without the other causes subtle `Service not found` errors at runtime.
- `LayerNode` is a custom abstraction (not standard Effect). Onboarding docs exist in `packages/codo/specs/effect/guide.md`.
- `@codo-ai/plugin` (workspace) and `@opencode-ai/plugin` (npm) have separate but near-identical types; trustedDependencies pinning keeps them aligned but TS sees them as unrelated types. Reflected in the typecheck baseline error.
- `Session.Service.prompt()` runs *synchronously* against a single Agent via the legacy compositional path; clustering (multi-process) is gated by `SessionStore/LocationServiceMap` and is not designed yet.
