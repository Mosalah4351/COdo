import { describe, expect } from "bun:test"
import * as fs from "fs/promises"
import path from "path"
import { Effect, Layer } from "effect"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { Worktree } from "../../src/worktree"
import { TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Worktree.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("Worktree.remove containment guard", () => {
  it.instance(
    "refuses to delete an unregistered directory outside the project worktree",
    () =>
      Effect.gen(function* () {
        const root = (yield* TestInstance).directory
        const svc = yield* Worktree.Service

        const outside = path.join(root, "..", `outside-${Date.now().toString(36)}`)
        yield* Effect.promise(() => fs.mkdir(outside, { recursive: true }))
        const marker = path.join(outside, "keep-me.txt")
        yield* Effect.promise(() => Bun.write(marker, "do not delete"))

        const error = yield* svc.remove({ directory: outside }).pipe(Effect.flip)

        expect(error instanceof Worktree.RemoveFailedError).toBe(true)
        if (error instanceof Worktree.RemoveFailedError) {
          expect(error.message).toContain("is not a worktree of this project")
        }

        // The control: refusal must leave the directory and its contents intact.
        const survived = yield* Effect.promise(() =>
          fs
            .stat(marker)
            .then(() => true)
            .catch(() => false),
        )
        expect(survived).toBe(true)

        yield* Effect.promise(() => fs.rm(outside, { recursive: true, force: true }))
      }),
    { git: true },
    // First instance test builds the Worktree layer from scratch (~12s cold start).
    120_000,
  )

  it.instance(
    "still removes an unregistered directory inside the project worktree",
    () =>
      Effect.gen(function* () {
        const root = (yield* TestInstance).directory
        const svc = yield* Worktree.Service

        const inside = path.join(root, "unregistered")
        yield* Effect.promise(() => fs.mkdir(inside, { recursive: true }))
        yield* Effect.promise(() => Bun.write(path.join(inside, "scratch.txt"), "temp"))

        const ok = yield* svc.remove({ directory: inside })

        expect(ok).toBe(true)
        const removed = yield* Effect.promise(() =>
          fs
            .stat(inside)
            .then(() => true)
            .catch(() => false),
        )
        expect(removed).toBe(false)
      }),
    { git: true },
  )

  it.instance(
    "refuses a traversal path that resolves outside the project worktree",
    () =>
      Effect.gen(function* () {
        const root = (yield* TestInstance).directory
        const svc = yield* Worktree.Service

        const escaped = path.join(root, "..", "..", `escape-${Date.now().toString(36)}`)
        yield* Effect.promise(() => fs.mkdir(escaped, { recursive: true }))
        const marker = path.join(escaped, "keep-me.txt")
        yield* Effect.promise(() => Bun.write(marker, "do not delete"))

        const error = yield* svc.remove({ directory: path.join(root, "..", "..", path.basename(escaped)) }).pipe(
          Effect.flip,
        )

        expect(error instanceof Worktree.RemoveFailedError).toBe(true)
        const survived = yield* Effect.promise(() =>
          fs
            .stat(marker)
            .then(() => true)
            .catch(() => false),
        )
        expect(survived).toBe(true)

        yield* Effect.promise(() => fs.rm(escaped, { recursive: true, force: true }))
      }),
    { git: true },
  )
})
