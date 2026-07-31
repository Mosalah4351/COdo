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

function transformAgent(content: string): string {
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

function transformCommand(content: string): string {
  return content.replace(/\/gsd:([a-z0-9-]+)/gi, "/gsd-$1")
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

async function extractTarball(tgz: string, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true })
  const proc = spawn(["tar", "-xzf", tgz, "-C", destDir, "--strip-components=1"])
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

  const pluginSrc = path.join(extractedRoot, ".opencode", "plugins", "gsd-core.js")
  if (existsSync(pluginSrc)) {
    const dstDir = path.join(installRoot, "plugins")
    await mkdir(dstDir, { recursive: true })
    await writeFile(path.join(dstDir, "gsd-core.js"), await readFile(pluginSrc, "utf-8"), "utf-8")
    count++
  }

  await writeFile(
    path.join(installRoot, ".installed-at"),
    new Date().toISOString(),
    "utf-8",
  )
  return count
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

          const copied = await installFromExtracted(paths.extractedRoot, paths.installRoot)
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

export * as GSD from "./gsd-installer"
