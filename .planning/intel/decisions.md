# Intel: Decisions

> Synthesized: 2026-08-25 by gsd-doc-synthesizer (compose dispatch)
> Mode: merge | Precedence applied: ADR > SPEC > PRD > DOC
> Sources: 17 classified docs + 2 classification records. No ADRs exist in the set; the one
> dated-filename plan (`docs/compose/plans/2026-07-05-codo-addons-plan.md`) was explicitly
> re-classified PLAN-not-ADR (see classifications/2026-07-05-codo-addons-plan.md).
> Destination artifacts (PROJECT/REQUIREMENTS/ROADMAP/STATE) do not exist yet; nothing below is
> contradicted by a locked core artifact. Binding cross-checks were made against the codebase map
> (.planning/codebase/*), not-a-fork-roadmap.md, research/, security/findings/, and AGENTS.md.

Decision IDs are stable; cite them (D#, R#, C#) from downstream artifacts instead of re-quoting prose.

---

## V2 Session Core

### D1 - Durable prompt admission is separate from model execution [SPEC, current]
`specs/v2/session.md`, corroborated by AGENTS.md "V2 Session Core" and specs/v2/todo.md.
- `sessions.create({ id?, location })`: omitted ID generates one; supplied ID creates when absent;
  reused ID returns existing identity (adoption).
- `sessions.prompt({ id?, sessionID, prompt, delivery?, resume? })` admits exactly one durable
  `session_input` row before any scheduling. Exact reuse of a message ID reconciles only when
  Session + prompt + delivery mode match; conflicting reuse fails. `resume: false` = admit-only.
- The serialized runner promotes admitted inputs into visible user messages only at safe provider-
  turn boundaries (event `PromptLifecycle.Promoted`; projector writes message + promoted mark in one
  event transaction).
- Delivery vocabulary is explicit: `steer` coalesces into the active activity at the next safe
  boundary; `queue` opens FIFO future activities one at a time after the active activity settles.

### D2 - Execution routing and scoping [SPEC, current]
`specs/v2/session.md`.
- `SessionExecution.resume(sessionID)` -> `SessionStore.get(sessionID)` ->
  `LocationServiceMap.get(session.location)` -> `SessionRunner.run({ sessionID, force? })`.
- `SessionExecution` and read-side `SessionStore` are process-global and Session-ID based; no layer
  takes a Session ID. `SessionRunner`, catalog, model resolver, tool registry, permission state, and
  filesystem are Location-scoped caches. Omitted `Location.workspaceID` = implicit-local placement;
  explicit workspace identity is reserved for future placement semantics.
- One explicit `llm.stream(request)` per provider turn; projected history reloaded once before
  durable continuation. Hard cap: fail after 25 provider turns within one local drain activity only
  when work remains. Never bridge through legacy `SessionPrompt.loop(...)`.
- Process-global `SessionRunCoordinator`: joins same-Session resumes, coalesces wakes, different
  Sessions run concurrently. Local drains stay process-local until clustering lands.
- Interruption targets the process-local ownership chain for that Session; idle/missing is a no-op;
  pending/unpromoted inbox rows survive for a later fresh wake.
- Entry points: `run` = explicit resume (>=1 provider attempt even with nothing eligible); `wake` =
  advisory, edge-triggered, provider called only when eligible input can be promoted.

### D3 - Event-sourced durability and schema contracts [PLAN/decision-record, current]
`specs/v2/schema-changelog.md`. Key standing contracts:
- `session_input` durable admission inbox; synchronized events
  `session.next.prompt.admitted.1` / `session.next.prompt.promoted.1`.
- Projected transcript resources carry stable `msg_*` IDs distinct from `evt_*` creator events;
  assistant steps propagate one `assistantMessageID` (provider-local call IDs may repeat across
  turns).
- Pagination/replay order follows durable aggregate sequence, never wall-clock timestamps; HTTP
  message cursors are opaque and resolve to `session_message.seq`.
- Deterministic ID constructors (`SessionSchema.ID.fromExternal`, `EventV2.ID.fromExternal`) exist
  for trusted external keys (idempotent retry boundaries).
- Pre-launch `session.next.*` databases are disposable experimental state; V1 canonical rows are
  preserved across resets. Schema-affecting commits must be summarized in this changelog.

### D4 - Context Epochs own privileged model-visible context [SPEC, current]
`specs/v2/session.md` (+ changelog entries 2026-06-04..05).
- One Context Epoch per Session state: one effective agent, one immutable baseline string, one
  model-hidden structured snapshot for source comparison.
- Initial sources: environment facts, host-local date, ambient global/upward-project `AGENTS.md`,
  selected-agent permission-filtered skill guidance. Location-wide sources come from the System
  Context Registry; the algebra/registry/built-ins live in `src/system-context`; producers live with
  their observed domains; history selection is renamed Session History.
- First complete observation initializes the epoch before any prompt becomes model-visible;
  unavailable initial context blocks (prompt stays pending/retryable). Changed context becomes one
  durable chronological System message committed atomically with snapshot advance.
- Agent/model switches and completed compactions request lazy baseline replacement, fenced against
  authoritative Session Location + effective agent + epoch revision; cross-agent turns block while
  replacement context is unavailable. A Session move clears the epoch.
- Ambient discovery honors `OPENCODE_DISABLE_PROJECT_CONFIG`; traversal canonicalized/contained.

### D5 - Automatic compaction executes before provider turns (landed 2026-06-05)
`specs/v2/session.md` "Automatic Compaction" + schema-changelog top entry.
- Budget = model context window minus max(output allowance, configured `compaction.buffer`);
  compact when exceeded and older complete turns exist.
- Full transcript stays durable; only the active model representation becomes one hidden checkpoint
  (structured rolling summary + token-bounded serialized recent context). Provider-native
  assistant/reasoning/tool messages never survive the boundary.
- `session.next.compaction.started.1` identifies attempts (progress deltas live-only);
  `session.next.compaction.ended.2` stores the final checkpoint; only completion projects a visible
  compaction message and requests epoch replacement. Failed/interrupted attempt leaves prior
  boundary active. One overflow-triggered retry after provider-side overflow rejection; never loops.

## Tools & Permissions

### D6 - Tool model: opaque single-executor definitions with codec boundary [SPEC, current]
`specs/v2/tools.md`.
- One opaque type `Tool.Definition<Input, Output>` built via `Tool.make({ description, input,
  output, execute, toModelOutput? })`; exactly one executor; schemas/executor are not public fields.
- Input/output codecs self-contained; conversion cannot require services; dependencies captured at
  construction. Invocation context is concrete: `{ sessionID, agent, assistantMessageID,
  toolCallID }`, supplied by the runner, never inferred by the registry.
- Effect interruption is the cancellation mechanism; expected typed failures translate to
  `ToolFailure`; interruption/defects must never become model-visible failures. Broad cause-catching
  around executors is invalid.
- Registration is named-record based; conservative provider-neutral name grammar validated at
  registration; generic-invalid names fail fast, provider-specific restrictions fail during request
  preparation as model-compatibility errors.
- Scoped replayable transforms: latest active registration wins per name; closing a scope removes
  exactly its registration and reveals next-latest; Location registrations outrank process
  application registrations. Stale rejection: a call never executes a registration other than the
  one advertised for its provider turn.
- Output bounding happens at one generic settlement boundary on the channel actually sent; oversized
  text/structured output spills to managed storage replaced by bounded preview; if retention fails,
  settlement fails operationally (never lossy success). Producer-side capture limits are modeled at
  the producer boundary and must not masquerade as model-output truncation.

### D7 - Authorization split between tools and PermissionV2 [SPEC, current]
`specs/v2/tools.md` + `specs/v2/session.md` + changelog.
- Trusted tools formulate and sequence permission requests; `PermissionV2` evaluates policy and
  manages approval; the registry injects no `assertPermission` helper.
- Sessions omitting `agent` execute AND evaluate permissions as the default `build` agent (no silent
  empty-policy mismatch).
- Permission requests support `once` / `always` / `reject` replies with saved rules kept separate
  from authored ordered rules; action/resource conventions fixed for `read`, `glob`, `grep`, `edit`,
  `external_directory`, `bash`, `todowrite`, `webfetch` (+ `skill`).
- Before assembling any provider request, local tools still projected `running` from a previous
  process are durably failed ("Tool execution interrupted"); abandoned side effects are never
  silently replayed.
- Bash is explicitly not sandboxed (host-user authority); structured external `workdir` resolution
  enforces `external_directory` approval; argument scans produce advisory warnings only.
- `apply_patch` first slice: add/update/delete hunks, parse-all-then-preflight, sequential commit,
  explicit partial-application report on later failure; add hunks create-only; commits
  uninterruptible after preflight; moves and atomic rollback deliberately unsupported follow-ups.

## Catalog / Config / Policy

### D8 - Catalog lifecycle Option B selected [design-spec, current]
`specs/v2/catalog-config-plugin-lifecycle.md` (header status line).
- Current core uses **replayable Location-scoped Catalog transforms** (Option B): plugins register
  transforms receiving a `Catalog.Editor`; catalog rematerializes from active transforms, applies
  policy last, commits diffs, emits at most one `Catalog.Event.Updated` per rebuild.
- Option A (Config transforms + Reload.all()) is retained in the doc as historical comparison only.
- Deferred plugin activation must not block location readiness; slow plugins activate in background.
- Reload/watch behavior and deferred external plugin activation remain open design work.

### D9 - Provider/model catalog shape [design-spec, current]
`specs/v2/provider-model.md`.
- Branded IDs (`ProviderV2.ID` with statics incl. opencode/anthropic/openai/google/google-vertex/
  github-copilot/amazon-bedrock/azure/openrouter/mistral/gitlab); tagged-union `Endpoint` including
  `{ type: "unknown" }` (resolved via provider before returning models).
- `ProviderV2.Info.enabled` is stored provider state recording why (env/account/custom) or false;
  model availability requires usable provider AND `model.enabled`; models stored nested by provider.
- Options shape everywhere: `{ headers, body, aisdk: { provider, request } }`; authored config uses
  partial patches merged in configuration order, never pre-materialized records.
- Plugin interface: hooks `init`, `provider.update`, `model.update`, `account.update/remove/
  activate/activated`; deterministic `Order` constants (modelsDev 0, env 10, account 20, provider
  30, config 40, discovery 50); built-in plugin roster enumerated in spec.
- First runner adaptation surface is deliberately narrow (openai/responses HTTP, openai/completions,
  anthropic/messages, three aisdk routes); unsupported routes fail explicitly — WebSocket
  `openai/responses` must NOT silently downgrade to HTTP. Google/Azure/Bedrock/OpenRouter-specific/
  Copilot/Vertex/gateway adapters remain future slices.

### D10 - Policy engine semantics [design-spec, current]
`specs/v2/provider-policy.md`.
- Statement = `{ effect: allow|deny, action, resource }`; wildcard matching on both axes; NO
  pattern-precedence — evaluation order controls.
- Evaluation: start from caller-supplied fallback (provider.use falls back `allow`), apply every
  matching statement, last match wins.
- Authored config documents are evaluated in REVERSE document order (user-global policy overrides
  repository policy) while ordinary settings read forward; written order preserved inside each
  document. A repository cannot silently re-enable what the user denied globally.
- Organization-managed statements, when implemented, append AFTER reversed authored statements
  (final authority). Delivery mechanism intentionally unspecified here.
- Plugins must never add, remove, or override policy statements. Provider policy is not a plugin
  sandbox. Provider configuration (`providers`) and provider permission (`experimental.policies`)
  remain separate concerns.
- Apply ordering: build catalog -> apply overrides -> evaluate `provider.use` per provider ID ->
  prevent denied providers from selection/use (remove-vs-disable-left-disabled is an open
  implementation choice).

### D11 - Legacy provider allow/deny lists replaced by experimental.policies [SPEC, current x2]
`specs/v2/provider-policy.md` "Legacy Migration" + `specs/v2/config.md` Group 7.
- `disabled_providers` / `enabled_providers` do not carry forward; canonical deny-list and
  allowlist migration mappings are specified in provider-policy.md.

### D12 - V2 config field dispositions [design-spec, DRAFT — decisions pending final team review]
`specs/v2/config.md`. Summary of the group review (draft status respected; treat directionally):
- KEEP: `$schema` (read-only), `shell`, `autoupdate`, `instructions` (flat array), `watcher`,
  `formatter` + `lsp` (singular, boolean|record), `tool_output`, `share` ("manual"|"auto"|
  "disabled"), `enterprise.url`, `username`, `model` (fallback), nested `agents.<name>.mode`
  ("primary"|"subagent"|"all"), agent `color`, separate agent `model` + `variant`.
- REMOVE: `logLevel`, `server`, `command` (skills cover workflows), `small_model` (title agent wins),
  `autoshare`, `default_agent`, top-level `mode`, `tools` (boolean maps), `layout`,
  `experimental.{disable_paste_summary,batch_tool,openTelemetry,primary_tools,continue_loop_on_deny}`,
  legacy provider model flags (`reasoning`,`temperature`,`interleaved`,`release_date`,`status`,
  `experimental`,`whitelist`,`blacklist`), dedicated agent `temperature`/`top_p`, deprecated
  `maxSteps`.
- REDESIGN (renames/shapes): `provider`->plural `providers` (NO compat alias while v2 surface is
  fluid); `skills` -> flat array of local-path/glob-or-URL discovery sources; `reference`->plural
  `references` (named local/git external context, addressable as `@alias`); `plugin`->plural
  `plugins` (ordered package strings or `{ package, options? }`); `snapshot`->`snapshots`;
  `attachment`->`attachments` (image normalization limits); `agent`->plural `agents`; `permission`->
  plural `permissions` (ordered `{ action, resource, effect }` rulesets, interactive `"ask"` effect
  retained — distinct from experimental.policies allow/deny-only); `mcp` nested under `mcp.servers`
  with protocol-wide `timeout` and per-entry `disabled`; `compaction.buffer` rename; consistent
  `disabled?: boolean` for inactive configured entries; agent `prompt`->`system`; model override `id`
  nested under `api.id`; `cost` accepts tiered arrays; provider `env` = additive recognized-env-var
  metadata.
- One v2 schema for now (no global/location split) until more scope-sensitive fields survive review.
- Open items: `.opencode` policy-source precedence vs project files.

## Core Doctrine & Completed Migrations

### D13 - Core architecture doctrine [guide, current]
`specs/v2/instructions.md`.
- Core = small typed containers (schemas, branded ids, tagged errors, `Interface`, `Context.Service`,
  `layer`/`defaultLayer`, bottom-of-file self-export). Application policy moves OUT of core services
  into plugins; hooks (Immer drafts, cancel flags, sequential triggering, domain-oriented names) are
  the extension boundary; boot stays composition-only.
- State private to service layers; publish events for committed domain changes only; target granular
  hot-reloadable reconfiguration over global reloads.
- Core must not import the application package; port domain shapes, leave behavior behind hooks.

### D14 - Legacy DB wrapper removal COMPLETE; invariants preserved [plan/decision-record, needs-update label, content verified complete]
`specs/storage/remove-opencode-db.md`. All five migration groups completed/superseded;
`packages/{opencode->codo}/src/storage/db.ts` deleted. Binding invariants that outlive the plan:
nested reads inside a transaction see the active transaction; `SyncEvent.run` sequence allocation
keeps immediate transaction behavior; post-commit publish effects run only after commit; table
definitions stay owned by core SQL schema modules. NOTE: file cites `packages/opencode/src/...`
paths that were retargeted to `packages/codo` repo-wide (CONCERNS P4) — path drift, not decision
drift.

### D15 - TUI extraction COMPLETE; SDK is the TUI's only domain boundary [plan/decision-record, needs-update label, all 10 sections marked Completed]
`specs/tui-package.md`.
- `packages/tui` owns renderer lifecycle, Solid composition, components/routes/themes/keymaps, SDK
  sync/event consumption, tool presentation, TUI-facing plugin contracts, resolved TUI config +
  pure validation, host-neutral terminal behavior, TUI-local persistence.
- CLI hosts own commands/parsing, server+worker lifecycle, auth/transport, signal policy, config
  discovery/precedence/migration, plugin discovery/installation, build wiring.
- Server/SDK owns all domain data/actions and wire shapes. Missing backend data => add server API +
  regenerate JS SDK (`./packages/sdk/js/script/build.ts`), never import backend implementation
  modules. Unknown tools/plugin data render safely without backend type imports; remote-server use
  must remain possible. Renderer cleanup restores terminal on every exit path.
- Drift note: spec text names `@opencode-ai/tui` / `packages/opencode` paths; actual package is
  `@codo-ai/tui` under `packages/tui` (branding drift cluster, see INGEST-CONFLICTS W3).

### D16 - Effect Drizzle SQLite adapter is a standalone generic vendored package [design-spec, current]
`specs/storage/effect-sqlite-package.md`.
- `packages/effect-drizzle-sqlite` ports the Drizzle Effect SQLite adapter shape; mirrors upstream
  naming/semantics; NO application paths, migrations, tables, transaction hooks, post-commit
  behavior, or domain language inside the package.
- Application wrapper preserves two non-obvious semantics: nested reads inside a transaction see the
  transaction; post-commit effects queue during transactions and run immediately outside.
  `SyncEvent.run` depends on this composability + `behavior: "immediate"`.

### D17 - Remove the dedicated session-init route [SPEC, current]
`specs/v2/session.md` tail: remove `POST /session/:sessionID/init` (compat wrapper only); rely on
the normal `/init` command flow; do not reintroduce `Session.initialize` special cases. (Contrasts
with draft API seed specs/project.md — see INGEST-CONFLICTS W2.)

## Shipped Feature Decisions (compose-authored, code-verified by classifier)

### D18 - Agent Browser wraps the external agent-browser CLI [design-spec+plan, drafts; implementation present]
`docs/compose/specs/2026-07-05-agent-browser-design.md` [+S-refs] and its plan.
- COdo does NOT reimplement browser automation; agent-browser (Rust CLI, CDP daemon) is a
  prerequisite binary; new `packages/browser` (`@codo-ai/browser`) wraps it as built-in tools.
- Per-COdo-session isolation via `--session codo-<sessionID>`; daemon auto-start + idle timeout
  (300 s); detection via PATH probe + `agent-browser doctor --offline --quick --json`.
- MVP toolset: browser_open/snapshot/click/fill/type/press/screenshot/read/eval/wait/get/close/tab
  (+ conditional react_tree/react_inspect/vitals; network_route/requests/har).
- Config under `CODO.json` `browser` key (headless, timeouts, screenshot format/quality, plugins[],
  allowed_domains, content_boundaries, max_output_chars). agent-browser's native stdio-JSON plugin
  protocol used for credentials/cloud providers/stealth/custom commands; COdo manages config + CLI
  surface only.
- Post-MVP deferred: bundled binary, desktop viewport embedding, deep COdo plugin hooks, record/
  replay, mobile emulation, a11y auditing.
- Caveat: plan targets the LEGACY V1 tool surface (`packages/codo/src/tool/registry.ts`, Tool.define
  with ctx.ask permissions) — see INGEST-CONFLICTS W5 about building on the legacy pattern mid-V2.

### D19 - Addon Marketplace shipped with one documented divergence [design-spec+plan, drafts; classifier code-verified]
`docs/compose/specs/2026-07-05-codo-addons-design.md`, plan, and
classifications/2026-07-05-codo-addons-plan.md.
- `/addons` CLI: interactive (@clack/prompts) browse/select/toggle flow + non-interactive
  `list|enable [--global]|disable|status` subcommands via effectCmd pattern.
- Built-in TypeScript catalog constant (first addon: agent-browser); npm install to cache; scope
  local (`<project>/.codo/`) vs global (`~/.config/COdo/`); addon entry recorded in `addons{}` of
  CODO.json (`AddonInfo` schema in `packages/core/src/v1/config/addon.ts`, wired into ConfigV1.Info).
- Disable keeps the npm package (fast re-enable); uninstall is future work.
- VERIFIED IMPLEMENTED: Tasks 1, 3-6 (schema, install, patch, manage, CLI registration at
  packages/codo/src/index.ts:32,107). DIVERGED Task 2: bundled skill-content strings/files were
  never created; shipped `catalog.ts` copies skills from the installed npm package's `skillDataDir`
  ("skill-data") at runtime instead. Checkboxes remain unchecked (stale tracking, not pending work).
- Skill visibility rides the legacy `skills.paths[]` discovery mechanism (v1 config).

## Explicit Deferrals (binding non-decisions)

### D20 - Deferred-by-design items [multiple current sources]
Do not treat these as missing work by accident — each is an explicit design deferral:
- Provider timeout/retry/watchdog policy (no universal stream timeout; needs configurable slice).
- Post-crash activity recovery (durable activity identity, dispatch ambiguity, retry/abandon
  decisions, budgets/backoff/status).
- Clustered Session execution ownership, stale-runtime fencing, startup activity discovery
  (EventV2 replay-owner claims already exist and are SEPARATE from execution ownership).
- Manual compaction on top of automatic; deterministic old-tool-result pruning.
- Configured/remote/nested instruction sources; watcher-backed caching (only if measurement demands).
- Plugin-defined Context Sources; plugin hooks for request settings/transforms.
- Background bash execution (needs observation/cancellation contract); hosted-tool continuation for
  `store:false`; webfetch image/attachment settlement (text-only today).
- apply_patch moves/atomic rollback; syscall-level mutation confinement.
- `.opencode` vs project-file policy precedence; organization-managed policy delivery.
- Everything-hotreloadable goal (todo.md) remains directional.
Sources: specs/v2/session.md, specs/v2/todo.md [draft], specs/v2/schema-changelog.md.
