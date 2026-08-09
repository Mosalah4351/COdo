import { homedir } from "os"
import { join } from "path"
import { existsSync, readdirSync, copyFileSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from "fs"

const GSD_CORE_DIRS = ["bin", "templates", "references", "commands", "contexts", "workflows", "scripts"]
const GSD_CORE_ROOT_FILES = [".gsd-runtime", "VERSION"]

const PS_BOOTSTRAP = `\`\`\`powershell
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

function hasGsdSkills(dir: string): boolean {
  if (!existsSync(dir)) return false
  try {
    const entries = readdirSync(dir)
    return entries.some(e => e.startsWith("gsd"))
  } catch {
    return false
  }
}

function copySkillsFrom(source: string, target: string) {
  mkdirSync(target, { recursive: true })
  const entries = readdirSync(source)
  for (const entry of entries) {
    const skillMd = join(source, entry, "SKILL.md")
    if (!existsSync(skillMd)) continue
    const destDir = join(target, entry)
    mkdirSync(destDir, { recursive: true })
    copyFileSync(skillMd, join(destDir, "SKILL.md"))
  }
}

function copyGsdCoreFromGlobal(source: string, projectDir: string): boolean {
  const dest = join(projectDir, ".agents", "gsd-core")
  if (existsSync(join(dest, "bin", "gsd-tools.cjs"))) return false
  const gsdCore = join(source, "gsd-core")
  const root = existsSync(gsdCore) ? gsdCore : source
  mkdirSync(dest, { recursive: true })
  for (const dir of GSD_CORE_DIRS) {
    const src = join(root, dir)
    if (existsSync(src)) {
      rmSync(join(dest, dir), { recursive: true, force: true })
      cpSync(src, join(dest, dir), { recursive: true })
    }
  }
  for (const file of GSD_CORE_ROOT_FILES) {
    const src = join(root, file)
    if (existsSync(src)) {
      copyFileSync(src, join(dest, file))
    }
  }
  writeFileSync(join(dest, ".gsd-runtime"), "opencode", "utf-8")
  const scriptsDir = join(dest, "scripts")
  if (!existsSync(scriptsDir)) {
    mkdirSync(scriptsDir, { recursive: true })
  }
  return true
}

function patchGsdForLocal(projectDir: string) {
  const skillsDir = join(projectDir, ".agents", "skills")
  if (existsSync(skillsDir)) {
    let skillEntries: string[] = []
    try { skillEntries = readdirSync(skillsDir) } catch { /* ignore */ }
    for (const entry of skillEntries) {
      if (!entry.startsWith("gsd")) continue
      const skillMd = join(skillsDir, entry, "SKILL.md")
      if (!existsSync(skillMd)) continue
      let content = readFileSync(skillMd, "utf-8")
      let changed = false
      if (content.includes("@~/.claude/gsd-core/")) {
        content = content.replaceAll("@~/.claude/gsd-core/", "@.agents/gsd-core/")
        changed = true
      }
      if (content.includes("@~/.codex/get-shit-done/")) {
        content = content.replaceAll("@~/.codex/get-shit-done/", "@.agents/gsd-core/")
        changed = true
      }
      if (content.includes("@$HOME/.config/opencode/get-shit-done/")) {
        content = content.replaceAll("@$HOME/.config/opencode/get-shit-done/", "@.agents/gsd-core/")
        changed = true
      }
      if (content.includes("@$HOME/.config/opencode/")) {
        content = content.replaceAll("@$HOME/.config/opencode/", "@.agents/gsd-core/")
        changed = true
      }
      if (changed) writeFileSync(skillMd, content, "utf-8")
    }
  }

  const workflowsDir = join(projectDir, ".agents", "gsd-core", "workflows")
  if (!existsSync(workflowsDir)) return
  let allFiles: string[] = []
  try { allFiles = readdirSync(workflowsDir, { recursive: true }) as string[] } catch { /* ignore */ }
  const workflowFiles = allFiles.filter(f => f.endsWith(".md"))
  for (const file of workflowFiles) {
    const filePath = join(workflowsDir, file)
    let content = readFileSync(filePath, "utf-8")
    let changed = false

    // Replace all ```bash with ```powershell so the agent doesn't execute bash literally
    if (content.includes("```bash")) {
      content = content.replaceAll("```bash", "```powershell")
      changed = true
    }

    // Replace gsd-sdk command references
    if (content.includes("gsd-sdk query")) {
      content = content.replaceAll("gsd-sdk query", "node .agents/gsd-core/bin/gsd-tools.cjs query")
      changed = true
    }

    // Replace GSD_SHIM_NAME bootstrap blocks entirely with PS_BOOTSTRAP
    if (content.includes("_GSD_SHIM_NAME")) {
      const idx = content.indexOf("_GSD_SHIM_NAME")
      const fenceStart = content.lastIndexOf("```", idx)
      if (fenceStart !== -1 && idx - fenceStart < 200) {
        let fenceEnd = -1
        for (let i = fenceStart + 3; i < content.length - 2; i++) {
          if (content[i] === "`" && content[i + 1] === "`" && content[i + 2] === "`") {
            fenceEnd = i
            break
          }
        }
        if (fenceEnd !== -1) {
          content = content.slice(0, fenceStart) + PS_BOOTSTRAP + content.slice(fenceEnd + 3)
          changed = true
        }
      }
    }

    if (changed) writeFileSync(filePath, content, "utf-8")
  }
}

export function ensureGsdLocal(projectDir: string) {
  process.env.GSD_RUNTIME = "opencode"

  const workflowFile = join(homedir(), ".codo", "workflow.json")
  try {
    const raw = readFileSync(workflowFile, "utf-8")
    const wf = JSON.parse(raw)
    if (wf.workflow !== "gsd") return
  } catch {
    return
  }

  const localSkillsDir = join(projectDir, ".agents", "skills")
  const globalSkillsDir = join(homedir(), ".agents", "skills")
  const globalCoreDir = join(homedir(), ".claude", "gsd-core")
  const localCoreDir = join(projectDir, ".agents", "gsd-core")
  const skillsExist = hasGsdSkills(localSkillsDir)
  const coreExist = existsSync(join(localCoreDir, "bin", "gsd-tools.cjs"))

  if (!skillsExist) {
    try {
      if (hasGsdSkills(globalSkillsDir)) {
        copySkillsFrom(globalSkillsDir, localSkillsDir)
      }
    } catch (e) {
      console.error("[gsd-local] copySkillsFrom failed:", e)
    }
  }

  if (!coreExist) {
    try {
      copyGsdCoreFromGlobal(globalCoreDir, projectDir)
    } catch (e) {
      console.error("[gsd-local] copyGsdCoreFromGlobal failed:", e)
    }
  }

  try {
    patchGsdForLocal(projectDir)
  } catch (e) {
    console.error("[gsd-local] patchGsdForLocal failed:", e)
  }

  try {
    const planningDir = join(projectDir, ".planning")
    const configPath = join(planningDir, "config.json")
    if (!existsSync(configPath)) {
      mkdirSync(planningDir, { recursive: true })
      writeFileSync(configPath, JSON.stringify({ runtime: "opencode" }, null, 2), "utf-8")
    }
  } catch (e) {
    console.error("[gsd-local] config.json write failed:", e)
  }
}
