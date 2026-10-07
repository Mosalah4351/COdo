import { Effect } from "effect"
import { ChildProcess } from "child_process"

const TOOLS = ["node", "python", "patchright"] as const

export type ScrapeToolName = (typeof TOOLS)[number]

export interface ScrapeToolPresence {
  tool: ScrapeToolName
  available: boolean
  version?: string
}

async function checkTool(name: string, timeoutMs: number): Promise<ScrapeToolPresence> {
  try {
    // Async spawn, never spawnSync: probing missing commands on Windows blocks
    // the whole thread for seconds per tool, starving every timer on it.
    const proc = Bun.spawn([name, "--version"], { stdio: ["ignore", "pipe", "pipe"] })
    const timer = setTimeout(() => proc.kill(), timeoutMs)
    const [text, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    if (exitCode === 0) {
      return { tool: name as ScrapeToolName, available: true, version: text.trim().split("\n")[0] }
    }
  } catch {}
  return { tool: name as ScrapeToolName, available: false }
}

export function checkScrapeTools(): Effect.Effect<ScrapeToolPresence[]> {
  return Effect.promise(() =>
    Promise.all([
      checkTool("node", 5000),
      checkTool("python", 5000),
      // Probing patchright through npx: may resolve the package on first call,
      // so give it more room than the bare-runtime probes.
      checkScrapePatchright(),
    ]),
  )
}

async function checkScrapePatchright(): Promise<ScrapeToolPresence> {
  const presence = await checkTool("patchright", 5000)
  if (presence.available) return presence
  try {
    const proc = Bun.spawn(["npx", "patchright", "--version"], { stdio: ["ignore", "pipe", "pipe"] })
    const timer = setTimeout(() => proc.kill(), 15000)
    const [text, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    clearTimeout(timer)
    if (exitCode === 0) {
      return { tool: "patchright", available: true, version: text.trim().split("\n")[0] }
    }
  } catch {}
  return { tool: "patchright", available: false }
}

/**
 * Personas that display a toolchain line. Only scrape topic workers today;
 * keyed by persona name so future scrape personas can opt in.
 */
const PERSONA_TOOLS: Record<string, readonly ScrapeToolName[]> = {
  "scrape-topic": TOOLS,
}

const availability = new Map<string, boolean>()
let primed = false

/**
 * Fire-and-forget refresh of the process-wide availability snapshot. Checks are
 * async subprocess spawns with timeouts — they never block the caller's thread.
 * The first preamble after priming may omit the line until probes settle.
 */
function primeScrapeToolPresence(): void {
  if (primed) return
  primed = true
  Effect.runPromise(checkScrapeTools())
    .then((results) => {
      for (const r of results) availability.set(r.tool, r.available)
    })
    .catch(() => {})
}

/**
 * Compact one-line presence summary for a persona's scraping tools, e.g.
 * `"toolchain: node ✓ python ✗ patchright ✓"`. Returns undefined while cold or
 * for unmapped personas so callers append it only when it carries information.
 */
export function toolchainLine(persona: string): string | undefined {
  const tools = PERSONA_TOOLS[persona]
  if (!tools) return undefined
  primeScrapeToolPresence()
  if (availability.size === 0) return undefined
  const parts = tools.map((t) => `${t} ${availability.get(t) ? "✓" : "✗"}`)
  return `toolchain: ${parts.join(" ")}`
}
