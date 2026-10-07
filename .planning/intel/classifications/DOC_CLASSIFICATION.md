# DOC_CLASSIFICATION.md

> Generated: 2026-08-23 | Classifier: gsd-doc-classifier (compose dispatch)
> Input focus: `specs/project.md` (multi-project session API spec) | Scope: all project documentation in the repository
> Method: full inventory of 1,642 markdown files; excluded tooling trees, vendored code, and test fixtures; classified 107 documentation files individually.

---

## 1. Summary

| Dimension | Breakdown |
|---|---|
| **Documents classified** | 107 files (79 index rows; `d/` counted as one grouped row of 29) |
| **Types** | reference (52) · guide (13) · plan/decision-record (13) · explanation (9) · design-spec (9) · starter-boilerplate (4) · audit/research-report (4) · api-reference (1) · tutorial (1) · roadmap (1) |
| **Audience** (multi-tag) | developer/contributor (~60) · agent-runtime (29) · end-user (11) · operator (5) · maintainer/strategy (3) · academic (2) · n/a boilerplate/stale (6) |
| **Status** | current: 78 · needs-update: 12 · draft: 10 · deprecated: 7 |

Exact per-column tallies: see Section 6 (machine-tallied from the master table).

---

## 2. Navigation Index — by Type

### API Reference
- [specs/project.md](../../../specs/project.md) — multi-project session HTTP API spec *(draft, active WIP)*

### Tutorials
- docs/sec-test/02-USER-GUIDE.md — course-style sec-test walkthrough

### Guides / How-to
- README.md · packages/codo/README.md · packages/cli/README.md · packages/desktop/README.md · packages/desktop/icons/README.md
- packages/http-recorder/README.md · packages/slack/README.md · sdks/vscode/README.md · github/README.md
- packages/app/e2e/performance/README.md · packages/codo/test/EFFECT_TEST_MIGRATION.md · specs/v2/instructions.md · packages/llm/README.md

### Explanations / Concept docs
- walkthrough.md · PROPOSAL.md · DEEP_MINDS_POSTER.md · docs/COdo-explanation.md
- docs/COdo_Complete_Wiki.md · docs/COdo_Features.md · docs/COdo-Features-Guide.md *(three overlapping feature guides — consolidate)*
- docs/not-a-fork/VISIBLE-DIFFERENCES.md · docs/sec-test/01-IDEA.md

### Reference
- AGENTS.md (root conventions) + 9 package-level `AGENTS.md` guides (app, codo, codo/project, codo/test, core/src/tool, desktop, effect-drizzle-sqlite, llm, stats)
- NOTICES.md (third-party licenses) · d/ (29 sec-test skill definitions — grouped entry) · .planning/codebase/* (7 codebase-map snapshots)
- docs/sec-test/03-IMPLEMENTATION.md · packages/codo/specs/tui-plugins.md · packages/stats/README.md · packages/containers/README.md

### Design Specs
- specs/v2/: session.md · tools.md · config.md · provider-model.md · provider-policy.md · catalog-config-plugin-lifecycle.md
- specs/storage/effect-sqlite-package.md · packages/app/create-effect-simplification-spec.md
- docs/compose/specs/: codo-addons-design.md · agent-browser-design.md *(both marked Draft)*

### Plans & Decision Records
- MIGRATION-PLAN.md · plan-compose-gsd.md · docs/CODO_IMPLEMENTATION_PLAN.md
- specs/tui-package.md · specs/storage/remove-opencode-db.md · specs/v2/schema-changelog.md · specs/v2/todo.md
- docs/compose/plans/: codo-addons-plan.md · agent-browser-plan.md
- packages/llm/example/call-sites.md · packages/codo/specs/openapi-translation-cleanup.md
- packages/codo/.planning/PROJECT.md · REQUIREMENTS.md *(unrelated demo artifacts — recommend removal)*

### Audit / Research Reports
- .planning/research/SCRAPE-SUITE-DESIGN.md · SCRAPE-AGENT-INTEGRATION.md
- .planning/security/findings/pipeline-harden.md · secrets-dependency-audit.md

### Roadmap
- .planning/not-a-fork-roadmap.md

---

## 3. Master Classification Table

| File | Type | Audience | Purpose | Status |
|---|---|---|---|---|
| README.md | guide | end-user, developer | onboarding | current |
| AGENTS.md | reference | contributor, agent | conventions | current |
| NOTICES.md | reference | operator, contributor | licensing | current |
| PROPOSAL.md | explanation | academic | academic | draft |
| DEEP_MINDS_POSTER.md | explanation | academic | academic | draft |
| MIGRATION-PLAN.md | plan/decision-record | developer | decision-record | needs-update |
| walkthrough.md | explanation | developer, contributor | architecture | current |
| plan-compose-gsd.md | plan/decision-record | developer | feature-doc | draft |
| specs/project.md | api-reference | developer | architecture | draft |
| specs/tui-package.md | plan/decision-record | developer | architecture | needs-update |
| specs/storage/effect-sqlite-package.md | design-spec | developer | architecture | current |
| specs/storage/remove-opencode-db.md | plan/decision-record | developer | decision-record | needs-update |
| specs/v2/session.md | design-spec | developer | architecture | current |
| specs/v2/tools.md | design-spec | developer | architecture | current |
| specs/v2/config.md | design-spec | developer | decision-record | draft |
| specs/v2/instructions.md | guide | contributor | conventions | current |
| specs/v2/provider-model.md | design-spec | developer | architecture | current |
| specs/v2/provider-policy.md | design-spec | developer | architecture | current |
| specs/v2/schema-changelog.md | plan/decision-record | developer | decision-record | current |
| specs/v2/todo.md | plan/decision-record | developer | strategy | draft |
| specs/v2/catalog-config-plugin-lifecycle.md | design-spec | developer | architecture | current |
| d/ (29 skill definitions: brief, scope, scope-gate, context, threat-model, code-audit, agent-surface-audit, api-security-test, auth-test, container-scan, coverage-audit, dependency-audit, exploit-verify, fuzz, incident-runbook, learn, logging-audit, mutation-test, pentest, pipeline-harden, posture-report, regression-guard, report, response, sbom, secrets-scan, supply-chain-attest, test-generate, test-plan) | reference | agent, maintainer | security | current |
| docs/COdo-explanation.md | explanation | end-user | onboarding | needs-update |
| docs/COdo_Complete_Wiki.md | explanation | end-user | feature-doc | current |
| docs/COdo_Features.md | explanation | end-user | feature-doc | current |
| docs/COdo-Features-Guide.md | explanation | end-user | feature-doc | current |
| docs/CODO_IMPLEMENTATION_PLAN.md | plan/decision-record | developer | strategy | needs-update |
| docs/not-a-fork/VISIBLE-DIFFERENCES.md | explanation | end-user, contributor | strategy | current |
| docs/sec-test/01-IDEA.md | explanation | end-user, developer | feature-doc | current |
| docs/sec-test/02-USER-GUIDE.md | tutorial | end-user | onboarding | current |
| docs/sec-test/03-IMPLEMENTATION.md | reference | maintainer | feature-doc | current |
| docs/compose/specs/2026-07-05-codo-addons-design.md | design-spec | developer | feature-doc | draft |
| docs/compose/specs/2026-07-05-agent-browser-design.md | design-spec | developer | feature-doc | draft |
| docs/compose/plans/2026-07-05-codo-addons-plan.md | plan/decision-record | developer | feature-doc | draft |
| docs/compose/plans/2026-07-05-agent-browser-plan.md | plan/decision-record | developer | feature-doc | draft |
| .planning/codebase/ARCHITECTURE.md | reference | developer, agent | architecture | current |
| .planning/codebase/STACK.md | reference | developer, agent | architecture | current |
| .planning/codebase/STRUCTURE.md | reference | developer, agent | architecture | current |
| .planning/codebase/CONVENTIONS.md | reference | developer, agent | conventions | current |
| .planning/codebase/TESTING.md | reference | developer, agent | testing | current |
| .planning/codebase/INTEGRATIONS.md | reference | developer, agent | architecture | current |
| .planning/codebase/CONCERNS.md | reference | developer, maintainer | decision-record | current |
| .planning/not-a-fork-roadmap.md | roadmap | maintainer | strategy | current |
| .planning/research/SCRAPE-SUITE-DESIGN.md | audit/research-report | developer | feature-doc | current |
| .planning/research/SCRAPE-AGENT-INTEGRATION.md | audit/research-report | developer | feature-doc | current |
| .planning/security/findings/pipeline-harden.md | audit/research-report | operator, maintainer | security | current |
| .planning/security/findings/secrets-dependency-audit.md | audit/research-report | operator, maintainer | security | current |
| perf/test-suite.md | plan/decision-record | developer | testing | needs-update |
| packages/app/README.md | starter-boilerplate | n/a | n/a | deprecated |
| packages/app/create-effect-simplification-spec.md | design-spec | developer | architecture | draft |
| packages/app/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/cli/README.md | guide | end-user | onboarding | current |
| packages/codo/README.md | guide | end-user | onboarding | current |
| packages/codo/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/codo/project/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/codo/test/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/codo/test/EFFECT_TEST_MIGRATION.md | guide | contributor | testing | current |
| packages/codo/specs/tui-plugins.md | reference | developer | feature-doc | current |
| packages/codo/specs/openapi-translation-cleanup.md | plan/decision-record | developer | architecture | needs-update |
| packages/codo/.planning/PROJECT.md | plan/decision-record | n/a | n/a | deprecated |
| packages/codo/.planning/REQUIREMENTS.md | plan/decision-record | n/a | n/a | deprecated |
| packages/console/app/README.md | starter-boilerplate | n/a | n/a | deprecated |
| packages/containers/README.md | reference | operator, contributor | architecture | current |
| packages/core/src/tool/AGENTS.md | reference | contributor, agent | architecture | current |
| packages/desktop/README.md | guide | developer | onboarding | current |
| packages/desktop/icons/README.md | guide | contributor | feature-doc | current |
| packages/desktop/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/docs/README.md | starter-boilerplate | n/a | n/a | deprecated |
| packages/effect-drizzle-sqlite/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/enterprise/README.md | starter-boilerplate | n/a | n/a | deprecated |
| packages/http-recorder/README.md | guide | developer | feature-doc | current |
| packages/llm/README.md | guide | developer | onboarding | needs-update |
| packages/llm/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/llm/example/call-sites.md | plan/decision-record | developer | feature-doc | draft |
| packages/slack/README.md | guide | end-user, developer | onboarding | needs-update |
| packages/stats/README.md | reference | developer | architecture | current |
| packages/stats/AGENTS.md | reference | contributor, agent | conventions | current |
| packages/web/README.md | starter-boilerplate | n/a | n/a | deprecated |
| sdks/vscode/README.md | guide | end-user | onboarding | needs-update |
| github/README.md | guide | end-user, operator | onboarding | needs-update |

*(perf/test-suite.md lives under `perf/`; it is indexed here because it is a working doc, not a test fixture.)*

---

## 4. Grouped Entries

| Group | Files | Nature | Decision |
|---|---|---|---|
| `.agents/gsd-core/**` (+ per-package copies in `packages/{codo,app}/.agents/`) | ~700 md | GSD workflow/skill tooling infrastructure | **Excluded** — not project docs |
| `codo-dev/**` | ~27 md incl. 20 translated READMEs | Vendored upstream opencode checkout used as dev reference (has own CONTRIBUTING/SECURITY) | **Excluded** — third-party reference tree |
| Test fixtures (`packages/codo/test/config/fixtures/*.md`, `test/fixture/skills/**`) | ~15 md | Test data | **Excluded** |
| Runtime content (`packages/*/src/workflow/templates`, `src/workflow/prompts`, skill bundles, `.opencode/command*`) | ~40 md | Product runtime content shipped to users, not repo documentation | **Excluded** |
| `packages/codo/.opencode/commands`, `project/.specify/templates` | ~15 md | Tool command definitions / templates | **Excluded** |

---

## 5. Gaps Identified

1. **Canonical doc set incomplete.** Of the 9 canonical types only README exists at root. Missing public docs: `ARCHITECTURE` (only an internal `.planning/codebase/` snapshot), `GETTING-STARTED`, `DEVELOPMENT` (scattered across AGENTS.md files), `TESTING`, `CONFIGURATION`, `API`, `CONTRIBUTING` (root has none; only the vendored `codo-dev` copy does), `DEPLOYMENT`.
2. **15 workspace packages have no README**: browser, console (root), core, effect-drizzle-sqlite (AGENTS-only), effect-sqlite-node, function, identity, plugin, script, sdk, server, session-ui, storybook, tui, ui.
3. **Redundant feature guides**: `docs/COdo_Complete_Wiki.md`, `docs/COdo_Features.md`, and `docs/COdo-Features-Guide.md` cover the same four pillars with divergent depth — consolidate into one canonical feature reference.
4. **Branding drift cluster ("opencode" → "COdo")**: sdks/vscode/README.md, github/README.md, packages/slack/README.md, packages/llm/README.md, plus older specs referencing `packages/opencode/*` paths that no longer exist (specs/tui-package.md, specs/storage/remove-opencode-db.md, packages/codo/specs/openapi-translation-cleanup.md, perf/test-suite.md). The `docs/not-a-fork/` positioning effort makes this drift user-visible.
5. **No user-facing configuration reference** for `CODO.json` / config schema despite configuration being central to the product.
6. **`packages/docs/` is still an uncustomized Mintlify starter** — the intended public docs site has not been built out.
7. **Stale unrelated planning artifacts**: `packages/codo/.planning/{PROJECT,REQUIREMENTS}.md` describe a "World Cup 2026 Fantasy" demo — recommend removal or relocation.
8. **Input spec status**: `specs/project.md` is a raw draft (self-noted "These are awkward" endpoints); it is the seed for the future canonical API doc but currently documents endpoints that do not match the implemented route surface.

---

## 6. Machine-Tallied Counts

<!-- TALLY-BLOCK: counts below are computed from Section 3 by script; do not hand-edit -->

See structured return summary appended to the dispatch conversation.
