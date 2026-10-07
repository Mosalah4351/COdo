import { afterAll, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { loadBaseline, RELATIVE_PATH } from "@/security/baseline"
import { FSUtil } from "@codo-ai/core/fs-util"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(FSUtil.defaultLayer, CrossSpawnSpawner.defaultLayer))

const dirs: string[] = []

afterAll(async () => {
  for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
})

/** Plain temp dir — the Effect tmpdir fixture pulls in a process spawner this suite does not need. */
const tmp = (contents?: string) =>
  Effect.promise(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codo-baseline-"))
    dirs.push(dir)
    if (contents !== undefined) {
      await fs.mkdir(path.join(dir, ".codo"), { recursive: true })
      await fs.writeFile(path.join(dir, RELATIVE_PATH), contents, "utf8")
    }
    return dir
  })

const load = (dir: string, now?: Date) =>
  Effect.gen(function* () {
    const fsu = yield* FSUtil.Service
    return yield* loadBaseline({ projectDir: dir, fs: fsu, now })
  })

describe("security baseline", () => {
  it.live("treats a missing file as nothing suppressed", () =>
    Effect.gen(function* () {
      const result = yield* load(yield* tmp())
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.entries.size).toBe(0)
      expect(result.expired).toEqual([])
    }),
  )

  it.live("suppresses an entry with no expiry", () =>
    Effect.gen(function* () {
      const dir = yield* tmp(
        JSON.stringify({ version: 1, entries: [{ fingerprint: "abc123", reason: "reviewed 2026-08" }] }),
      )
      const result = yield* load(dir)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.entries.get("abc123")?.reason).toBe("reviewed 2026-08")
      expect(result.expired).toEqual([])
    }),
  )

  it.live("honours an unexpired sunset", () =>
    Effect.gen(function* () {
      const dir = yield* tmp(
        JSON.stringify({ entries: [{ fingerprint: "future", reason: "temporary", expires: "2030-01-01T00:00:00Z" }] }),
      )
      const result = yield* load(dir, new Date("2026-08-13T00:00:00Z"))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.entries.has("future")).toBe(true)
    }),
  )

  it.live("stops suppressing after the sunset and reports it", () =>
    Effect.gen(function* () {
      const dir = yield* tmp(
        JSON.stringify({ entries: [{ fingerprint: "stale", reason: "was temporary", expires: "2026-01-01T00:00:00Z" }] }),
      )
      const result = yield* load(dir, new Date("2026-08-13T00:00:00Z"))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // An acceptance must not outlive the review that granted it.
      expect(result.entries.has("stale")).toBe(false)
      expect(result.expired.map((e) => e.fingerprint)).toEqual(["stale"])
    }),
  )

  it.live("treats a malformed expiry as already expired, never as permanent", () =>
    Effect.gen(function* () {
      const dir = yield* tmp(
        JSON.stringify({ entries: [{ fingerprint: "bad", reason: "typo", expires: "not-a-date" }] }),
      )
      const result = yield* load(dir)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.entries.has("bad")).toBe(false)
      expect(result.expired.map((e) => e.fingerprint)).toEqual(["bad"])
    }),
  )

  it.live("fails closed on unparseable JSON rather than suppressing nothing silently", () =>
    Effect.gen(function* () {
      const result = yield* load(yield* tmp("{ this is not json"))
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe("unparseable")
    }),
  )

  it.live("rejects a file whose entries do not match the schema", () =>
    Effect.gen(function* () {
      const result = yield* load(yield* tmp(JSON.stringify({ entries: [{ fingerprint: "x" }] })))
      expect(result.ok).toBe(false)
    }),
  )
})
