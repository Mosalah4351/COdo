import { describe, expect, test } from "bun:test"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { SecurityFindingTable } from "@codo-ai/core/security/sql"

const coreMigration = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../core/src/database/migration/20260807123904_security_finding.ts",
)
const coreSchemaGen = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../core/src/database/schema.gen.ts",
)
const codoReExport = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/storage/schema.ts")
const reportSkill = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/skill/sec-test/report/SKILL.md",
)

describe("security_finding table", () => {
  test("SecurityFindingTable module exports the sqliteTable", () => {
    expect(SecurityFindingTable).toBeDefined()
    const shape = SecurityFindingTable as unknown as Record<string, unknown>
    expect(shape.persona).toBeDefined()
    expect(shape.category).toBeDefined()
    expect(shape.location).toBeDefined()
    expect(shape.confidence).toBeDefined()
    expect(shape.severity).toBeDefined()
    expect(shape.status).toBeDefined()
    expect(shape.fingerprint).toBeDefined()
    expect(shape.project_id).toBeDefined()
    expect(shape.session_id).toBeDefined()
  })

  test("migration file creates the table with all expected columns", async () => {
    const text = await readFile(coreMigration, "utf-8")
    expect(text).toContain("CREATE TABLE")
    expect(text).toContain("security_finding")
    for (const col of [
      "id",
      "persona",
      "category",
      "location",
      "confidence",
      "severity",
      "finding",
      "evidence",
      "remediation",
      "status",
      "cvss_score",
      "cvss_vector",
      "epss_score",
      "fingerprint",
      "project_id",
      "session_id",
      "metadata",
      "time_created",
      "time_updated",
      "time_status_changed",
    ]) {
      // Generator escapes backticks; assert the column name appears adjacent to one.
      expect(text).toContain("`" + col)
    }
  })

  test("migration registers unique fingerprint+project index for dedup", async () => {
    const text = await readFile(coreMigration, "utf-8")
    expect(text).toContain("UNIQUE INDEX")
    expect(text).toContain("security_finding_fingerprint_project_idx")
  })

  test("schema.gen.ts contains the same CREATE TABLE statement", async () => {
    const text = await readFile(coreSchemaGen, "utf-8")
    expect(text).toContain("CREATE TABLE")
    expect(text).toContain("security_finding")
    expect(text).toContain("fk_security_finding_project_id_project_id_fk")
  })

  test("codo storage/schema.ts re-exports SecurityFindingTable", async () => {
    const text = await readFile(codoReExport, "utf-8")
    expect(text).toContain('SecurityFindingTable } from "@codo-ai/core/security/sql"')
  })
})

describe("sec-test:report skill persistence", () => {
  test("SKILL.md describes both the markdown source and the SQL projection", async () => {
    const text = await readFile(reportSkill, "utf-8")
    expect(text).toContain(".planning/security/findings/")
    expect(text).toContain("security_finding")
    expect(text).toContain("fingerprint")
    expect(text).toContain("project_id")
  })

  test("SKILL.md documents the status lifecycle constraints", async () => {
    const text = await readFile(reportSkill, "utf-8")
    expect(text).toContain("`fixed`")
    expect(text).toContain("`accepted-risk`")
    expect(text).toContain("`false-positive`")
    expect(text).toContain("scanner reran clean")
  })
})
