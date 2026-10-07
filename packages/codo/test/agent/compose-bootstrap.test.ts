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
    expect(text).toContain("NO EXCEPTIONS")
    expect(text).toContain("FORBIDDEN from inferring the answer from phrasing")
    expect(text).toMatch(/ask.*question.*tool/i)
  })

  it("maps choices to slash commands the user must run themselves", async () => {
    const text = await readFile(promptPath, "utf-8")
    // Accept either /gsd-new-project or /gsd:new-project — both appear in the gate text.
    expect(text).toMatch(/\/gsd[-:]new-project/)
    expect(text).toMatch(/\/gsd[-:]onboard/)
  })

  it("explicitly forbids summoning researchers or planners directly from the gate", async () => {
    const text = await readFile(promptPath, "utf-8")
    const gateStart = text.indexOf("Bootstrap gate")
    const gateEnd = text.indexOf("## GSD Flow Navigation")
    const gateBlock = text.slice(gateStart, gateEnd)
    // Prohibition on dispatching researchers from the gate must be literal.
    expect(gateBlock).toContain("Do NOT dispatch gsd-project-researcher")
    // No affirmative instruction to spawn them.
    expect(gateBlock).not.toMatch(/Summon gsd-roadmapper/i)
    expect(gateBlock).not.toMatch(/dispatch gsd-codebase-mapper/i)
  })

  it("forbids summon attempts entirely and hands off to the user immediately", async () => {
    const text = await readFile(promptPath, "utf-8")
    // Explicit prohibition on workarounds.
    expect(text).toContain("no `command` tool")
    expect(text).toContain("FORBIDDEN from attempting to invoke it yourself")
    // Hand-off is immediate.
    expect(text).toContain("hand off immediately")
    // The `codo run` command may appear only inside a negation (e.g. "no `bash` → `codo run ...`"),
    // never as an affirmative instruction.
    expect(text).not.toMatch(/Try `codo run/)
    expect(text).not.toMatch(/run `codo run/)
    expect(text).toMatch(/no `bash` → `codo run/)
  })

  it("routes the user to the slash commands after the gate resolves", async () => {
    const text = await readFile(promptPath, "utf-8")
    expect(text).toMatch(/Run `\/gsd[-:]new-project` in COdo/)
    expect(text).toMatch(/Run `\/gsd[-:]onboard` in COdo/)
  })
})
