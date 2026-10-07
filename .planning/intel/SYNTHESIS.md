# SYNTHESIS — Intel Entry Point

> Generated: 2026-08-25 | Agent: gsd-doc-synthesizer (compose dispatch)
> Operation: doc-ingest synthesis into .planning/intel/ | MODE=merge
> Conflict gate: see ../INGEST-CONFLICTS.md — BLOCKERS: 0 / WARNINGS: 7 / INFO: 9

## Purpose

Single entry point for everything synthesized from the classified documentation set. Downstream
routing (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md creation) should read this file first,
then load only the intel files it needs.

## Outputs

| File | Contents |
|---|---|
| decisions.md | 20 decision records (D1-D20) with source citations + status tags; includes explicit-deferral register D20 |
| requirements.md | R1-R10 requirement groups with [implemented]/[partial]/[draft]/[gap]/[future] tags; competing variants preserved, never merged |
| constraints.md | C1-C9 hard invariants: repo law, V2 Session Core, storage, package boundaries, config/policy evaluation, migration state, security posture, hygiene, platform |
| context.md | X1-X9 narrative background + standardized terminology + known tensions |

## Inputs consumed

17 ingested docs (all read in full):
- specs/project.md [api-reference, draft]
- specs/tui-package.md [plan/decision-record, needs-update]
- specs/storage/effect-sqlite-package.md [design-spec, current]
- specs/storage/remove-opencode-db.md [plan/decision-record, needs-update]
- specs/v2/{session,tools,config(draft),provider-model,provider-policy,catalog-config-plugin-lifecycle}.md [design-specs]
- specs/v2/{schema-changelog(current), todo(draft), instructions(current)} [plans/guide]
- docs/compose/specs/2026-07-05-{agent-browser,codo-addons}-design.md [design-specs, draft]
- docs/compose/plans/2026-07-05-{agent-browser,codo-addons}-plan.md [plans, draft]

Plus staging classifications:
- classifications/DOC_CLASSIFICATION.md (master table, gaps section, provider-policy code-verified deep dive)
- classifications/2026-07-05-codo-addons-plan.md (dedicated record incl. ADR rejection + Task-status verification)

Binding existing context cross-checked:
- .planning/config.json, .planning/codebase/{STACK,ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING,INTEGRATIONS,CONCERNS}.md
- .planning/not-a-fork-roadmap.md, .planning/research/{SCRAPE-SUITE-DESIGN,SCRAPE-AGENT-INTEGRATION}.md
- .planning/security/findings/{pipeline-harden,secrets-dependency-audit}.md
- AGENTS.md (repo law)

## Method

1. Read all sources fully; classify per DOC_CLASSIFICATION statuses (authoritative for docs without
   dedicated records).
2. Overlap merge: V2 session semantics appeared across session.md/todo.md/schema-changelog/AGENTS.md
   -> merged into D1-D5/C2 with AGENTS.md treated as verbatim-critical. Tool semantics across
   tools.md/schema-changelog/session.md -> D6/D7. Config outcomes across config.md/provider-policy/
   catalog-lifecycle -> D10-D12.
3. Contradiction scan vs binding context and intra-set -> INGEST-CONFLICTS.md (0 blockers; 7
   warnings preserved as variants; 9 informational).
4. Terminology standardized per context.md X8 (COdo/packages/codo/core; V1/V2; Location/Session/
   Epoch; admit/promote; steer/queue; classification status labels).
5. Redundancy removed: repeated compaction/inbox/policy prose deduplicated into single canonical
   statements with citations.

## Precedence notes actually exercised

- No ADR exists in the set; addons plan was explicitly rejected as ADR by its classifier record.
- SPEC > PRD > DOC applied where drafts conflict with current specs (e.g., session-init route:
  current session.md removal decision recorded as D17; draft project.md variant preserved as W2).
- Draft docs (config.md, compose specs/plans, todo.md, project.md) are tagged draft everywhere they
  feed decisions/requirements so downstream artifacts inherit the caveat.

## Coverage matrix (doc -> primary landing spots)

- project.md -> R1.1 (+W1/W2)
- tui-package.md -> D15, C4, C8 (drift), R8.4
- effect-sqlite-package.md -> D16, C3, I8
- remove-opencode-db.md -> D14, C3, C8
- v2/session.md -> D1-D5, D17, D20, R1-R3, C2
- v2/tools.md -> D6, D7, R3, C4
- v2/config.md -> D12, R4, C5
- v2/provider-model.md -> D9, R5, I7
- v2/provider-policy.md -> D10, D11, C5, W4
- v2/catalog-config-plugin-lifecycle.md -> D8, C5
- v2/schema-changelog.md -> D3, D20, R1, C3
- v2/todo.md -> D20, R4.2, R10, W7
- v2/instructions.md -> D13, C4
- agent-browser design+plan -> D18, R3.2, R7, W5
- codo-addons design+plan(+record) -> D19, R6, C5/I6, W6
- DOC_CLASSIFICATION.md -> R8, C8, X5, I1-I3

## Gaps remaining after synthesis (not resolvable from sources)

1. No canonical API contract reconciling specs/project.md with implemented V2 routes (needs a
   dedicated decision).
2. v2 config review unfinished (`.opencode` policy precedence; several "remains open" notes).
3. Addon skill-delivery divergence lacks an adopt-or-revert decision record.
4. Legacy-V1-feature-surface vs core-doctrine reconciliation has no owner or slice.
5. Scrape suite is designed but unbuilt; blueprint is time-stamped to working tree 2026-08-22 and
   should be re-verified before execution.
6. Organization-managed policy delivery mechanism unspecified by design.
7. packages/docs public site strategy undefined beyond "starter untouched".

## Regeneration note

This intel set reflects repo state as of 2026-08-25 against branch dev. Re-run classification +
synthesis after major landings (V2 parity completion, config v2 finalization, scrape suite build,
not-a-fork Phase A/B) before relying on it for new phase planning.
