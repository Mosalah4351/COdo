import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import {
  analyzePhaseFiles,
  nextAction,
  parseRoadmapPhases,
  parseStateFields,
  routeNextAction,
  type PhaseArtifacts,
  type RoadmapPhase,
  type StateFields,
} from "../../src/workflow/next-action"
import { tmpdir } from "../fixture/fixture"

const STATE = `
# Project State

## Current Position

Phase: 1 of 4 (Foundation)
Status: In progress
Progress: [░░░░░░░░░░] 0%
`

const ROADMAP = `
## Phases

- [ ] **Phase 1: Foundation** - Scaffolding
- [ ] **Phase 2: Features** - Core features

## Phase Details

### Phase 1: Foundation
**Goal**: Scaffolding

### Phase 2: Features
**Goal**: Core features
`

const ctx = (state: StateFields, phases: RoadmapPhase[], artifacts: PhaseArtifacts | null, extra?: Partial<Parameters<typeof routeNextAction>[0]>) =>
  routeNextAction({
    state,
    phases,
    artifacts,
    hasPhaseDir: artifacts !== null,
    anyPhaseDirs: artifacts !== null,
    continueHere: false,
    ...extra,
  })

describe("parseStateFields", () => {
  test("extracts phase, status from the state template", () => {
    const s = parseStateFields(STATE)
    expect(s.currentPhase).toBe("1")
    expect(s.status).toBe("In progress")
    expect(s.pausedAt).toBeNull()
  })

  test("detects paused_at via body field", () => {
    const s = parseStateFields(`Phase: 2 of 4\nPaused At: 2026-01-01`)
    expect(s.pausedAt).toBe("2026-01-01")
  })
})

describe("parseRoadmapPhases", () => {
  test("parses checkbox + heading phases", () => {
    const phases = parseRoadmapPhases(ROADMAP)
    expect(phases.map((p) => p.number)).toEqual(["1", "2"])
    expect(phases[0].name).toBe("Foundation")
    expect(phases[0].complete).toBe(false)
  })

  test("marks checked phases complete", () => {
    const phases = parseRoadmapPhases(`- [x] **Phase 1: Done** - desc\n- [ ] **Phase 2: Next** - desc`)
    expect(phases[0].complete).toBe(true)
    expect(phases[1].complete).toBe(false)
  })
})

describe("routeNextAction", () => {
  const state: StateFields = { currentPhase: "1", currentPhaseName: "Foundation", status: "In progress", pausedAt: null }
  const phases: RoadmapPhase[] = [
    { number: "1", name: "Foundation", complete: false },
    { number: "2", name: "Features", complete: false },
  ]

  test("no phase dirs → discuss first phase", () => {
    const a = ctx(state, phases, null, { anyPhaseDirs: false, hasPhaseDir: false })
    expect(a.command).toBe("discuss-phase")
    expect(a.args).toBe("1")
  })

  test("phase without context → discuss", () => {
    const a = ctx(state, phases, { plans: [], summaries: [], hasContext: false, hasResearch: false, hasVerification: false, unresolvedVerification: false })
    expect(a.command).toBe("discuss-phase")
    expect(a.args).toBe("1")
  })

  test("phase with context but no plans → plan", () => {
    const a = ctx(state, phases, { plans: [], summaries: [], hasContext: true, hasResearch: true, hasVerification: false, unresolvedVerification: false })
    expect(a.command).toBe("plan-phase")
    expect(a.args).toBe("1")
  })

  test("plans without summaries → execute", () => {
    const a = ctx(state, phases, { plans: ["01-01-PLAN.md", "01-02-PLAN.md"], summaries: ["01-01-SUMMARY.md"], hasContext: true, hasResearch: true, hasVerification: false, unresolvedVerification: false })
    expect(a.command).toBe("execute-phase")
    expect(a.args).toBe("1")
  })

  test("all plans summarized but not verified → verify", () => {
    const a = ctx(state, phases, { plans: ["01-01-PLAN.md"], summaries: ["01-01-SUMMARY.md"], hasContext: true, hasResearch: true, hasVerification: false, unresolvedVerification: false })
    expect(a.command).toBe("verify-work")
    expect(a.args).toBe("")
  })

  test("verified phase with a next phase → discuss next", () => {
    const a = ctx(state, phases, { plans: ["01-01-PLAN.md"], summaries: ["01-01-SUMMARY.md"], hasContext: true, hasResearch: true, hasVerification: true, unresolvedVerification: false })
    expect(a.command).toBe("discuss-phase")
    expect(a.args).toBe("2")
  })

  test("all phases complete → complete milestone", () => {
    const done: RoadmapPhase[] = [
      { number: "1", name: "Foundation", complete: true },
      { number: "2", name: "Features", complete: true },
    ]
    const a = ctx(state, done, { plans: ["01-01-PLAN.md"], summaries: ["01-01-SUMMARY.md"], hasContext: true, hasResearch: true, hasVerification: true, unresolvedVerification: false })
    expect(a.command).toBe("complete-milestone")
  })

  test("paused → resume", () => {
    const a = ctx({ ...state, pausedAt: "2026-01-01" }, phases, null)
    expect(a.command).toBe("resume-work")
  })

  test("continue-here checkpoint → blocked", () => {
    const a = ctx(state, phases, null, { continueHere: true })
    expect(a.command).toBe("blocked")
    expect(a.reason).toContain("continue-here")
  })

  test("error state → blocked", () => {
    const a = ctx({ ...state, status: "failed" }, phases, null)
    expect(a.command).toBe("blocked")
  })

  test("unresolved verification FAILs → blocked", () => {
    const a = ctx(state, phases, { plans: [], summaries: [], hasContext: true, hasResearch: true, hasVerification: true, unresolvedVerification: true })
    expect(a.command).toBe("blocked")
  })
})

describe("analyzePhaseFiles", () => {
  test("counts plans/summaries and flags context", () => {
    const a = analyzePhaseFiles(
      ["01-01-PLAN.md", "01-02-PLAN.md", "01-01-SUMMARY.md", "01-CONTEXT.md", "01-VERIFICATION.md"],
      "",
    )
    expect(a.plans).toEqual(["01-01-PLAN.md", "01-02-PLAN.md"])
    expect(a.summaries).toEqual(["01-01-SUMMARY.md"])
    expect(a.hasContext).toBe(true)
    expect(a.hasVerification).toBe(true)
    expect(a.unresolvedVerification).toBe(false)
  })

  test("flags FAIL rows in verification content", () => {
    const a = analyzePhaseFiles([], "| TEST-01 | FAIL | reason |")
    expect(a.unresolvedVerification).toBe(true)
  })
})

describe("nextAction (filesystem)", () => {
  test("missing STATE.md → new-project", async () => {
    await using tmp = await tmpdir()
    const a = await nextAction(tmp.path)
    expect(a.command).toBe("new-project")
  })

  test("walks the full lifecycle on disk", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const planning = join(dir, ".planning")
        const phases = join(planning, "phases", "01-foundation")
        await Bun.write(join(planning, "STATE.md"), STATE)
        await Bun.write(join(planning, "ROADMAP.md"), ROADMAP)
        await Bun.write(join(phases, "01-CONTEXT.md"), "# Context")
        await Bun.write(join(phases, "01-RESEARCH.md"), "# Research")
        await Bun.write(join(phases, "01-01-PLAN.md"), "# Plan")
        await Bun.write(join(phases, "01-01-SUMMARY.md"), "# Summary")
        await Bun.write(join(phases, "01-VERIFICATION.md"), "Status: passed")
      },
    })
    expect((await nextAction(tmp.path)).command).toBe("discuss-phase")
  })
})
