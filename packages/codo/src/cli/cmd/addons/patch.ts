import path from "path"
import {
  type ParseError as JsoncParseError,
  applyEdits,
  modify,
  parse as parseJsonc,
  printParseErrorCode,
} from "jsonc-parser"
import { Filesystem } from "@/util/filesystem"
import { ConfigPaths } from "@/config/paths"
import { Global } from "@codo-ai/core/global"

export type Scope = "local" | "global"

export type PatchDeps = {
  readText: (file: string) => Promise<string>
  write: (file: string, text: string) => Promise<void>
  exists: (file: string) => Promise<boolean>
  files: (dir: string) => string[]
}

export interface PatchResult {
  ok: boolean
  error?: string
  configFile?: string
}

const defaultDeps: PatchDeps = {
  readText: (file) => Filesystem.readText(file),
  write: async (file, text) => { await Filesystem.write(file, text) },
  exists: (file) => Filesystem.exists(file),
  files: (dir) => ConfigPaths.fileInDirectory(dir, "COdo"),
}

/**
 * Patch CODO.json to enable an addon:
 * 1. Add to `addons{}` with addon info
 * 2. Add skill path to `skills.paths[]`
 */
export async function enableAddonInConfig(
  addonName: string,
  addonValue: Record<string, unknown>,
  skillDir: string,
  scope: Scope,
  projectDir: string,
  deps: PatchDeps = defaultDeps,
): Promise<PatchResult> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = deps.files(configDir)
  let cfg = files[0]
  for (const file of files) {
    if (await deps.exists(file)) { cfg = file; break }
  }

  const src = await deps.readText(cfg).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return "{}"
    return err
  })
  if (src instanceof Error) return { ok: false, error: src.message }

  const text = src.trim() ? src : "{}"
  const errs: JsoncParseError[] = []
  const data = parseJsonc(text, errs, { allowTrailingComma: true })
  if (errs.length) {
    const err = errs[0]; const lines = text.substring(0, err.offset).split("\n")
    return { ok: false, error: `JSON parse error at line ${lines.length}: ${printParseErrorCode(err.error)}` }
  }

  let out = text

  // Set addons.<name> = { ... }
  out = applyEdits(out, modify(out, ["addons", addonName], addonValue, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  }))

  // Add skill dir to skills.paths[] if not already present
  const existingPaths: string[] = (data as any)?.skills?.paths ?? []
  if (!existingPaths.includes(skillDir)) {
    const newPaths = [...existingPaths, skillDir]
    if (!(data as any)?.skills) {
      out = applyEdits(out, modify(out, ["skills"], { paths: newPaths }, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    } else {
      out = applyEdits(out, modify(out, ["skills", "paths"], newPaths, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    }
  }

  await deps.write(cfg, out)
  return { ok: true, configFile: cfg }
}

/**
 * Patch CODO.json to disable an addon:
 * 1. Remove skill path from `skills.paths[]`
 * 2. Set `addons.<name>.enabled = false`
 */
export async function disableAddonInConfig(
  addonName: string,
  skillDir: string,
  scope: Scope,
  projectDir: string,
  deps: PatchDeps = defaultDeps,
): Promise<PatchResult> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = deps.files(configDir)
  let cfg = files[0]
  for (const file of files) {
    if (await deps.exists(file)) { cfg = file; break }
  }

  const src = await deps.readText(cfg).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return "{}"
    return err
  })
  if (src instanceof Error) return { ok: false, error: src.message }

  const text = src.trim() ? src : "{}"
  const errs: JsoncParseError[] = []
  const data = parseJsonc(text, errs, { allowTrailingComma: true })
  if (errs.length) {
    const err = errs[0]; const lines = text.substring(0, err.offset).split("\n")
    return { ok: false, error: `JSON parse error at line ${lines.length}: ${printParseErrorCode(err.error)}` }
  }

  let out = text

  // Remove skill dir from skills.paths[]
  const existingPaths: string[] = (data as any)?.skills?.paths ?? []
  const filteredPaths = existingPaths.filter((p: string) => p !== skillDir)
  if (filteredPaths.length !== existingPaths.length) {
    if (filteredPaths.length === 0) {
      out = applyEdits(out, modify(out, ["skills", "paths"], undefined, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    } else {
      out = applyEdits(out, modify(out, ["skills", "paths"], filteredPaths, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    }
  }

  // Set enabled = false
  out = applyEdits(out, modify(out, ["addons", addonName, "enabled"], false, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  }))

  await deps.write(cfg, out)
  return { ok: true, configFile: cfg }
}

/**
 * Read current addon state from CODO.json
 */
export async function readAddonState(
  addonName: string,
  scope: Scope,
  projectDir: string,
): Promise<{ enabled: boolean; installed: boolean; configDir: string } | null> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = ConfigPaths.fileInDirectory(configDir, "COdo")
  let cfg = files[0]
  for (const file of files) {
    if (await Filesystem.exists(file)) { cfg = file; break }
  }

  const src = await Filesystem.readText(cfg).catch(() => "{}")
  const errs: JsoncParseError[] = []
  const data = parseJsonc(src, errs, { allowTrailingComma: true })
  if (errs.length) return null

  const addons = (data as any)?.addons
  if (!addons || !addons[addonName]) return null

  const entry = addons[addonName]
  return {
    enabled: Boolean(entry.enabled),
    installed: true,
    configDir,
  }
}
