## Conflict Detection Report

Operation: ingest (doc synthesis into .planning/intel/)
Mode: merge | Precedence: ADR > SPEC > PRD > DOC
Loaded context: .planning/codebase/*, not-a-fork-roadmap.md, research/*, security/findings/*,
AGENTS.md. Core artifacts (PROJECT/REQUIREMENTS/ROADMAP/STATE) absent — nothing core-locked to
contradict; binding context treated per dispatch instructions.

### BLOCKERS (0)

(none — no incoming statement contradicts a locked decision; destination artifacts do not exist yet)

### WARNINGS (7)

[WARNING] Draft API seed spec does not match implemented route surface
  Found: specs/project.md [api-reference, draft] documents a multi-project session API
  (`GET /project`, `POST /project/:projectID/session...`, directory-parameterized provider/config/
  agent/find endpoints it self-labels "awkward", `POST /log`).
  Impact: Routing it into REQUIREMENTS as-is would codify endpoints that do not exist; the
  classification (gap #8) confirms the mismatch against the live server surface (V2 routes in
  specs/v2/schema-changelog.md, x-codo-directory routing per INTEGRATIONS).
  → Treat specs/project.md as seed material only; reconcile against implemented routes before any
  canonical API doc or requirement is written.

[WARNING] Competing acceptance variants on the dedicated session-init endpoint
  Found: specs/project.md includes `POST /project/:projectID/session/:sessionID/init`; current
  design-spec specs/v2/session.md ("Remove Dedicated session.init Route") mandates removing the
  dedicated endpoint in favor of the normal `/init` command flow.
  Impact: Both variants are preserved unmerged; an API requirement derived from the wrong one
  reintroduces a `Session.initialize` special case the V2 design explicitly rejects.
  → Downstream API requirements must cite D17 (removal) as the SPEC-precedent variant and record
  project.md's variant as superseded-draft.

[WARNING] Branding/path drift inside needs-update specs vs verified repo reality
  Found: specs/tui-package.md names `@opencode-ai/tui` and `packages/opencode` paths while
  STRUCTURE.md verifies `@codo-ai/tui` under `packages/tui`; remove-opencode-db.md and
  effect-sqlite-package.md cite `packages/opencode/src/...` and `/Users/kit/...` author-machine
  paths plus `@opencode-ai/effect-drizzle-sqlite` naming; schema-changelog references branch
  `feat/opencode-embedded-api`.
  Impact: Verbatim path/package reuse from these specs will fail or mislead; decisions themselves
  are sound (statuses internally Completed) — only identifiers drifted.
  → Use codebase-map identifiers everywhere; apply the C8 hygiene sweep when these specs are next
  edited.

[WARNING] Provider-policy spec-to-code identifier drift
  Found: DOC_CLASSIFICATION deep dive (code-verified) reports specs/v2/provider-policy.md says
  `Catalog.ProviderPolicy` fixes action="provider.use", while implemented code has
  `Catalog.PolicyActions` + `ConfigExperimental.Policy` (catalog.ts / config/experimental.ts /
  policy.test.ts / v1/config/migrate.ts).
  Impact: Implementation docs quoting spec identifiers will reference non-existent symbols;
  spec-only readers will misread migration behavior.
  → Use CODE identifiers in implementation-facing artifacts; update spec text opportunistically.

[WARNING] Shipped features built on legacy V1 tool surface while core doctrine moves ownership
  Found: agent-browser plan wires tools via legacy `packages/codo/src/tool/registry.ts` +
  Tool.define(ctx.ask) pattern; addons ride legacy `skills.paths[]`; meanwhile current design-specs
  (tools.md, instructions.md) locate tool ownership in the Location-scoped ToolRegistry with
  Tool.make + PermissionV2.assert and narrow plugin capabilities, and CONCERNS P9 tracks 16 v1/v2
  dual-write sites awaiting an SLA flip.
  Impact: New capabilities may need re-porting during the V2 cutover; permission semantics differ
  between surfaces (ctx.ask vs PermissionV2 assert); risk of compounding legacy dependencies.
  → Record as reconciliation requirement; prefer V2-surface integration for NEW feature work unless
  deliberately scoped to the legacy runtime.

[WARNING] Addons plan is executed but internally stale (checkboxes + Task 2 divergence)
  Found: classification record verifies Tasks 1,3-6 implemented and registered
  (packages/codo/src/index.ts:32,107), Task 2 diverged (bundled skill-content files never created;
  catalog.ts copies skills from installed npm package skillDataDir instead), all checkboxes remain
  `- [ ]`.
  Impact: Treating the plan as living work-list would redo finished work; treating bundled-skills
  design as shipped would misstate delivery mechanism.
  → Annotate divergence + refresh checkboxes if kept as living doc; otherwise archive as historical
  execution artifact (classifier recommendation).

[WARNING] Compaction status conflict between draft todo and current specs
  Found: specs/v2/todo.md [draft] still lists compaction among future runner slices ("add
  compaction... only as their slices become concrete"); specs/v2/session.md and schema-changelog
  (2026-06-05 entry) document automatic compaction as EXECUTED with event versions started.1/ended.2.
  Impact: Roadmap items derived from todo.md would schedule completed work; both variants preserved
  here unmerged per policy.
  → Treat session.md + schema-changelog as authoritative (SPEC precedence over draft); prune the
  stale bullet when todo.md is next revised.

### INFO (9)

[INFO] Stale unrelated planning artifacts present
  Note: packages/codo/.planning/{PROJECT,REQUIREMENTS}.md describe an unrelated "World Cup 2026
  Fantasy" demo (classification gap #7). Recommend removal/relocation; excluded from synthesis.

[INFO] Documentation gaps cluster (canonical set incomplete)
  Note: Only root README exists of 9 canonical types; 15 workspace packages lack READMEs; three
  overlapping feature guides need consolidation; no user-facing CODO.json reference; packages/docs
  is an untouched Mintlify starter; root CONTRIBUTING absent. Full list preserved as R8.

[INFO] Specs lack ADR-style status headers
  Note: staleness is hard to detect across specs/ (classification recommendation); add status
  headers when editing ingested specs (constraint C8).

[INFO] Security posture snapshot carried into constraints
  Note: pipeline-harden.md (17 findings: 0C/1H/8M/8L; SLSA L1 today) and secrets-dependency-audit.md
  (vite HIGH D1, electron/astro/pkg.pr.new M, fixture-key S1/S2, tui.log S3) folded into R9/C7 —
  remediation requirements preserved with IDs.

[INFO] Scrape suite designed but not implemented
  Note: SCRAPE-SUITE-DESIGN.md is final/validated with a line-verified integration blueprint
  (verified against working tree 2026-08-22); recorded as draft-ready requirement R10; re-verify
  line anchors before execution.

[INFO] Generational config layering for skills
  Note: addons patch legacy `skills.paths[]` (shipped) while v2 config redesign flattens `skills`
  to a discovery-source array (config.md Group 3); reconciliation needed during any v2 config
  migration (C5/I6).

[INFO] small_model removal tension with catalog interface
  Note: config.md removes top-level `small_model`, but provider-model.md Catalog interface still
  exposes `model.small(providerID)`; harmless while title-generation migrates to explicit title-
  agent model override — flag during catalog interface revision.

[INFO] effect-drizzle-sqlite open questions remain open
  Note: client-target choice (@effect/sql-sqlite-bun vs node), copy-vs-import strategy, upstream
  Drizzle update path stay unresolved by design; package exists and works (STRUCTURE.md).

[INFO] Deferred-by-design register established
  Note: provider timeout/watchdog, post-crash recovery, clustering/stale-owner fencing, manual
  compaction, plugin Context Sources, background bash, org-managed policy delivery et al. are
  explicit deferrals (D20) — absence from roadmaps must not be read as oversight.

---

Gate: 0 blockers — proceed. 7 warnings require explicit user approval before downstream artifacts
consume the affected content (approve / revise / abort per gate-prompts contract). INFO entries
carry no gate.
