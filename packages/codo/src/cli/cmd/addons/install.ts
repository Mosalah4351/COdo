import path from "path"
import { cp, mkdir, rm, stat } from "fs/promises"
import { Npm } from "@codo-ai/core/npm"
import { Global } from "@codo-ai/core/global"
import { type AddonEntry } from "./catalog"

export type InstallResult =
  | { ok: true; configDir: string; skillDir: string }
  | { ok: false; error: string }

/**
 * Copy skill-data/ from the installed npm package into the addon skills directory.
 * Retains the full subdirectory structure so each SKILL.md is auto-discovered.
 */
async function copySkillData(pkgDir: string, skillDir: string, subDir: string) {
  const src = path.join(pkgDir, subDir)
  try {
    await stat(src)
  } catch {
    throw new Error(`skill-data directory not found at ${src}`)
  }
  await cp(src, skillDir, { recursive: true, force: true })
}

export async function installAddon(
  addon: AddonEntry,
  scope: "local" | "global",
  projectDir: string,
): Promise<InstallResult> {
  const configDir = scope === "global"
    ? Global.Path.config
    : path.join(projectDir, ".codo")
  const skillDir = path.join(configDir, "addons", addon.name, "skills")

  try {
    const pkg = await Npm.add(addon.npmPackage)
    await mkdir(skillDir, { recursive: true })
    await copySkillData(pkg.directory, skillDir, addon.skillDataDir)
    return { ok: true, configDir, skillDir }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function removeSkillDir(
  addonName: string,
  scope: "local" | "global",
  projectDir: string,
): Promise<boolean> {
  const configDir = scope === "global"
    ? Global.Path.config
    : path.join(projectDir, ".codo")
  const skillDir = path.join(configDir, "addons", addonName, "skills")
  try {
    await rm(skillDir, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
