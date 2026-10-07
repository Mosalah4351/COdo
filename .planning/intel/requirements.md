# Intel: Requirements

> Synthesized: 2026-08-25 by gsd-doc-synthesizer (compose dispatch)
> Mode: merge | Sources: 17 classified docs + classification records.
> Status tags: [implemented] = verified in code (classifier/codebase map), [partial], [draft] =
> authored intent not yet settled/reconciled, [gap] = documented need with no implementation,
> [future] = explicitly deferred (see decisions.md D20).
> Competing acceptance variants are preserved side-by-side, never merged (see INGEST-CONFLICTS.md).

---

## R1. HTTP / SDK API surface

### R1.1 Multi-project session HTTP API [draft — CONFLICTS W1/W2 apply]
`specs/project.md` (api-reference, draft; self-noted "These are awkward" endpoints):
- `GET /project -> Project[]`; `POST /project/init`.
- Session CRUD per project: list/get/create/delete under `/project/:projectID/session[...]`;
  create accepts `{ id?, parentID?, directory }`.
- Session operations: init, abort, share (POST/DELETE), compact, revert, unrevert, permission reply.
- Message reads/writes: list, get one, post; shape `{ info: Message, parts: Part[] }`.
- File discovery/status endpoints; `POST /log`.
- Directory-parameterized provider/config/agent/find endpoints flagged "awkward" in-source.
CAVEAT (classification gap #8): this draft does NOT match the implemented route surface. The
implemented experimental V2 surface is described by schema-changelog: session list/prompt/context/
message-list/compact/wait routes, prompt admission `id|delivery|resume` fields, permission
list/reply/saved-rule routes, question ask/reply/reject routes, public catalog DTOs
(`GET /api/provider[/:providerID]`, `GET /api/model`) with sanitized URLs and no credentials/request
material crossing the public boundary. Treat specs/project.md as a seed for a future canonical API
doc only after reconciliation.

### R1.2 Replayable Session event stream over HTTP/SDK [partial]
`specs/v2/session.md` follow-ups + todo.md: expose `sessions.events({ sessionID, after? })`
(durable-only replay+tail, aggregate-sequence cursor) over HTTP and generated SDK where remote
consumers need it; decide whether the public cursor should be opaque rather than the embedded API's
branded sequence. UI-facing optional interleaving of ephemeral deltas must never advance the durable
cursor (design required before exposure).

### R1.3 Prompt admission contract over the wire [implemented]
Admission returns admitted user-shaped message + conflict error on non-matching message-ID reuse;
optional `id`, `delivery`, `resume` fields; opaque message cursors preserving Location routing via
legacy flat and nested `location[...]` query params. Source: schema-changelog "V2 Session HTTP And
Generated SDK Contracts".

### R1.4 Permission & question surfaces [implemented]
Location-scoped pending permission requests (once/always/reject) with originating tool/call IDs;
question ask/reply/reject routes (`GET /api/question/request`,
`POST /api/session/:sessionID/question/request/:requestID/{reply,reject}`); pending questions are
in-memory Location state (no migration).

## R2. V2 Session behavior

### R2.1 Core lifecycle semantics [implemented]
Create (with ID adoption), prompt admission (idempotent exact-retry, conflict otherwise),
interrupt (ownership-chain stop, inbox preserved, idle no-op). See D1/D2.
### R2.2 Delivery modes [implemented]
`steer` coalescing at safe boundaries; `queue` FIFO one-activity-at-a-time. Backlog/steering-batch
limits must exist BEFORE broad multi-caller admission or untrusted queue growth is exposed.
### R2.3 Compaction [implemented automatic; manual = future]
Automatic pre-turn compaction with overflow-triggered retry (D5). Explicit manual compaction is an
open follow-up.
### R2.4 Context fidelity [partial]
V1 runtime-context parity checklist in specs/v2/session.md is CANONICAL and must be updated in the
PR that changes any row: environment/date partial; global/upward AGENTS.md partial (CLAUDE.md/
CONTEXT.md legacy discovery undecided); configured/remote/nested instruction sources missing;
skill guidance partial; request assembly partially complete (agent system prompt + policy, provider
base instructions, reminders, plugin transforms, structured-output policy still missing);
prompt/reference expansion largely missing (native template/@mention expansion, agent-reference,
configured-reference); synthetic expansion replay partial.

## R3. Tools

### R3.1 Built-in tool set [implemented unless noted]
Core-owned Location-scoped built-ins with explicit parameter/success schemas:
read, glob, grep, write, exact edit, bash (advisory warnings; no background param), webfetch (text-
only settlement; images rejected until attachment design), websearch, todowrite, question, skill,
apply_patch (sequential; moves/rollback future). Bounded inputs/outputs throughout (page sizes,
line previews, timeouts, result counts).
### R3.2 Browser tools [implemented via packages/browser]
MVP set per D18 (browser_open..browser_close/tab + conditional react/network tools); registered
conditionally when agent-browser detected; screenshots should return image attachments (plan Task 10).
### R3.3 Tool output bounding & retention [implemented]
Managed-output spill with bounded previews; managed paths readable by read/grep/bash via whitelisted
directory; retention bounded in time.
### R3.4 Registry ergonomics follow-ups [future]
Plugin installation receives the narrow Tools capability without PluginBoot->Tools->PluginBoot
cycle; public Session result shape stops exposing managed `outputPaths` (opaque reference design).

## R4. Configuration (v2)

### R4.1 Field dispositions [draft — direction settled, review open]
Apply D12 keep/remove/redesign outcomes. Highlights that behave as requirements:
- Plural collection keys (providers, agents, permissions, plugins, references, snapshots,
  attachments) with NO legacy alias for `provider` while v2 surface is fluid.
- `permissions` ordered rulesets including `"ask"` effect; same shape inside agents entries.
- `mcp.servers` nesting with protocol timeout + per-server overrides/disabled.
- `compaction.buffer`; `disabled?: boolean` convention; agent `system` rename; `steps` replace
  `maxSteps`; model override `api.id` nesting; tiered cost arrays; provider `env` additive metadata.
### R4.2 Old-to-new config conversion [gap]
todo.md: "Old configs should get auto-converted to new" — auto-migration of legacy configs is
required but undesigned.
### R4.3 User-facing configuration reference [gap]
Classification gap #5: no user-facing CODO.json/config-schema documentation exists despite config
being central to the product.

## R5. Providers & models

### R5.1 Catalog requirements [implemented core; extensions future]
Schemas/interfaces per D9; public DTO boundary per R1 note; unknown-endpoint resolution via provider.
### R5.2 Provider selection policy [implemented]
experimental.policies replacing enable/disable lists (D10/D11) incl. both legacy migration mappings.
### R5.3 Remaining provider integrations [future]
Google, Azure, Bedrock, OpenRouter-specific behavior, GitHub Copilot, Vertex, gateway adapters,
signed authentication; WebSocket responses transport; provider/model identity as Context Source
without stale Location-wide values (session.md parity table).

## R6. Addons (marketplace)

### R6.1 Shipped scope [implemented w/ divergence D19]
Browse built-in catalog; enable local/global; disable without uninstall; status/list commands;
AddonInfo config persistence; skills discoverable post-install.
### R6.2 Documented future scope [future]
Remote addon registry (URL-fetched catalog); `codo addons update <name>` version management;
addon-to-addon dependency resolution; Desktop GUI management; full uninstall (npm cleanup +
skill files); opt-in popularity analytics; plugin-type addons registering server/TUI hooks.
### R6.3 Reconciliation requirement [gap]
Task-2 divergence (skillDataDir copy instead of bundled skill files) must be either adopted as the
documented design or reverted; plan checkboxes need refresh if kept as living doc (W6).

## R7. Agent Browser

### R7.1 Functional requirements [implemented core]
See D18 toolset + daemon lifecycle + per-session isolation + config keys.
### R7.2 Robustness requirements [partial]
Clear not-installed error with install instructions; graceful session-mismatch/plugin-failure
wrapping into ToolFailure; configurable per-call timeout (30 s default); COdo-shutdown
`agent-browser close --all` cleanup.
### R7.3 Deferred scope [future]
Bundled binary distribution; desktop viewport embedding; deep plugin event hooks; record/replay;
mobile emulation; accessibility auditing.

## R8. Documentation (repo-level)

From DOC_CLASSIFICATION gaps section — all [gap]:
1. Canonical doc set incomplete: only README exists at root; missing ARCHITECTURE (public),
   GETTING-STARTED, DEVELOPMENT, TESTING, CONFIGURATION, API, CONTRIBUTING (root), DEPLOYMENT.
2. 15 workspace packages lack READMEs (browser, console root, core, effect-drizzle-sqlite,
   effect-sqlite-node, function, identity, plugin, script, sdk, server, session-ui, storybook,
   tui, ui).
3. Consolidate three overlapping feature guides (docs/COdo_Complete_Wiki.md, docs/COdo_Features.md,
   docs/COdo-Features-Guide.md) into one canonical feature reference.
4. Branding-drift cluster needs a sweep: sdks/vscode/README.md, github/README.md,
   packages/slack/README.md, packages/llm/README.md + older specs referencing packages/opencode
   paths (specs/tui-package.md, specs/storage/remove-opencode-db.md,
   packages/codo/specs/openapi-translation-cleanup.md, perf/test-suite.md).
5. User-facing configuration reference (dup of R4.3 — tracked once).
6. packages/docs/ remains an uncustomized Mintlify starter; intended public docs site unbuilt.
7. Remove/relocate stale unrelated planning artifacts at
   packages/codo/.planning/{PROJECT,REQUIREMENTS}.md ("World Cup 2026 Fantasy" demo).
8. Specs lack ADR-style status headers, making staleness hard to detect (process fix).
9. specs/project.md needs reconciliation against implemented routes before becoming canonical API
   doc (see R1.1 caveat).
10. Root CONTRIBUTING.md absent (only vendored codo-dev copy exists).

## R9. Security & supply chain (from binding findings context)

All [gap] unless noted; sources .planning/security/findings/*.
### R9.1 Pipeline remediations
- H1: pin/verify the curl-pipe installer used in six secret-bearing workflows.
- M4: re-enable npm provenance (--provenance on all four publish sites); then L2 path: artifact
  attestations, SBOM attach, cosign-sign GHCR images.
- M7: reconcile Windows signing paths to packages/codo/dist; make verification fail-closed.
- M2/M3/M8/M9: tighten agent-workflow permissions/deny lists; drop unneeded id-token:write; align
  repo-slug guards (three different orgs referenced today).
- L10-L17: permissions blocks, env-var indirection for interpolated inputs, PR-instead-of-push for
  generated commits, AUR host-key pinning, bun checksum verification, SECURITY.md + Dependabot +
  CI secret/deps scanning, checkout v3 bumps, release workflow guard.
### R9.2 Dependency remediations
- D1 (HIGH): vite >= 7.3.5 (five fs.deny bypasses incl. CVSS-v4 8.2 NTFS ADS); drop --host 0.0.0.0
  in dev for console app/support.
- D2: electron >= 42.9.3 + regular bump cadence.
- D3: astro >= 5.15.8 within major 5.
- D4: replace pkg.pr.new @solidjs/start with published npm release (or vendor/pin controlled SHA).
- D5: audit/replace opencode-poe-auth@0.0.1 (wildcard dep in auth path).
- D6: pin ghostty-web manifest ref to full SHA. D7: prune minimumReleaseAgeExcludes list.
### R9.3 Secrets hygiene
- S1: format-valid Google-key fixture in http-recorder test — mark fake / ignore-entry / rotate if
  provenance uncertain. S2: move Stripe pk_test key out of npm script. S3: untrack tui.log,
  gitignore *.log.

## R10. Non-functional / operational

- Test coverage gaps [gap]: GSD/workflow feature set (gsd*.ts, gsd-local.ts, gsd-installer.ts,
  tool/workflow.ts, workflow/* library), cli/cmd/browser.ts, processor dual-write branches
  (packages/codo/test gaps per TESTING.md).
- Backpressure/limits before broadening exposure: per-turn tool-call limits, streamed-delta
  batching, covering history indexes (session.md runner follow-ups).
- Hardening backlog (deferred, visible): cross-process migration claiming semaphore, paged durable
  replay reads, cross-process tail polling decision, ripgrep timeout/bounded framing, unresolved
  URL/file attachment materialization policy (todo.md deferred list).
- Scrape suite build-out [draft-ready]: SCRAPE-SUITE-DESIGN.md is final/validated with integration
  blueprint (9 skills, ladder, politeness spec, checkpoints, QA gates) — implementation not yet
  started; treat blueprint line-references as verified against working tree 2026-08-22.
