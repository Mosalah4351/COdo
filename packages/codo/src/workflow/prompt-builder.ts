/**
 * Prompt builder — constructs dispatch prompts for each unit type.
 *
 * Simplified from GSD-Pi's auto-prompts.ts (4541 lines).
 * Key patterns preserved:
 *   - Template variable resolution
 *   - Context budget constraints
 *   - Inlined context composition
 *   - Unit-type-specific prompt construction
 *
 * Simplifications:
 *   - No DB dependencies (file-based state)
 *   - No complex telemetry
 *   - No phase anchors or recovery contexts
 *   - Simplified skill activation
 */

import { readFileSync, existsSync } from "fs"
import { join } from "path"

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

import {
  injectContext,
  composeInlinedContext,
} from "./context-injector"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Section separator for composed context blocks */
const SECTION_SEPARATOR = "\n\n---\n\n"

/** Path to prompts directory */
const PROMPTS_DIR = join(__dirname, "prompts")

/** Path to templates directory */
const TEMPLATES_DIR = join(__dirname, "templates")

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PromptContext {
  /** Unit being built for */
  unit: Unit
  /** Current project state */
  state: ProjectState
  /** Roadmap slices */
  roadmap: RoadmapSlice[]
  /** Plan tasks */
  plan: PlanTask[]
  /** Milestone context (optional) */
  milestoneContext?: MilestoneContext
  /** Decisions (optional) */
  decisions?: Decision[]
  /** Requirements (optional) */
  requirements?: Requirement[]
  /** Prior task summaries (optional) */
  priorSummaries?: string[]
  /** Dependency slice summaries (optional) */
  dependencySummaries?: string[]
  /** Context window size in tokens */
  contextWindow?: number
}

export interface PromptResult {
  /** The complete prompt */
  prompt: string
  /** Context injection used */
  context: ContextInjection
  /** Budget allocation used */
  budget: ContextBudget
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a prompt for a unit.
 *
 * This is the main entry point for prompt construction. It:
 * 1. Loads the appropriate template
 * 2. Injects context based on unit type
 * 3. Resolves template variables
 * 4. Applies budget constraints
 */
export function buildUnitPrompt(ctx: PromptContext): PromptResult {
  const contextWindow = ctx.contextWindow ?? 200_000
  const budget = allocateBudget(ctx.unit.type, contextWindow)

  // Inject context based on unit type
  const context = injectContext(
    ctx.unit,
    ctx.state,
    ctx.roadmap,
    ctx.plan,
    contextWindow,
    ctx.milestoneContext,
    ctx.decisions,
    ctx.requirements,
    ctx.priorSummaries,
    ctx.dependencySummaries,
  )

  // Load and fill template
  const template = loadTemplate(ctx.unit.type)
  const prompt = fillTemplate(template, ctx, context)

  return { prompt, context, budget }
}

/**
 * Build prompt for milestone planning.
 */
export function buildMilestonePlanPrompt(
  milestoneId: string,
  milestoneTitle: string,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  milestoneContext?: MilestoneContext,
  decisions?: Decision[],
  requirements?: Requirement[],
): PromptResult {
  const unit: Unit = {
    type: "milestone",
    id: milestoneId,
    title: milestoneTitle,
    milestoneId,
  }

  return buildUnitPrompt({
    unit,
    state,
    roadmap,
    plan,
    contextWindow,
    milestoneContext,
    decisions,
    requirements,
  })
}

/**
 * Build prompt for slice planning.
 */
export function buildSlicePlanPrompt(
  sliceId: string,
  sliceTitle: string,
  milestoneId: string,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  priorSummaries?: string[],
  dependencySummaries?: string[],
): PromptResult {
  const unit: Unit = {
    type: "slice",
    id: sliceId,
    title: sliceTitle,
    milestoneId,
    sliceId,
  }

  return buildUnitPrompt({
    unit,
    state,
    roadmap,
    plan,
    contextWindow,
    priorSummaries,
    dependencySummaries,
  })
}

/**
 * Build prompt for task execution.
 */
export function buildTaskExecutePrompt(
  taskId: string,
  taskTitle: string,
  sliceId: string,
  milestoneId: string,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  priorSummaries?: string[],
): PromptResult {
  const unit: Unit = {
    type: "task",
    id: taskId,
    title: taskTitle,
    milestoneId,
    sliceId,
    taskId,
  }

  return buildUnitPrompt({
    unit,
    state,
    roadmap,
    plan,
    contextWindow,
    priorSummaries,
  })
}

/**
 * Build prompt for slice completion.
 */
export function buildSliceCompletePrompt(
  sliceId: string,
  sliceTitle: string,
  milestoneId: string,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  priorSummaries?: string[],
): PromptResult {
  const unit: Unit = {
    type: "slice",
    id: sliceId,
    title: sliceTitle,
    milestoneId,
    sliceId,
  }

  return buildUnitPrompt({
    unit,
    state,
    roadmap,
    plan,
    contextWindow,
    priorSummaries,
  })
}

/**
 * Build prompt for milestone completion.
 */
export function buildMilestoneCompletePrompt(
  milestoneId: string,
  milestoneTitle: string,
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
  contextWindow: number = 200_000,
  milestoneContext?: MilestoneContext,
  decisions?: Decision[],
  requirements?: Requirement[],
  priorSummaries?: string[],
): PromptResult {
  const unit: Unit = {
    type: "milestone",
    id: milestoneId,
    title: milestoneTitle,
    milestoneId,
  }

  return buildUnitPrompt({
    unit,
    state,
    roadmap,
    plan,
    contextWindow,
    milestoneContext,
    decisions,
    requirements,
    priorSummaries,
  })
}

// ─── Template Loading ────────────────────────────────────────────────────────

/**
 * Load a prompt template by unit type.
 */
function loadTemplate(unitType: UnitType): string {
  const templateName = getTemplateName(unitType)
  const templatePath = join(PROMPTS_DIR, `${templateName}.md`)

  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`)
  }

  return readFileSync(templatePath, "utf-8")
}

/**
 * Get template name for unit type.
 */
function getTemplateName(unitType: UnitType): string {
  switch (unitType) {
    case "milestone":
      return "plan-milestone"
    case "slice":
      return "plan-slice"
    case "task":
      return "execute-task"
  }
}

// ─── Template Filling ────────────────────────────────────────────────────────

/**
 * Fill template with context values.
 *
 * Replaces {{variable}} placeholders with actual values.
 */
function fillTemplate(
  template: string,
  ctx: PromptContext,
  context: ContextInjection,
): string {
  const vars = buildTemplateVariables(ctx, context)
  return resolveTemplateVariables(template, vars)
}

/**
 * Build template variables from context.
 */
function buildTemplateVariables(
  ctx: PromptContext,
  context: ContextInjection,
): Record<string, string> {
  const { unit, state } = ctx

  return {
    // Unit identifiers
    milestoneId: unit.milestoneId,
    milestoneTitle: ctx.milestoneContext?.title ?? "",
    sliceId: unit.sliceId ?? "",
    sliceTitle: unit.type === "slice" ? unit.title : "",
    taskId: unit.taskId ?? "",
    taskTitle: unit.type === "task" ? unit.title : "",

    // Working directory
    workingDirectory: ".",

    // Context injection
    inlinedContext: context.context,
    preamble: context.preamble,
    unitInstructions: context.unitInstructions,
    verificationRequirements: context.verificationRequirements,
    completionContract: context.completionContract,

    // Paths
    planPath: `.planning/phases/${unit.milestoneId}/${unit.milestoneId}-ROADMAP.md`,
    taskPlanPath: unit.sliceId && unit.taskId
      ? `.planning/phases/${unit.milestoneId}/${unit.sliceId}-${unit.taskId}-PLAN.md`
      : "",
    taskSummaryTemplatePath: "templates/task-summary.md",
    taskSummaryPath: unit.sliceId && unit.taskId
      ? `.planning/phases/${unit.milestoneId}/${unit.sliceId}/tasks/${unit.taskId}-SUMMARY.md`
      : "",
    sliceSummaryPath: unit.sliceId
      ? `.planning/phases/${unit.milestoneId}/${unit.sliceId}-SUMMARY.md`
      : "",
    sliceUatPath: unit.sliceId
      ? `.planning/phases/${unit.milestoneId}/${unit.sliceId}-UAT.md`
      : "",
    outputPath: `.planning/phases/${unit.milestoneId}/${unit.milestoneId}-ROADMAP.md`,
    researchOutputPath: `.planning/phases/${unit.milestoneId}/${unit.milestoneId}-RESEARCH.md`,
    secretsOutputPath: `.planning/phases/${unit.milestoneId}/${unit.milestoneId}-SECRETS.md`,

    // Prior task summaries
    priorTaskLines: ctx.priorSummaries && ctx.priorSummaries.length > 0
      ? ctx.priorSummaries.map(p => `- \`${p}\``).join("\n")
      : "- (no prior tasks)",

    // Dependency summaries
    dependencySummaries: ctx.dependencySummaries?.join("\n\n") ?? "",

    // Skill activation (simplified)
    skillActivation: "Follow relevant skills before code edits.",
    skillDiscoveryMode: "automatic",
    skillDiscoveryInstructions: " Skills are discovered automatically from context.",

    // Verification budget
    verificationBudget: "~10K chars",

    // Gates
    gatesToClose: "",

    // Resume section
    resumeSection: "",

    // Carry forward
    carryForwardSection: "",

    // Task plan inline
    taskPlanInline: "",

    // Slice plan excerpt
    slicePlanExcerpt: "",

    // Overrides
    overridesSection: "",

    // Runtime context
    runtimeContext: "",

    // Phase anchor
    phaseAnchorSection: "",

    // On-demand context
    onDemandContext: "",

    // Templates
    inlinedTemplates: "",

    // Source file paths
    sourceFilePaths: buildSourceFilePaths(ctx),

    // Commit instruction
    commitInstruction: "Do not commit manually — the system auto-commits.",
  }
}

/**
 * Build source file paths for the unit.
 */
function buildSourceFilePaths(ctx: PromptContext): string {
  const paths: string[] = []

  // Add relevant .planning/ files
  if (ctx.unit.milestoneId) {
    const phaseDir = `.planning/phases/${ctx.unit.milestoneId}`
    paths.push(`${phaseDir}/${ctx.unit.milestoneId}-CONTEXT.md`)
    paths.push(`${phaseDir}/${ctx.unit.milestoneId}-ROADMAP.md`)
  }

  if (paths.length === 0) {
    return "No specific source files identified."
  }

  return paths.map(p => `- \`${p}\``).join("\n")
}

/**
 * Resolve template variables in a string.
 *
 * Replaces {{variable}} with actual values.
 */
function resolveTemplateVariables(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template

  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(pattern, value)
  }

  return result
}

// ─── Inline Helpers ──────────────────────────────────────────────────────────

/**
 * Inline a template file.
 */
export function inlineTemplate(name: string, label: string): string {
  const templatePath = join(TEMPLATES_DIR, `${name}.md`)
  if (!existsSync(templatePath)) {
    return `### ${label}\n\n[Template not found: ${name}.md]`
  }

  const content = readFileSync(templatePath, "utf-8")
  return `### Output Template: ${label}\n\n${content.trim()}`
}

/**
 * Inline a file with optional content.
 */
export async function inlineFile(
  path: string,
  relPath: string,
  label: string,
): Promise<string> {
  if (!existsSync(path)) {
    return `### ${label}\n\nSource: \`${relPath}\`\n\n[File not found]`
  }

  const content = readFileSync(path, "utf-8")
  return `### ${label}\n\nSource: \`${relPath}\`\n\n${content.trim()}`
}

/**
 * Inline a file optionally (returns null if missing).
 */
export async function inlineFileOptional(
  path: string,
  relPath: string,
  label: string,
): Promise<string | null> {
  if (!existsSync(path)) {
    return null
  }

  return inlineFile(path, relPath, label)
}