/**
 * Context budget engine — proportional allocation and section-boundary truncation.
 *
 * Simplified from GSD-Pi's context-budget.ts (309 lines).
 * No tiktoken dependency — uses approximate chars-per-token.
 * No model registry — uses configurable context window.
 *
 * Budget ratios (from GSD-Pi):
 *   Summary: 15% — dependency/prior-task summaries
 *   Inline context: 40% — plans, decisions, code snippets
 *   Verification: 10% — verification sections in prompts
 *   Reserved: 35% — executor working space
 */

import type { UnitType, ContextBudget } from "./types"

// ─── Budget ratio constants ──────────────────────────────────────────────────

/** Proportion of context window for dependency/prior-task summaries */
const SUMMARY_RATIO = 0.15

/** Proportion of context window for inline context (plans, decisions, code) */
const INLINE_CONTEXT_RATIO = 0.40

/** Proportion of context window for verification sections */
const VERIFICATION_RATIO = 0.10

/** Approximate chars-per-token conversion factor */
const CHARS_PER_TOKEN = 4

/** Default context window when none can be resolved */
const DEFAULT_CONTEXT_WINDOW = 200_000

/** Maximum preamble characters (from GSD-Pi auto-prompts.ts) */
export const MAX_PREAMBLE_CHARS = 20_000

/** Percentage of context consumed before suggesting a continue-here checkpoint */
const CONTINUE_THRESHOLD_PERCENT = 70

// ─── Task count bounds ───────────────────────────────────────────────────────

const TASK_COUNT_MIN = 2

/** Task count ceiling tiers: [contextWindowThreshold, maxTasks] */
const TASK_COUNT_TIERS: [number, number][] = [
  [500_000, 8],
  [200_000, 6],
  [128_000, 5],
  [0, 3],
]

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TruncationResult {
  /** The (possibly truncated) content string */
  content: string
  /** Number of sections dropped during truncation; 0 when content fits */
  droppedSections: number
}

export interface BudgetAllocation {
  /** Character budget for dependency/prior-task summaries */
  summaryBudgetChars: number
  /** Character budget for inline context (plans, decisions, code snippets) */
  inlineContextBudgetChars: number
  /** Character budget for verification sections */
  verificationBudgetChars: number
  /** Recommended task count range for the executor */
  taskCountRange: { min: number; max: number }
  /** Percentage of context consumed before suggesting a continue-here checkpoint */
  continueThresholdPercent: number
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute proportional budget allocations from a context window size (in tokens).
 *
 * Returns deterministic output for any given input. Invalid inputs (≤ 0)
 * silently default to 200K.
 */
export function computeBudgets(contextWindow: number): BudgetAllocation {
  const effectiveWindow = contextWindow > 0 ? contextWindow : DEFAULT_CONTEXT_WINDOW
  const totalChars = effectiveWindow * CHARS_PER_TOKEN

  return {
    summaryBudgetChars: Math.floor(totalChars * SUMMARY_RATIO),
    inlineContextBudgetChars: Math.floor(totalChars * INLINE_CONTEXT_RATIO),
    verificationBudgetChars: Math.floor(totalChars * VERIFICATION_RATIO),
    continueThresholdPercent: CONTINUE_THRESHOLD_PERCENT,
    taskCountRange: {
      min: TASK_COUNT_MIN,
      max: resolveTaskCountMax(effectiveWindow),
    },
  }
}

/**
 * Allocate budget for a specific unit type.
 *
 * Different unit types have different context needs:
 * - Milestones: more inline context (roadmap, requirements, decisions)
 * - Slices: balanced (plan, dependency summaries, task plans)
 * - Tasks: more verification (task plan, verification commands)
 */
export function allocateBudget(
  unitType: UnitType,
  contextWindow: number = DEFAULT_CONTEXT_WINDOW,
): ContextBudget {
  const totalChars = contextWindow * CHARS_PER_TOKEN

  // Adjust ratios based on unit type
  switch (unitType) {
    case "milestone":
      return {
        totalTokens: contextWindow,
        summaryBudget: Math.floor(totalChars * 0.10),  // Less summary needed
        inlineContextBudget: Math.floor(totalChars * 0.45),  // More inline context
        verificationBudget: Math.floor(totalChars * 0.05),  // Less verification
        reservedBudget: Math.floor(totalChars * 0.40),
      }
    case "slice":
      return {
        totalTokens: contextWindow,
        summaryBudget: Math.floor(totalChars * 0.15),  // Standard summary
        inlineContextBudget: Math.floor(totalChars * 0.40),  // Standard inline
        verificationBudget: Math.floor(totalChars * 0.10),  // Standard verification
        reservedBudget: Math.floor(totalChars * 0.35),
      }
    case "task":
      return {
        totalTokens: contextWindow,
        summaryBudget: Math.floor(totalChars * 0.10),  // Less summary
        inlineContextBudget: Math.floor(totalChars * 0.35),  // Less inline
        verificationBudget: Math.floor(totalChars * 0.15),  // More verification
        reservedBudget: Math.floor(totalChars * 0.40),
      }
  }
}

/**
 * Truncate content at markdown section boundaries to fit within a character budget.
 *
 * Splits on `### ` headings and `---` dividers. Keeps whole sections that fit.
 * Appends `[...truncated N sections]` when content is dropped.
 * Returns content unchanged when it fits within budget.
 *
 * This is critical — mid-section cuts produce invalid markdown and broken context.
 */
export function truncateAtSectionBoundary(content: string, budgetChars: number): TruncationResult {
  if (!content || content.length <= budgetChars) {
    return { content, droppedSections: 0 }
  }

  const sections = splitIntoSections(content)

  if (sections.length <= 1) {
    const truncated = content.slice(0, budgetChars)
    return { content: truncated + "\n\n[...truncated 1 section]", droppedSections: 1 }
  }

  // Greedily keep sections that fit
  let usedChars = 0
  let keptCount = 0

  for (const section of sections) {
    const sectionLen = section.length
    if (usedChars + sectionLen > budgetChars && keptCount > 0) {
      break
    }
    usedChars += sectionLen
    keptCount++
    if (usedChars >= budgetChars) break
  }

  const droppedCount = sections.length - keptCount
  if (droppedCount === 0) {
    return { content, droppedSections: 0 }
  }

  const kept = sections.slice(0, keptCount).join("")
  return {
    content: kept.trimEnd() + `\n\n[...truncated ${droppedCount} sections]`,
    droppedSections: droppedCount,
  }
}

/**
 * Reduce content to fit within budget using section-boundary truncation.
 */
export function reduceToFit(content: string, budgetChars: number): TruncationResult {
  if (!content || content.length <= budgetChars) {
    return { content, droppedSections: 0 }
  }
  return truncateAtSectionBoundary(content, budgetChars)
}

/**
 * Count approximate tokens in content.
 * Uses simple chars-per-token estimation.
 */
export function countTokens(content: string): number {
  return Math.ceil(content.length / CHARS_PER_TOKEN)
}

/**
 * Truncate preamble to MAX_PREAMBLE_CHARS.
 * Preamble is the system-level context that precedes unit-specific instructions.
 */
export function capPreamble(preamble: string): string {
  if (preamble.length <= MAX_PREAMBLE_CHARS) {
    return preamble
  }
  return preamble.slice(0, MAX_PREAMBLE_CHARS) + "\n\n[...preamble truncated]"
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Resolve task count ceiling from context window size.
 */
function resolveTaskCountMax(contextWindow: number): number {
  for (const [threshold, max] of TASK_COUNT_TIERS) {
    if (contextWindow >= threshold) return max
  }
  return 3
}

/**
 * Split content into sections at `### ` headings or `---` dividers.
 * Each section includes its leading marker.
 */
function splitIntoSections(content: string): string[] {
  const pattern = /^(?=### |\-{3,}\s*$)/m
  const parts = content.split(pattern).filter(p => p.length > 0)
  return parts
}