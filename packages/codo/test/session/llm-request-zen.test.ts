import { describe, expect, test } from "bun:test"
import { LLMRequestPrep } from "@/session/llm/request"

describe("zen user agent", () => {
  test("spoofs a real opencode release satisfying the free-tier gate (>=1.18.0)", () => {
    expect(LLMRequestPrep.ZEN_USER_AGENT.startsWith("opencode/")).toBe(true)
    const [major, minor] = LLMRequestPrep.ZEN_USER_AGENT.slice("opencode/".length).split(".").map(Number)
    expect(major > 1 || (major === 1 && minor >= 18)).toBe(true)
  })
})
