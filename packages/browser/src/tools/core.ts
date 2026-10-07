import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { Effect, Schema } from "effect"
import { Tool } from "codo/tool/tool"
import { BrowserDaemon } from "../daemon"

import BROWSER_OPEN_DESC from "./browser_open.txt"
import BROWSER_SNAPSHOT_DESC from "./browser_snapshot.txt"
import BROWSER_CLICK_DESC from "./browser_click.txt"
import BROWSER_FILL_DESC from "./browser_fill.txt"
import BROWSER_TYPE_DESC from "./browser_type.txt"
import BROWSER_PRESS_DESC from "./browser_press.txt"
import BROWSER_SCREENSHOT_DESC from "./browser_screenshot.txt"
import BROWSER_READ_DESC from "./browser_read.txt"
import BROWSER_EVAL_DESC from "./browser_eval.txt"
import BROWSER_WAIT_DESC from "./browser_wait.txt"
import BROWSER_GET_DESC from "./browser_get.txt"
import BROWSER_CLOSE_DESC from "./browser_close.txt"

export const BrowserOpenParams = Schema.Struct({
  url: Schema.String,
  headless: Schema.optional(Schema.Boolean),
  session: Schema.optional(Schema.String),
  enable_react_devtools: Schema.optional(Schema.Boolean),
})

export const browserOpenTool = Tool.define(
  "browser_open",
  Effect.gen(function* () {
    return {
      description: BROWSER_OPEN_DESC,
      parameters: BrowserOpenParams,
      execute: (params: Schema.Schema.Type<typeof BrowserOpenParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_open",
            patterns: [params.url],
            always: ["*"],
            metadata: { url: params.url, headless: params.headless },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args = ["open", params.url]
          if (params.headless === false) args.push("--headed")
          if (params.enable_react_devtools) args.push("--enable", "react-devtools")
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

export const BrowserSnapshotParams = Schema.Struct({
  interactive: Schema.optional(Schema.Boolean),
  compact: Schema.optional(Schema.Boolean),
  depth: Schema.optional(Schema.Number),
  selector: Schema.optional(Schema.String),
})

export const browserSnapshotTool = Tool.define(
  "browser_snapshot",
  Effect.gen(function* () {
    return {
      description: BROWSER_SNAPSHOT_DESC,
      parameters: BrowserSnapshotParams,
      execute: (params: Schema.Schema.Type<typeof BrowserSnapshotParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_snapshot",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["snapshot"]
          if (params.interactive) args.push("-i")
          if (params.compact) args.push("-c")
          if (params.depth) args.push("-d", String(params.depth))
          if (params.selector) args.push("-s", params.selector)
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

export const BrowserClickParams = Schema.Struct({
  ref: Schema.optional(Schema.String),
  selector: Schema.optional(Schema.String),
  new_tab: Schema.optional(Schema.Boolean),
})

export const browserClickTool = Tool.define(
  "browser_click",
  Effect.gen(function* () {
    return {
      description: BROWSER_CLICK_DESC,
      parameters: BrowserClickParams,
      execute: (params: Schema.Schema.Type<typeof BrowserClickParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_click",
            patterns: ["*"],
            always: ["*"],
            metadata: { ref: params.ref, selector: params.selector },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const sel = params.ref ?? params.selector
          const args = ["click", sel]
          if (params.new_tab) args.push("--new-tab")
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

export const BrowserFillParams = Schema.Struct({
  ref: Schema.optional(Schema.String),
  selector: Schema.optional(Schema.String),
  value: Schema.String,
})

export const browserFillTool = Tool.define(
  "browser_fill",
  Effect.gen(function* () {
    return {
      description: BROWSER_FILL_DESC,
      parameters: BrowserFillParams,
      execute: (params: Schema.Schema.Type<typeof BrowserFillParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_fill",
            patterns: ["*"],
            always: ["*"],
            metadata: { ref: params.ref, selector: params.selector },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const sel = params.ref ?? params.selector
          const result = yield* BrowserDaemon.runCommand(["fill", sel, params.value], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserTypeParams = Schema.Struct({
  ref: Schema.optional(Schema.String),
  selector: Schema.optional(Schema.String),
  text: Schema.String,
})

export const browserTypeTool = Tool.define(
  "browser_type",
  Effect.gen(function* () {
    return {
      description: BROWSER_TYPE_DESC,
      parameters: BrowserTypeParams,
      execute: (params: Schema.Schema.Type<typeof BrowserTypeParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_type",
            patterns: ["*"],
            always: ["*"],
            metadata: { ref: params.ref, selector: params.selector },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const sel = params.ref ?? params.selector
          const result = yield* BrowserDaemon.runCommand(["type", sel, params.text], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserPressParams = Schema.Struct({
  key: Schema.String,
})

export const browserPressTool = Tool.define(
  "browser_press",
  Effect.gen(function* () {
    return {
      description: BROWSER_PRESS_DESC,
      parameters: BrowserPressParams,
      execute: (params: Schema.Schema.Type<typeof BrowserPressParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_press",
            patterns: ["*"],
            always: ["*"],
            metadata: { key: params.key },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const result = yield* BrowserDaemon.runCommand(["press", params.key], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserScreenshotParams = Schema.Struct({
  full_page: Schema.optional(Schema.Boolean),
  annotate: Schema.optional(Schema.Boolean),
})

export const browserScreenshotTool = Tool.define(
  "browser_screenshot",
  Effect.gen(function* () {
    return {
      description: BROWSER_SCREENSHOT_DESC,
      parameters: BrowserScreenshotParams,
      execute: (params: Schema.Schema.Type<typeof BrowserScreenshotParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_screenshot",
            patterns: [],
            always: ["*"],
            metadata: params,
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["screenshot"]
          if (params.full_page) args.push("--full")
          if (params.annotate) args.push("--annotate")
          const result = yield* BrowserDaemon.runCommand(args, ctx.sessionID)

          if (!result.ok) {
            return { output: result.error, title: "Browser Screenshot", metadata: {} }
          }

          const match = result.stdout.match(/Screenshot saved to (.+\.(?:png|jpe?g))/i)
          if (match?.[1] && existsSync(match[1])) {
            const filePath = match[1]
            const imageData = yield* Effect.promise(() => readFile(filePath))
            const base64 = imageData.toString("base64")
            const ext = filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") ? "jpeg" : "png"
            return {
              output: `Screenshot taken: ${filePath}`,
              title: "Browser Screenshot",
              metadata: {},
              attachments: [{
                type: "file" as const,
                mime: `image/${ext}`,
                url: `data:image/${ext};base64,${base64}`,
              }],
            }
          }

          return { output: result.stdout, title: "Browser Screenshot", metadata: {} }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserReadParams = Schema.Struct({
  url: Schema.optional(Schema.String),
})

export const browserReadTool = Tool.define(
  "browser_read",
  Effect.gen(function* () {
    return {
      description: BROWSER_READ_DESC,
      parameters: BrowserReadParams,
      execute: (params: Schema.Schema.Type<typeof BrowserReadParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_read",
            patterns: params.url ? [params.url] : ["*"],
            always: ["*"],
            metadata: { url: params.url },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args = params.url ? ["read", params.url] : ["read"]
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

export const BrowserEvalParams = Schema.Struct({
  js: Schema.String,
})

export const browserEvalTool = Tool.define(
  "browser_eval",
  Effect.gen(function* () {
    return {
      description: BROWSER_EVAL_DESC,
      parameters: BrowserEvalParams,
      execute: (params: Schema.Schema.Type<typeof BrowserEvalParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_eval",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const result = yield* BrowserDaemon.runCommand(["eval", params.js], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const BrowserWaitParams = Schema.Struct({
  selector: Schema.optional(Schema.String),
  timeout_ms: Schema.optional(Schema.Number),
  text: Schema.optional(Schema.String),
  load_state: Schema.optional(Schema.String),
})

export const browserWaitTool = Tool.define(
  "browser_wait",
  Effect.gen(function* () {
    return {
      description: BROWSER_WAIT_DESC,
      parameters: BrowserWaitParams,
      execute: (params: Schema.Schema.Type<typeof BrowserWaitParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_wait",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["wait"]
          if (params.selector) args.push(params.selector)
          if (params.text) args.push("--text", params.text)
          if (params.load_state) args.push("--load", params.load_state)
          if (params.timeout_ms) args.push("--timeout", String(params.timeout_ms))
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

export const BrowserGetParams = Schema.Struct({
  property: Schema.Literal("url", "title"),
  ref: Schema.optional(Schema.String),
  attr: Schema.optional(Schema.String),
})

export const browserGetTool = Tool.define(
  "browser_get",
  Effect.gen(function* () {
    return {
      description: BROWSER_GET_DESC,
      parameters: BrowserGetParams,
      execute: (params: Schema.Schema.Type<typeof BrowserGetParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_get",
            patterns: ["*"],
            always: ["*"],
            metadata: { property: params.property },
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const args: string[] = ["get", params.property]
          if (params.ref) args.push(params.ref)
          if (params.attr) args.push("--attr", params.attr)
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

const EmptyParams = Schema.Struct({})

export const browserCloseTool = Tool.define(
  "browser_close",
  Effect.gen(function* () {
    return {
      description: BROWSER_CLOSE_DESC,
      parameters: EmptyParams,
      execute: (_params: Schema.Schema.Type<typeof EmptyParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_close",
            patterns: ["*"],
            always: ["*"],
            metadata: {},
          })
          yield* BrowserDaemon.ensureInstalled().pipe(Effect.orDie)
          const result = yield* BrowserDaemon.runCommand(["close"], ctx.sessionID)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {} as Record<string, unknown>,
          }
        }).pipe(Effect.orDie),
    }
  }),
)

const allTools = [
  browserOpenTool,
  browserSnapshotTool,
  browserClickTool,
  browserFillTool,
  browserTypeTool,
  browserPressTool,
  browserScreenshotTool,
  browserReadTool,
  browserEvalTool,
  browserWaitTool,
  browserGetTool,
  browserCloseTool,
]

export const layer = Effect.gen(function* () {
  for (const tool of allTools) {
    const info = yield* tool
    yield* Tool.init(info)
  }
})

export const BrowserTools = {
  browserOpenTool,
  browserSnapshotTool,
  browserClickTool,
  browserFillTool,
  browserTypeTool,
  browserPressTool,
  browserScreenshotTool,
  browserReadTool,
  browserEvalTool,
  browserWaitTool,
  browserGetTool,
  browserCloseTool,
  layer,
}
