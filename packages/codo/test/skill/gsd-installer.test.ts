import { describe, expect, test } from "bun:test"
import { transformAgent, transformCommand, scopePaths, GSD_VERSION } from "../../src/skill/gsd-installer"

const SAMPLE_AGENT = `---
name: gsd-planner
description: Planner agent
tools: Read, Write, Edit, Bash, Glob, Grep, Skill, WebFetch, mcp__context7__*
color: green
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
---

<role>You are a GSD planner.</role>
`

describe("gsd-installer transformAgent", () => {
  test("keeps the body untouched", () => {
    const out = transformAgent(SAMPLE_AGENT)
    expect(out).toContain("<role>You are a GSD planner.</role>")
  })

  test("converts PascalCase tool CSV into a YAML map with lowercase opencode tool names", () => {
    const out = transformAgent(SAMPLE_AGENT)
    expect(out).toContain("tools:")
    expect(out).toContain("read: true")
    expect(out).toContain("write: true")
    expect(out).toContain("edit: true")
    expect(out).toContain("bash: true")
    expect(out).toContain("glob: true")
    expect(out).toContain("grep: true")
    expect(out).toContain("skill: true")
    expect(out).toContain("webfetch: true")
    expect(out).toContain("mcp__context7__*: true")
    expect(out).not.toContain("Read:")
  })

  test("converts color names to hex", () => {
    const out = transformAgent(SAMPLE_AGENT)
    expect(out).toContain('color: "#008000"')
  })

  test("leaves hex colors alone", () => {
    const src = `---\nname: gsd-x\ncolor: "#abcdef"\n---\nbody\n`
    expect(transformAgent(src)).toContain('color: "#abcdef"')
  })

  test("strips hooks block", () => {
    const out = transformAgent(SAMPLE_AGENT)
    expect(out).not.toContain("hooks:")
    expect(out).not.toContain("PostToolUse")
  })

  test("adds mode: subagent when absent", () => {
    expect(transformAgent(SAMPLE_AGENT)).toContain('mode: "subagent"')
  })

  test("keeps existing explicit mode", () => {
    const src = `---\nname: x\nmode: primary\n---\nbody\n`
    expect(transformAgent(src)).toContain('mode: "primary"')
  })

  test("passes through non-frontmatter content unchanged", () => {
    const body = "no frontmatter here\n"
    expect(transformAgent(body)).toBe(body)
  })
})

describe("gsd-installer transformCommand", () => {
  test("rewrites /gsd:<x> to /gsd-<x>", () => {
    const src = "Use /gsd:plan-phase then /gsd:execute-phase"
    expect(transformCommand(src)).toContain("/gsd-plan-phase")
    expect(transformCommand(src)).toContain("/gsd-execute-phase")
    expect(transformCommand(src)).not.toContain("/gsd:")
  })

  test("is case-insensitive for the prefix", () => {
    expect(transformCommand("/GSD:Plan-Phase")).toBe("/gsd-Plan-Phase")
  })

  test("leaves non-gsd commands alone", () => {
    const src = "/init and /workflow are unchanged"
    expect(transformCommand(src)).toBe(src)
  })
})

describe("gsd-installer scopePaths", () => {
  test("local scope installs under <project>/.codo/gsd", () => {
    const p = scopePaths("local", "D:/work/myproj")
    expect(p.installRoot.replaceAll("\\", "/")).toBe("D:/work/myproj/.codo/gsd")
  })

  test("global scope installs under the user config gsd dir", () => {
    const p = scopePaths("global", "D:/work/myproj")
    // Global.Path.config on win32 is %APPDATA%/codo; on POSIX ~/.config/codo
    expect(p.installRoot).toMatch(/codo[\\/]gsd$/)
    expect(p.installRoot).not.toContain("myproj")
  })

  test("cache is shared across scopes and pinned to GSD_VERSION", () => {
    const local = scopePaths("local", "D:/work/x")
    const globalP = scopePaths("global", "D:/work/x")
    expect(local.cache).toBe(globalP.cache)
    expect(local.extractedRoot).toContain(GSD_VERSION)
  })
})

describe("gsd-installer mirrorToAgentsSkills", () => {
  test("writes one SKILL.md per gsd-* command to both user-skill roots", async () => {
    const fs = await import("fs/promises")
    const os = await import("os")
    const path = await import("path")
    const { mirrorToAgentsSkills, AGENTS_SKILLS_ROOT } = await import("../../src/skill/gsd-installer")
    const { Global } = await import("@codo-ai/core/global")

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "gsd-mirror-"))
    const commandsDir = path.join(tmp, "commands")
    await fs.mkdir(commandsDir, { recursive: true })
    await fs.writeFile(path.join(commandsDir, "gsd-new-project.md"), "---\ndescription: spawn new project\n---\nbody A", "utf-8")
    await fs.writeFile(path.join(commandsDir, "gsd-onboard.md"), "---\ndescription: onboard existing\n---\nbody B", "utf-8")
    await fs.writeFile(path.join(commandsDir, "not-gsd.md"), "skip me", "utf-8")

    const written = await mirrorToAgentsSkills(tmp)

    const codo = path.join(Global.Path.home, ".codo", "skills")
    const agents = AGENTS_SKILLS_ROOT
    const expectedNew = await fs.readFile(path.join(agents, "gsd-new-project", "SKILL.md"), "utf-8")
    const expectedOld = await fs.readFile(path.join(agents, "gsd-onboard", "SKILL.md"), "utf-8")
    const expectedCodo = await fs.readFile(path.join(codo, "gsd-new-project", "SKILL.md"), "utf-8")
    expect(expectedNew).toContain("spawn new project")
    expect(expectedOld).toContain("onboard existing")
    expect(expectedCodo).toContain("spawn new project")
    // not-gsd.md is NOT mirrored (only gsd-prefixed commands)
    await expect(fs.readFile(path.join(agents, "not-gsd", "SKILL.md"), "utf-8")).rejects.toThrow()
    // 2 commands × 2 roots = 4 fresh writes
    expect(written).toBe(4)

    // Second run is idempotent (same content → no rewrite)
    const second = await mirrorToAgentsSkills(tmp)
    expect(second).toBe(0)
  })

  test("skips when commands dir missing", async () => {
    const fs = await import("fs/promises")
    const os = await import("os")
    const path = await import("path")
    const { mirrorToAgentsSkills } = await import("../../src/skill/gsd-installer")
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "gsd-mirror-empty-"))
    expect(await mirrorToAgentsSkills(tmp)).toBe(0)
  })
})
