import { afterAll, describe, expect, it } from "bun:test"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import { SecProbeTool } from "@/tool/sec_probe"
import { SessionID, MessageID } from "@/session/schema"
import { Agent } from "@/agent/agent"
import { Truncate } from "@/tool/truncate"
import { FSUtil } from "@codo-ai/core/fs-util"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { InstanceRef } from "@/effect/instance-ref"
import { testEffect } from "../lib/effect"
import type { Tool } from "@/tool/tool"
import path from "path"
import fs from "fs/promises"
import os from "os"

const mockHttp = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response("<html>ok</html>", {
          status: 200,
          headers: { "content-type": "text/html", "set-cookie": "session=abc123" },
        }),
      ),
    ),
  ),
)

const it = testEffect(
  Layer.mergeAll(mockHttp, FSUtil.defaultLayer, CrossSpawnSpawner.defaultLayer, Truncate.defaultLayer, Agent.defaultLayer),
)

function makeCtx(overrides?: Partial<Tool.Context>): Tool.Context {
  return {
    sessionID: SessionID.make("ses_test"),
    messageID: MessageID.make("msg_test"),
    agent: "sec-pentest",
    abort: new AbortController().signal,
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
    ...overrides,
  }
}

const scope = (targets: string[], opts?: { allow_active_scan?: boolean }) =>
  JSON.stringify({
    expires: "2030-01-01T00:00:00Z",
    targets: targets.map((t) => ({ type: "web" as const, value: t })),
    allow_active_scan: opts?.allow_active_scan,
  })

const dirs: string[] = []

afterAll(async () => {
  for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
})

async function tmpdir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codo-sec-probe-"))
  dirs.push(dir)
  return dir
}

function withInstance(dir: string) {
  return Effect.provideService(InstanceRef, {
    directory: dir,
    worktree: dir,
    project: { id: "test-project" },
  } as any)
}

const initTool = () => SecProbeTool.pipe(Effect.flatMap((info) => info.init()))

describe("sec_probe blocking", () => {
  it.effect("blocks non-http URLs", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "ftp://example.com" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("bad-url")
    }),
  )

  it.effect("blocks relative paths", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "/api/users" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("bad-url")
    }),
  )

  it.effect("blocks DELETE regardless of scope", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"], { allow_active_scan: true }))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/x", method: "DELETE" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("destructive-method")
    }),
  )

  it.effect("blocks when scope file is missing", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("missing")
    }),
  )

  it.effect("blocks when target is not in scope", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://allowed.example.com"]))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://evil.example.com" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("target-not-in-scope")
    }),
  )

  it.effect("blocks POST when allow_active_scan is false", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"]))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/api", method: "POST", body: "test" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("active-scan-required")
    }),
  )

  it.effect("blocks GET with body when allow_active_scan is false", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"]))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/api", method: "GET", body: "test" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBe(true)
      expect(result.metadata.reason).toBe("active-scan-required")
    }),
  )

  it.effect("allows GET without body when allow_active_scan is false", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"]))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/page" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBeUndefined()
      expect(result.metadata.status).toBe(200)
    }),
  )

  it.effect("allows POST when allow_active_scan is true", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"], { allow_active_scan: true }))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/api", method: "POST", body: "test" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBeUndefined()
    }),
  )

  // TODO: re-enable with longer timeout — rate-limit sleep makes this slow
  // it.effect("blocks after 100 requests (budget)", () =>
  //   Effect.gen(function* () {
  //     const dir = yield* Effect.promise(() => tmpdir())
  //     yield* Effect.promise(async () => {
  //       await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
  //       await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"], { allow_active_scan: true }))
  //     })
  //     const tool = yield* initTool()
  //     const ctx = makeCtx()
  //     for (let i = 0; i < 100; i++) {
  //       yield* tool.execute({ url: `https://example.com/p${i}` }, ctx).pipe(withInstance(dir))
  //     }
  //     const result = yield* tool.execute({ url: "https://example.com/p100" }, ctx).pipe(withInstance(dir))
  //     expect(result.metadata.blocked).toBe(true)
  //     expect(result.metadata.reason).toBe("budget-exhausted")
  //   }),
  // )
})

describe("sec_probe successful probe", () => {
  it.effect("returns status, body, and redacted headers", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"], { allow_active_scan: true }))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/page" }, makeCtx()).pipe(withInstance(dir))
      expect(result.metadata.blocked).toBeUndefined()
      expect(result.metadata.status).toBe(200)
      expect(result.output).toContain("<html>ok</html>")
      expect(result.output).toContain("<redacted>")
      expect(result.output).not.toContain("session=abc123")
      expect(result.output).toContain("curl")
    }),
  )

  it.effect("includes intent when note is provided", () =>
    Effect.gen(function* () {
      const dir = yield* Effect.promise(() => tmpdir())
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
        await fs.writeFile(path.join(dir, ".codo", "security-scope.json"), scope(["https://example.com"], { allow_active_scan: true }))
      })
      const tool = yield* initTool()
      const result = yield* tool.execute({ url: "https://example.com/page", note: "confirming auth bypass" }, makeCtx()).pipe(withInstance(dir))
      expect(result.output).toContain("Intent: confirming auth bypass")
    }),
  )
})
