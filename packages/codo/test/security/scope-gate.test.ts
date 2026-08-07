import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { FSUtil } from "@codo-ai/core/fs-util"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { evaluateGate } from "../../src/security/scope-gate"

const futureDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const pastDate = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function scopeJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    created: new Date().toISOString(),
    expires: futureDate(),
    targets: [{ type: "web", value: "https://staging.example.com" }],
    allow_active_scan: false,
    ...overrides,
  })
}

async function withScopeFile<T>(contents: string | undefined, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sec-test-scope-gate-"))
  try {
    if (contents !== undefined) {
      await Effect.runPromise(
        Effect.gen(function* () {
          const fsSvc = yield* FSUtil.Service
          yield* fsSvc.writeWithDirs(`${dir}/.codo/security-scope.json`, contents)
        }).pipe(Effect.provide(FSUtil.defaultLayer)),
      )
    }
    return await fn(dir)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

const runGate = (opts: Omit<Parameters<typeof evaluateGate>[0], "fs">) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fsSvc = yield* FSUtil.Service
      return yield* evaluateGate({ ...opts, fs: fsSvc })
    }).pipe(Effect.provide(FSUtil.defaultLayer)),
  )

describe("scope-gate", () => {
  test("missing file blocks pentest", () =>
    withScopeFile(undefined, async (dir) => {
      const result = await runGate({ projectDir: dir })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe("missing")
    }))

  test("unparseable JSON blocks", () =>
    withScopeFile("not json {", async (dir) => {
      const result = await runGate({ projectDir: dir })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe("unparseable")
    }))

  test("expired scope blocks", () =>
    withScopeFile(scopeJson({ expires: pastDate() }), async (dir) => {
      const result = await runGate({ projectDir: dir })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe("expired")
    }))

  test("empty targets block", () =>
    withScopeFile(JSON.stringify({ ...scopeJson(), targets: [] }), async (dir) => {
      const result = await runGate({ projectDir: dir })
      expect(result.ok).toBe(false)
    }))

  test("valid file admits", () =>
    withScopeFile(scopeJson(), async (dir) => {
      const result = await runGate({ projectDir: dir })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.scope.targets[0].value).toBe("https://staging.example.com")
    }))

  test("explicit target must be in scope.targets", () =>
    withScopeFile(scopeJson(), async (dir) => {
      const result = await runGate({ projectDir: dir, target: "https://prod.example.com" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe("target-not-in-scope")
    }))

  test("target prefix match admits sub-paths under a listed origin", () =>
    withScopeFile(scopeJson(), async (dir) => {
      const result = await runGate({ projectDir: dir, target: "https://staging.example.com/api/users" })
      expect(result.ok).toBe(true)
    }))
})
