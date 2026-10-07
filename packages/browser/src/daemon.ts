export * as BrowserDaemon from "./daemon"

import { Effect } from "effect"
import { AgentBrowserCLI } from "./agent-browser"

export function ensureInstalled(): Effect.Effect<boolean, string> {
  return Effect.gen(function* () {
    const installed = yield* AgentBrowserCLI.isInstalled()
    if (!installed) {
      return yield* Effect.fail(
        "agent-browser is not installed. Install it with: npm install -g agent-browser\n" +
        "Or see: https://github.com/vercel-labs/agent-browser",
      )
    }
    return true
  })
}

export function runCommand(args: string[], sessionID?: string, extraEnv?: Record<string, string>) {
  const env: Record<string, string> = {
    AGENT_BROWSER_IDLE_TIMEOUT_MS: "300000",
    ...extraEnv,
  }
  return AgentBrowserCLI.exec(args, { session: sessionID, env })
}
