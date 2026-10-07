import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./workflow.txt"
import {
  parseState,
  parseRoadmap,
  parsePlan,
} from "@/workflow/state-parser"
import { getNextUnit } from "@/workflow/state-query"
import { nextAction } from "@/workflow/next-action"
import { injectContext } from "@/workflow/context-injector"
import {
  collectEvidence,
  evaluateGates,
  renderEvidenceTable,
} from "@/workflow/verification"
import { runDoctor, renderDoctorResults } from "@/workflow/doctor"
import { join } from "path"
import { existsSync } from "fs"
import type {
  UnitType,
  ProjectState,
  RoadmapSlice,
  PlanTask,
} from "@/workflow/types"

export const Parameters = Schema.Struct({
  action: Schema.String.annotate({
    description:
      "The workflow action: get-state, get-next-unit, next-step, inject-context, verify, doctor, summary",
  }),
  projectDir: Schema.optional(Schema.String).annotate({
    description: "Project directory (defaults to cwd)",
  }),
  unitType: Schema.optional(Schema.String).annotate({
    description: "Unit type for inject-context: milestone, slice, or task",
  }),
  milestoneId: Schema.optional(Schema.String).annotate({
    description: "Milestone ID for inject-context",
  }),
  sliceId: Schema.optional(Schema.String).annotate({
    description: "Slice ID for inject-context",
  }),
  taskId: Schema.optional(Schema.String).annotate({
    description: "Task ID for inject-context or verify",
  }),
})

type Metadata = {
  action: string
}

export const WorkflowTool = Tool.define<typeof Parameters, Metadata, never>(
  "workflow",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "workflow",
            patterns: [params.action],
            always: ["*"],
            metadata: { action: params.action },
          })

          const projectDir = params.projectDir ?? process.cwd()
          const planningDir = join(projectDir, ".planning")

          switch (params.action) {
            case "get-state": {
              const statePath = join(planningDir, "STATE.md")
              if (!existsSync(statePath)) {
                return {
                  title: "No state found",
                  output: "No .planning/STATE.md found. Run GSD workflow to initialize.",
                  metadata: { action: "get-state" },
                }
              }
              const state: ProjectState | null = yield* Effect.tryPromise({
                try: () => parseState(statePath),
                catch: () => null,
              })
              if (!state) {
                return {
                  title: "State parse error",
                  output: "Failed to parse .planning/STATE.md",
                  metadata: { action: "get-state" },
                }
              }
              const lines = [
                "# Project State",
                `**Phase:** ${state.activePhase || "None"}`,
                `**Milestone:** ${state.activeMilestone || "None"}`,
                `**Slice:** ${state.activeSlice || "None"}`,
                `**Task:** ${state.activeTask || "None"}`,
                "",
                "## Completed Milestones",
                ...(state.completedMilestones.length
                  ? state.completedMilestones.map((m: string) => `- [x] ${m}`)
                  : ["- (none)"]),
                "## Completed Slices",
                ...(state.completedSlices.length
                  ? state.completedSlices.map((s: string) => `- [x] ${s}`)
                  : ["- (none)"]),
                "## Completed Tasks",
                ...(state.completedTasks.length
                  ? state.completedTasks.map((t: string) => `- [x] ${t}`)
                  : ["- (none)"]),
                "",
                `**Last Updated:** ${state.lastUpdated.toISOString()}`,
              ]
              return {
                title: "Project state",
                output: lines.join("\n"),
                metadata: { action: "get-state" },
              }
            }

            case "next-step": {
              const action = yield* Effect.tryPromise({
                try: () => nextAction(projectDir),
                catch: (err) => {
                  throw err
                },
              })
              const gateLines = [
                action.gates.continueHere ? "- continue-here checkpoint" : "",
                action.gates.errorState ? "- error/failed state" : "",
                action.gates.unresolvedVerification ? "- unresolved VERIFICATION FAILs" : "",
              ].filter(Boolean)
              const output = [
                `**Next Step:** ${action.command}${action.args ? ` ${action.args}` : ""}`,
                `**Reason:** ${action.reason}`,
                action.currentPhase ? `**Phase:** ${action.currentPhase}${action.phaseName ? ` — ${action.phaseName}` : ""}` : "",
                gateLines.length ? `**Gates:**\n${gateLines.join("\n")}` : "",
                `**Context:** ${action.context.summaryCount}/${action.context.planCount} plans complete, ${action.context.hasContext ? "context" : "no context"}, ${action.context.hasResearch ? "research" : "no research"}, ${action.context.hasVerification ? "verified" : "not verified"}`,
              ]
                .filter(Boolean)
                .join("\n")
              return {
                title: `Next step: ${action.command}`,
                output,
                metadata: { action: "next-step" },
              }
            }

            case "get-next-unit": {
              const statePath = join(planningDir, "STATE.md")
              if (!existsSync(statePath)) {
                return {
                  title: "No state found",
                  output: "No .planning/STATE.md found.",
                  metadata: { action: "get-next-unit" },
                }
              }
              const state: ProjectState | null = yield* Effect.tryPromise({
                try: () => parseState(statePath),
                catch: () => null,
              })
              const roadmap: RoadmapSlice[] = yield* Effect.tryPromise({
                try: () => parseRoadmap(join(planningDir, "ROADMAP.md")),
                catch: () => [],
              })
              const plan: PlanTask[] = yield* Effect.tryPromise({
                try: () => parsePlan(join(planningDir, "PLAN.md")),
                catch: () => [],
              })
              const nextUnit = getNextUnit(state, roadmap, plan)
              if (!nextUnit) {
                return {
                  title: "All complete",
                  output: "All units are complete! No next unit to work on.",
                  metadata: { action: "get-next-unit" },
                }
              }
              const output = [
                `**Next Unit:** ${nextUnit.type}`,
                `**ID:** ${nextUnit.id}`,
                `**Milestone:** ${nextUnit.milestoneId}`,
                nextUnit.sliceId ? `**Slice:** ${nextUnit.sliceId}` : "",
              ]
                .filter(Boolean)
                .join("\n")
              return {
                title: `Next: ${nextUnit.type} ${nextUnit.id}`,
                output,
                metadata: { action: "get-next-unit" },
              }
            }

            case "inject-context": {
              const statePath = join(planningDir, "STATE.md")
              if (!existsSync(statePath)) {
                return {
                  title: "No state found",
                  output: "No .planning/STATE.md found.",
                  metadata: { action: "inject-context" },
                }
              }
              const state: ProjectState | null = yield* Effect.tryPromise({
                try: () => parseState(statePath),
                catch: () => null,
              })
              const roadmap: RoadmapSlice[] = yield* Effect.tryPromise({
                try: () => parseRoadmap(join(planningDir, "ROADMAP.md")),
                catch: () => [],
              })
              const plan: PlanTask[] = yield* Effect.tryPromise({
                try: () => parsePlan(join(planningDir, "PLAN.md")),
                catch: () => [],
              })
              const unit = {
                type: (params.unitType ?? "task") as UnitType,
                id: params.taskId ?? params.sliceId ?? params.milestoneId ?? "",
                title: "",
                milestoneId: params.milestoneId ?? state.activeMilestone ?? "",
                sliceId: params.sliceId,
                taskId: params.taskId,
              }
              const injection = injectContext(unit, state, roadmap, plan)
              const output = [
                injection.preamble,
                injection.context,
                injection.unitInstructions,
                injection.verificationRequirements,
                injection.completionContract,
                injection.templates,
              ]
                .filter(Boolean)
                .join("\n\n---\n\n")
              return {
                title: `Context for ${unit.type} ${unit.id}`,
                output,
                metadata: { action: "inject-context" },
              }
            }

            case "verify": {
              const planPath = join(planningDir, "PLAN.md")
              const tasks: PlanTask[] = existsSync(planPath)
                ? yield* Effect.tryPromise({
                    try: () => parsePlan(planPath),
                    catch: () => [] as PlanTask[],
                  })
                : []
              const task = params.taskId
                ? tasks.find((t: PlanTask) => t.id === params.taskId)
                : tasks[0]
              if (!task) {
                return {
                  title: "No task found",
                  output: "No task found for verification.",
                  metadata: { action: "verify" },
                }
              }
              const evidence = collectEvidence(task, projectDir)
              const unit = {
                type: "task" as const,
                id: task.id,
                title: task.title,
                milestoneId: params.milestoneId ?? "",
                sliceId: task.sliceId,
                taskId: task.id,
              }
              const gates = evaluateGates(unit, evidence)
              const evidenceTable = renderEvidenceTable(evidence)
              const gateSummary = gates
                .map((g) => `- **${g.gateId}:** ${g.verdict} — ${g.rationale}`)
                .join("\n")
              const output = [
                "## Verification Results",
                "",
                evidenceTable,
                "",
                "## Quality Gates",
                gateSummary || "No gates evaluated.",
              ].join("\n")
              return {
                title: `Verification for task ${task.id}`,
                output,
                metadata: { action: "verify" },
              }
            }

            case "doctor": {
              const checks = yield* Effect.tryPromise({
                try: () => runDoctor(projectDir),
                catch: () => [],
              })
              const output = renderDoctorResults(checks)
              return {
                title: "Doctor results",
                output,
                metadata: { action: "doctor" },
              }
            }

            case "summary": {
              const statePath = join(planningDir, "STATE.md")
              if (!existsSync(statePath)) {
                return {
                  title: "No state",
                  output: "No .planning/STATE.md found.",
                  metadata: { action: "summary" },
                }
              }
              const state: ProjectState | null = yield* Effect.tryPromise({
                try: () => parseState(statePath),
                catch: () => null,
              })
              const roadmap: RoadmapSlice[] = yield* Effect.tryPromise({
                try: () => parseRoadmap(join(planningDir, "ROADMAP.md")),
                catch: () => [],
              })
              const plan: PlanTask[] = yield* Effect.tryPromise({
                try: () => parsePlan(join(planningDir, "PLAN.md")),
                catch: () => [],
              })
              const nextUnit = getNextUnit(state, roadmap, plan)
              const lines = [
                "**Current State:**",
                `- Phase: ${state.activePhase || "None"}`,
                `- Milestone: ${state.activeMilestone || "None"}`,
                `- Slice: ${state.activeSlice || "None"}`,
                `- Task: ${state.activeTask || "None"}`,
                "",
                "**Progress:**",
                `- Milestones: ${state.completedMilestones.length}/${roadmap.length}`,
                `- Slices: ${state.completedSlices.length}/${roadmap.length}`,
                `- Tasks: ${state.completedTasks.length}/${plan.length}`,
                "",
              ]
              if (nextUnit) {
                lines.push(`**Next Unit:** ${nextUnit.type} ${nextUnit.id}`)
              } else {
                lines.push("**Status:** All units complete!")
              }
              return {
                title: "Project summary",
                output: lines.join("\n"),
                metadata: { action: "summary" },
              }
            }

            default:
              return {
                title: "Unknown action",
                output: `Unknown action: ${params.action}. Valid: get-state, get-next-unit, next-step, inject-context, verify, doctor, summary`,
                metadata: { action: "error" },
              }
          }
        }).pipe(Effect.orDie),
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)
