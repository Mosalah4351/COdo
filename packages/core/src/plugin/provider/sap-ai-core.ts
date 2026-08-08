import { Npm } from "../../npm"
import { Effect, Option } from "effect"
import { pathToFileURL } from "url"
import { PluginV2 } from "../../plugin"
import { ProviderV2 } from "../../provider"

export const SapAICorePlugin = PluginV2.define({
  id: PluginV2.ID.make("sap-ai-core"),
  effect: Effect.gen(function* () {
    const npm = yield* Npm.Service
    return {
      "aisdk.sdk": Effect.fn(function* (evt) {
        if (evt.model.providerID !== ProviderV2.ID.make("sap-ai-core")) return
        const serviceKey =
          process.env.AICORE_SERVICE_KEY ??
          (typeof evt.options.serviceKey === "string" ? evt.options.serviceKey : undefined)

        const installedPath = evt.package.startsWith("file://")
          ? evt.package
          : Option.getOrUndefined((yield* npm.add(evt.package).pipe(Effect.orDie)).entrypoint)
        if (!installedPath) throw new Error(`Package ${evt.package} has no import entrypoint`)

        const mod = yield* Effect.promise(async () => {
          return (await import(
            installedPath.startsWith("file://") ? installedPath : pathToFileURL(installedPath).href
          )) as Record<string, (options: any) => any>
        }).pipe(Effect.orDie)
        const match = Object.keys(mod).find((name) => name.startsWith("create"))
        if (!match) throw new Error(`Package ${evt.package} has no provider factory export`)

        // The SAP AI Core SDK reads AICORE_SERVICE_KEY from process.env at factory-call
        // time only — scope the mutation so it can't leak to later code that happens
        // to share the runtime. If the user (or another provider load) already set
        // AICORE_SERVICE_KEY, preserve it verbatim and restore afterwards.
        const hadExisting = Object.prototype.hasOwnProperty.call(process.env, "AICORE_SERVICE_KEY")
        const previous = process.env.AICORE_SERVICE_KEY
        if (serviceKey && !hadExisting) process.env.AICORE_SERVICE_KEY = serviceKey
        try {
          evt.sdk = mod[match](
            serviceKey
              ? { deploymentId: process.env.AICORE_DEPLOYMENT_ID, resourceGroup: process.env.AICORE_RESOURCE_GROUP }
              : {},
          )
        } finally {
          if (hadExisting) {
            process.env.AICORE_SERVICE_KEY = previous
          } else {
            delete process.env.AICORE_SERVICE_KEY
          }
        }
      }),
      "aisdk.language": Effect.fn(function* (evt) {
        if (evt.model.providerID !== ProviderV2.ID.make("sap-ai-core")) return
        evt.language = evt.sdk(evt.model.api.id)
      }),
    }
  }),
})
