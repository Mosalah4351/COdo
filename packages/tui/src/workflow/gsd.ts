import { exec } from "child_process"
import { promisify } from "util"
import { homedir } from "os"
import { join } from "path"
import { existsSync } from "fs"
import { mkdtemp, rm, readdir, copyFile, mkdir, cp, readFile, writeFile } from "fs/promises"
import { tmpdir } from "os"

const execAsync = promisify(exec)

async function hasGsdSkills(dir: string): Promise<boolean> {
  if (!existsSync(dir)) return false
  const entries = await readdir(dir).catch(() => [])
  return entries.some(e => e.startsWith("gsd"))
}

async function copySkillsFrom(source: string, target: string) {
  await mkdir(target, { recursive: true })
  const entries = await readdir(source)
  for (const entry of entries) {
    const skillMd = join(source, entry, "SKILL.md")
    if (!existsSync(skillMd)) continue
    const destDir = join(target, entry)
    await mkdir(destDir, { recursive: true })
    await copyFile(skillMd, join(destDir, "SKILL.md"))
  }
}

const GSD_CORE_DIRS = ["bin", "templates", "references", "commands", "contexts", "workflows", "scripts"]
const GSD_CORE_ROOT_FILES = [".gsd-runtime", "VERSION"]

async function copyGsdCore(source: string, projectDir: string): Promise<boolean> {
  const dest = join(projectDir, ".agents", "gsd-core")
  if (existsSync(join(dest, "bin", "gsd-tools.cjs"))) return false
  const gsdCore = join(source, "gsd-core")
  const root = existsSync(gsdCore) ? gsdCore : source
  await mkdir(dest, { recursive: true })
  for (const dir of GSD_CORE_DIRS) {
    const src = join(root, dir)
    if (existsSync(src)) {
      await rm(join(dest, dir), { recursive: true, force: true })
      await cp(src, join(dest, dir), { recursive: true })
    }
  }
  // Copy root files (.gsd-runtime, VERSION)
  for (const file of GSD_CORE_ROOT_FILES) {
    const src = join(root, file)
    if (existsSync(src)) {
      await copyFile(src, join(dest, file))
    }
  }
  // Write .gsd-runtime as "opencode" (overwriting whatever was copied)
  await writeFile(join(dest, ".gsd-runtime"), "opencode", "utf-8")
  // Create scripts/ placeholder if missing (fixes command-roster.cjs require)
  const scriptsDir = join(dest, "scripts")
  if (!existsSync(scriptsDir)) {
    await mkdir(scriptsDir, { recursive: true })
  }
  return true
}

function hasGsdCore(projectDir?: string): boolean {
  // Check project-local first
  if (projectDir) {
    const localPath = join(projectDir, ".agents", "gsd-core", "bin", "gsd-tools.cjs")
    if (existsSync(localPath)) return true
  }
  // Fall back to global
  return existsSync(join(homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs"))
}

export async function initGsd(scope: "local" | "global") {
  const projectDir = process.cwd()
  const localDir = join(projectDir, ".agents", "skills")
  const globalDir = join(homedir(), ".agents", "skills")
  const targetDir = scope === "local" ? localDir : globalDir

  const skillsExist = await hasGsdSkills(targetDir)
  const coreExist = hasGsdCore(projectDir)

  if (skillsExist && coreExist) {
    return { installed: false, path: targetDir, coreInstalled: false }
  }

  const tempDir = await mkdtemp(join(tmpdir(), "gsd-install-"))
  try {
    let packageRoot: string | null = null
    try {
      await execAsync(`npm pack @opengsd/gsd-core@latest --pack-destination "${tempDir}"`)
      const tarballs = (await readdir(tempDir)).filter(f => f.endsWith(".tgz"))
      if (!tarballs[0]) throw new Error("No tarball downloaded")
      await execAsync(`tar -xzf "${join(tempDir, tarballs[0])}" -C "${tempDir}"`)
      packageRoot = join(tempDir, "package")
    } catch { /* fall through to git clone */ }

    if (!packageRoot || !existsSync(join(packageRoot, "skills"))) {
      const repoDir = join(tempDir, "repo")
      await execAsync(
        `git clone --single-branch --depth 1 https://github.com/open-gsd/gsd-core.git "${repoDir}"`
      )
      packageRoot = repoDir
    }

    if (!skillsExist) {
      const skillsSrc = join(packageRoot, "skills")
      if (existsSync(skillsSrc)) {
        await copySkillsFrom(skillsSrc, targetDir)
      }
    }
    const coreInstalled = !coreExist && await copyGsdCore(packageRoot, projectDir)
    if (coreInstalled) {
      await patchGsdForLocal(projectDir)
    }
    return { installed: !skillsExist, path: targetDir, coreInstalled }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function patchGsdForLocal(projectDir: string): Promise<void> {
  // Pass A: Patch SKILL.md execution_context paths
  const skillsDir = join(projectDir, ".agents", "skills")
  if (existsSync(skillsDir)) {
    const skillEntries = await readdir(skillsDir).catch(() => [])
    for (const entry of skillEntries) {
      if (!entry.startsWith("gsd")) continue
      const skillMd = join(skillsDir, entry, "SKILL.md")
      if (!existsSync(skillMd)) continue
      let content = await readFile(skillMd, "utf-8")
      let changed = false
      // Replace @~/.claude/gsd-core/ → @.agents/gsd-core/
      if (content.includes("@~/.claude/gsd-core/")) {
        content = content.replaceAll("@~/.claude/gsd-core/", "@.agents/gsd-core/")
        changed = true
      }
      // Replace @~/.codex/get-shit-done/ → @.agents/gsd-core/
      if (content.includes("@~/.codex/get-shit-done/")) {
        content = content.replaceAll("@~/.codex/get-shit-done/", "@.agents/gsd-core/")
        changed = true
      }
      if (changed) await writeFile(skillMd, content, "utf-8")
    }
  }

  // Pass B: Patch workflow bootstrap blocks (bash → PowerShell-compatible)
  const workflowsDir = join(projectDir, ".agents", "gsd-core", "workflows")
  if (!existsSync(workflowsDir)) return
  const workflowFiles = (await readdir(workflowsDir, { recursive: true }).catch(() => [])).filter(f => f.endsWith(".md"))
  const psBootstrap = `\`\`\`powershell
$GSD_TOOLS = ".agents\\gsd-core\\bin\\gsd-tools.cjs"
if (-not (Test-Path $GSD_TOOLS)) { $GSD_TOOLS = "$env:USERPROFILE\\.claude\\gsd-core\\bin\\gsd-tools.cjs" }
if (-not (Test-Path $GSD_TOOLS)) { $GSD_TOOLS = "$env:USERPROFILE\\.codex\\get-shit-done\\bin\\gsd-tools.cjs" }
if (-not (Test-Path $GSD_TOOLS)) { Write-Output '{"error":"gsd-tools not found"}'; exit 1 }
$INIT = node $GSD_TOOLS query init.new-project
if ($INIT -match "^@file:(.*)") { $INIT = Get-Content $Matches[1] -Raw }
$AGENT_SKILLS_RESEARCHER = node $GSD_TOOLS query agent-skills gsd-project-researcher
$AGENT_SKILLS_SYNTHESIZER = node $GSD_TOOLS query agent-skills gsd-research-synthesizer
$AGENT_SKILLS_ROADMAPPER = node $GSD_TOOLS query agent-skills gsd-roadmapper
\`\`\``

  for (const file of workflowFiles) {
    const filePath = join(workflowsDir, file)
    let content = await readFile(filePath, "utf-8")
    if (!content.includes("GSD_SHIM_NAME")) continue
    // Replace the bash block: from ```bash to the closing ``` after GSD_SHIM_NAME
    const bashStart = content.indexOf("```bash")
    if (bashStart === -1) continue
    // Find the closing ``` after the bash block
    let bashEnd = -1
    for (let i = bashStart + 7; i < content.length - 2; i++) {
      if (content[i] === "`" && content[i + 1] === "`" && content[i + 2] === "`") {
        bashEnd = i
        break
      }
    }
    if (bashEnd === -1) continue
    content = content.slice(0, bashStart) + psBootstrap + content.slice(bashEnd + 3)
    await writeFile(filePath, content, "utf-8")
  }
}

export async function runGsdCommand(command: string) {
  const { stdout, stderr } = await execAsync(`gsd ${command}`)
  return { stdout, stderr }
}

// ─── State Machine Integration ───────────────────────────────────────────────

interface ProjectState {
  activePhase: string
  activeMilestone?: string
  activeSlice?: string
  activeTask?: string
  completedMilestones: string[]
  completedSlices: string[]
  completedTasks: string[]
  lastUpdated: Date
}

interface RoadmapSlice {
  id: string
  title: string
  status: "pending" | "active" | "completed"
  risk: "low" | "medium" | "high"
  depends: string[]
}

interface PlanTask {
  id: string
  title: string
  status: "pending" | "active" | "completed"
  estimate: string
  mustHaves: string[]
  verification: string[]
  sliceId: string
}

/**
 * Parse STATE.md into structured state.
 */
async function parseState(statePath: string): Promise<ProjectState | null> {
  if (!existsSync(statePath)) return null
  const content = await Bun.file(statePath).text()

  const activeMilestone = content.match(/Active Milestone:\s*(.+)/)?.[1]?.trim()
  const activeSlice = content.match(/Active Slice:\s*(.+)/)?.[1]?.trim()
  const activeTask = content.match(/Active Task:\s*(.+)/)?.[1]?.trim()

  const completedMilestones = extractCheckboxes(content, "Completed Milestones")
  const completedSlices = extractCheckboxes(content, "Completed Slices")
  const completedTasks = extractCheckboxes(content, "Completed Tasks")

  return {
    activePhase: content.match(/Active Phase:\s*(.+)/)?.[1]?.trim() || "",
    activeMilestone,
    activeSlice,
    activeTask,
    completedMilestones,
    completedSlices,
    completedTasks,
    lastUpdated: new Date(),
  }
}

/**
 * Extract checkboxes from a section.
 */
function extractCheckboxes(content: string, section: string): string[] {
  const sectionRegex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = content.match(sectionRegex)
  if (!match) return []

  const checkboxes = match[1].match(/- \[x\] (.+)/g) || []
  return checkboxes.map(cb => cb.replace(/- \[x\] /, "").trim())
}

/**
 * Parse ROADMAP.md into slices.
 */
async function parseRoadmap(roadmapPath: string): Promise<RoadmapSlice[]> {
  if (!existsSync(roadmapPath)) return []
  const content = await Bun.file(roadmapPath).text()

  const slices: RoadmapSlice[] = []
  const sliceRegex = /^- \[([ x])\] \*\*(\w+):\s*(.+?)\*\*/gm
  let match

  while ((match = sliceRegex.exec(content)) !== null) {
    slices.push({
      id: match[2],
      title: match[3],
      status: match[1] === "x" ? "completed" : "pending",
      risk: "medium",
      depends: [],
    })
  }

  return slices
}

/**
 * Parse PLAN.md into tasks.
 */
async function parsePlan(planPath: string): Promise<PlanTask[]> {
  if (!existsSync(planPath)) return []
  const content = await Bun.file(planPath).text()

  const tasks: PlanTask[] = []
  const taskRegex = /^- \[([ x])\] \*\*(\w+):\s*(.+?)\*\*/gm
  let match

  while ((match = taskRegex.exec(content)) !== null) {
    tasks.push({
      id: match[2],
      title: match[3],
      status: match[1] === "x" ? "completed" : "pending",
      estimate: "",
      mustHaves: [],
      verification: [],
      sliceId: "",
    })
  }

  return tasks
}

/**
 * Get the next unit to work on.
 *
 * Priority:
 * 1. Active task
 * 2. Next pending task in active slice
 * 3. Next ready slice in active milestone
 * 4. Next milestone with satisfied dependencies
 * 5. null if all complete
 */
function getNextUnit(
  state: ProjectState,
  roadmap: RoadmapSlice[],
  plan: PlanTask[],
): { type: "milestone" | "slice" | "task"; id: string; milestoneId: string; sliceId?: string } | null {
  // 1. Active task
  if (state.activeTask) {
    const task = plan.find(t => t.id === state.activeTask && t.status === "pending")
    if (task) {
      return { type: "task", id: task.id, milestoneId: state.activeMilestone || "", sliceId: task.sliceId }
    }
  }

  // 2. Next pending task in active slice
  if (state.activeSlice) {
    const nextTask = plan.find(t => t.sliceId === state.activeSlice && t.status === "pending")
    if (nextTask) {
      return { type: "task", id: nextTask.id, milestoneId: state.activeMilestone || "", sliceId: state.activeSlice }
    }
  }

  // 3. Next ready slice in active milestone
  if (state.activeMilestone) {
    const nextSlice = roadmap.find(s => s.status === "pending" && s.depends.every(d =>
      state.completedSlices.includes(d)
    ))
    if (nextSlice) {
      return { type: "slice", id: nextSlice.id, milestoneId: state.activeMilestone }
    }
  }

  // 4. Next milestone
  const nextMilestone = roadmap.find(s => s.status === "pending" && s.depends.every(d =>
    state.completedMilestones.includes(d)
  ))
  if (nextMilestone) {
    return { type: "milestone", id: nextMilestone.id, milestoneId: nextMilestone.id }
  }

  // 5. All complete
  return null
}

/**
 * Render state back to STATE.md format.
 */
function renderState(state: ProjectState): string {
  const lines = [
    "# Project State",
    "",
    `Active Phase: ${state.activePhase}`,
    `Active Milestone: ${state.activeMilestone || ""}`,
    `Active Slice: ${state.activeSlice || ""}`,
    `Active Task: ${state.activeTask || ""}`,
    "",
    "## Completed Milestones",
    ...state.completedMilestones.map(m => `- [x] ${m}`),
    "",
    "## Completed Slices",
    ...state.completedSlices.map(s => `- [x] ${s}`),
    "",
    "## Completed Tasks",
    ...state.completedTasks.map(t => `- [x] ${t}`),
    "",
    `Last Updated: ${state.lastUpdated.toISOString()}`,
  ]

  return lines.join("\n")
}

/**
 * Persist state to STATE.md.
 */
async function persistState(state: ProjectState, statePath: string): Promise<void> {
  const content = renderState(state)
  await Bun.write(statePath, content)
}

/**
 * Update state after GSD execution.
 *
 * Call this after a GSD command completes to advance the state machine.
 */
export async function updateStateAfterExecution(projectDir: string): Promise<void> {
  const planningDir = join(projectDir, ".planning")
  const statePath = join(planningDir, "STATE.md")

  if (!existsSync(statePath)) return

  const state = await parseState(statePath)
  if (!state) return

  const roadmap = await parseRoadmap(join(planningDir, "ROADMAP.md"))
  const plan = await parsePlan(join(planningDir, "PLAN.md"))

  const nextUnit = getNextUnit(state, roadmap, plan)
  if (nextUnit) {
    state.activeMilestone = nextUnit.milestoneId
    state.activeSlice = nextUnit.sliceId
    state.activeTask = nextUnit.type === "task" ? nextUnit.id : undefined
    state.lastUpdated = new Date()
    await persistState(state, statePath)
  }
}

/**
 * Get a summary of the current project state.
 */
export async function getProjectStateSummary(projectDir: string): Promise<string> {
  const planningDir = join(projectDir, ".planning")
  const statePath = join(planningDir, "STATE.md")

  if (!existsSync(statePath)) {
    return "No .planning/STATE.md found. Run GSD workflow to initialize."
  }

  const state = await parseState(statePath)
  if (!state) return "Failed to parse STATE.md"

  const roadmap = await parseRoadmap(join(planningDir, "ROADMAP.md"))
  const plan = await parsePlan(join(planningDir, "PLAN.md"))

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

  return lines.join("\n")
}
