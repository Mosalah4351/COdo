import { Effect, Schema } from "effect"
import { Tool } from "codo/tool/tool"
import { BrowserDaemon } from "../daemon"
import BROWSER_TAB_DESC from "./browser_tab.txt"

export const BrowserTabParams = Schema.Struct({
  action: Schema.Literal("list", "new", "switch", "close"),
  url: Schema.optional(Schema.String),
  tab_id: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
})

export const browserTabTool = Tool.define(
  "browser_tab",
  Effect.gen(function* () {
    return {
      description: BROWSER_TAB_DESC,
      parameters: BrowserTabParams,
      execute: (params: Schema.Schema.Type<typeof BrowserTabParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_tab",
            patterns: ["*"],
            always: ["*"],
            metadata: { action: params.action },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["tab"]
          switch (params.action) {
            case "list":
              break
            case "new":
              args.push("new")
              if (params.url) args.push(params.url)
              if (params.label) args.push("--label", params.label)
              break
            case "switch":
              if (params.tab_id) args.push(params.tab_id)
              break
            case "close":
              args.push("close")
              if (params.tab_id) args.push(params.tab_id)
              break
          }
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

export const BrowserTabTool = {
  browserTabTool,
}
