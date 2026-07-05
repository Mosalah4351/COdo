import type { Argv } from "yargs"
import { intro, outro, select, spinner, log, isCancel } from "@clack/prompts"
import { Effect } from "effect"
import { cmd } from "../cmd"
import { effectCmd } from "../../effect-cmd"
import { UI } from "../../ui"
import { getAddon } from "./catalog"
import { getAllAddonStatuses, enableAddon, disableAddon, type AddonStatus } from "./manage"
import { InstanceRef } from "@/effect/instance-ref"

function statusBadge(status: AddonStatus, scope?: string): string {
  if (status === "enabled") return `● enabled${scope ? ` · ${scope}` : ""}`
  if (status === "disabled") return `○ disabled`
  return `○ not installed`
}

/**
 * Interactive addon management loop
 */
async function interactiveMode(projectDir: string) {
  intro("COdo Addons")

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const statuses = await getAllAddonStatuses(projectDir)

    const options = statuses.map((s) => ({
      label: s.label,
      value: s.name,
      hint: statusBadge(s.status, s.scope),
    }))

    const selected = await select({
      message: "Select an addon to manage",
      options,
    })

    if (isCancel(selected)) {
      outro("Goodbye!")
      return
    }

    const addon = getAddon(selected as string)
    if (!addon) {
      log.error(`Addon "${selected}" not found`)
      continue
    }

    const current = statuses.find((s) => s.name === selected)!

    // Build contextual action menu
    const actions: { label: string; value: string; hint?: string }[] = []

    if (current.status === "not_installed") {
      actions.push(
        { label: "Enable (local scope)", value: "enable-local", hint: "Install in project .codo/" },
        { label: "Enable (global scope)", value: "enable-global", hint: "Install in ~/.config/COdo/" },
      )
    } else if (current.status === "disabled") {
      actions.push({ label: "Enable", value: "enable", hint: "Re-enable with existing install" })
    } else if (current.status === "enabled") {
      actions.push({ label: "Disable", value: "disable", hint: "Remove from skills, keep files" })
    }

    actions.push({ label: "Show details", value: "details" })
    actions.push({ label: "Back", value: "back" })

    const action = await select({
      message: `${addon.label}`,
      options: actions,
    })

    if (isCancel(action) || action === "back") continue

    if (action === "details") {
      log.info(`${addon.label}`)
      log.info(`${addon.description}`)
      log.info(`npm package: ${addon.npmPackage}`)
      log.info(`Skills: installed from package skill-data/ directory`)
      continue
    }

    const spin = spinner()

    if (action === "enable-local" || action === "enable-global" || action === "enable") {
      const scope = action === "enable-global" ? "global" : "local"

      spin.start(action === "enable" ? "Enabling addon..." : "Installing addon...")

      const result = await enableAddon(addon.name, scope, projectDir)
      if (!result.ok) {
        spin.stop("Failed", 1)
        log.error(result.error ?? "Unknown error")
        continue
      }

      spin.stop("Done!")
      log.success(`${addon.label} enabled (${scope} scope)`)
    } else if (action === "disable") {
      spin.start("Disabling addon...")

      const result = await disableAddon(addon.name, projectDir)
      if (!result.ok) {
        spin.stop("Failed", 1)
        log.error(result.error ?? "Unknown error")
        continue
      }

      spin.stop("Done!")
      log.success(`${addon.label} disabled`)
    }
  }
}

// Non-interactive subcommands

export const AddonListCommand = effectCmd({
  command: "list",
  describe: "list all available addons and their status",
  instance: true,
  handler: Effect.fn("Cli.addons.list")(function* () {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const statuses = yield* Effect.promise(() => getAllAddonStatuses(ctx.directory))
    for (const s of statuses) {
      console.log(`${statusBadge(s.status, s.scope)}  ${s.label} — ${s.description}`)
    }
  }),
})

export const AddonEnableCommand = effectCmd({
  command: "enable <name>",
  describe: "enable (install if needed) an addon",
  instance: true,
  builder: (yargs) =>
    yargs
      .positional("name", { type: "string", describe: "addon name" })
      .option("global", { alias: "g", type: "boolean", default: false, describe: "install globally" }),
  handler: Effect.fn("Cli.addons.enable")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const name = String(args.name ?? "").trim()
    if (!name) { UI.error("addon name is required"); process.exitCode = 1; return }

    const scope = args.global ? "global" : "local"
    const spin = spinner()
    spin.start(`Enabling ${name}...`)

    const result = yield* Effect.promise(() => enableAddon(name, scope, ctx.directory))
    if (!result.ok) {
      spin.stop("Failed", 1)
      UI.error(result.error ?? "Unknown error")
      process.exitCode = 1
      return
    }

    spin.stop("Done!")
    log.success(`${name} enabled (${scope} scope)`)
  }),
})

export const AddonDisableCommand = effectCmd({
  command: "disable <name>",
  describe: "disable an addon",
  instance: true,
  builder: (yargs: Argv) =>
    yargs.positional("name", { type: "string", describe: "addon name" }),
  handler: Effect.fn("Cli.addons.disable")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const name = String(args.name ?? "").trim()
    if (!name) { UI.error("addon name is required"); process.exitCode = 1; return }

    const spin = spinner()
    spin.start(`Disabling ${name}...`)

    const result = yield* Effect.promise(() => disableAddon(name, ctx.directory))
    if (!result.ok) {
      spin.stop("Failed", 1)
      UI.error(result.error ?? "Unknown error")
      process.exitCode = 1
      return
    }

    spin.stop("Done!")
    log.success(`${name} disabled`)
  }),
})

export const AddonStatusCommand = effectCmd({
  command: "status",
  describe: "show detailed status of all addons",
  instance: true,
  handler: Effect.fn("Cli.addons.status")(function* () {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const statuses = yield* Effect.promise(() => getAllAddonStatuses(ctx.directory))
    for (const s of statuses) {
      console.log(`${statusBadge(s.status, s.scope)}  ${s.label}`)
      console.log(`  ${s.description}`)
      console.log()
    }
  }),
})

// Root command uses cmd() (not effectCmd) to avoid yargs conflicts with subcommands.
// Subcommands use effectCmd with InstanceRef independently.
export const AddonCommand = cmd({
  command: "addons",
  describe: "manage COdo addons (interactive mode with no subcommand)",
  builder: (yargs) =>
    yargs
      .command(AddonListCommand)
      .command(AddonEnableCommand)
      .command(AddonDisableCommand)
      .command(AddonStatusCommand),
  async handler() {
    // Interactive mode — runs when no subcommand is matched
    await interactiveMode(process.cwd())
  },
})
