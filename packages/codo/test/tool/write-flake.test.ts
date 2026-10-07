import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import fs from "fs/promises"
import { WriteTool } from "../../src/tool/write"
import { LSP } from "@/lsp/lsp"
import { FSUtil } from "@codo-ai/core/fs-util"
import { EventV2Bridge } from "../../src/event-v2-bridge"
import { Format } from "../../src/format"
import { Truncate } from "@/tool/truncate"
import { Tool } from "@/tool/tool"
import { Agent } from "../../src/agent/agent"
import { SessionID, MessageID } from "../../src/session/schema"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const ctx = {
  sessionID: SessionID.make("ses_test-write-flake"),
  messageID: MessageID.make("msg_test"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

afterEach(async () => {
  await disposeAllInstances()
})

const it = testEffect(
  Layer.mergeAll(
    LSP.defaultLayer,
    FSUtil.defaultLayer,
    EventV2Bridge.defaultLayer,
    Format.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
  ),
)

const init = Effect.fn("WriteToolFlakeTest.init")(function* () {
  const info = yield* WriteTool
  return yield* info.init()
})

const run = Effect.fn("WriteToolFlakeTest.run")(function* (
  args: Tool.InferParameters<typeof WriteTool>,
) {
  const tool = yield* init()
  return yield* tool.execute(args, ctx)
})

describe("tool.write regression — flake repro", () => {
  it.instance("two concurrent writes to the same path complete with last-wins", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const filepath = path.join(test.directory, "concurrent.txt")
      yield* Effect.all(
        [run({ filePath: filepath, content: "from A\n" }), run({ filePath: filepath, content: "from B\n" })],
        { concurrency: "unbounded" },
      )
      const final = yield* Effect.promise(() => fs.readFile(filepath, "utf-8"))
      expect(["from A\n", "from B\n"]).toContain(final)
    }),
  )

  it.instance("write to a path whose parent is being created concurrently", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const parent = path.join(test.directory, "deep", "nested")
      yield* Effect.all(
        [
          run({ filePath: path.join(parent, "a.txt"), content: "A" }),
          run({ filePath: path.join(parent, "b.txt"), content: "B" }),
          run({ filePath: path.join(parent, "c.txt"), content: "C" }),
        ],
        { concurrency: "unbounded" },
      )
      const [a, b, c] = yield* Effect.promise(() =>
        Promise.all([
          fs.readFile(path.join(parent, "a.txt"), "utf-8"),
          fs.readFile(path.join(parent, "b.txt"), "utf-8"),
          fs.readFile(path.join(parent, "c.txt"), "utf-8"),
        ]),
      )
      expect(a).toBe("A")
      expect(b).toBe("B")
      expect(c).toBe("C")
    }),
  )

  it.instance("write under tight sequence — rapid overwrites", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const filepath = path.join(test.directory, "rapid.txt")
      for (let i = 0; i < 10; i++) {
        yield* run({ filePath: filepath, content: `iteration ${i}\n` })
      }
      const final = yield* Effect.promise(() => fs.readFile(filepath, "utf-8"))
      expect(final).toBe("iteration 9\n")
    }),
  )
})
