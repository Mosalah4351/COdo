import { Effect } from "effect"
import { AgentBrowserCLI } from "@codo-ai/browser/agent-browser"
import { effectCmd } from "../effect-cmd"
import { UI } from "../ui"

export const BrowserCommand = effectCmd({
  command: "browser <action>",
  describe: "manage browser automation",
  instance: false,
  builder: (yargs) =>
    yargs.positional("action", {
      type: "string",
      describe: "browser action",
      choices: ["plugin", "doctor", "version"],
    }),
  handler: Effect.fn("Cli.browser")(function* (args: { action?: string }) {
    const action = String(args.action ?? "").trim()
    if (action === "doctor") {
      const result = yield* AgentBrowserCLI.doctor()
      if (result.ok) {
        console.log(result.stdout)
      } else {
        UI.error(result.error)
        process.exitCode = 1
      }
      return
    }
    if (action === "version") {
      const result = yield* AgentBrowserCLI.exec(["--version"])
      if (result.ok) {
        console.log(result.stdout)
      } else {
        UI.error(result.error)
        process.exitCode = 1
      }
      return
    }
    if (action === "plugin") {
      console.log("Use: agent-browser plugin <add|list|show> directly")
      console.log("Plugin configuration is managed via CODO.json browser.plugins")
      return
    }
    UI.error(`Unknown browser action: ${action}`)
    process.exitCode = 1
  }),
})
