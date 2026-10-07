/**
 * Skill activation and discovery for COdo workflow units.
 *
 * Simplified from GSD-Pi's skill-activation.ts (321 lines).
 * Key patterns preserved:
 *   - Context-based skill matching
 *   - Skill activation blocks
 *   - Skill recommendations
 *
 * Simplifications:
 *   - No preferences system (hardcoded rules)
 *   - No manifest system (simpler skill filtering)
 *   - No DB dependencies
 *   - No skill discovery CLI integration
 */

import { existsSync, readdirSync } from "fs"
import { join } from "path"

import type { Info } from "./index"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SkillActivationParams {
  /** Unit type (milestone, slice, task, complete-slice, complete-milestone) */
  unitType: string
  /** Milestone ID */
  milestoneId: string
  /** Milestone title */
  milestoneTitle?: string
  /** Slice ID */
  sliceId?: string
  /** Slice title */
  sliceTitle?: string
  /** Task ID */
  taskId?: string
  /** Task title */
  taskTitle?: string
  /** Extra context tokens for matching */
  extraContext?: string[]
  /** Installed skills */
  skills: Info[]
}

export interface SkillActivationResult {
  /** Skills to activate (must read and follow) */
  activated: Info[]
  /** Skills to recommend (consider if relevant) */
  recommended: Info[]
  /** XML block for prompt injection */
  block: string
}

export interface SkillSubDirs {
  workflows: Array<{ name: string; path: string }>
  references: Array<{ name: string; path: string }>
  templates: Array<{ name: string; path: string }>
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Skills to activate per unit type */
const UNIT_TYPE_SKILLS: Record<string, string[]> = {
  milestone: ["gsd:plan-phase", "gsd:spec-phase", "gsd:discuss-phase"],
  slice: ["gsd:plan-phase", "gsd:execute-phase"],
  task: ["gsd:execute-phase", "gsd:fast"],
  "complete-slice": ["gsd:verify-work", "gsd:code-review"],
  "complete-milestone": ["gsd:complete-milestone", "gsd:audit-milestone"],
  verify: ["gsd:verify-work"],
}

/** Skills that match common context keywords */
const CONTEXT_KEYWORD_SKILLS: Record<string, string[]> = {
  testing: ["gsd:add-tests", "gsd:validate-phase"],
  debug: ["gsd:debug", "gsd:forensics"],
  review: ["gsd:code-review", "gsd:review"],
  ui: ["gsd:ui-phase", "gsd:ui-review", "gsd:sketch"],
  ai: ["gsd:ai-integration-phase", "gsd:eval-review"],
  security: ["gsd:secure-phase"],
  docs: ["gsd:docs-update"],
}

/** XML tag for skill activation */
const SKILL_ACTIVATION_TAG = "skill_activation"

/** XML tag for skill recommendations */
const SKILL_RECOMMENDATIONS_TAG = "skill_recommendations"

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build skill activation block for a unit.
 *
 * Returns activated skills (must follow) and recommended skills (consider).
 */
export function buildSkillActivation(params: SkillActivationParams): SkillActivationResult {
  const contextTokens = tokenizeContext(params)
  const activated = new Set<string>()
  const avoided = new Set<string>()

  // 1. Activate skills based on unit type
  const unitTypeSkills = UNIT_TYPE_SKILLS[params.unitType] ?? []
  for (const skillName of unitTypeSkills) {
    const skill = params.skills.find(s => s.name === skillName)
    if (skill) activated.add(skill.name)
  }

  // 2. Activate skills based on context keywords
  for (const [keyword, skillNames] of Object.entries(CONTEXT_KEYWORD_SKILLS)) {
    if (contextTokens.has(keyword)) {
      for (const skillName of skillNames) {
        const skill = params.skills.find(s => s.name === skillName)
        if (skill) activated.add(skill.name)
      }
    }
  }

  // 3. Auto-match skills by name/description
  for (const skill of params.skills) {
    if (activated.has(skill.name) || avoided.has(skill.name)) continue
    if (skillMatchesContext(skill, contextTokens)) {
      activated.add(skill.name)
    }
  }

  // 4. Filter to installed skills only
  const installedNames = new Set(params.skills.map(s => s.name))
  const orderedActivated = [...activated]
    .filter(name => installedNames.has(name) && !avoided.has(name))
    .sort()

  const activatedSkills = orderedActivated
    .map(name => params.skills.find(s => s.name === name)!)
    .filter(Boolean)

  // 5. Build recommended list (not activated but potentially relevant)
  const recommendedSkills = params.skills
    .filter(s => !activated.has(s.name) && !avoided.has(s.name))
    .slice(0, 5) // Limit recommendations

  // 6. Build XML block
  const block = formatActivationBlock(activatedSkills, recommendedSkills, params.unitType)

  return {
    activated: activatedSkills,
    recommended: recommendedSkills,
    block,
  }
}

/**
 * Build skill activation block XML string.
 */
export function buildSkillActivationBlock(params: SkillActivationParams): string {
  const result = buildSkillActivation(params)
  return result.block
}

/**
 * Build skill discovery variables for template substitution.
 */
export function buildSkillDiscoveryVars(): {
  skillDiscoveryMode: string
  skillDiscoveryInstructions: string
} {
  return {
    skillDiscoveryMode: "automatic",
    skillDiscoveryInstructions:
      " Skills are discovered automatically from context. Check <available_skills> for installed skills.",
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Tokenize context for skill matching.
 */
function tokenizeContext(params: SkillActivationParams): Set<string> {
  const tokens = new Set<string>()
  const addVariants = (value: string) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized || normalized.length < 2) return
    tokens.add(normalized)
    tokens.add(normalized.replace(/[-_]+/g, " "))
    tokens.add(normalized.replace(/\s+/g, "-"))
    tokens.add(normalized.replace(/\s+/g, ""))
  }

  // Add unit identifiers
  addVariants(params.milestoneId)
  if (params.milestoneTitle) addVariants(params.milestoneTitle)
  if (params.sliceId) addVariants(params.sliceId)
  if (params.sliceTitle) addVariants(params.sliceTitle)
  if (params.taskId) addVariants(params.taskId)
  if (params.taskTitle) addVariants(params.taskTitle)

  // Add extra context
  for (const part of params.extraContext ?? []) {
    const text = part.toLowerCase()
    const matches = text.match(/[a-z0-9][a-z0-9+.#/_-]{1,}/g) ?? []
    for (const match of matches) {
      addVariants(match)
      for (const piece of match.split(/[^a-z0-9+.#]+/g)) {
        if (piece.length >= 3) addVariants(piece)
      }
    }
  }

  return tokens
}

/**
 * Check if a skill matches context tokens.
 */
function skillMatchesContext(skill: Info, contextTokens: Set<string>): boolean {
  const haystacks = [
    skill.name.toLowerCase(),
    skill.name.toLowerCase().replace(/[-_]+/g, " "),
    (skill.description ?? "").toLowerCase(),
  ]

  return [...contextTokens].some(
    token =>
      token.length >= 3 &&
      haystacks.some(haystack => haystack.includes(token)),
  )
}

/** Skill names must be lowercase alphanumeric with hyphens */
const SAFE_SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/

/**
 * Format skill activation block as XML.
 */
function formatActivationBlock(
  activated: Info[],
  recommended: Info[],
  unitType: string,
): string {
  const safeActivated = activated.filter(s => SAFE_SKILL_NAME.test(s.name))
  const safeRecommended = recommended.filter(s => SAFE_SKILL_NAME.test(s.name))

  if (safeActivated.length === 0 && safeRecommended.length === 0) {
    return ""
  }

  const parts: string[] = []

  // Activation block
  if (safeActivated.length > 0) {
    const reads = safeActivated
      .map(s => `Load '${s.name}' from <available_skills> and follow its instructions`)
      .join(". ")
    parts.push(`<${SKILL_ACTIVATION_TAG}>${reads}.</${SKILL_ACTIVATION_TAG}>`)
  }

  // Recommendations block
  if (safeRecommended.length > 0) {
    const names = safeRecommended.map(s => s.name).join(", ")
    parts.push(
      `<${SKILL_RECOMMENDATIONS_TAG} unit="${unitType}">For this unit type, also consider reading these installed skill files from <available_skills>: ${names}. These are recommendations, not requirements.</${SKILL_RECOMMENDATIONS_TAG}>`,
    )
  }

  return parts.join("\n")
}

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Scan skill directory for router-pattern subdirectories.
 *
 * Looks for workflows/, references/, and templates/ subdirectories
 * and returns their contents for skill activation.
 */
export function scanSkillSubDirs(skillDir: string): SkillSubDirs {
  const result: SkillSubDirs = {
    workflows: [],
    references: [],
    templates: [],
  }

  const subDirs = ["workflows", "references", "templates"] as const

  for (const subDir of subDirs) {
    const subDirPath = join(skillDir, subDir)
    if (!existsSync(subDirPath)) continue

    try {
      const entries = readdirSync(subDirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          result[subDir].push({
            name: entry.name.replace(/\.md$/, ""),
            path: join(subDirPath, entry.name),
          })
        }
      }
    } catch {
      // Directory not readable — skip
    }
  }

  return result
}