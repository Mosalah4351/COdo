# Document Classification Record

**Classified by:** gsd-doc-classifier (compose dispatch)
**Date:** 2026-08-23
**Source file:** `docs/compose/plans/2026-07-05-codo-addons-plan.md`

---

## Verdict

| Field | Value |
|-------|-------|
| **Type** | PLAN (SPEC-class execution document) — **NOT an ADR** |
| **Audience** | Contributor / developer — specifically agentic workers (`compose:subagent`, `compose:execute`) |
| **Purpose** | Feature implementation roadmap with spec traceability; documents *how to build*, not *why a choice was made* |
| **Status** | needs-update — implemented, but code diverged from plan on one task and checkboxes are stale |

---

## ADR Flag Resolution

The `YYYY-MM-DD` directory date-pattern flagged this as a possible ADR. Content
heuristics **reject** that classification:

### ADR signals checked — none present

| ADR signal | Present? | Evidence |
|------------|----------|----------|
| Status header (Proposed/Accepted/Superseded) | No | Header block contains Goal/Architecture/Tech Stack only |
| Context → Decision → Consequences structure | No | Structure is Task 1–7 with checkbox steps |
| Alternatives considered / trade-off rationale | No | Single approach stated; no rejected options discussed |
| Decision-record language ("we chose X because…") | No | Imperative work directives throughout |

### Plan/SPEC signals — all present

1. Title explicitly: "COdo Addon Marketplace — **Implementation Plan**"
2. Checkbox task tracking (`- [ ]`) for step-by-step execution
3. Per-task Create/Modify file manifests and verbatim code blocks
4. Per-task commit messages (`feat(core): add AddonInfo config schema`, etc.)
5. Verification gates per task (`bun typecheck`, manual smoke tests)
6. Agentic execution directive in the callout ("REQUIRED SUB-SKILL: compose:subagent…")
7. Traceability tags (`Covers: [S3]`) into the companion design spec
   `docs/compose/specs/2026-07-05-codo-addons-design.md` ([S1]–[S9])

**Conclusion:** dated-filename pattern is shared by plans and ADRs alike — a false
positive here. The document is a downstream artifact of the design spec, not a
decision record.

---

## Classification Detail

### Type

Diátaxis fit: none of the five canonical types cleanly apply. Nearest neighbor is
a *how-to guide* aimed at implementers, but the checkbox/code-manifest/commit
structure makes it an executable work specification (GSD SPEC-class), paired 1:1
with its design spec.

### Audience

- Primary: agentic workers dispatched to execute tasks mechanically
- Secondary: developers reviewing what was planned vs. what shipped

### Purpose

Feature implementation planning — bridges the [S#] requirements in the design
spec to concrete files, code, commits, and verification steps. Not architecture
documentation and not a decision record.

### Status evidence (checked against live codebase)

| Plan task | Codebase state |
|-----------|----------------|
| Task 1: `packages/core/src/v1/config/addon.ts` | ✅ Exists; wired into config |
| Task 2: `catalog.ts` + bundled skill files | ⚠️ Partial — catalog exists but **diverged**: uses `skillDataDir: "skill-data"` (skills copied from npm package at runtime); planned `skills/agent-browser-core.ts` and `agent-browser-dogfood.ts` were never created |
| Task 3: `install.ts` | ✅ Exists |
| Task 4: `patch.ts` | ✅ Exists |
| Task 5: `manage.ts` | ✅ Exists |
| Task 6: CLI command + registration | ✅ Exists; registered at `packages/codo/src/index.ts` lines 32, 107 |
| Task 7: verification | Unknown (no record) |

All checkboxes remain `- [ ]` unchecked despite implementation — stale tracking,
not pending work.

### Recommended handling

1. Treat as **historical execution artifact**, not living documentation.
2. If kept current: update Task 2 to reflect the skill-data-dir design and check
   off completed steps, or annotate the divergence.
3. Do not index under decision records / architecture docs; index under plans.
4. Cross-link both directions with `docs/compose/specs/2026-07-05-codo-addons-design.md`.

---

## Coverage Gaps Observed

- No status field in the plan itself (plans would benefit from an
  Implemented/Superseded marker once executed, like the spec's Draft status).
- The sibling plan `2026-07-05-agent-browser-plan.md` and two specs in the same
  tree are not yet classified.
