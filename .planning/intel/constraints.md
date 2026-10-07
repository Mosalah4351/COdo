# Intel: Constraints

> Synthesized: 2026-08-25 by gsd-doc-synthesizer (compose dispatch)
> Mode: merge | Binding sources: AGENTS.md (repo law), .planning/codebase/*, ingested specs.
> These are hard invariants / guardrails. Violating any of them invalidates a plan regardless of
> other merits.

---

## C1. Repo law (AGENTS.md + CONVENTIONS — always binding)

- Branch names: <= 3 hyphen-separated words, no slashes, no `feat/`-style type prefixes.
- Commits/PR titles: conventional `type(scope): summary`; types feat|fix|docs|chore|refactor|test;
  optional scope core|opencode|tui|app|desktop|sdk|plugin. Default branch: `dev` (local `main` may
  not exist — diff against `dev`/`origin/dev`).
- Style: one function unless composable; no preemptive single-use helpers; avoid try/catch; no
  `any`; prefer Bun APIs (`Bun.file()`); rely on inference; const over let; ternaries/early returns
  over reassignment; NO else; functional array methods with type guards; inline single-use values.
- No import aliases; NO star imports; import module namespaces by name
  (`import { Project } from "@opencode-ai/core/project"` then `Project.ID`). Dynamic imports for
  heavy startup-path modules, destructured near top of the narrowest scope; keep branch-specific
  imports inside their branch.
- Drizzle schemas: snake_case column names (no string-redefined columns).
- In src/config: follow the self-export pattern (`export * as ConfigAgent from "./agent"`).
- Testing: never run tests from repo root (guard `do-not-run-tests-from-root`); run per-package;
  avoid mocks (Layer.mock only when unavoidable); test real implementations.
- Typecheck: `bun typecheck` from package dirs; never call tsc directly.
- SDK regeneration: run `./packages/sdk/js/script/build.ts` whenever server API changes.

## C2. V2 Session Core invariants (AGENTS.md verbatim-critical + session.md)

1. Durable prompt admission is separate from model execution: admit one durable `session_input` row
   BEFORE scheduling advisory `SessionExecution.wake(sessionID)`; `resume: false` = admit-only; the
   serialized runner promotes inputs at safe boundaries.
2. Reusing a Session ID adopts the Session; reusing a prompt message ID reconciles an exact retry
   only on full match (Session+prompt+delivery); conflicting reuse fails; historical projected
   prompts lazily synthesize promoted inbox records during exact retry.
3. `SessionExecution` stays process-global and Session-ID based; local implementation owns the
   process-local coordinator and discovers placement through `SessionStore` +
   `LocationServiceMap.get(session.location)` only when a drain starts; NO layer takes a Session ID;
   V2 interruption targets the active process-local ownership chain; idle/missing interruption is a
   no-op.
4. `SessionRunner`, model resolution, tool registry, permissions, filesystem stay Location-scoped;
   omitted `Location.workspaceID` = implicit-local; explicit workspace identity reserved.
5. One explicit `llm.stream(request)` call per provider turn and reload projected history before
   durable continuation. Do NOT bridge through legacy `SessionPrompt.loop(...)` or delegate
   orchestration to an in-memory tool loop.
6. Local drains stay process-local until clustering exists; coordinator joins same-Session resumes,
   coalesces wakeups, allows cross-Session concurrency; advisory wakes drain eligible durable inbox
   rows only; post-crash activity recovery requires its own explicit design before ANY provider-work
   retry.
7. Delivery vocabulary explicit: steer-by-default coalescing at safe provider-turn boundaries;
   explicit `queue` opens FIFO future activities one at a time after the active activity settles.
8. EventV2 replay owner claims remain SEPARATE from clustered Session execution ownership.
9. System Context algebra/registry/built-ins live in `src/system-context`; Context Source producers
   stay with their observed domains; Session History selection + Context Epoch persistence are
   Session-owned.

## C3. Storage & durability constraints

- Nested reads inside a transaction MUST use the active transaction, not the root client.
- Event-sequence allocation keeps `behavior: "immediate"` transaction semantics.
- Post-commit publish effects must never run before commit.
- Table/schema ownership remains in core SQL schema modules (`packages/core/src/**/*.sql.ts`
  pattern); never move table definitions back into the app package.
- Pre-launch experimental `session.next.*` databases are disposable; V1 canonical session/message/
  part rows are preserved across beta resets; discard adapter-managed external workspace resources
  from unreleased builds before new-build startup.
- Schema-affecting changes require an entry in specs/v2/schema-changelog.md (and matching commit
  summary).
- effect-drizzle-sqlite package stays generic (no domain language, no app paths/migrations/hooks);
  wrapper semantics per D16 must be preserved when consumed.

## C4. Package-boundary constraints

- Core must NOT import the application package (`packages/codo`); remodel needed shapes in core
  first (instructions.md).
- TUI imports domain data ONLY through the generated SDK; no imports from executable/backend
  packages or `@opencode-ai/core`-equivalent; unknown tools render via fallback without backend type
  imports; remote-server operation must remain possible.
- A Location plugin receives only the narrow Tools registration capability, never the internal
  registry; plugin installation ordering must avoid PluginBoot->Tools->PluginBoot cycles.
- Sharing a tool TYPE does not imply equal authority: built-ins/trusted plugins may capture services
  application tools cannot.
- Plugins are forbidden from adding/removing/overriding policy statements (provider-policy.md).
- Boot layers stay composition-only (no policy inside boot).

## C5. Config & policy evaluation constraints

- Ordinary settings read authored documents FORWARD (location overrides user-global); POLICIES read
  documents in REVERSE (user-global overrides repository); written order preserved within a
  document; organization-managed policy (future) appended last with final authority.
- Policy matching has NO wildcard-precedence; order alone decides; last match wins over caller
  fallback (allow for provider.use).
- `permissions` rulesets retain interactive `"ask"`; `experimental.policies` are allow/deny-only —
  do not conflate the two surfaces.
- No compatibility alias for legacy singular `provider` key while v2 config surface is in flux.
- v2 uses ONE schema (no global/location split) until scope-sensitive fields force the split.
- Addon/skill registration currently rides LEGACY `skills.paths[]` discovery; v2 flattens `skills`
  to a discovery-source array — reconcile addon skill registration during any v2 config migration
  (see I6).

## C6. Migration-state constraints

- V1/V2 dual-write: 16 TODO dual-write sites in session processor gated on `mirrorAssistant`;
  toggling mid-stream desyncs v1/v2 — requires an SLA-style flip discipline (CONCERNS P9). V2
  replaces V1 runner only when the parity checklist (session.md) reaches complete.
- Legacy `@opencode-ai/plugin` (npm) vs `@codo-ai/plugin` (workspace) types are near-identical but
  TS-unrelated; trustedDependencies pinning keeps them aligned; reflected in typecheck baseline.
- AppLayer (45 merged services) and server LayerNode.group([56 nodes]) are manually synced — adding
  a service to one without the other fails at runtime ("Service not found").
- `LayerNode` is custom (not stock Effect); onboarding guide at packages/codo/specs/effect/guide.md.
- Session clustering gated on undesigned `SessionStore/LocationServiceMap` multi-process ownership.

## C7. Security & supply-chain constraints (findings context treated as binding posture)

- All GitHub Actions `uses:` stay SHA-pinned (77/77 baseline today — do not regress).
- No unpinned curl-pipe installs in secret-bearing workflows (H1 open).
- npm releases ship WITH provenance once M4 lands; Windows Authenticode verification must fail
  closed (M7).
- Keep 3-day minimumReleaseAge cool-down effective; prune exclusions rather than grow them (D7).
- Never accept wildcard deps in auth-handling code paths (D5 lesson).
- Provider credentials must not leak into ambient env beyond documented SDK-construction needs
  (CONCERNS P3 comments); desktop sidecar password-in-env exposure acknowledged (P15).
- webfetch lacks SSRF guard + buffers before cap (P7) — treat as known-open when touching network
  tools.

## C8. Hygiene constraints (fold into any planning that touches these areas)

- Stale unrelated planning artifacts exist at packages/codo/.planning/{PROJECT,REQUIREMENTS}.md
  (World Cup demo) — remove/relocate, do not build upon.
- Branding drift ("opencode" -> "COdo") persists across several READMEs and older specs; workflow
  guards reference three different orgs (sst/opencode, anomalyco/opencode, Mosalah4351/COdo) —
  normalize during related edits; user-visible sweep tracked by not-a-fork roadmap Phase A.
- Specs lack status headers — when editing an ingested spec, add ADR-style status headers so
  staleness becomes detectable (classification recommendation).
- Spec-to-code identifier drift on provider-policy naming (spec: `Catalog.ProviderPolicy`; code:
  `Catalog.PolicyActions` + `ConfigExperimental.Policy`) — use CODE identifiers in implementation
  docs; update spec text when touched (W4).

## C9. Platform/toolchain constraints

- Bun 1.3.13 pinned via packageManager (+ husky pre-push version check); Node 20 dev shell / Node 24
  CI runners.
- Effect 4.0.0-beta.74 catalog-pinned; SolidJS via fragile pkg.pr.new URL (supply-chain flag D4).
- Compiled binaries target 12 platform variants; AVX2/musl/Rosetta detection governs artifact
  choice; build-time defines include CODO_VERSION/MODELS_DEV/WORKER_PATH/CHANNEL/LIBC.
- Windows-first development realities: terminal-cleanup module required on TUI exit paths (P6 fix
  pattern); async-only tool-presence probes with timeouts (spawnSync blocked the thread on Windows —
  canonical warning in security/tool-presence.ts); PowerShell tree-sitter parsing precedes shell
  interpretation (here-string caveat P16); single-star wildcard patterns + forward slashes in
  permission literal patterns (globstar form silently denies top-level writes).
- Server binds 127.0.0.1:4096 default; per-request `x-codo-directory` header selects project.
