# Plan: Compose Agent as GSD-Friendly Interface

## Vision

The compose agent becomes the **zero-learning-curve interface** for GSD. Users speak plain English. The agent orchestrates all 84 GSD skills internally. Users never need to learn `/gsd:add-phase` or phase numbering.

## Architecture

```
User: "I want to build a login feature"
                │
                ▼
        ┌──────────────────┐
        │  Compose Agent   │ ← reads .codo/config.json for active workflow
        │  (compose.txt)   │   loads compose:gsd-ecosystem skill if GSD
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Routing Headers │ ← 16 compose SKILL.md route to GSD equivalents
        │  + Direct Use    │    70+ GSD skills used from available_skills
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  GSD Skills      │ ← All 84 available via skill tool
        │  (gsd:plan-phase,│
        │   gsd:execute,   │
        │   gsd:ship, etc.)│
        └──────────────────┘
```

## Files Changed

| Action | File | Change |
|---|---|---|
| **Create** | `src/skill/compose/gsd-ecosystem/SKILL.md` | Full GSD ecosystem reference (concepts, 8 categories, when-to-use, example flow) |
| **Modify** | `src/skill/compose-skills.ts` | Register `compose:gsd-ecosystem` |
| **Modify** | `src/agent/prompt/compose.txt` | Add ~20 line workflow awareness section |
| **Modify** | `src/skill/compose/ask/SKILL.md` | Add routing header: remains compose-native (meta-utility) |
| **Modify** | `src/skill/compose/brainstorm/SKILL.md` | Routing header → `gsd:explore` + `gsd:spec-phase` |
| **Modify** | `src/skill/compose/debug/SKILL.md` | Routing header → `gsd:debug` |
| **Modify** | `src/skill/compose/execute/SKILL.md` | Routing header → `gsd:execute-phase` / `gsd:execute-plan` |
| **Modify** | `src/skill/compose/feedback/SKILL.md` | Routing header → `gsd:code-review-fix` + **bridging content** |
| **Modify** | `src/skill/compose/merge/SKILL.md` | Routing header → `gsd:ship` + `gsd:pr-branch` |
| **Modify** | `src/skill/compose/new-skill/SKILL.md` | Routing header → `gsd:spike-wrap-up` / `gsd:sketch-wrap-up` |
| **Modify** | `src/skill/compose/parallel/SKILL.md` | Routing header → `gsd:execute-phase` waves + **bridging content** |
| **Modify** | `src/skill/compose/plan/SKILL.md` | Routing header → `gsd:plan-phase` |
| **Modify** | `src/skill/compose/report/SKILL.md` | Routing header → `gsd:milestone-summary` / `gsd:session-report` / `gsd:extract_learnings` |
| **Modify** | `src/skill/compose/review/SKILL.md` | Routing header → `gsd:code-review` / `gsd:review` |
| **Modify** | `src/skill/compose/self-extend/SKILL.md` | Routing header → `gsd:settings` / `gsd:settings-advanced` / `gsd:profile-user` |
| **Modify** | `src/skill/compose/subagent/SKILL.md` | Routing header → `gsd:autonomous` / `gsd:execute-phase` + **bridging content** |
| **Modify** | `src/skill/compose/tdd/SKILL.md` | Routing header → `gsd:add-tests` + `gsd:validate-phase` + **bridging content** |
| **Modify** | `src/skill/compose/verify/SKILL.md` | Routing header → `gsd:verify-work` / `gsd:validate-phase` |
| **Modify** | `src/skill/compose/worktree/SKILL.md` | Routing header → `gsd:new-workspace` |

## 16 Compose → GSD Mapping

| Compose Skill | GSD Equivalent (when GSD active) | Match |
|---|---|---|
| `ask` | Compose-native (meta-utility). GSD workflows handle own questioning. | N/A |
| `brainstorm` | `gsd:explore` (ideation) + `gsd:spec-phase` (requirements) | Good |
| `debug` | `gsd:debug` — same scientific method approach | Direct |
| `execute` | `gsd:execute-phase` / `gsd:execute-plan` — wave-based execution | Good |
| `feedback` | `gsd:code-review-fix` — auto-fix from review findings | Needs bridge |
| `merge` | `gsd:ship` (PR creation) + `gsd:pr-branch` (clean branch) | Good |
| `new-skill` | `gsd:spike-wrap-up` / `gsd:sketch-wrap-up` — packages findings into skills | Partial |
| `parallel` | `gsd:execute-phase` wave parallelism | Needs bridge |
| `plan` | `gsd:plan-phase` — detailed execution plan with verification | Good |
| `report` | `gsd:milestone-summary` / `gsd:session-report` / `gsd:extract-learnings` | Good |
| `review` | `gsd:code-review` (files) / `gsd:review` (cross-AI peer) | Good |
| `self-extend` | `gsd:settings` / `gsd:settings-advanced` / `gsd:profile-user` | Good |
| `subagent` | `gsd:autonomous` / `gsd:execute-phase` | Needs bridge |
| `tdd` | `gsd:add-tests` (post-phase test gen) + `gsd:validate-phase` (Nyquist coverage) | Needs bridge |
| `verify` | `gsd:verify-work` (conversational UAT) / `gsd:validate-phase` (Nyquist) | Good |
| `worktree` | `gsd:new-workspace` — isolated workspace with clones/worktrees | Good |

## 84 GSD Skill Categories

### Phase Lifecycle (use in this order)
`gsd:spec-phase` → `gsd:discuss-phase` → `gsd:plan-phase` → `gsd:execute-phase` → `gsd:code-review` → `gsd:verify-work` → `gsd:ship`

### Phase Management (project health & maintenance)
`gsd:progress`, `gsd:next`, `gsd:stats`, `gsd:health`, `gsd:manager`,
`gsd:add-phase`, `gsd:insert-phase`, `gsd:remove-phase`, `gsd:add-backlog`, `gsd:review-backlog`,
`gsd:complete-milestone`, `gsd:cleanup`, `gsd:milestone-summary`,
`gsd:add-tests`, `gsd:validate-phase`, `gsd:audit-uat`, `gsd:audit-milestone`, `gsd:audit-fix`,
`gsd:plan-milestone-gaps`, `gsd:analyze-dependencies`,
`gsd:plan-review-convergence`, `gsd:list-phase-assumptions`, `gsd:research-phase`,
`gsd:ai-integration-phase`, `gsd:ui-phase`, `gsd:ui-review`, `gsd:secure-phase`, `gsd:eval-review`

### Ideation & Discovery (explore before committing)
`gsd:explore`, `gsd:spike`, `gsd:sketch`, `gsd:note`, `gsd:plant-seed`,
`gsd:add-todo`, `gsd:check-todos`, `gsd:inbox`, `gsd:ingest-docs`,
`gsd:map-codebase`, `gsd:scan`

### Configuration (system setup)
`gsd:settings`, `gsd:settings-advanced`, `gsd:settings-integrations`,
`gsd:set-profile`, `gsd:profile-user`, `gsd:update`, `gsd:sync-skills`,
`gsd:from-gsd2`, `gsd:reapply-patches`

### Workspace (environment management)
`gsd:new-workspace`, `gsd:remove-workspace`, `gsd:list-workspaces`,
`gsd:workstreams`, `gsd:import`

### Recovery (when things go wrong)
`gsd:debug`, `gsd:forensics`, `gsd:undo`, `gsd:pause-work`, `gsd:resume-work`,
`gsd:thread`

### Synthesis (capture & document)
`gsd:session-report`, `gsd:extract-learnings`, `gsd:docs-update`,
`gsd:spike-wrap-up`, `gsd:sketch-wrap-up`

### Orchestration (multi-phase automation)
`gsd:autonomous` — drives all phases end-to-end

## Wave Execution Order

### Wave 1: gsd-ecosystem skill
1. Create `src/skill/compose/gsd-ecosystem/SKILL.md` with full GSD reference
2. Register in `src/skill/compose-skills.ts`

### Wave 2: compose.txt update
1. Add workflow awareness section to `src/agent/prompt/compose.txt`

### Wave 3: Routing headers (16 SKILL.md files)
1. Add routing headers to all 16 files
2. 4 files get extra bridging content (feedback, parallel, subagent, tdd)

### Wave 4: Verification
1. Run `bun typecheck` from `packages/codo`
2. Verify all imports resolve correctly

## GSD Ecosystem Skill Content (gsd-ecosystem/SKILL.md)

### Frontmatter
```yaml
---
name: compose:gsd-ecosystem
hidden: true
description: "Full GSD skill ecosystem reference for workflow-aware compose agent operations. Load when active workflow is GSD."
---
```

### Body Structure
1. **GSD Concepts**: phases, milestones, PLAN.md, CONTEXT.md, SUMMARY.md, waves, `.planning/` directory
2. **8 skill categories** (detailed above) with when-to-use guidance
3. **Routing rule**: "Compose skills = standard entry points → route via headers. No compose skill → use GSD skills directly. Translate all to plain language."
4. **Example flow**: Full login feature from idea to PR

## compose.txt Addition

```
## Workflow Awareness

Check the active workflow from .codo/config.json. If set to "gsd":
1. Load the `compose:gsd-ecosystem` skill for the full GSD reference
2. Each compose skill's ## Workflow Routing header tells you which GSD
   skill to use when GSD is active
3. For tasks without a compose skill, use GSD skills from available_skills
   directly
4. Translate all GSD output and terminology to plain, user-friendly language
5. If context is compacted mid-session, re-load the skill to restore accuracy
```

## SKILL.md Routing Header Template

```markdown
## Workflow Routing

If the active workflow is **GSD**, invoke **`gsd:X`** via the skill tool
instead of following the instructions below. (Other workflows TBD.)
```

## compose-skills.ts Addition

```ts
import gsdEcosystemContent from "./compose/gsd-ecosystem/SKILL.md" with { type: "text" }
// Add to array:
{ name: "compose:gsd-ecosystem", hidden: true, description: "Full GSD skill ecosystem reference for compose agent", content: gsdEcosystemContent },
```
