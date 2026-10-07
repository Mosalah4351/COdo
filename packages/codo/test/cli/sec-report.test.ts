import { describe, expect, it } from "bun:test"
import { Effect, Layer } from "effect"
import { eq, and, gte } from "drizzle-orm"
import { Database } from "@codo-ai/core/database/database"
import { ProjectTable } from "@codo-ai/core/project/sql"
import { SessionTable } from "@codo-ai/core/session/sql"
import { SecurityFindingTable } from "@codo-ai/core/security/sql"
import { FSUtil } from "@codo-ai/core/fs-util"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { Truncate } from "@/tool/truncate"
import { Agent } from "@/agent/agent"
import { testEffect } from "../lib/effect"
import { mkdtempSync } from "fs"
import path from "path"
import os from "os"

let testCounter = 0

const dbDir = mkdtempSync(path.join(os.tmpdir(), "codo-sec-report-db-"))
const dbPath = path.join(dbDir, "test.db")

const it = testEffect(
  Layer.mergeAll(
    Database.layerFromPath(dbPath),
    FSUtil.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
  ),
)

function makeIds() {
  const n = ++testCounter
  return { projectID: `prj_rpt-${n}`, sessionID: `ses_rpt-${n}` }
}

const seedProject = (projectID: string, sessionID: string) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    yield* db
      .insert(ProjectTable)
      .values({
        id: projectID,
        worktree: "/tmp/test",
        sandboxes: ["/tmp/test"],
        time_created: Date.now(),
        time_updated: Date.now(),
      })
      .onConflictDoNothing()
    yield* db
      .insert(SessionTable)
      .values({
        id: sessionID,
        project_id: projectID,
        slug: "test-session",
        directory: "/tmp/test",
        title: "Test Session",
        version: "2",
        cost: 0,
        tokens_input: 0,
        tokens_output: 0,
        tokens_reasoning: 0,
        tokens_cache_read: 0,
        tokens_cache_write: 0,
        time_created: Date.now(),
        time_updated: Date.now(),
      })
      .onConflictDoNothing()
  })

const insertFinding = (
  projectID: string,
  sessionID: string,
  overrides: Partial<{ severity: string; status: string; category: string; location: string; finding: string }> = {},
) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const now = Date.now()
    yield* db
      .insert(SecurityFindingTable)
      .values({
        id: `fin_${Math.random().toString(36).slice(2, 10)}`,
        persona: "sec-appsec",
        category: overrides.category ?? "CWE-798",
        location: overrides.location ?? "src/config.ts:10",
        confidence: "high",
        severity: (overrides.severity ?? "critical") as any,
        finding: overrides.finding ?? "hardcoded credential",
        evidence: 'const key = "AKIAIOSFODNN7EXAMPLE"',
        remediation: "move to env config",
        status: (overrides.status ?? "open") as any,
        fingerprint: `fp_${Math.random().toString(36).slice(2, 10)}`,
        project_id: projectID,
        session_id: sessionID,
        time_created: now,
        time_updated: now,
        time_status_changed: now,
      })
      .onConflictDoNothing()
  })

const queryFindings = (projectID: string) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    return yield* db
      .select()
      .from(SecurityFindingTable)
      .where(eq(SecurityFindingTable.project_id, projectID))
      .all()
      .pipe(Effect.orDie)
  })

describe("sec report", () => {
  it.effect("returns all findings for project", () =>
    Effect.gen(function* () {
      const { projectID, sessionID } = makeIds()
      yield* seedProject(projectID, sessionID)
      yield* insertFinding(projectID, sessionID, { severity: "critical" })
      yield* insertFinding(projectID, sessionID, { severity: "medium" })

      const rows = yield* queryFindings(projectID)
      expect(rows.length).toBe(2)
      const severities = rows.map((r) => r.severity).sort()
      expect(severities).toEqual(["critical", "medium"])
    }),
  )

  it.effect("filters by status", () =>
    Effect.gen(function* () {
      const { projectID, sessionID } = makeIds()
      yield* seedProject(projectID, sessionID)
      yield* insertFinding(projectID, sessionID, { status: "open" })
      yield* insertFinding(projectID, sessionID, { status: "fixed" })

      const { db } = yield* Database.Service
      const openRows = yield* db
        .select()
        .from(SecurityFindingTable)
        .where(and(eq(SecurityFindingTable.project_id, projectID), eq(SecurityFindingTable.status, "open")))
        .all()
        .pipe(Effect.orDie)

      expect(openRows.length).toBe(1)
      expect(openRows[0].status).toBe("open")
    }),
  )

  it.effect("filters by since timestamp", () =>
    Effect.gen(function* () {
      const { projectID, sessionID } = makeIds()
      yield* seedProject(projectID, sessionID)
      const now = Date.now()
      yield* insertFinding(projectID, sessionID, { severity: "critical" })

      const { db } = yield* Database.Service
      const recentRows = yield* db
        .select()
        .from(SecurityFindingTable)
        .where(and(eq(SecurityFindingTable.project_id, projectID), gte(SecurityFindingTable.time_created, now - 1000)))
        .all()
        .pipe(Effect.orDie)
      expect(recentRows.length).toBe(1)

      const futureRows = yield* db
        .select()
        .from(SecurityFindingTable)
        .where(and(eq(SecurityFindingTable.project_id, projectID), gte(SecurityFindingTable.time_created, now + 10000)))
        .all()
        .pipe(Effect.orDie)
      expect(futureRows.length).toBe(0)
    }),
  )

  it.effect("empty project returns no findings", () =>
    Effect.gen(function* () {
      const { projectID, sessionID } = makeIds()
      yield* seedProject(projectID, sessionID)
      const rows = yield* queryFindings(projectID)
      expect(rows.length).toBe(0)
    }),
  )

  it.effect("severity groups correctly", () =>
    Effect.gen(function* () {
      const { projectID, sessionID } = makeIds()
      yield* seedProject(projectID, sessionID)
      yield* insertFinding(projectID, sessionID, { severity: "critical" })
      yield* insertFinding(projectID, sessionID, { severity: "critical" })
      yield* insertFinding(projectID, sessionID, { severity: "high" })
      yield* insertFinding(projectID, sessionID, { severity: "low" })
      yield* insertFinding(projectID, sessionID, { severity: "info" })

      const rows = yield* queryFindings(projectID)
      expect(rows.length).toBe(5)
      const bySeverity = rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.severity] = (acc[r.severity] ?? 0) + 1
        return acc
      }, {})
      expect(bySeverity).toEqual({ critical: 2, high: 1, low: 1, info: 1 })
    }),
  )
})
