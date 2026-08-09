/**
 * Next Action — Deterministic GSD flow routing for the compose agent.
 *
 * Port of gsd-opencode's `route-next-action.ts` / `workflows/next.md` to the
 * phase-directory dialect the installed gsd-core subagents actually produce
 * (`.planning/phases/<NN>-<slug>/` with `*PLAN.md`, `*SUMMARY.md`, `CONTEXT.md`,
 * `RESEARCH.md`, `VERIFICATION.md`). Reads project state and answers "what is
 * the next GSD step?" so compose can advance the discuss → plan → execute →
 * verify → complete lifecycle without the user naming the step.
 */

import { readFile, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

export type NextCommand =
  | "new-project"
  | "discuss-phase"
  | "plan-phase"
  | "execute-phase"
  | "verify-work"
  | "complete-milestone"
  | "resume-work"
  | "blocked"

export interface NextAction {
  command: NextCommand
  args: string
  reason: string
  currentPhase: string | null
  phaseName: string | null
  gates: {
    continueHere: boolean
    errorState: boolean
    unresolvedVerification: boolean
  }
  context: {
    hasContext: boolean
    hasResearch: boolean
    hasPlans: boolean
    planCount: number
    summaryCount: number
    hasVerification: boolean
  }
}

// ─── STATE.md parsing ───────────────────────────────────────────────────────

interface StateFields {
  currentPhase: string | null
  currentPhaseName: string | null
  status: string | null
  pausedAt: string | null
}

function extractField(content: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const bold = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, "i").exec(content)
  if (bold) return bold[1].trim()
  const plain = new RegExp(`^${escaped}:\\s*(.+)`, "im").exec(content)
  return plain ? plain[1].trim() : null
}

export function parseStateFields(content: string): StateFields {
  const phaseRaw = extractField(content, "Current Phase") ?? extractField(content, "Phase")
  const phaseNum = phaseRaw?.match(/(\d+(?:\.\d+)*)/)?.[1] ?? null
  return {
    currentPhase: phaseNum,
    currentPhaseName: extractField(content, "Current Phase Name"),
    status: extractField(content, "Status"),
    pausedAt: extractField(content, "Paused At") ?? extractField(content, "Paused at"),
  }
}

// ─── ROADMAP.md parsing ─────────────────────────────────────────────────────

export interface RoadmapPhase {
  number: string
  name: string
  complete: boolean
}

export function parseRoadmapPhases(content: string): RoadmapPhase[] {
  const phases: RoadmapPhase[] = []
  const re = /#{2,4}\s*Phase\s+([\w][\w.-]*)\s*:\s*([^\n]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const number = m[1].replace(/^0+/, "") || m[1]
    const name = m[2].trim().replace(/\s*\(INSERTED\)\s*$/, "").trim()
    if (!phases.some((p) => p.number === number)) {
      phases.push({ number, name, complete: false })
    }
  }
  // Checkbox list format: "- [x] **Phase 1: Name**"
  const checkboxRe = /^-\s*\[([ x])\]\s*\*\*Phase\s+([\w][\w.-]*)\s*:\s*([^*]*)\*\*/gm
  while ((m = checkboxRe.exec(content)) !== null) {
    const number = m[2].replace(/^0+/, "") || m[2]
    const existing = phases.find((p) => p.number === number)
    if (existing) existing.complete = m[1] === "x"
    else phases.push({ number, name: m[3].trim(), complete: m[1] === "x" })
  }
  return phases
}

// ─── Phase directory scanning ───────────────────────────────────────────────

function phaseToken(dirName: string): string {
  const codePrefixed = dirName.match(/^([A-Z]{1,6}-\d+(?:\.\d+)*)/i)
  if (codePrefixed) return codePrefixed[1]
  const numeric = dirName.match(/^(\d+(?:\.\d+)*)/i)
  return numeric ? numeric[1] : dirName
}

function phaseTokenMatches(dirName: string, phase: string): boolean {
  const norm = phase.replace(/^0+/, "") || phase
  return phaseToken(dirName).replace(/^0+/, "") === norm
}

export interface PhaseArtifacts {
  plans: string[]
  summaries: string[]
  hasContext: boolean
  hasResearch: boolean
  hasVerification: boolean
  unresolvedVerification: boolean
}

export function analyzePhaseFiles(files: string[], verificationContent: string): PhaseArtifacts {
  const plans = files.filter((f) => f.endsWith("-PLAN.md") || f === "PLAN.md").sort()
  const summaries = files.filter((f) => f.endsWith("-SUMMARY.md") || f === "SUMMARY.md").sort()
  return {
    plans,
    summaries,
    hasContext: files.some((f) => f.endsWith("-CONTEXT.md") || f === "CONTEXT.md"),
    hasResearch: files.some((f) => f.endsWith("-RESEARCH.md") || f === "RESEARCH.md"),
    hasVerification: files.some((f) => f.endsWith("-VERIFICATION.md") || f === "VERIFICATION.md"),
    unresolvedVerification: verificationContent
      .split("\n")
      .some((line) => /\|\s*FAIL\s*\|/i.test(line) && !/override/i.test(line)),
  }
}

// ─── Routing ────────────────────────────────────────────────────────────────

export function routeNextAction(input: {
  state: StateFields
  phases: RoadmapPhase[]
  artifacts: PhaseArtifacts | null
  hasPhaseDir: boolean
  anyPhaseDirs: boolean
  continueHere: boolean
}): NextAction {
  const { state, phases, artifacts, hasPhaseDir, anyPhaseDirs, continueHere } = input
  const currentPhase = state.currentPhase ?? (phases.length > 0 ? phases[0].number : null)
  const phaseName =
    state.currentPhaseName ?? (currentPhase ? phases.find((p) => p.number === currentPhase)?.name ?? null : null)
  const gates = {
    continueHere,
    errorState: /\b(error|failed)\b/i.test(state.status ?? ""),
    unresolvedVerification: artifacts?.unresolvedVerification ?? false,
  }
  const context = {
    hasContext: artifacts?.hasContext ?? false,
    hasResearch: artifacts?.hasResearch ?? false,
    hasPlans: artifacts ? artifacts.plans.length > 0 : false,
    planCount: artifacts?.plans.length ?? 0,
    summaryCount: artifacts?.summaries.length ?? 0,
    hasVerification: artifacts?.hasVerification ?? false,
  }

  const base = { currentPhase, phaseName, gates, context }

  if (gates.continueHere || gates.errorState || gates.unresolvedVerification) {
    return {
      ...base,
      command: "blocked",
      args: "",
      reason: gates.continueHere
        ? ".planning/.continue-here.md exists — resolve the checkpoint before advancing"
        : gates.errorState
          ? "STATE.md shows an error/failed status — resolve before advancing"
          : "VERIFICATION.md has unresolved FAIL rows — address or override them first",
    }
  }

  if (state.pausedAt) {
    return { ...base, command: "resume-work", args: "", reason: "Project is paused — resume before continuing" }
  }

  if (phases.length > 0 && !anyPhaseDirs) {
    const first = phases[0]
    return {
      ...base,
      currentPhase: first.number,
      phaseName: first.name,
      command: "discuss-phase",
      args: first.number,
      reason: "ROADMAP has phases but none exist on disk yet",
    }
  }

  if (!currentPhase) {
    return { ...base, command: "new-project", args: "", reason: "No current phase and no roadmap phases found" }
  }

  if (!hasPhaseDir) {
    return {
      ...base,
      command: "discuss-phase",
      args: currentPhase,
      reason: "Phase directory not found — start with discussion",
    }
  }

  if (!context.hasContext && !context.hasResearch) {
    return {
      ...base,
      command: "discuss-phase",
      args: currentPhase,
      reason: "Phase has no CONTEXT.md or RESEARCH.md yet",
    }
  }

  if (context.planCount === 0) {
    return { ...base, command: "plan-phase", args: currentPhase, reason: "Context exists but no PLAN.md files" }
  }

  if (context.summaryCount < context.planCount) {
    return {
      ...base,
      command: "execute-phase",
      args: currentPhase,
      reason: `${context.planCount - context.summaryCount} plan(s) still need a SUMMARY.md`,
    }
  }

  if (!context.hasVerification) {
    return { ...base, command: "verify-work", args: "", reason: "All plans have summaries — run verification" }
  }

  const idx = phases.findIndex((p) => p.number === currentPhase)
  const next = idx >= 0 ? phases.slice(idx + 1).find((p) => !p.complete) : null
  if (next) {
    return {
      ...base,
      currentPhase: next.number,
      phaseName: next.name,
      command: "discuss-phase",
      args: next.number,
      reason: "Current phase verified — advance to the next phase",
    }
  }

  return {
    ...base,
    command: "complete-milestone",
    args: "",
    reason: "All phases complete — close out the milestone",
  }
}

// ─── Filesystem entry point ─────────────────────────────────────────────────

/**
 * Resolve the next GSD action for a project by reading `.planning/` on disk.
 * Returns a `new-project` suggestion when no `.planning/STATE.md` exists.
 */
export async function nextAction(projectDir: string): Promise<NextAction> {
  const planning = join(projectDir, ".planning")
  const statePath = join(planning, "STATE.md")

  if (!existsSync(statePath)) {
    return {
      command: "new-project",
      args: "",
      reason: "No .planning/STATE.md — initialize a GSD project first",
      currentPhase: null,
      phaseName: null,
      gates: { continueHere: existsSync(join(planning, ".continue-here.md")), errorState: false, unresolvedVerification: false },
      context: { hasContext: false, hasResearch: false, hasPlans: false, planCount: 0, summaryCount: 0, hasVerification: false },
    }
  }

  const state = parseStateFields(await readFile(statePath, "utf-8"))
  const phases = parseRoadmapPhases(await readFile(join(planning, "ROADMAP.md"), "utf-8"))

  const phasesDir = join(planning, "phases")
  let anyPhaseDirs = false
  let dirEntries: string[] = []
  try {
    dirEntries = (await readdir(phasesDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
    anyPhaseDirs = dirEntries.length > 0
  } catch {
    anyPhaseDirs = false
  }

  const currentPhase = state.currentPhase ?? (phases.length > 0 ? phases[0].number : null)
  let artifacts: PhaseArtifacts | null = null
  let hasPhaseDir = false
  if (currentPhase) {
    const match = dirEntries.find((d) => phaseTokenMatches(d, currentPhase))
    if (match) {
      hasPhaseDir = true
      const files = await readdir(join(phasesDir, match))
      const verFile = files.find((f) => f.endsWith("-VERIFICATION.md") || f === "VERIFICATION.md")
      const verContent = verFile ? await readFile(join(phasesDir, match, verFile), "utf-8") : ""
      artifacts = analyzePhaseFiles(files, verContent)
    }
  }

  return routeNextAction({ state, phases, artifacts, hasPhaseDir, anyPhaseDirs, continueHere: existsSync(join(planning, ".continue-here.md")) })
}
