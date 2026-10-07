import { Effect } from "effect"
import { ChildProcess } from "child_process"

const TOOLS = ["semgrep", "gitleaks", "trufflehog", "osv-scanner", "syft", "grype", "trivy", "cosign"] as const

export type ToolName = (typeof TOOLS)[number]

export interface ToolPresence {
  tool: ToolName
  available: boolean
  version?: string
}

async function checkTool(name: string): Promise<ToolPresence> {
  try {
    // Async spawn, never spawnSync: probing missing commands on Windows blocks
    // the whole thread for seconds per tool, starving every timer on it.
    const proc = Bun.spawn([name, "--version"], { stdio: ["ignore", "pipe", "pipe"] })
    const timer = setTimeout(() => proc.kill(), 5000)
    const [text, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    if (exitCode === 0) {
      return { tool: name as ToolName, available: true, version: text.trim().split("\n")[0] }
    }
  } catch {}
  return { tool: name as ToolName, available: false }
}

export function checkAllTools(): Effect.Effect<ToolPresence[]> {
  return Effect.promise(() => Promise.all(TOOLS.map(checkTool)))
}

export function formatToolPresence(presence: ToolPresence[]): string {
  const lines = ["Tool availability:"]
  for (const p of presence) {
    const status = p.available ? `✓ ${p.version ?? "installed"}` : "✗ not found"
    lines.push(`  ${p.tool.padEnd(15)} ${status}`)
  }
  return lines.join("\n")
}

/**
 * Scanners each toolchain-relevant persona is allowed to run (mirrors the bash
 * grants in `src/agent/sec.ts`). Personas not listed here get no toolchain
 * line in their execution context.
 */
const PERSONA_TOOLS: Record<string, readonly ToolName[]> = {
  "sec-appsec": ["semgrep", "gitleaks", "trufflehog", "osv-scanner"],
  "sec-devsecops": ["osv-scanner", "syft", "grype", "trivy", "cosign"],
}

const availability = new Map<ToolName, boolean>()
let primed = false

/**
 * Fire-and-forget refresh of the process-wide availability snapshot. The
 * underlying checks are synchronous subprocess spawns (`--version`, capped at
 * 5s each), so this runs at most once per process and never on the caller's
 * critical path — the first preamble after priming may omit the line until
 * the probes settle.
 */
function primeToolPresence(): void {
  if (primed) return
  primed = true
  Effect.runPromise(checkAllTools())
    .then((results) => {
      for (const r of results) availability.set(r.tool, r.available)
    })
    .catch(() => {})
}

/**
 * Compact one-line presence summary for a persona's own scanners, e.g.
 * `"toolchain: semgrep ✓ gitleaks ✗ trufflehog ✓"`. Returns undefined while
 * the snapshot is still cold or for personas without mapped scanners, so
 * callers can append it only when it carries information.
 */
export function toolchainLine(persona: string): string | undefined {
  const tools = PERSONA_TOOLS[persona]
  if (!tools) return undefined
  primeToolPresence()
  if (availability.size === 0) return undefined
  const parts = tools.map((t) => `${t} ${availability.get(t) ? "✓" : "✗"}`)
  return `toolchain: ${parts.join(" ")}`
}
