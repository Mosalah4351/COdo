/**
 * State Machine — In-memory state transitions persisted to `.planning/STATE.md`.
 *
 * Ported from GSD-Pi's lifecycle state machine (simplified).
 * Manages unit status transitions and STATE.md rendering.
 */

import { writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { ProjectState, UnitStatus } from "./types"

// ─── Valid Transitions ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  pending: ["planning"],
  planning: ["ready", "failed"],
  ready: ["executing"],
  executing: ["verifying", "failed"],
  verifying: ["completed", "failed"],
  failed: ["planning", "executing"],
  completed: [],
}

// ─── Unit State ─────────────────────────────────────────────────────────────

export interface UnitState {
  id: string
  type: string
  status: UnitStatus
  milestoneId: string
  sliceId?: string
  taskId?: string
}

/**
 * Transition a unit to a new status.
 * Throws if the transition is invalid.
 */
export function transitionState(current: UnitState, newStatus: UnitStatus): UnitState {
  const allowed = VALID_TRANSITIONS[current.status]
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${current.status} → ${newStatus}. Allowed: ${allowed.join(", ")}`,
    )
  }

  return {
    ...current,
    status: newStatus,
  }
}

/**
 * Check if a transition is valid without throwing.
 */
export function isValidTransition(from: UnitStatus, to: UnitStatus): boolean {
  const allowed = VALID_TRANSITIONS[from]
  return allowed.includes(to)
}

// ─── State Rendering ────────────────────────────────────────────────────────

/**
 * Render a ProjectState to STATE.md format (human-readable markdown).
 */
export function renderState(state: ProjectState): string {
  const lines: string[] = []

  lines.push("---")
  lines.push(`active_phase: "${state.activePhase}"`)
  if (state.activeMilestone) lines.push(`active_milestone: "${state.activeMilestone}"`)
  if (state.activeSlice) lines.push(`active_slice: "${state.activeSlice}"`)
  if (state.activeTask) lines.push(`active_task: "${state.activeTask}"`)
  lines.push(`last_updated: "${state.lastUpdated.toISOString()}"`)
  lines.push("---")
  lines.push("")

  lines.push("# Project State")
  lines.push("")

  if (state.activeMilestone) {
    lines.push(`**Active Milestone:** ${state.activeMilestone}`)
  }
  if (state.activeSlice) {
    lines.push(`**Active Slice:** ${state.activeSlice}`)
  }
  if (state.activeTask) {
    lines.push(`**Active Task:** ${state.activeTask}`)
  }

  if (state.completedMilestones.length > 0) {
    lines.push("")
    lines.push(`**Completed Milestones:** ${state.completedMilestones.join(", ")}`)
  }
  if (state.completedSlices.length > 0) {
    lines.push(`**Completed Slices:** ${state.completedSlices.join(", ")}`)
  }
  if (state.completedTasks.length > 0) {
    lines.push(`**Completed Tasks:** ${state.completedTasks.join(", ")}`)
  }

  return lines.join("\n") + "\n"
}

/**
 * Persist state to a file.
 */
export async function persistState(state: ProjectState, path: string): Promise<void> {
  const content = renderState(state)
  await writeFile(path, content, "utf-8")
}

/**
 * Ensure the parent directory exists.
 */
async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath)
  const { mkdirSync, existsSync } = await import("node:fs")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}
