import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { forceTerminalCleanup, resetTerminalCleanupForTests, TERMINAL_MOUSE_OFF_SEQUENCE } from "../src/terminal-cleanup"

let stdoutSpy: ReturnType<typeof spyOn>
let stderrSpy: ReturnType<typeof spyOn>
let stdoutCalls: string[]
let stderrCalls: string[]

beforeEach(() => {
  resetTerminalCleanupForTests()
  stdoutCalls = []
  stderrCalls = []
  stdoutSpy = spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdoutCalls.push(String(chunk))
    return true
  })
  stderrSpy = spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderrCalls.push(String(chunk))
    return true
  })
})

afterEach(() => {
  stdoutSpy.mockRestore()
  stderrSpy.mockRestore()
})

test("writes the off sequence to both stdout and stderr", () => {
  forceTerminalCleanup()
  expect(stdoutCalls).toHaveLength(1)
  expect(stderrCalls).toHaveLength(1)
  expect(stdoutCalls[0]).toBe(TERMINAL_MOUSE_OFF_SEQUENCE)
  expect(stderrCalls[0]).toBe(TERMINAL_MOUSE_OFF_SEQUENCE)
})

test("covers every mouse-tracking variant", () => {
  forceTerminalCleanup()
  for (const code of ["\x1b[?1049l", "\x1b[?1000l", "\x1b[?1002l", "\x1b[?1003l", "\x1b[?1006l", "\x1b[?1015l", "\x1b[?1016l"]) {
    expect(TERMINAL_MOUSE_OFF_SEQUENCE).toContain(code)
    expect(stdoutCalls[0]).toContain(code)
  }
})

test("is idempotent — a second call writes nothing", () => {
  forceTerminalCleanup()
  forceTerminalCleanup()
  forceTerminalCleanup()
  expect(stdoutCalls).toHaveLength(1)
  expect(stderrCalls).toHaveLength(1)
})

test("silently swallows write failures", () => {
  stdoutSpy.mockRestore()
  stderrSpy.mockRestore()
  stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => {
    throw new Error("EPIPE")
  })
  stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => {
    throw new Error("EPIPE")
  })
  expect(() => forceTerminalCleanup()).not.toThrow()
})

test("resetTerminalCleanupForTests allows re-run", () => {
  forceTerminalCleanup()
  expect(stdoutCalls).toHaveLength(1)
  resetTerminalCleanupForTests()
  forceTerminalCleanup()
  expect(stdoutCalls).toHaveLength(2)
})
