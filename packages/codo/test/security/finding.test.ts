import { describe, expect, it } from "bun:test"
import { fingerprintFinding, validateFinding, FindingInput } from "@/security/finding"
import { Schema } from "effect"

const base = {
  persona: "sec-appsec",
  category: "A05-injection",
  location: "src/api/users.ts:42",
  evidence: `db.query("SELECT * FROM users WHERE id = " + req.params.id)`,
}

describe("finding fingerprint", () => {
  it("is a 128-bit hex digest, not a 32-bit hash", () => {
    // The unique index is on (project_id, fingerprint), so a colliding pair
    // would silently up-sert onto one row and drop a distinct finding. The
    // original implementation was a 32-bit FNV-1a mislabeled as sha1.
    const fp = fingerprintFinding(base)
    expect(fp).toMatch(/^[0-9a-f]{32}$/)
  })

  it("is stable across calls", () => {
    expect(fingerprintFinding(base)).toBe(fingerprintFinding(base))
  })

  it("changes when any identity component changes", () => {
    const fp = fingerprintFinding(base)
    expect(fingerprintFinding({ ...base, persona: "sec-pentest" })).not.toBe(fp)
    expect(fingerprintFinding({ ...base, category: "A01-access-control" })).not.toBe(fp)
    expect(fingerprintFinding({ ...base, location: "src/api/users.ts:43" })).not.toBe(fp)
    expect(fingerprintFinding({ ...base, evidence: "something else entirely" })).not.toBe(fp)
  })

  it("normalizes volatile tokens so a re-scan dedups instead of duplicating", () => {
    const first = fingerprintFinding({ ...base, evidence: "failed at 2026-08-13T04:15:00Z in request a1b2c3d4e5" })
    const second = fingerprintFinding({ ...base, evidence: "failed at 2026-08-14T09:02:11Z in request 99887766aabb" })
    expect(first).toBe(second)
  })

  it("normalizes whitespace and case", () => {
    expect(fingerprintFinding({ ...base, evidence: "  SELECT   *  FROM x  " })).toBe(
      fingerprintFinding({ ...base, evidence: "select * from x" }),
    )
  })

  it("does not collapse genuinely different evidence", () => {
    expect(fingerprintFinding({ ...base, evidence: "SELECT * FROM users" })).not.toBe(
      fingerprintFinding({ ...base, evidence: "SELECT * FROM sessions" }),
    )
  })
})

describe("FindingInput contract", () => {
  const valid = {
    category: "CWE-798",
    location: "src/config.ts:10",
    confidence: "high",
    severity: "critical",
    finding: "hardcoded credential",
    evidence: `const key = "AKIAIOSFODNN7EXAMPLE"`,
    remediation: "move to environment configuration",
  }

  it("accepts a minimal finding and defaults status at the tool layer", () => {
    const decoded = Schema.decodeUnknownSync(FindingInput)(valid)
    expect(decoded.status).toBeUndefined()
  })

  it("rejects an out-of-vocabulary severity", () => {
    // A stale prompt emitting "warning" must fail before reaching SQLite.
    expect(() => Schema.decodeUnknownSync(FindingInput)({ ...valid, severity: "warning" })).toThrow()
  })

  it("rejects an out-of-vocabulary confidence", () => {
    expect(() => Schema.decodeUnknownSync(FindingInput)({ ...valid, confidence: "certain" })).toThrow()
  })

  it("rejects an out-of-vocabulary status", () => {
    expect(() => Schema.decodeUnknownSync(FindingInput)({ ...valid, status: "wontfix" })).toThrow()
  })

  it("does not let a persona supply its own id or fingerprint", () => {
    const decoded = Schema.decodeUnknownSync(FindingInput)({
      ...valid,
      id: "fin_attacker_chosen",
      fingerprint: "deadbeef",
    }) as Record<string, unknown>
    expect(decoded.id).toBeUndefined()
    expect(decoded.fingerprint).toBeUndefined()
  })

  it("requires evidence, since it feeds the fingerprint", () => {
    const { evidence, ...withoutEvidence } = valid
    expect(() => Schema.decodeUnknownSync(FindingInput)(withoutEvidence)).toThrow()
  })
})

describe("validateFinding", () => {
  it("requires the runtime-assigned fields on the full row", () => {
    expect(() =>
      validateFinding({
        category: "CWE-798",
        location: "src/config.ts:10",
        confidence: "high",
        severity: "critical",
        finding: "x",
        evidence: "y",
        remediation: "z",
        status: "open",
      }),
    ).toThrow()
  })

  it("accepts a complete row", () => {
    const row = validateFinding({
      persona: "sec-appsec",
      category: "CWE-798",
      location: "src/config.ts:10",
      confidence: "high",
      severity: "critical",
      finding: "x",
      evidence: "y",
      remediation: "z",
      status: "open",
      fingerprint: "abc",
      project_id: "prj_1",
    })
    expect(row.persona).toBe("sec-appsec")
    expect(row.status).toBe("open")
  })
})
