import { Effect, Schema } from "effect"
import { Tool } from "codo/tool/tool"
import { BrowserDaemon } from "../daemon"
import BROWSER_NETWORK_ROUTE_DESC from "./browser_network_route.txt"
import BROWSER_NETWORK_REQUESTS_DESC from "./browser_network_requests.txt"
import BROWSER_NETWORK_HAR_DESC from "./browser_network_har.txt"

export const BrowserNetworkRouteParams = Schema.Struct({
  action: Schema.Literal("block", "unblock", "mock"),
  pattern: Schema.String,
  response: Schema.optional(Schema.String),
})

export const browserNetworkRouteTool = Tool.define(
  "browser_network_route",
  Effect.gen(function* () {
    return {
      description: BROWSER_NETWORK_ROUTE_DESC,
      parameters: BrowserNetworkRouteParams,
      execute: (params: Schema.Schema.Type<typeof BrowserNetworkRouteParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_network_route",
            patterns: ["*"],
            always: ["*"],
            metadata: { action: params.action, pattern: params.pattern },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["network", "route", params.action, params.pattern]
          if (params.response) args.push(params.response)
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

export const BrowserNetworkRequestsParams = Schema.Struct({
  status: Schema.optional(Schema.Number),
  method: Schema.optional(Schema.String),
  url_pattern: Schema.optional(Schema.String),
})

export const browserNetworkRequestsTool = Tool.define(
  "browser_network_requests",
  Effect.gen(function* () {
    return {
      description: BROWSER_NETWORK_REQUESTS_DESC,
      parameters: BrowserNetworkRequestsParams,
      execute: (params: Schema.Schema.Type<typeof BrowserNetworkRequestsParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_network_requests",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["network", "requests"]
          if (params.status) args.push("--status", String(params.status))
          if (params.method) args.push("--method", params.method)
          if (params.url_pattern) args.push("--pattern", params.url_pattern)
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

export const BrowserNetworkHarParams = Schema.Struct({
  action: Schema.Literal("start", "stop"),
  path: Schema.optional(Schema.String),
})

export const browserNetworkHarTool = Tool.define(
  "browser_network_har",
  Effect.gen(function* () {
    return {
      description: BROWSER_NETWORK_HAR_DESC,
      parameters: BrowserNetworkHarParams,
      execute: (params: Schema.Schema.Type<typeof BrowserNetworkHarParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_network_har",
            patterns: ["*"],
            always: ["*"],
            metadata: { action: params.action },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["network", "har", params.action]
          if (params.path) args.push("--path", params.path)
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

export const BrowserNetworkTool = {
  browserNetworkRouteTool,
  browserNetworkRequestsTool,
  browserNetworkHarTool,
}
