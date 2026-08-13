import { Effect } from "effect"
import { ChildProcess } from "child_process"

const TOOLS = ["semgrep", "gitleaks", "osv-scanner", "syft", "grype", "trivy", "cosign"] as const

export type ToolName = (typeof TOOLS)[number]

export interface ToolPresence {
  tool: ToolName
  available: boolean
  version?: string
}

function checkTool(name: string): Effect.Effect<ToolPresence> {
  return Effect.gen(function* () {
    try {
      const proc = Bun.spawnSync([name, "--version"], { stdio: ["ignore", "pipe", "pipe"], timeout: 5000 })
      if (proc.exitCode === 0) {
        const version = proc.stdout.toString().trim().split("\n")[0]
        return { tool: name as ToolName, available: true, version }
      }
    } catch {}
    return { tool: name as ToolName, available: false }
  })
}

export function checkAllTools(): Effect.Effect<ToolPresence[]> {
  return Effect.forEach(TOOLS, checkTool, { concurrency: "unbounded" })
}

export function formatToolPresence(presence: ToolPresence[]): string {
  const lines = ["Tool availability:"]
  for (const p of presence) {
    const status = p.available ? `✓ ${p.version ?? "installed"}` : "✗ not found"
    lines.push(`  ${p.tool.padEnd(15)} ${status}`)
  }
  return lines.join("\n")
}
