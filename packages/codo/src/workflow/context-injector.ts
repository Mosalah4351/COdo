/**
 * Context injector — selects and composes context for each unit type.
 *
 * Simplified from GSD-Pi's unit-context-composer.ts (512 lines) and
 * auto-prompts.ts context selection logic.
 *
 * Design:
 *   - Pure functions for context selection (no I/O)
 *   - Budget-aware truncation at section boundaries
 *   - Prior summary injection for strategic context
 *   - Dependency slice summaries for forward intelligence
 */

import type {
  Unit,
  UnitType,
  ProjectState,
  RoadmapSlice,
  PlanTask,
  ContextInjection,
  ContextBudget,
  MilestoneContext,
  Decision,
  Requirement,
} from "./types"

import {
  allocateBudget,
  reduceToFit,
  capPreamble,
  countTokens,
  MAX_PREAMBLE_CHARS,
} from "./context-budget"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum tokens for prior summary injection (from GSD-Pi unit-context-composer.ts) */
const PRIOR_SUMMARY_MAX_TOKENS = 2500

/** Section separator for composed context blocks */
const SECTION_SEPARATOR = "\n\n---\n\n"

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Inject context for a unit based on its type and current state.
 *
 * This is the main entry point for context engineering. It:
 * 1. Determines what context is needed based on unit type
 * 2. Selects and truncates context blocks to fit budget
 * 3. Composes the final ContextInjection structure
 */
export function injectContext(
  unit: Unit,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  milestoneContext?: MilestoneContext,
  decisions?: Decision[],
  requirements?: Requirement[],
  priorSummaries?: string[],
  dependencySummaries?: string[],
): ContextInjection {
  const budget = allocateBudget(unit.type, contextWindow)

  switch (unit.type) {
    case "milestone":
      return injectMilestoneContext(unit, state, roadmap, plan, budget, milestoneContext, decisions, requirements)
    case "slice":
      return injectSliceContext(unit, state, roadmap, plan, budget, priorSummaries, dependencySummaries)
    case "task":
      return injectTaskContext(unit, state, roadmap, plan, budget, priorSummaries)
  }
}

/**
 * Compose inlined context from artifact blocks.
 *
 * Walks the artifact list in order, resolves each block, and joins them
 * with section separators. Null-returning resolvers are skipped silently.
 */
export async function composeInlinedContext(
  artifactKeys: string[],
  resolver: (key: string) => Promise<string | null>,
): Promise<string> {
  const blocks: string[] = []
  for (const key of artifactKeys) {
    const body = await resolver(key)
    if (body !== null && body.length > 0) {
      blocks.push(body)
    }
  }
  return blocks.join(SECTION_SEPARATOR)
}

// ─── Milestone Context ───────────────────────────────────────────────────────

function injectMilestoneContext(
  unit: Unit,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  budget: ContextBudget,
  milestoneContext?: MilestoneContext,
  decisions?: Decision[],
  requirements?: Requirement[],
): ContextInjection {
  // Milestone needs: roadmap, requirements, decisions, project context
  const roadmapBlock = renderRoadmapExcerpt(roadmap, unit.milestoneId)
  const requirementsBlock = requirements ? renderRequirementsExcerpt(requirements) : ""
  const decisionsBlock = decisions ? renderDecisionsExcerpt(decisions) : ""
  const contextBlock = milestoneContext ? renderMilestoneContext(milestoneContext) : ""

  // Compose inline context with budget constraints
  const inlineContext = [
    contextBlock,
    roadmapBlock,
    requirementsBlock,
    decisionsBlock,
  ]
    .filter(block => block.length > 0)
    .join(SECTION_SEPARATOR)

  const truncatedInline = reduceToFit(inlineContext, budget.inlineContextBudget)

  return {
    preamble: buildMilestonePreamble(unit, state),
    context: truncatedInline.content,
    unitInstructions: "",  // Filled by prompt builder
    verificationRequirements: "",  // Milestones don't have direct verification
    completionContract: buildMilestoneCompletionContract(unit),
    templates: "",  // Filled by prompt builder
  }
}

// ─── Slice Context ───────────────────────────────────────────────────────────

function injectSliceContext(
  unit: Unit,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  budget: ContextBudget,
  priorSummaries?: string[],
  dependencySummaries?: string[],
): ContextInjection {
  // Slice needs: slice plan, dependency summaries, task plans, prior summaries
  const slicePlan = findSlicePlan(roadmap, unit.sliceId)
  const taskPlans = findTaskPlans(plan, unit.sliceId)
  const slicePlanBlock = slicePlan ? renderSlicePlanExcerpt(slicePlan) : ""
  const taskPlansBlock = taskPlans.length > 0 ? renderTaskPlansExcerpt(taskPlans) : ""

  // Prior summaries (strategic context from prior work)
  const priorBlock = priorSummaries && priorSummaries.length > 0
    ? renderPriorSummaries(priorSummaries)
    : ""

  // Dependency summaries (forward intelligence)
  const depBlock = dependencySummaries && dependencySummaries.length > 0
    ? renderDependencySummaries(dependencySummaries)
    : ""

  // Compose inline context with budget constraints
  const inlineContext = [
    slicePlanBlock,
    taskPlansBlock,
    depBlock,
    priorBlock,
  ]
    .filter(block => block.length > 0)
    .join(SECTION_SEPARATOR)

  const truncatedInline = reduceToFit(inlineContext, budget.inlineContextBudget)

  // Verification requirements from task plans
  const verificationReqs = taskPlans
    .flatMap(t => t.verification)
    .join("\n")

  return {
    preamble: buildSlicePreamble(unit, state),
    context: truncatedInline.content,
    unitInstructions: "",  // Filled by prompt builder
    verificationRequirements: verificationReqs,
    completionContract: buildSliceCompletionContract(unit),
    templates: "",  // Filled by prompt builder
  }
}

// ─── Task Context ────────────────────────────────────────────────────────────

function injectTaskContext(
  unit: Unit,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  budget: ContextBudget,
  priorSummaries?: string[],
): ContextInjection {
  // Task needs: task plan, slice excerpt, prior task summaries
  const taskPlan = findTaskPlan(plan, unit.taskId)
  const slicePlan = findSlicePlan(roadmap, unit.sliceId)
  const taskPlanBlock = taskPlan ? renderTaskPlanExcerpt(taskPlan) : ""
  const sliceExcerpt = slicePlan ? renderSliceExcerptForTask(slicePlan) : ""

  // Prior task summaries (strategic context from completed tasks)
  const priorBlock = priorSummaries && priorSummaries.length > 0
    ? renderPriorSummaries(priorSummaries)
    : ""

  // Compose inline context with budget constraints
  const inlineContext = [
    taskPlanBlock,
    sliceExcerpt,
    priorBlock,
  ]
    .filter(block => block.length > 0)
    .join(SECTION_SEPARATOR)

  const truncatedInline = reduceToFit(inlineContext, budget.inlineContextBudget)

  // Verification budget for task verification commands
  const verificationContext = taskPlan?.verification
    ? reduceToFit(taskPlan.verification.join("\n"), budget.verificationBudget)
    : { content: "", droppedSections: 0 }

  return {
    preamble: buildTaskPreamble(unit, state),
    context: truncatedInline.content,
    unitInstructions: "",  // Filled by prompt builder
    verificationRequirements: verificationContext.content,
    completionContract: buildTaskCompletionContract(unit),
    templates: "",  // Filled by prompt builder
  }
}

// ─── Preamble Builders ───────────────────────────────────────────────────────

function buildMilestonePreamble(unit: Unit, state: ProjectState): string {
  const lines = [
    `## GSD Auto-Mode: Plan Milestone ${unit.milestoneId}`,
    "",
    `**Working Directory:** \`.\``,
    "",
    "**All file reads, writes, and shell commands MUST operate relative to this directory.**",
    "",
    "All relevant context is preloaded below. Start immediately without re-reading these files.",
  ]
  return capPreamble(lines.join("\n"))
}

function buildSlicePreamble(unit: Unit, state: ProjectState): string {
  const lines = [
    `## GSD Auto-Mode: Plan Slice ${unit.sliceId}`,
    "",
    `**Working Directory:** \`.\``,
    "",
    "**All file reads, writes, and shell commands MUST operate relative to this directory.**",
    "",
    "Relevant context is preloaded; start without re-reading it.",
  ]
  return capPreamble(lines.join("\n"))
}

function buildTaskPreamble(unit: Unit, state: ProjectState): string {
  const lines = [
    `## GSD Auto-Mode: Execute Task ${unit.taskId}`,
    "",
    `**Working Directory:** \`.\``,
    "",
    "**All file reads, writes, and shell commands MUST operate relative to this directory.**",
    "",
    "You execute. The inlined task plan is authoritative.",
  ]
  return capPreamble(lines.join("\n"))
}

// ─── Completion Contracts ────────────────────────────────────────────────────

function buildMilestoneCompletionContract(unit: Unit): string {
  return [
    "## Completion Contract",
    "",
    "When done, say: \"Milestone {{milestoneId}} planned.\" Say this exactly once.",
    "",
    "**You MUST call `gsd_plan_milestone` before finishing.**",
  ].join("\n")
}

function buildSliceCompletionContract(unit: Unit): string {
  return [
    "## Completion Contract",
    "",
    "When done, say: \"Slice {{sliceId}} planned.\" Say this exactly once.",
    "",
    "**You MUST call `gsd_plan_slice` and then `gsd_plan_task` once for each planned task before finishing.**",
  ].join("\n")
}

function buildTaskCompletionContract(unit: Unit): string {
  return [
    "## Completion Contract",
    "",
    "When done, say: \"Task {{taskId}} closeout submitted.\" Do not say the task is complete.",
    "",
    "**You MUST call `gsd_task_complete` before finishing.**",
  ].join("\n")
}

// ─── Render Helpers ──────────────────────────────────────────────────────────

function renderRoadmapExcerpt(roadmap: RoadmapSlice[], milestoneId: string): string {
  const milestone = roadmap.find(m => m.id === milestoneId)
  if (!milestone) return ""

  return [
    "## Roadmap Excerpt",
    "",
    `- [${milestone.status === "completed" ? "x" : " "}] **${milestone.id}: ${milestone.title}**`,
    `  Risk: ${milestone.risk}`,
    `  Depends: [${milestone.depends.join(", ")}]`,
    `  Demo: ${milestone.demo}`,
  ].join("\n")
}

function renderRequirementsExcerpt(requirements: Requirement[]): string {
  const active = requirements.filter(r => r.status === "active")
  if (active.length === 0) return ""

  return [
    "## Requirements (Active)",
    "",
    ...active.map(r => `- **${r.id}**: ${r.description} (Owner: ${r.owner})`),
  ].join("\n")
}

function renderDecisionsExcerpt(decisions: Decision[]): string {
  if (decisions.length === 0) return ""

  return [
    "## Decisions",
    "",
    "| # | Decision | Choice | Rationale |",
    "|---|----------|--------|-----------|",
    ...decisions.map(d => `| ${d.id} | ${d.decision} | ${d.choice} | ${d.rationale} |`),
  ].join("\n")
}

function renderMilestoneContext(context: MilestoneContext): string {
  return [
    "## Milestone Context",
    "",
    `**Vision:** ${context.vision}`,
    "",
    "**Success Criteria:**",
    ...context.successCriteria.map(c => `- ${c}`),
    "",
    "**Key Risks:**",
    ...context.keyRisks.map(r => `- ${r}`),
  ].join("\n")
}

function renderSlicePlanExcerpt(slice: RoadmapSlice): string {
  return [
    "## Slice Plan",
    "",
    `**Goal:** ${slice.demo}`,
    `**Risk:** ${slice.risk}`,
    `**Depends:** [${slice.depends.join(", ")}]`,
  ].join("\n")
}

function renderTaskPlansExcerpt(tasks: PlanTask[]): string {
  return [
    "## Task Plans",
    "",
    ...tasks.map(t => [
      `### ${t.id}: ${t.title}`,
      "",
      `Estimate: ${t.estimate}`,
      "",
      "**Must-Haves:**",
      ...t.mustHaves.map(m => `- ${m}`),
      "",
      "**Verification:**",
      ...t.verification.map(v => `- \`${v}\``),
    ].join("\n")),
  ].join("\n\n")
}

function renderPriorSummaries(summaries: string[]): string {
  if (summaries.length === 0) return ""

  // Truncate to PRIOR_SUMMARY_MAX_TOKENS
  const joined = summaries.join("\n\n---\n\n")
  const maxChars = PRIOR_SUMMARY_MAX_TOKENS * 4  // Approximate chars-per-token
  const truncated = reduceToFit(joined, maxChars)

  return [
    "## Prior Work Summaries",
    "",
    truncated.content,
  ].join("\n")
}

function renderDependencySummaries(summaries: string[]): string {
  if (summaries.length === 0) return ""

  return [
    "## Dependency Slice Summaries",
    "",
    "Use Forward Intelligence from dependencies when present.",
    "",
    ...summaries,
  ].join("\n")
}

function renderTaskPlanExcerpt(task: PlanTask): string {
  return [
    "## Task Plan",
    "",
    `**Task:** ${task.id}: ${task.title}`,
    `**Slice:** ${task.sliceId}`,
    `**Estimate:** ${task.estimate}`,
    "",
    "**Must-Haves:**",
    ...task.mustHaves.map(m => `- ${m}`),
    "",
    "**Verification:**",
    ...task.verification.map(v => `- \`${v}\``),
  ].join("\n")
}

function renderSliceExcerptForTask(slice: RoadmapSlice): string {
  return [
    "## Slice Excerpt",
    "",
    `**Slice:** ${slice.id}: ${slice.title}`,
    `**Goal:** ${slice.demo}`,
    `**Risk:** ${slice.risk}`,
  ].join("\n")
}

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

function findSlicePlan(roadmap: RoadmapSlice[], sliceId?: string): RoadmapSlice | undefined {
  if (!sliceId) return undefined
  return roadmap.find(s => s.id === sliceId)
}

function findTaskPlans(plan: PlanTask[], sliceId?: string): PlanTask[] {
  if (!sliceId) return []
  return plan.filter(t => t.sliceId === sliceId)
}

function findTaskPlan(plan: PlanTask[], taskId?: string): PlanTask | undefined {
  if (!taskId) return undefined
  return plan.find(t => t.id === taskId)
}