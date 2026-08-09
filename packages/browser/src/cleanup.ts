export * as BrowserCleanup from "./cleanup"

import { Effect } from "effect"
import { AgentBrowserCLI } from "./agent-browser"

export function registerCleanup(): void {
  const cleanup = () => {
    AgentBrowserCLI.exec(["close", "--all"]).pipe(
      Effect.runPromise,
    ).catch(() => {})
  }
  process.on("exit", cleanup)
}

export function closeAll() {
  return AgentBrowserCLI.exec(["close", "--all"]).pipe(
    Effect.runPromise,
  ).catch(() => {})
}
