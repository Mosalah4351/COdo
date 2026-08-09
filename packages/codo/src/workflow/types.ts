/**
 * Workflow types — shared type definitions for the GSD workflow system.
 *
 * These types model the structured state of a GSD project:
 * milestones, slices, tasks, and their lifecycle states.
 */

// ─── Unit Types ─────────────────────────────────────────────────────────────

export type UnitType = "milestone" | "slice" | "task"

export type UnitStatus = "pending" | "planning" | "ready" | "executing" | "verifying" | "completed" | "failed"

// ─── Roadmap ────────────────────────────────────────────────────────────────

export interface RoadmapSlice {
  id: string
  title: string
  status: "pending" | "active" | "completed"
  risk: "low" | "medium" | "high"
  depends: string[]
  demo: string
  isSketch: boolean
}

// ─── Plan ───────────────────────────────────────────────────────────────────

export interface PlanTask {
  id: string
  title: string
  status: "pending" | "active" | "completed"
  estimate: string
  mustHaves: string[]
  verification: string[]
  sliceId: string
}

// ─── State ──────────────────────────────────────────────────────────────────

export interface ProjectState {
  activePhase: string
  activeMilestone?: string
  activeSlice?: string
  activeTask?: string
  completedMilestones: string[]
  completedSlices: string[]
  completedTasks: string[]
  lastUpdated: Date
}

// ─── Context ────────────────────────────────────────────────────────────────

export interface MilestoneContext {
  id: string
  title: string
  vision: string
  successCriteria: string[]
  keyRisks: string[]
  decisions: Decision[]
  requirements: Requirement[]
}

// ─── Decisions & Requirements ───────────────────────────────────────────────

export interface Decision {
  id: string
  when: string
  decision: string
  choice: string
  rationale: string
}

export interface Requirement {
  id: string
  status: "active" | "validated" | "deferred" | "blocked" | "out-of-scope"
  description: string
  owner: string
}

// ─── Verification ───────────────────────────────────────────────────────────

export interface VerificationEvidence {
  id: string
  taskId: string
  sliceId: string
  milestoneId: string
  command: string
  exitCode: number
  verdict: "pass" | "fail" | "skip"
  durationMs: number
  output: string
  createdAt: Date
}

export interface QualityGate {
  gateId: string
  scope: "task" | "slice" | "milestone"
  status: "pending" | "evaluated"
  verdict: "pass" | "fail" | "waived"
  rationale: string
  findings: string[]
  evaluatedAt?: Date
}

// ─── Rework ─────────────────────────────────────────────────────────────────

export interface ReworkBrief {
  id: string
  milestoneId: string
  sliceId: string
  taskId: string
  findings: ReworkFinding[]
  createdAt: Date
}

export interface ReworkFinding {
  findingId: string
  severity: "blocking" | "major" | "minor"
  description: string
  requiredFix: string
  verificationCommands: string[]
  status: "pending" | "fixed" | "wontfix"
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

export interface DoctorCheck {
  name: string
  status: "pass" | "fail" | "warn"
  message: string
  fix?: string
}

// ─── Context Budget ─────────────────────────────────────────────────────────

export interface ContextBudget {
  totalTokens: number
  summaryBudget: number
  inlineContextBudget: number
  verificationBudget: number
  reservedBudget: number
}

// ─── Unit ───────────────────────────────────────────────────────────────────

export interface Unit {
  type: UnitType
  id: string
  title: string
  milestoneId: string
  sliceId?: string
  taskId?: string
}

// ─── Context Injection ──────────────────────────────────────────────────────

export interface ContextInjection {
  preamble: string
  context: string
  unitInstructions: string
  verificationRequirements: string
  completionContract: string
  templates: string
}

// ─── Completion Status ──────────────────────────────────────────────────────

export interface CompletionStatus {
  totalMilestones: number
  completedMilestones: number
  totalSlices: number
  completedSlices: number
  totalTasks: number
  completedTasks: number
  isComplete: boolean
}

// ─── Dependency Graph ───────────────────────────────────────────────────────

export interface DependencyGraph {
  nodes: Map<string, RoadmapSlice>
  edges: Map<string, string[]>
  inDegree: Map<string, number>
}
