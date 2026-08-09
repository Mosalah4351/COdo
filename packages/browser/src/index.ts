export * as Browser from "./index"

import { Effect, Layer } from "effect"
import { AgentBrowserCLI } from "./agent-browser"
import { BrowserConfig } from "./config"
import { BrowserTools } from "./tools/core"

export const browserAvailable = AgentBrowserCLI.isInstalled()

export const browserLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const available = yield* browserAvailable
    if (!available) return
    yield* BrowserTools.layer
  }),
)
