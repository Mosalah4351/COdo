import { describe, expect, it } from "bun:test"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { secTestSkills, SEC_TEST_SKILL_NAMES, isSecTestSkill } from "../../src/skill/sec-test-skills"

const agentPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/agent/agent.ts")

// Registry order after the compose entry:
//   sec-test → sec-architect → sec-appsec → sec-devsecops → sec-pentest → sec-secops → general
async function registryBlock(name: string, nextNames: string[]) {
  const text = await readFile(agentPath, "utf-8")
  const start = text.indexOf(`"${name}": {`)
  expect(start).toBeGreaterThan(-1)
  const ends = nextNames
    .flatMap((n) => [text.indexOf(`"${n}": {`), text.indexOf(`${n}: {`)])
    .filter((i) => i > start)
    .sort((a, b) => a - b)
  const end = ends.length > 0 ? ends[0] : text.length
  return text.slice(start, end)
}

describe("sec-test agent registry", () => {
  it("imports all six sec prompts", async () => {
    const text = await readFile(agentPath, "utf-8")
    for (const p of ["SEC_TEST", "SEC_ARCHITECT", "SEC_APPSEC", "SEC_DEVSECOPS", "SEC_PENTEST", "SEC_SECOPS"]) {
      expect(text).toContain(`PROMPT_${p}`)
    }
  })

  it("registers sec-test as a primary native agent", async () => {
    const block = await registryBlock("sec-test", ["sec-architect"])
    expect(block).toContain('mode: "primary"')
    expect(block).toContain("native: true")
    expect(block).toContain("PROMPT_SEC_TEST")
  })

  it("registers the five personas as subagents", async () => {
    const order = ["sec-architect", "sec-appsec", "sec-devsecops", "sec-pentest", "sec-secops"]
    for (let i = 0; i < order.length; i++) {
      const block = await registryBlock(order[i], [...order.slice(i + 1), "general"])
      expect(block).toContain('mode: "subagent"')
      expect(block).toContain("native: true")
    }
  })

  it("sec-pentest permission is interactively gated (ask) for invasive scanners", async () => {
    const block = await registryBlock("sec-pentest", ["sec-secops"])
    expect(block).toContain('"nmap*"')
    expect(block).toContain('"nikto*"')
    expect(block).toContain('"nuclei*"')
    expect(block).toContain("ask")
    expect(block).toContain("external_directory")
  })

  it("sec-pentest hard-denies full active scanners by default", async () => {
    const block = await registryBlock("sec-pentest", ["sec-secops"])
    expect(block).toContain('"zap*"')
    expect(block).toContain('"sqlmap*"')
    expect(block).toContain("deny")
  })

  it("read-only personas allow writes only under .planning/security", async () => {
    const order = ["sec-architect", "sec-appsec", "sec-devsecops"]
    for (let i = 0; i < order.length; i++) {
      const block = await registryBlock(order[i], [...order.slice(i + 1), "sec-pentest", "sec-secops", "general"])
      expect(block).toContain(".planning")
      expect(block).toContain("security")
      expect(block).toContain("edit:")
    }
  })
})

describe("sec-test skills", () => {
  it("registers twenty-three bundled skills", () => {
    expect(secTestSkills).toHaveLength(23)
  })

  it("uses sec-test: prefix for all names", () => {
    for (const s of secTestSkills) expect(s.name.startsWith("sec-test:")).toBe(true)
  })

  it("indexes every exported skill by SEC_TEST_SKILL_NAMES", () => {
    expect(SEC_TEST_SKILL_NAMES.size).toBe(23)
    for (const s of secTestSkills) expect(SEC_TEST_SKILL_NAMES.has(s.name)).toBe(true)
  })

  it("isSecTestSkill is prefix-based", () => {
    expect(isSecTestSkill("sec-test:code-audit")).toBe(true)
    expect(isSecTestSkill("sec-test:pentest")).toBe(true)
    expect(isSecTestSkill("compose:plan")).toBe(false)
    expect(isSecTestSkill("self-extend")).toBe(false)
  })

  it("each skill content includes its frontmatter name", () => {
    for (const s of secTestSkills) expect(s.content).toContain(`name: ${s.name}`)
  })
})
