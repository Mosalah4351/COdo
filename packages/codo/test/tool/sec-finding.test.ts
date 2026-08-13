import { afterAll, describe, expect, it } from "bun:test"
import { Effect, Layer } from "effect"
import { SecFindingTool } from "@/tool/sec_finding"
import { SessionID, MessageID } from "@/session/schema"
import { Agent } from "@/agent/agent"
import { Truncate } from "@/tool/truncate"
import { FSUtil } from "@codo-ai/core/fs-util"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { Database } from "@codo-ai/core/database/database"
import { ProjectTable } from "@codo-ai/core/project/sql"
import { SessionTable } from "@codo-ai/core/session/sql"
import { InstanceRef } from "@/effect/instance-ref"
import { testEffect } from "../lib/effect"
import type { Tool } from "@/tool/tool"
import path from "path"
import fs from "fs/promises"
import { mkdtempSync } from "fs"
import os from "os"

const PROJECT_ID = "prj_test-project"
const SESSION_ID = "ses_test"

const dbDir = mkdtempSync(path.join(os.tmpdir(), "codo-sec-finding-db-"))
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

function makeCtx(overrides?: Partial<Tool.Context>): Tool.Context {
  return {
    sessionID: SessionID.make("ses_test"),
    messageID: MessageID.make("msg_test"),
    agent: "sec-appsec",
    abort: new AbortController().signal,
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
    ...overrides,
  }
}

afterAll(async () => {
  await fs.rm(dbDir, { recursive: true, force: true }).catch(() => {})
})

async function tmpdir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "codo-sec-finding-"))
}

function withInstance(dir: string) {
  return Effect.provideService(InstanceRef, {
    directory: dir,
    worktree: dir,
    project: { id: PROJECT_ID },
  } as any)
}

const initTool = () => SecFindingTool.pipe(Effect.flatMap((info) => info.init()))

const sampleFinding = {
  category: "CWE-798",
  location: "src/config.ts:10",
  confidence: "high" as const,
  severity: "critical" as const,
  finding: "hardcoded credential",
  evidence: `const key = "AKIAIOSFODNN7EXAMPLE"`,
  remediation: "move to env config",
}

const seedDb = () =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    yield* db
      .insert(ProjectTable)
      .values({
        id: PROJECT_ID,
        worktree: "/tmp/test",
        sandboxes: ["/tmp/test"],
        time_created: Date.now(),
        time_updated: Date.now(),
      })
      .onConflictDoNothing()
    yield* db
      .insert(SessionTable)
      .values({
        id: SESSION_ID,
        project_id: PROJECT_ID,
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

describe("sec_finding", () => {
  it.effect("returns no-op for empty findings", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute({ findings: [] }, makeCtx()).pipe(withInstance(dir))
      expect(result.output).toContain("No findings supplied")
    }),
  )

  it.effect("inserts a new finding with assigned ID", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute({ findings: [sampleFinding] }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.recorded).toBe(1)
      expect(result.metadata.new).toBe(1)
      expect(result.output).toContain("1 new")
      expect(result.output).toContain("fingerprint=")
    }),
  )

  it.effect("deduplicates on same fingerprint", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      yield* tool.execute({ findings: [sampleFinding] }, makeCtx()).pipe(withInstance(dir))
      const result = yield* tool.execute({ findings: [sampleFinding] }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.recorded).toBe(1)
      expect(result.metadata.new).toBe(0)
      expect(result.output).toContain("already known")
    }),
  )

  it.effect("keeps fixed finding without rescan", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      yield* tool.execute({ findings: [{ ...sampleFinding, status: "open" as const }] }, makeCtx()).pipe(withInstance(dir))
      yield* tool.execute({ findings: [{ ...sampleFinding, status: "fixed" as const }] }, makeCtx()).pipe(withInstance(dir))
      const result = yield* tool.execute({ findings: [{ ...sampleFinding, status: "open" as const }] }, makeCtx()).pipe(withInstance(dir))
      expect(result.output).toContain("already known")
      expect(result.output).toContain("fixed")
    }),
  )

  it.effect("reopens fixed finding with rescan flag", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      yield* tool.execute({ findings: [{ ...sampleFinding, status: "open" as const }] }, makeCtx()).pipe(withInstance(dir))
      yield* tool.execute({ findings: [{ ...sampleFinding, status: "fixed" as const }] }, makeCtx()).pipe(withInstance(dir))
      const result = yield* tool.execute({ findings: [{ ...sampleFinding, status: "open" as const }], rescan: true }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.recorded).toBe(1)
      expect(result.output).toContain("open")
    }),
  )

  it.effect("marks baseline-suppressed findings as accepted-risk", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const first = yield* tool.execute({ findings: [sampleFinding] }, makeCtx()).pipe(withInstance(dir))
      const fpMatch = /fingerprint=([0-9a-f]+)/.exec(first.output)
      expect(fpMatch).not.toBeNull()
      const fp = fpMatch![1]
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(
          path.join(dir, ".codo", "security-baseline.json"),
          JSON.stringify({ entries: [{ fingerprint: fp, reason: "reviewed and accepted" }] }),
        )
      })
      const result = yield* tool.execute({ findings: [sampleFinding] }, makeCtx()).pipe(withInstance(dir))
      expect(result.output).toContain("accepted-risk")
    }),
  )

  it.effect("counts by severity", () =>
    Effect.gen(function* () {
      yield* seedDb()
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute(
        {
          findings: [
            { ...sampleFinding, severity: "critical" as const },
            { ...sampleFinding, severity: "critical" as const, location: "src/a.ts:1" },
            { ...sampleFinding, severity: "high" as const, location: "src/b.ts:2" },
          ],
        },
        makeCtx(),
      ).pipe(withInstance(dir))
      expect(result.metadata.recorded).toBe(3)
      expect(result.metadata.bySeverity).toEqual({ critical: 2, high: 1 })
    }),
  )
})
