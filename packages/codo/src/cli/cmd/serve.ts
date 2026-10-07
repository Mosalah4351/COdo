import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions, requiresPassword } from "../network"
import { Flag } from "@codo-ai/core/flag/flag"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless COdo server",
  // Server loads instances per-request via x-COdo-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    const { Server } = yield* Effect.promise(() => import("../../server/server"))
    const opts = yield* resolveNetworkOptions(args)
    if (requiresPassword(opts.hostname) && !Flag.CODO_SERVER_PASSWORD) {
      console.error(`Refusing to bind ${opts.hostname} without CODO_SERVER_PASSWORD set — the server would be open to your network.`)
      process.exitCode = 1
      return
    }
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`COdo server listening on http://${server.hostname}:${server.port}`)

    yield* Effect.never
  }),
})
