import { describe, expect, test } from "bun:test"
import { Command } from "../../src/command"

describe("Command.Default.WORKFLOW", () => {
  test("is registered under the name 'workflow'", () => {
    expect(Command.Default.WORKFLOW).toBe("workflow")
  })

  test("shares the spot with init, review, and goal", () => {
    expect(Command.Default.INIT).toBe("init")
    expect(Command.Default.REVIEW).toBe("review")
    expect(Command.Default.GOAL).toBe("goal")
  })
})

describe("workflow command arguments", () => {
  // The handler parses "<workflow> [scope]" via a simple whitespace split on input.arguments.
  test("bare invocation has no arg", () => {
    const m = "".match(/^(\S+)?\s*(\S+)?/)
    expect(m?.[1]).toBeUndefined()
  })

  test("gsd alone parses scope as undefined", () => {
    const m = "gsd".match(/^(\S+)?\s*(\S+)?/)
    expect(m?.[1]).toBe("gsd")
    expect(m?.[2]).toBeUndefined()
  })

  test("gsd local picks local scope", () => {
    const m = "gsd local".match(/^(\S+)?\s*(\S+)?/)
    expect(m?.[1]!.toLowerCase()).toBe("gsd")
    expect(m?.[2]!.toLowerCase()).toBe("local")
  })

  test("gsd global picks global scope", () => {
    const m = "gsd global".match(/^(\S+)?\s*(\S+)?/)
    expect(m?.[2]!.toLowerCase()).toBe("global")
  })

  test("unknown workflow is reported", () => {
    const m = "speckit".match(/^(\S+)?\s*(\S+)?/)
    expect(m?.[1]).toBe("speckit")
    expect(["gsd", "default", "vibe"]).not.toContain(m?.[1]!.toLowerCase())
  })
})
