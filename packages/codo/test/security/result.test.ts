import { describe, expect, it } from "bun:test"
import { format, MARKER, parse } from "@/security/result"
import { secTestSkills } from "@/skill/sec-test-skills"
import { Sec } from "@/agent/sec"

describe("SEC-RESULT contract", () => {
  it("parses a complete result with counts", () => {
    const out = parse(
      `some prose\n${MARKER} skill=sec-test:code-audit status=complete findings=3 critical=1 high=2 doc=.planning/security/findings/x.md\nmore prose`,
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.skill).toBe("sec-test:code-audit")
    expect(out.result.status).toBe("complete")
    expect(out.result.findings).toBe(3)
    expect(out.result.critical).toBe(1)
    expect(out.result.high).toBe(2)
    expect(out.result.doc).toBe(".planning/security/findings/x.md")
  })

  it("parses a blocked result and keeps the reason", () => {
    const out = parse(`${MARKER} skill=sec-test:pentest status=blocked reason=target-not-in-scope`)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.status).toBe("blocked")
    expect(out.result.reason).toBe("target-not-in-scope")
    expect(out.result.findings).toBeUndefined()
  })

  it("takes the LAST marker so a quoted example cannot shadow the real result", () => {
    const out = parse(
      [
        `I will end with ${MARKER} skill=sec-test:pentest status=complete findings=0`,
        `...work...`,
        `${MARKER} skill=sec-test:pentest status=blocked reason=expired`,
      ].join("\n"),
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.status).toBe("blocked")
    expect(out.result.reason).toBe("expired")
  })

  it("rejects a message with no marker", () => {
    const out = parse("I audited the code and found three things.")
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.reason).toBe("no-marker")
  })

  it("rejects an unregistered skill name", () => {
    const out = parse(`${MARKER} skill=sec-test:not-a-real-skill status=complete`)
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.reason).toBe("unknown-skill")
  })

  it("rejects a status outside the vocabulary", () => {
    const out = parse(`${MARKER} skill=sec-test:code-audit status=done`)
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.reason).toBe("unknown-status")
  })

  it("round-trips through format", () => {
    const line = format({
      skill: "sec-test:test-plan",
      status: "complete",
      findings: 2,
      critical: 0,
      high: 1,
      doc: ".planning/testing/x-plan.md",
    })
    const out = parse(line)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.skill).toBe("sec-test:test-plan")
    expect(out.result.high).toBe(1)
  })

  it("ignores placeholder counts instead of coercing them to a number", () => {
    // Skills document the contract with <n> placeholders; a persona that leaves
    // one in must not be read as a real count.
    const out = parse(`${MARKER} skill=sec-test:code-audit status=complete findings=<n> critical=<n>`)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.findings).toBeUndefined()
    expect(out.result.critical).toBeUndefined()
  })
})

describe("marker adoption", () => {
  it("every bundled skill documents the SEC-RESULT contract", () => {
    const missing = secTestSkills.filter((s) => !s.content.includes(MARKER)).map((s) => s.name)
    expect(missing).toEqual([])
  })

  it("no skill still uses a legacy prose marker", () => {
    const legacy = [
      "## CODE AUDIT COMPLETE",
      "## PENTEST COMPLETE",
      "## PENTEST BLOCKED",
      "## POSTURE REPORT COMPLETE",
      "## PIPELINE HARDEN COMPLETE",
      "## CONTAINER SCAN COMPLETE",
      "## SBOM COMPLETE",
      "## SCOPE AUTHORED",
      "## CONTEXT COMPLETE",
      "## RESPONSE ENGAGED",
      "## THREAT MODEL COMPLETE",
    ]
    const offenders = secTestSkills.flatMap((s) =>
      legacy.filter((m) => s.content.includes(m)).map((m) => `${s.name}: ${m}`),
    )
    expect(offenders).toEqual([])
  })

  it("every persona prompt ends on the SEC-RESULT contract", () => {
    for (const spec of Sec.SEC_AGENT_SPECS) {
      expect(spec.prompt).toContain(MARKER)
    }
  })

  it("each skill's documented marker names that same skill", () => {
    // Catches copy-paste drift: a skill that reports another skill's name would
    // make the orchestrator route on the wrong identity.
    for (const skill of secTestSkills) {
      const lines = skill.content.split("\n").filter((l) => l.includes(MARKER) && l.includes("skill="))
      for (const line of lines) {
        const named = /skill=(\S+)/.exec(line)?.[1]
        if (named === undefined || named.startsWith("<")) continue
        expect(named).toBe(skill.name)
      }
    }
  })
})
