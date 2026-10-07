export * as AgentBrowserCLI from "./agent-browser"

import { spawn } from "child_process"
import { Effect } from "effect"

export function isInstalled(): Effect.Effect<boolean> {
  return Effect.callback<boolean>((resume) => {
    const cmd = process.platform === "win32" ? "where" : "which"
    const proc = spawn(cmd, ["agent-browser"])
    proc.on("close", (code) => {
      resume(Effect.succeed(code === 0))
    })
    proc.on("error", () => {
      resume(Effect.succeed(false))
    })
  })
}

export type ExecResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; error: string; stderr: string; code: number | null }

export function exec(
  args: string[],
  options?: { session?: string; timeout?: number; env?: Record<string, string> },
): Effect.Effect<ExecResult> {
  return Effect.callback<ExecResult>((resume) => {
    const env = { ...process.env, ...options?.env }
    if (options?.session) {
      env["AGENT_BROWSER_SESSION"] = options.session
    }
    const proc = spawn("agent-browser", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env,
      timeout: options?.timeout ?? 30000,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    proc.stdout.on("data", (chunk) => stdout.push(chunk))
    proc.stderr.on("data", (chunk) => stderr.push(chunk))
    proc.on("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf-8")
      const err = Buffer.concat(stderr).toString("utf-8")
      if (code === 0) {
        resume(Effect.succeed({ ok: true, stdout: out.trim(), stderr: err.trim() }))
      } else {
        resume(Effect.succeed({ ok: false, error: out.trim() || err.trim(), stderr: err.trim(), code }))
      }
    })
    proc.on("error", (err) => {
      resume(Effect.succeed({ ok: false, error: err.message, stderr: "", code: null }))
    })
  })
}

export function doctor(): Effect.Effect<ExecResult> {
  return exec(["doctor", "--offline", "--quick", "--json"])
}
