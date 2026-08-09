/**
 * State Query — Query structured state to determine next unit and completion status.
 *
 * Ported from GSD-Pi's auto-mode state derivation logic.
 * Pure functions, no I/O.
 */

import type {
  ProjectState,
  RoadmapSlice,
  PlanTask,
  Unit,
  UnitType,
  CompletionStatus,
  DependencyGraph,
} from "./types"

// ─── Next Unit ──────────────────────────────────────────────────────────────

/**
 * Determine the next unit to execute based on current state, roadmap, and plan.
 *
 * Logic:
 * 1. If activeTask exists → return that task
 * 2. If activeSlice exists → find next pending task in slice
 * 3. If activeMilestone exists → find next ready slice
 * 4. Find next milestone with unmet dependencies satisfied
 * 5. Return null if all complete
 */
export function getNextUnit(
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
): Unit | null {
  // 1. If there's an active task, return it
  if (state.activeTask && state.activeSlice && state.activeMilestone) {
    const task = plan.find(
      (t) => t.id === state.activeTask && t.sliceId === state.activeSlice,
    )
    if (task && task.status !== "completed") {
      return {
        type: "task",
        id: task.id,
        title: task.title,
        milestoneId: state.activeMilestone,
        sliceId: state.activeSlice,
        taskId: task.id,
      }
    }
  }

  // 2. If there's an active slice, find next pending task
  if (state.activeSlice && state.activeMilestone) {
    const nextTask = findNextPendingTask(plan, state.activeSlice, state.completedTasks)
    if (nextTask) {
      return {
        type: "task",
        id: nextTask.id,
        title: nextTask.title,
        milestoneId: state.activeMilestone,
        sliceId: state.activeSlice,
        taskId: nextTask.id,
      }
    }
  }

  // 3. If there's an active milestone, find next ready slice
  if (state.activeMilestone) {
    const nextSlice = findNextReadySlice(roadmap, state.activeMilestone, state.completedSlices)
    if (nextSlice) {
      return {
        type: "slice",
        id: nextSlice.id,
        title: nextSlice.title,
        milestoneId: state.activeMilestone,
        sliceId: nextSlice.id,
      }
    }
  }

  // 4. Find next milestone with satisfied dependencies
  const nextMilestone = findNextReadyMilestone(roadmap, state.completedMilestones)
  if (nextMilestone) {
    return {
      type: "milestone",
      id: nextMilestone.id,
      title: nextMilestone.title,
      milestoneId: nextMilestone.id,
    }
  }

  // 5. All complete
  return null
}

// ─── Completion Status ──────────────────────────────────────────────────────

/** Get completion status across all units. */
export function getCompletionStatus(
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
): CompletionStatus {
  const totalMilestones = roadmap.length
  const completedMilestones = state.completedMilestones.length
  const totalSlices = roadmap.length // Each milestone has one slice in roadmap
  const completedSlices = state.completedSlices.length
  const totalTasks = plan.length
  const completedTasks = state.completedTasks.length

  return {
    totalMilestones,
    completedMilestones,
    totalSlices,
    completedSlices,
    totalTasks,
    completedTasks,
    isComplete: completedMilestones === totalMilestones && completedTasks === totalTasks,
  }
}

// ─── Dependency Graph ───────────────────────────────────────────────────────

/** Build a dependency graph from roadmap slices. */
export function getDependencyGraph(roadmap: RoadmapSlice[]): DependencyGraph {
  const nodes = new Map<string, RoadmapSlice>()
  const edges = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const slice of roadmap) {
    nodes.set(slice.id, slice)
    edges.set(slice.id, slice.depends)
    inDegree.set(slice.id, slice.depends.length)
  }

  return { nodes, edges, inDegree }
}

/** Get reasons why units are blocked. */
export function getBlockedReasons(
  graph: DependencyGraph,
  state: ProjectState,
): string[] {
  const reasons: string[] = []

  for (const [sliceId, depends] of graph.edges) {
    if (state.completedSlices.includes(sliceId)) continue

    const unmet = depends.filter((dep) => !state.completedSlices.includes(dep))
    if (unmet.length > 0) {
      const slice = graph.nodes.get(sliceId)
      reasons.push(`Slice "${slice?.title ?? sliceId}" blocked by: ${unmet.join(", ")}`)
    }
  }

  return reasons
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function findNextPendingTask(
  plan: PlanTask[],
  sliceId: string,
  completedTasks: string[],
): PlanTask | null {
  const sliceTasks = plan.filter((t) => t.sliceId === sliceId)
  for (const task of sliceTasks) {
    if (task.status !== "completed" && !completedTasks.includes(task.id)) {
      return task
    }
  }
  return null
}

function findNextReadySlice(
  roadmap: RoadmapSlice[],
  milestoneId: string,
  completedSlices: string[],
): RoadmapSlice | null {
  for (const slice of roadmap) {
    if (completedSlices.includes(slice.id)) continue
    // Check if all dependencies are met
    const depsMet = slice.depends.every((dep) => completedSlices.includes(dep))
    if (depsMet) return slice
  }
  return null
}

function findNextReadyMilestone(
  roadmap: RoadmapSlice[],
  completedMilestones: string[],
): RoadmapSlice | null {
  for (const slice of roadmap) {
    if (completedMilestones.includes(slice.id)) continue
    const depsMet = slice.depends.every((dep) => completedMilestones.includes(dep))
    if (depsMet) return slice
  }
  return null
}
