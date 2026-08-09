/**
 * State Parser — Parse `.planning/` markdown files into structured data.
 *
 * Ported from GSD-Pi's files.ts. Pure functions, no module state.
 * Parses ROADMAP.md, PLAN.md, STATE.md, CONTEXT.md, DECISIONS.md, REQUIREMENTS.md.
 */

import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type {
  RoadmapSlice,
  PlanTask,
  ProjectState,
  MilestoneContext,
  Decision,
  Requirement,
} from "./types"

// ─── Markdown Parsing ───────────────────────────────────────────────────────

/** Extract the text after a heading at a given level, up to the next heading of same or higher level. */
export function extractSection(body: string, heading: string, level: number = 2): string | null {
  const prefix = "#".repeat(level) + " "
  const regex = new RegExp(`^${prefix}${escapeRegex(heading)}\\s*$`, "m")
  const match = regex.exec(body)
  if (!match) return null

  const start = match.index + match[0].length
  const rest = body.slice(start)

  const nextHeading = rest.match(new RegExp(`^#{1,${level}} `, "m"))
  const end = nextHeading ? nextHeading.index! : rest.length

  return rest.slice(0, end).trim()
}

/** Extract all sections at a given level, returning heading → content map. */
export function extractAllSections(body: string, level: number = 2): Map<string, string> {
  const prefix = "#".repeat(level) + " "
  const regex = new RegExp(`^${prefix}(.+)$`, "gm")
  const sections = new Map<string, string>()
  const matches = [...body.matchAll(regex)]

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim()
    const start = matches[i].index! + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : body.length
    sections.set(heading, body.slice(start, end).trim())
  }

  return sections
}

/** Parse checkbox items from markdown content. */
export function parseCheckboxes(content: string): { id: string; title: string; status: "pending" | "completed" }[] {
  const items: { id: string; title: string; status: "pending" | "completed" }[] = []
  const regex = /^- \[([ x])\] \*\*(\w+):\s*(.+?)\*\*/gm
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    items.push({
      status: match[1] === "x" ? "completed" : "pending",
      id: match[2],
      title: match[3].trim(),
    })
  }

  return items
}

/** Extract key: value from bold-prefixed lines like "**Key:** Value" */
export function extractBoldField(text: string, key: string): string | null {
  const regex = new RegExp(`^\\*\\*${escapeRegex(key)}:\\*\\*\\s*(.+)$`, "m")
  const match = regex.exec(text)
  return match ? match[1].trim() : null
}

/** Parse bullet list items from a text block. */
export function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
}

// ─── YAML Frontmatter ───────────────────────────────────────────────────────

/** Split content into frontmatter data and body. */
export function splitFrontmatter(content: string): [string | null, string] {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(content)
  if (!match) return [null, content]
  return [match[1], content.slice(match[0].length)]
}

/** Parse YAML-like frontmatter into a key-value map. */
export function parseFrontmatterMap(yamlContent: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentKey = ""
  let currentValue = ""
  let isArray = false
  let arrayItems: string[] = []

  for (const line of yamlContent.split("\n")) {
    // Array item
    if (/^\s+-\s+/.test(line)) {
      const item = line.replace(/^\s+-\s+/, "").trim()
      if (isArray) {
        arrayItems.push(item)
      }
      continue
    }

    // New key: value pair
    const kvMatch = /^(\w[\w_]*):\s*(.*)$/.exec(line)
    if (kvMatch) {
      // Save previous key
      if (currentKey) {
        if (isArray) {
          result[currentKey] = arrayItems
        } else {
          result[currentKey] = parseYamlValue(currentValue)
        }
      }

      currentKey = kvMatch[1]
      currentValue = kvMatch[2].trim()
      isArray = currentValue === "" || currentValue === "[]"
      arrayItems = []

      // Handle inline array
      if (currentValue.startsWith("[") && currentValue.endsWith("]")) {
        const inner = currentValue.slice(1, -1).trim()
        arrayItems = inner ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")) : []
        isArray = true
      }
    } else if (currentKey && line.trim()) {
      currentValue += " " + line.trim()
    }
  }

  // Save last key
  if (currentKey) {
    if (isArray) {
      result[currentKey] = arrayItems
    } else {
      result[currentKey] = parseYamlValue(currentValue)
    }
  }

  return result
}

function parseYamlValue(value: string): unknown {
  if (value === "true") return true
  if (value === "false") return false
  if (value === "null" || value === "") return null
  if (/^\d+$/.test(value)) return parseInt(value, 10)
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

// ─── File Parsers ───────────────────────────────────────────────────────────

/** Parse ROADMAP.md into structured slice data. */
export async function parseRoadmap(path: string): Promise<RoadmapSlice[]> {
  if (!existsSync(path)) return []
  const content = await readFile(path, "utf-8")
  return parseRoadmapContent(content)
}

export function parseRoadmapContent(content: string): RoadmapSlice[] {
  const slices: RoadmapSlice[] = []
  const checkboxItems = parseCheckboxes(content)

  for (const item of checkboxItems) {
    // Parse additional fields from the section below the checkbox
    const sectionRegex = new RegExp(
      `^- \\[[ x]\\] \\*\\*${escapeRegex(item.id)}:\\s*${escapeRegex(item.title)}\\*\\*([\\s\\S]*?)(?=^- \\[|$)`,
      "m",
    )
    const sectionMatch = sectionRegex.exec(content)
    const section = sectionMatch ? sectionMatch[1] : ""

    const depends = extractBoldField(section, "Depends")?.split(",").map((s) => s.trim()) ?? []
    const risk = (extractBoldField(section, "Risk") as "low" | "medium" | "high") ?? "low"
    const demo = extractBoldField(section, "Demo") ?? ""
    const isSketch = /sketch/i.test(section)

    slices.push({
      id: item.id,
      title: item.title,
      status: item.status === "completed" ? "completed" : "pending",
      risk,
      depends,
      demo,
      isSketch,
    })
  }

  return slices
}

/** Parse PLAN.md into structured task data. */
export async function parsePlan(path: string): Promise<PlanTask[]> {
  if (!existsSync(path)) return []
  const content = await readFile(path, "utf-8")
  return parsePlanContent(content)
}

export function parsePlanContent(content: string): PlanTask[] {
  const tasks: PlanTask[] = []
  const checkboxItems = parseCheckboxes(content)

  for (const item of checkboxItems) {
    const sectionRegex = new RegExp(
      `^- \\[[ x]\\] \\*\\*${escapeRegex(item.id)}:\\s*${escapeRegex(item.title)}\\*\\*([\\s\\S]*?)(?=^- \\[|$)`,
      "m",
    )
    const sectionMatch = sectionRegex.exec(content)
    const section = sectionMatch ? sectionMatch[1] : ""

    const estimate = extractBoldField(section, "Estimate") ?? ""
    const mustHaves = extractBoldField(section, "Must-haves")?.split(",").map((s) => s.trim()) ?? []
    const verification = extractBoldField(section, "Verification")?.split(",").map((s) => s.trim()) ?? []
    const sliceId = extractBoldField(section, "Slice") ?? ""

    tasks.push({
      id: item.id,
      title: item.title,
      status: item.status === "completed" ? "completed" : "pending",
      estimate,
      mustHaves,
      verification,
      sliceId,
    })
  }

  return tasks
}

/** Parse STATE.md into structured state data. */
export async function parseState(path: string): Promise<ProjectState> {
  const defaultState: ProjectState = {
    activePhase: "",
    completedMilestones: [],
    completedSlices: [],
    completedTasks: [],
    lastUpdated: new Date(),
  }

  if (!existsSync(path)) return defaultState
  const content = await readFile(path, "utf-8")
  return parseStateContent(content)
}

export function parseStateContent(content: string): ProjectState {
  const [fmLines, body] = splitFrontmatter(content)
  const fm = fmLines ? parseFrontmatterMap(fmLines) : {}

  const completedMilestones = extractBoldField(body, "Completed Milestones")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []
  const completedSlices = extractBoldField(body, "Completed Slices")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []
  const completedTasks = extractBoldField(body, "Completed Tasks")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []

  return {
    activePhase: (fm.active_phase as string) ?? "",
    activeMilestone: (fm.active_milestone as string) ?? undefined,
    activeSlice: (fm.active_slice as string) ?? undefined,
    activeTask: (fm.active_task as string) ?? undefined,
    completedMilestones,
    completedSlices,
    completedTasks,
    lastUpdated: fm.last_updated ? new Date(fm.last_updated as string) : new Date(),
  }
}

/** Parse CONTEXT.md into structured milestone context. */
export async function parseContext(path: string): Promise<MilestoneContext> {
  const defaultContext: MilestoneContext = {
    id: "",
    title: "",
    vision: "",
    successCriteria: [],
    keyRisks: [],
    decisions: [],
    requirements: [],
  }

  if (!existsSync(path)) return defaultContext
  const content = await readFile(path, "utf-8")
  return parseContextContent(content)
}

export function parseContextContent(content: string): MilestoneContext {
  const [fmLines, body] = splitFrontmatter(content)
  const fm = fmLines ? parseFrontmatterMap(fmLines) : {}

  const vision = extractSection(body, "Vision") ?? ""
  const successCriteria = parseBullets(extractSection(body, "Success Criteria") ?? "")
  const keyRisks = parseBullets(extractSection(body, "Key Risks") ?? "")

  return {
    id: (fm.id as string) ?? "",
    title: (fm.title as string) ?? "",
    vision,
    successCriteria,
    keyRisks,
    decisions: [],
    requirements: [],
  }
}

/** Parse DECISIONS.md into structured decision data. */
export async function parseDecisions(path: string): Promise<Decision[]> {
  if (!existsSync(path)) return []
  const content = await readFile(path, "utf-8")
  return parseDecisionsContent(content)
}

export function parseDecisionsContent(content: string): Decision[] {
  const decisions: Decision[] = []
  const sections = extractAllSections(content, 3)

  for (const [heading, sectionContent] of sections) {
    const id = heading.trim()
    if (!id) continue

    const when = extractBoldField(sectionContent, "When") ?? ""
    const decision = extractBoldField(sectionContent, "Decision") ?? ""
    const choice = extractBoldField(sectionContent, "Choice") ?? ""
    const rationale = extractBoldField(sectionContent, "Rationale") ?? ""

    decisions.push({ id, when, decision, choice, rationale })
  }

  return decisions
}

/** Parse REQUIREMENTS.md into structured requirement data. */
export async function parseRequirements(path: string): Promise<Requirement[]> {
  if (!existsSync(path)) return []
  const content = await readFile(path, "utf-8")
  return parseRequirementsContent(content)
}

export function parseRequirementsContent(content: string): Requirement[] {
  const requirements: Requirement[] = []
  const checkboxItems = parseCheckboxes(content)

  for (const item of checkboxItems) {
    const sectionRegex = new RegExp(
      `^- \\[[ x]\\] \\*\\*${escapeRegex(item.id)}:\\s*${escapeRegex(item.title)}\\*\\*([\\s\\S]*?)(?=^- \\[|$)`,
      "m",
    )
    const sectionMatch = sectionRegex.exec(content)
    const section = sectionMatch ? sectionMatch[1] : ""

    const statusRaw = extractBoldField(section, "Status") ?? "active"
    const status = ["active", "validated", "deferred", "blocked", "out-of-scope"].includes(statusRaw)
      ? (statusRaw as Requirement["status"])
      : "active"
    const owner = extractBoldField(section, "Owner") ?? ""

    requirements.push({
      id: item.id,
      status,
      description: item.title,
      owner,
    })
  }

  return requirements
}

// ─── File Cache ─────────────────────────────────────────────────────────────

/** Fast composite key: length + first/mid/last 100 chars. */
function cacheKey(content: string): string {
  const len = content.length
  const head = content.slice(0, 100)
  const midStart = Math.max(0, Math.floor(len / 2) - 50)
  const mid = len > 200 ? content.slice(midStart, midStart + 100) : ""
  const tail = len > 100 ? content.slice(-100) : ""
  return `${len}:${head}:${mid}:${tail}`
}

export class FileCache {
  private cache = new Map<string, unknown>()
  private ttlMs: number

  constructor(ttlMs: number = 5000) {
    this.ttlMs = ttlMs
  }

  async get<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cacheKey = `${key}|${this.ttlMs}`
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as T
    const result = await loader()
    this.cache.set(cacheKey, result)
    return result
  }

  invalidate(key: string): void {
    for (const k of this.cache.keys()) {
      if (k.startsWith(key)) this.cache.delete(k)
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
