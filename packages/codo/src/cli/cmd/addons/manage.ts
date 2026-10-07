import path from "path"
import { Global } from "@codo-ai/core/global"
import { getAddon, listAddons } from "./catalog"
import { installAddon } from "./install"
import { enableAddonInConfig, disableAddonInConfig, readAddonState, type Scope } from "./patch"

export type AddonStatus = "not_installed" | "enabled" | "disabled"

export interface AddonWithStatus {
  name: string
  label: string
  description: string
  status: AddonStatus
  scope?: Scope
}

/**
 * Get the full status of all addons in the catalog
 */
export async function getAllAddonStatuses(projectDir: string): Promise<AddonWithStatus[]> {
  const results: AddonWithStatus[] = []
  for (const addon of listAddons()) {
    // Check local first, then global
    const localState = await readAddonState(addon.name, "local", projectDir)
    const globalState = localState ? null : await readAddonState(addon.name, "global", projectDir)
    const state = localState ?? globalState

    if (!state) {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "not_installed" })
    } else if (state.enabled) {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "enabled", scope: localState ? "local" : "global" })
    } else {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "disabled", scope: localState ? "local" : "global" })
    }
  }
  return results
}

/**
 * Enable an addon: install + config patch, or just config patch if already installed
 */
export async function enableAddon(
  name: string,
  scope: Scope,
  projectDir: string,
): Promise<{ ok: boolean; error?: string; skillDir?: string }> {
  const addon = getAddon(name)
  if (!addon) return { ok: false, error: `Addon "${name}" not found in catalog` }

  // Check if already installed
  const existing = await readAddonState(name, scope, projectDir)

  if (existing && existing.installed && existing.enabled) {
    return { ok: true, skillDir: skillDirFor(name, scope, projectDir) }
  }

  if (!existing || !existing.installed) {
    // First-time install: npm + skills + config
    const installResult = await installAddon(addon, scope, projectDir)
    if (!installResult.ok) return { ok: false, error: installResult.error }

    const skillDir = installResult.skillDir
    const patchResult = await enableAddonInConfig(
      name,
      { name, enabled: true, scope, npmPackage: addon.npmPackage, skills: [skillDir] },
      skillDir,
      scope,
      projectDir,
    )
    if (!patchResult.ok) return { ok: false, error: patchResult.error }

    return { ok: true, skillDir }
  }

  // Re-enable: just config patch
  const skillDir = skillDirFor(name, scope, projectDir)
  const patchResult = await enableAddonInConfig(
    name,
    { name, enabled: true, scope, npmPackage: addon.npmPackage, skills: [skillDir] },
    skillDir,
    scope,
    projectDir,
  )
  if (!patchResult.ok) return { ok: false, error: patchResult.error }

  return { ok: true, skillDir }
}

/**
 * Disable an addon: config patch only, keep npm + skills
 */
export async function disableAddon(
  name: string,
  projectDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const addon = getAddon(name)
  if (!addon) return { ok: false, error: `Addon "${name}" not found in catalog` }

  // Check local first, then global
  const localState = await readAddonState(name, "local", projectDir)
  const globalState = localState ? null : await readAddonState(name, "global", projectDir)
  const state = localState ?? globalState

  if (!state) return { ok: false, error: `Addon "${name}" is not installed` }

  const scope: Scope = localState ? "local" : "global"
  const skillDir = skillDirFor(name, scope, projectDir)

  const result = await disableAddonInConfig(name, skillDir, scope, projectDir)
  if (!result.ok) return { ok: false, error: result.error }

  return { ok: true }
}

function skillDirFor(name: string, scope: Scope, projectDir: string) {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  return path.join(configDir, "addons", name, "skills")
}
