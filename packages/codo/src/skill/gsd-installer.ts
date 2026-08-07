/**
 * GSD (Get Shit Done) installer.
 *
 * Downloads a pinned gsd-core release tarball from GitHub, extracts only the
 * OpenCode-needed subtrees (agents/commands/skills/workflows/references/
 * templates/bin/hooks/plugins), applies Claude→OpenCode transformations
 * in-memory, and installs into either the global config dir
 * (`~/.config/codo/gsd/`) or the project-local dir (`<project>/.codo/gsd/`).
 *
 * Pin to a published tag — never chase a moving branch. The default branch
 * of gsd-core is `next`, which is not safe to use as an install target.
 */

import { Context, Effect, Layer } from "effect"
import { LayerNode } from "@codo-ai/core/effect/layer-node"
import { Global } from "@codo-ai/core/global"
import path from "path"
import { mkdir, writeFile, readFile, readdir, rm } from "fs/promises"
import { createWriteStream, existsSync, mkdirSync } from "fs"
import pathPkg from "path"
import { pipeline } from "stream/promises"
import { Readable } from "stream"
import { spawn } from "bun"

/** Latest known-good release tag. Update to a fresh published tag as needed. */
export const GSD_VERSION = "1.8.0"
const GSD_TARBALL = `https://api.github.com/repos/open-gsd/gsd-core/tarball/v${GSD_VERSION}`

export type Scope = "local" | "global"

export interface ScopePaths {
  /** Where the download tarball is cached */
  cache: string
  /** Extraction root for the tarball */
  extractedRoot: string
  /** Final destination for installed content */
  installRoot: string
}

/** Where Claude/Codex-style user skills live (cross-runtime convention). */
export const AGENTS_SKILLS_ROOT = path.join(Global.Path.home, ".agents", "skills")

/**
 * Additional runtime-visible destinations for a complete GSD tree. The
 * installer lands everything it produces in ALL of these so:
 * - `.codo/gsd` is COdo's own primary root (canonical, indexed by compose)
 * - `.agents/gsd-core` matches the manual-import layout the rokicool/gsd-opencode
 *   repo guides users to — needed when users migrated in via that path
 * - (only for global) `~/.config/codo/gsd` keeps the user-global install from
 *   colliding with the project-local one
 */
export function secondaryInstallRoots(scope: Scope, projectDir: string): string[] {
  if (scope === "global") return [path.join(Global.Path.home, ".agents", "gsd-core")]
  return [
    path.join(projectDir, ".agents", "gsd-core"),
    path.join(Global.Path.home, ".agents", "gsd-core"),
  ]
}

export function scopePaths(scope: Scope, projectDir: string): ScopePaths {
  const base = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  return {
    cache: path.join(Global.Path.cache, "gsd"),
    extractedRoot: path.join(Global.Path.cache, "gsd", `core-${GSD_VERSION}`),
    installRoot: path.join(base, "gsd"),
  }
}

// ---- Transformation rules (Claude Code → OpenCode agents/commands) ----

const TOOL_MAP: Record<string, string> = {
  Read: "read", Write: "write", Edit: "edit", Bash: "bash", Glob: "glob", Grep: "grep",
  List: "list", WebFetch: "webfetch", WebSearch: "websearch", TodoWrite: "todowrite",
  Task: "task", AskUserQuestion: "question", Skill: "skill", Web: "web",
}

const COLOR_MAP: Record<string, string> = {
  red: "#FF0000", green: "#008000", blue: "#0000FF", yellow: "#FFFF00",
  cyan: "#00FFFF", magenta: "#FF00FF", orange: "#FFA500", purple: "#800080",
  pink: "#FFC0CB", black: "#000000", white: "#FFFFFF",
}

interface Frontmatter { [key: string]: unknown }

function parseFrontmatter(text: string): { data: Frontmatter; body: string } | null {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null
  const data: Frontmatter = {}
  let inNested = false
  for (const rawLine of match[1].split("\n")) {
    if (rawLine.trim() === "") continue
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0
    if (indent === 0) inNested = false
    const kv = rawLine.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    if (indent === 0) {
      const [, key, value] = kv
      if (value === "" && /^\w+:\s*$/.test(rawLine)) { inNested = true; continue }
      data[key] = value.replace(/^["']|["']$/g, "")
    } else if (inNested) { /* swallow nested (hooks, etc.) */ }
  }
  return { data, body: match[2] }
}

function renderFrontmatter(data: Frontmatter) {
  const lines: string[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      lines.push(`${k}:`)
      for (const [tk, tv] of Object.entries(v as Record<string, unknown>)) lines.push(`  ${tk}: ${tv}`)
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`)
    }
  }
  return `---\n${lines.join("\n")}\n---\n`
}

export function transformAgent(content: string): string {
  const parsed = parseFrontmatter(content)
  if (!parsed) return content
  const data = parsed.data

  if (typeof data.tools === "string") {
    const map: Record<string, boolean> = {}
    for (const t of data.tools.split(",")) {
      const name = t.trim()
      if (!name) continue
      map[TOOL_MAP[name] ?? name.toLowerCase()] = true
    }
    data.tools = map
  }
  if (typeof data.color === "string" && !data.color.startsWith("#")) {
    data.color = COLOR_MAP[data.color.toLowerCase()] ?? data.color
  }
  if (data.mode === undefined) data.mode = "subagent"
  delete data.hooks
  return renderFrontmatter(data) + parsed.body
}

export function transformCommand(content: string): string {
  return content.replace(/\/gsd:([a-z0-9-]+)/gi, (_, name) => `/gsd-${name}`)
}

// ---- Download / extract using OS tar (no extra dep) ----

async function fetchTarball(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "codo-gsd-installer", Accept: "application/vnd.github+json" },
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} fetching ${url}`)
  await mkdir(path.dirname(dest), { recursive: true })
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest))
}

/**
 * On Windows the PATH-resolvable `tar` is the MSYS/Git Bash build, which
 * interprets `C:/...` as a remote host because of the colon. Use bsdtar at
 * its absolute location, or, as a last resort, BSdTar via PowerShell Expand-Archive
 * (we only need a tgz, so we keep tar).
 */
function resolveTarBinary(): string {
  if (process.platform !== "win32") return "tar"
  // bsdtar shipped with Windows supports absolute win32 paths
  for (const candidate of [
    "C:\\Windows\\System32\\tar.exe",
    "C:\\Program Files\\Git\\usr\\bin\\tar.exe",
    "C:\\Program Files (x86)\\Git\\usr\\bin\\tar.exe",
  ]) {
    if (existsSync(candidate)) return candidate
  }
  return "tar"
}

/** Forward-slashes the path so MSYS tar doesn't mistake the drive letter for a remote host. */
function toTarFriendlyPath(p: string) {
  return process.platform === "win32" ? p.replaceAll("\\", "/") : p
}

async function extractTarball(tgz: string, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true })
  const tar = resolveTarBinary()
  const proc = spawn([tar, "-xzf", toTarFriendlyPath(tgz), "-C", toTarFriendlyPath(destDir), "--strip-components=1"])
  const code = await proc.exited
  if (code !== 0) throw new Error(`tar failed with code ${code}`)
}

// ---- Per-scope file copy with transformation ----

async function copyTransformedTree(
  extracted: string,
  installRoot: string,
  srcRel: string,
  dstRel: string,
  opts: { transform?: (c: string) => string; flattenGsdCommands?: boolean } = {},
): Promise<number> {
  const src = path.join(extracted, srcRel)
  if (!existsSync(src)) return 0
  const dst = path.join(installRoot, dstRel)
  await mkdir(dst, { recursive: true })
  let written = 0
  const entries = await readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const srcPath = path.join(src, e.name)
    if (e.isDirectory()) {
      written += await copyTransformedTree(extracted, installRoot, path.join(srcRel, e.name), path.join(dstRel, e.name), opts)
      continue
    }
    if (!e.isFile()) continue
    const extOk = /\.(md|json|cjs|js)$/i.test(e.name) || e.name === "SKILL.md"
    if (!extOk) continue
    let destName = e.name
    if (opts.flattenGsdCommands && srcRel === "commands/gsd" && !destName.startsWith("gsd-")) {
      destName = `gsd-${destName}`
    }
    const content = await readFile(srcPath, "utf-8")
    const final =
      e.name.endsWith(".md") && opts.transform ? opts.transform(content) : content
    await writeFile(path.join(dst, destName), final, "utf-8")
    written++
  }
  return written
}

async function installFromExtracted(extractedRoot: string, installRoot: string): Promise<number> {
  let count = 0
  count += await copyTransformedTree(extractedRoot, installRoot, "agents", "agents", { transform: transformAgent })
  count += await copyTransformedTree(extractedRoot, installRoot, "commands/gsd", "commands", {
    transform: transformCommand,
    flattenGsdCommands: true,
  })
  count += await copyTransformedTree(extractedRoot, installRoot, "skills", "skills")
  count += await copyTransformedTree(extractedRoot, installRoot, "gsd-core/references", "references")
  count += await copyTransformedTree(extractedRoot, installRoot, "gsd-core/templates", "templates")
  count += await copyTransformedTree(extractedRoot, installRoot, "gsd-core/workflows", "workflows")
  count += await copyTransformedTree(extractedRoot, installRoot, "gsd-core/bin", "bin")
  count += await copyTransformedTree(extractedRoot, installRoot, "hooks", "hooks")
  count += await copyTransformedTree(extractedRoot, installRoot, "scripts", "scripts")

  const pluginSrc = path.join(extractedRoot, ".opencode", "plugins", "gsd-core.js")
  if (existsSync(pluginSrc)) {
    const dstDir = path.join(installRoot, "plugins")
    await mkdir(dstDir, { recursive: true })
    await writeFile(path.join(dstDir, "gsd-core.js"), await readFile(pluginSrc, "utf-8"), "utf-8")

    // The plugin dir gets a marker declaring CommonJS so Node doesn't walk up
    // and resolve `type: "module"` from a higher package.json — without this,
    // the .js entry crashes at require-time when the user's config dir has ESM
    // type. Mirrors what upstream does in plugins/package.json (#2544).
    const markerPath = path.join(dstDir, "package.json")
    if (!existsSync(markerPath)) {
      await writeFile(markerPath, JSON.stringify({ type: "commonjs" }, null, 2) + "\n", "utf-8")
      count++
    }
    count++
  }

  await writeFile(
    path.join(installRoot, ".installed-at"),
    new Date().toISOString(),
    "utf-8",
  )
  return count
}

/**
 * Mirror the installed command files into the user-skills shape that Claude
 * Code, Codex, Cursor and other runtimes all scan: one directory per slash
 * command under `<root>/gsd-<name>/SKILL.md` holding the command's body.
 * COdo reads its own copies from `.codo/gsd/`; the `~/.agents/skills/` mirror
 * makes the same commands discoverable to external tools on the same machine.
 * `~/.codo/skills/` is COdo's own user-level skill root (parallel to
 * `~/.agents/skills/` for the cross-runtime layout).
 *
 * Beyond just the per-command SKILL.md files, the mirror also replicates the
 * whole auxiliary content tree (references/, templates/, workflows/, bin/,
 * hooks/, scripts/) into `<root>/.agents/skills/gsd-core/` so the local
 * project layout is complete — this is what `npx @opengsd/gsd-core` produces
 * when run with `--claude`.
 */
export async function mirrorToAgentsSkills(installRoot: string): Promise<number> {
  const commandsDir = path.join(installRoot, "commands")
  let written = 0

  // Per-command SKILL.md mirrors (existing behavior).
  if (existsSync(commandsDir)) {
    const entries = await readdir(commandsDir, { withFileTypes: true })
    const targets = [AGENTS_SKILLS_ROOT, path.join(Global.Path.home, ".codo", "skills")]
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue
      const commandName = entry.name.replace(/\.md$/, "")
      if (!commandName.startsWith("gsd-")) continue
      const body = await readFile(path.join(commandsDir, entry.name), "utf-8")
      for (const root of targets) {
        const dest = path.join(root, commandName)
        await mkdir(dest, { recursive: true })
        const existing = path.join(dest, "SKILL.md")
        const prior = existsSync(existing) ? await readFile(existing, "utf-8") : undefined
        if (prior === body) continue
        await writeFile(existing, body, "utf-8")
        written++
      }
    }
  }

  // Full auxiliary tree into the dedicated gsd-core mirror slot. This is what
  // makes the local layout complete: scripts/, hooks/, bin/, references/,
  // templates/, workflows/ are all reachable under one root.
  const auxSrcs = ["references", "templates", "workflows", "bin", "hooks", "scripts"] as const
  const targets = [
    path.join(AGENTS_SKILLS_ROOT, "gsd-core"),
    path.join(Global.Path.home, ".codo", "skills", "gsd-core"),
  ]
  for (const aux of auxSrcs) {
    const src = path.join(installRoot, aux)
    if (!existsSync(src)) continue
    for (const targetRoot of targets) {
      written += await copyTransformedTree(installRoot, targetRoot, aux, aux)
    }
  }
  return written
}

// ---- Public API ----

export interface InstallResult {
  scope: Scope
  installRoot: string
  filesInstalled: number
  version: string
}

export interface Interface {
  readonly install: (scope: Scope, projectDir: string) => Effect.Effect<InstallResult, Error>
  readonly isInstalled: (scope: Scope, projectDir: string) => Effect.Effect<boolean>
  readonly installDir: (scope: Scope, projectDir: string) => string
}

export class Service extends Context.Service<Service, Interface>()("@codo/GSD") {}

export const layer = Layer.succeed(
  Service,
  Service.of({
    install: (scope, projectDir) =>
      Effect.tryPromise({
        try: async () => {
          const paths = scopePaths(scope, projectDir)
          const tgz = path.join(paths.cache, `gsd-core-${GSD_VERSION}.tgz`)

          await mkdir(paths.cache, { recursive: true })
          if (!existsSync(tgz)) await fetchTarball(GSD_TARBALL, tgz)

          if (!existsSync(path.join(paths.extractedRoot, "agents"))) {
            await rm(paths.extractedRoot, { recursive: true, force: true }).catch(() => {})
            await extractTarball(tgz, paths.extractedRoot)
          }

          let copied = await installFromExtracted(paths.extractedRoot, paths.installRoot)
          // Mirror the complete tree (scripts/, hooks/, plugins/, etc.) into the
          // companion runtime roots so subagents find them regardless of which
          // convention the workflow file points at.
          for (const secondary of secondaryInstallRoots(scope, projectDir)) {
            if (secondary === paths.installRoot) continue
            copied += await installFromExtracted(paths.extractedRoot, secondary)
          }
          // Only global installs fan out to the user-skills roots — local
          // installs are project-scoped and shouldn't pollute cross-runtime config.
          if (scope === "global") {
            await mirrorToAgentsSkills(paths.installRoot)
          }
          return {
            scope,
            installRoot: paths.installRoot,
            filesInstalled: copied,
            version: GSD_VERSION,
          }
        },
        catch: (err) => (err instanceof Error ? err : new Error(String(err))),
      }),
    isInstalled: (scope, projectDir) =>
      Effect.sync(() => existsSync(path.join(scopePaths(scope, projectDir).installRoot, "agents"))),
    installDir: (scope, projectDir) => scopePaths(scope, projectDir).installRoot,
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(defaultLayer, [])

export * as GSD from "./gsd-installer"
