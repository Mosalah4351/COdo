import path from "path"
import { mkdir, rm } from "fs/promises"
import { Npm } from "@codo-ai/core/npm"
import { Global } from "@codo-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import { type AddonEntry } from "./catalog"

export type InstallResult =
  | { ok: true; configDir: string; skillDir: string }
  | { ok: false; error: string }

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
    await Npm.add(addon.npmPackage)

    await mkdir(skillDir, { recursive: true })

    for (const skill of addon.skills) {
      const skillPath = path.join(skillDir, `${skill.name}.md`)
      const content = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.content}`
      await Filesystem.write(skillPath, content)
    }

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
