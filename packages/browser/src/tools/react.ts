import { Effect, Schema } from "effect"
import { Tool } from "codo/tool/tool"
import { BrowserDaemon } from "../daemon"
import BROWSER_REACT_TREE_DESC from "./browser_react_tree.txt"
import BROWSER_REACT_INSPECT_DESC from "./browser_react_inspect.txt"
import BROWSER_VITALS_DESC from "./browser_vitals.txt"

const EmptyParams = Schema.Struct({})

export const browserReactTreeTool = Tool.define(
  "browser_react_tree",
  Effect.gen(function* () {
    return {
      description: BROWSER_REACT_TREE_DESC,
      parameters: EmptyParams,
      execute: (_params: Schema.Schema.Type<typeof EmptyParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_react_tree",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const result = yield* BrowserDaemon.runCommand(["react", "tree"], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserReactInspectParams = Schema.Struct({
  fiber_id: Schema.String,
})

export const browserReactInspectTool = Tool.define(
  "browser_react_inspect",
  Effect.gen(function* () {
    return {
      description: BROWSER_REACT_INSPECT_DESC,
      parameters: BrowserReactInspectParams,
      execute: (params: Schema.Schema.Type<typeof BrowserReactInspectParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_react_inspect",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const result = yield* BrowserDaemon.runCommand(
            ["react", "inspect", params.fiber_id],
            ctx.sessionID,
          )
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserVitalsParams = Schema.Struct({
  url: Schema.optional(Schema.String),
})

export const browserVitalsTool = Tool.define(
  "browser_vitals",
  Effect.gen(function* () {
    return {
      description: BROWSER_VITALS_DESC,
      parameters: BrowserVitalsParams,
      execute: (params: Schema.Schema.Type<typeof BrowserVitalsParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_vitals",
            patterns: params.url ? [params.url] : ["*"],
            always: ["*"],
            metadata: { url: params.url },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args = params.url ? ["vitals", params.url] : ["vitals"]
          const result = yield* BrowserDaemon.runCommand(args, ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserReactTool = {
  browserReactTreeTool,
  browserReactInspectTool,
  browserVitalsTool,
}
