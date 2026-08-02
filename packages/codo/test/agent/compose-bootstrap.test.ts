import { describe, expect, it } from "bun:test"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const promptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/agent/prompt/compose.txt",
)

describe("compose bootstrap gate", () => {
  it("is mandatory and never inferred", async () => {
    const text = await readFile(promptPath, "utf-8")
    // Cannot be skipped based on phrasing
    expect(text).toContain("NO EXCEPTIONS")
    expect(text).toContain("FORBIDDEN from inferring the answer from phrasing")
    // Asked via question tool
    expect(text).toMatch(/ask.*question.*tool/i)
  })

  it("maps choices to the exact upstream command names", async () => {
    const text = await readFile(promptPath, "utf-8")
    expect(text).toContain("/gsd-new-project")
    expect(text).toContain("/gsd-onboard")
  })

  it("does NOT allow fallback to a chain of subagent dispatches when summon fails", async () => {
    const text = await readFile(promptPath, "utf-8")
    const gateStart = text.indexOf("Bootstrap gate")
    const gateEnd = text.indexOf("## GSD Flow Navigation")
    const gateBlock = text.slice(gateStart, gateEnd)
    // The chain language from prior revisions must NOT live in the gate anymore
    expect(gateBlock).not.toContain("gsd-project-researcher")
    expect(gateBlock).not.toContain("gsd-roadmapper")
    expect(gateBlock).not.toContain("gsd-codebase-mapper")
  })

  it("attempts literal summon via `codo run` first", async () => {
    const text = await readFile(promptPath, "utf-8")
    expect(text).toContain("codo run '/gsd-new-project'")
    expect(text).toContain("codo run '/gsd-onboard'")
  })

  it("on failure tells the user to run the command, not silently substitutes", async () => {
    const text = await readFile(promptPath, "utf-8")
    expect(text).toContain("Run `/gsd-new-project` in COdo")
    expect(text).toContain("Run `/gsd-onboard` in COdo")
  })
})
