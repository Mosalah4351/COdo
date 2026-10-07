# Intel: Context

> Synthesized: 2026-08-25 by gsd-doc-synthesizer (compose dispatch)
> Mode: merge | Narrative background for downstream PROJECT/ROADMAP/STATE creation.
> Evidence base: .planning/codebase/* (complete evidence-backed map), DOC_CLASSIFICATION.md
> (1,642 md inventoried; 107 classified), not-a-fork-roadmap.md, research/, security/findings/,
> and the 17 ingested docs.

---

## X1. What this project is

COdo is an AI coding-agent platform: a Bun-compiled CLI kernel (`packages/codo`, ~70 src dirs)
that serves a local HTTP/SSE API, drives a SolidJS/OpenTUI terminal UI (`packages/tui` as worker),
a web console, a desktop (Electron) app, MCP/LSP integrations, provider LLMs, and a generated JS
SDK. It is source-available (MIT) with acknowledged engineering lineage from OpenCode — the active
product thesis is the "not-a-fork" roadmap: independent product surface (sec-test security
workflows as headline, GSD workflow routing, addon marketplace, local-first defaults), honest
NOTICES attribution, own visual identity, own community story. Definition of done: a person who
never heard of OpenCode can install/use/contribute without wondering what it was forked from.

Distribution: GitHub Releases + install script (Mosalah4351/COdo), GHCR multi-arch images, npm
meta-package with per-platform optional deps, AUR, Homebrew tap; Windows Authenticode + macOS
notarization; Sentry on desktop.

## X2. Technical shape (from codebase map)

- Toolchain: Bun 1.3.13, TS 5.8.2 + native preview (tsgo), Turbo, oxlint+tsgolint, Prettier,
  Effect 4 beta, Drizzle+SQLite, SolidJS 1.9 + OpenTUI 0.3.
- Process topology: codo binary -> yargs CLI -> TUI worker thread / HTTP server / ACP bridge;
  `AppLayer` merges ~45 Effect services under ManagedRuntime; server composes its own 56-node DAG;
  `InstanceStore` is the per-directory cache chokepoint; ALS/Effect context bridges
  (`InstanceRef`/`WorkspaceRef`/`LocalContext`).
- Session pipeline (V1 today): Session.Service -> SessionPrompt loop -> SessionProcessor ->
  LLM.Service.stream -> AI SDK or experimental native runtime -> Drizzle part/message writes ->
  GlobalBus events; V2 events run in parallel via dual-write TODOs.
- Cross-cutting: provider registry (~24 providers, dynamic import), tool registry + user tools,
  skill discovery (compose:*/sec-test:*/business:* suites + GSD cross-pollination), agent registry
  (sec-test default-first), command registry, workflow state library (GSD), control-plane workspace
  sync, snapshots (bare-repo per project), patch, MCP client+OAuth, LSP clients.

## X3. Migration state: V2 rebuild in progress

The repo is mid-rebuild from the legacy application architecture to an Effect-native core:
- DONE: Hono -> Effect HttpApi server backend (cleanup remains); legacy storage/db.ts wrapper fully
  removed (five migration groups); TUI extracted into standalone `packages/tui` (all 10 sections);
  EventV2 durable event service (sync-versioned persistence, sequencing, pub/sub, replay,
  replay-owner claims); durable session_input inbox + prompt admission/promotion events; first V2
  runner slices (Location-scoped SessionRunner, SessionRunCoordinator, eager local-tool settlement,
  bounded built-ins incl. apply_patch/skill/question/todowrite/webfetch/websearch); automatic
  compaction executed (2026-06-05); Context Epochs with ambient AGENTS.md producers + skill
  guidance admission; catalog Option B transforms; policy engine for provider.use; public catalog
  DTOs; effect-drizzle-sqlite vendored adapter package.
- IN FLIGHT: v1/v2 dual-write in session processor (16 gated sites); runtime-context parity
  checklist (many partial/missing rows) gates V2 runner replacing V1.
- DELIBERATELY DEFERRED: provider timeout/watchdog policy, post-crash recovery, clustering/stale-
  owner fencing, manual compaction, plugin Context Sources, background bash, configured/remote/
  nested instruction sources, org-managed policy delivery (see decisions D20).
- Draft direction: v2 config review (config.md) settles keep/remove/redesign per field but is not
  final; todo.md tracks launch-oriented workstreams ("get out of this rebuild phase").

## X4. Feature landscape

- sec-test: six security personas + ~30 skills registered; SQLite-backed findings; scope-gate;
  result-line contracts; documented (docs/sec-test/01-03). Default-first primary agent.
- GSD/workflow integration: compose orchestrator + 33 GSD subagents, workflow.json driver, workflow
  state library; installed locally via gsd-local.ts (.agents/skills/gsd-*).
- business suite: hands-on light orchestrator with xlsx-official skill chain.
- scrape suite (DESIGNED, NOT BUILT): final validated design + code-verified integration blueprint
  for 9 hidden skills + scrape-topic subagent persona + escalation ladder (static-fetch ->
  browser-render -> Patchright-hardened -> api-discovery -> auth-session -> blocked), politeness
  spec (delay tiers, caps, warming, honeypot rule), JSONL checkpoints with provenance quintet,
  QA gates G1-G7, Excel delivery. Open risks recorded (prompt-discipline-only politeness, inert
  hidden flag, Patchright single-maintainer).
- Agent Browser (SHIPPED): wraps external agent-browser Rust CLI as browser_* built-in tools;
  daemon lifecycle; per-session isolation; plugin passthrough; config under CODO.json `browser`.
- Addon Marketplace (SHIPPED w/ divergence): /addons interactive + subcommand CLI; built-in catalog
  (agent-browser first); AddonInfo v1 config; local/global scopes; disable keeps npm cache;
  skills delivered by copying the installed package's skill-data dir (divergence from bundled-
  strings plan).

## X5. Documentation landscape (classification snapshot 2026-08-23)

107 docs classified: reference 52, guide 13, plan/decision-record 13, explanation 9, design-spec 9,
starter-boilerplate 4, audit/research 4, api-reference 1, tutorial 1, roadmap 1. Status: current 78,
needs-update 12, draft 10, deprecated 7. Grouped exclusions: GSD tooling (~700 md), vendored
codo-dev tree (~27), test fixtures (~15), runtime content (~40), templates (~15).
Key gaps: canonical doc set incomplete (only README at root), 15 packages without READMEs, three
overlapping feature guides, branding drift cluster, no user-facing config reference, Mintlify
starter unbuilt, stale demo planning artifacts, specs lacking status headers, specs/project.md raw
draft mismatching implemented routes.

## X6. Security posture (findings context)

Two audit reports (2026-08-23):
- Pipeline hardening: 17 findings (0 critical / 1 high / 8 medium / 8 low). Strong baseline: 77/77
  SHA-pinned actions, OIDC AWS deploys, safe pull_request_target handling. Top issues: unpinned
  curl|bash installer in six secret-bearing workflows (H1), npm provenance explicitly disabled
  (M4), fail-open Windows signing verification with stale packages\opencode paths (M7), over-
  privileged comment-triggered agent jobs (M2/M3/M8/M9). SLSA current level L1; concrete L2 path
  documented (provenance, attestations, SBOM, cosign).
- Secrets & dependencies: no confirmed live secrets in tree/history (two format-valid fixtures
  flagged S1/S2; tui.log tracked S3). Dependency posture strong (exact installs, integrity hashes,
  3-day cool-down, trustedDependencies) with specific open bumps: vite >= 7.3.5 (HIGH, five
  fs.deny bypasses, Windows-relevant), electron >= 42.9.3, astro >= 5.15.8, replace pkg.pr.new
  @solidjs/start, audit opencode-poe-auth, pin ghostty-web SHA, prune cool-down exclusions.

## X7. Roadmap alignment

not-a-fork-roadmap.md phases: A name/license/attribution (rename sweep + NOTICES + README story),
B independent product surface (sec-test default-first, npm publish decision, public semver tag),
C identity-deepening refactors (path/dead-code/prompt-library decoupling), D community +
discoverability (issues, MIGRATION doc, CONTRIBUTING, publish arch docs), E visual identity
(persona-grouped session list, composer persona strip, persona cards, three native themes, web
route renames) with an explicit do-not-change list (renderer/keyboard/command-palette internals).
Success gates defined inline (grep-zero user-visible opencode strings; v1.0.0 tag; binary self-ID).

## X8. Standardized terminology (used across all intel files)

- COdo = product; `packages/codo` = kernel app package; "core" = `packages/core` shared domain
  package; "the app package" = codo.
- V1 = legacy runtime path; V2 = Effect-native rebuild (session.next.*, SessionV2, CatalogV2...).
- Location = scoped service/cache unit keyed by directory (+ optional workspaceID); Session = V2
  conversation aggregate; Context Epoch = privileged system-context state; inbox = `session_input`.
- CODO.json = product config file; ConfigV1 vs v2 config review (draft).
- steer/queue = delivery modes; promote/admit = inbox lifecycle; drain/activity = execution spans.
- Status labels follow DOC_CLASSIFICATION: current / needs-update / draft / deprecated.

## X9. Known tensions an orchestrator should carry forward

1. New features keep landing on the LEGACY V1 tool/plugin surfaces (browser tools, addons) while
   core doctrine moves ownership into core + narrow capabilities — a reconciliation requirement,
   not an accident (W5).
2. specs/project.md (API seed draft) vs implemented V2 routes vs session.md init-route removal —
   three-way tension needing one canonical API decision (W1/W2).
3. Identifier drift between provider-policy spec text and code naming (W4).
4. Addon skill delivery diverged from its own plan (W6) — adopt-or-revert decision pending.
5. todo.md staleness vs changelog reality (compaction landed after todo written) (W7).
