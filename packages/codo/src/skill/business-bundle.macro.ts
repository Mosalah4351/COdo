import fs from "fs"
import path from "path"
import { createHash } from "crypto"

const JUNK = new Set([".DS_Store", "Thumbs.db", "__pycache__"])

export interface BusinessBundle {
  readonly hash: string
  readonly skills: Record<string, Record<string, string>>
}

function walkDir(base: string, rel: string, out: Record<string, string>) {
  const full = rel ? path.join(base, rel) : base
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (JUNK.has(entry.name) || entry.name.endsWith(".pyc")) continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) walkDir(base, relPath, out)
    else out[relPath] = fs.readFileSync(path.join(full, entry.name), "utf8")
  }
}

export function loadBusinessBundle(): BusinessBundle {
  const dir = path.join(import.meta.dir, "business")
  const skills: Record<string, Record<string, string>> = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const files: Record<string, string> = {}
    walkDir(path.join(dir, entry.name), "", files)
    if (Object.keys(files).length > 0) skills[entry.name] = files
  }
  const hash = createHash("sha256").update(JSON.stringify(skills)).digest("hex").slice(0, 16)
  return { hash, skills }
}
