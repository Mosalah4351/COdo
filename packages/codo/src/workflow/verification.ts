/**
 * Verification pipeline — evidence collection and quality gates.
 *
 * Simplified from GSD-Pi's auto-verification.ts (1337 lines) + verification-gate.ts (989 lines).
 * Key patterns preserved:
 *   - Command discovery (task plan → preference → package.json)
 *   - Evidence collection via child process spawning
 *   - Quality gate evaluation
 *   - Failure context formatting
 *
 * Simplifications:
 *   - No SQLite state (file-based evidence)
 *   - No worktree or session management
 *   - No cost tracking or budget enforcement
 *   - No auto-retry logic
 *   - No task recovery domain operations
 */

import { spawnSync } from "child_process"
import { existsSync, readFileSync, readdirSync } from "fs"
import { join, basename } from "path"

import type {
  PlanTask,
  Unit,
  VerificationEvidence,
  QualityGate,
} from "./types"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max output bytes per command (10 KB) */
const MAX_OUTPUT_BYTES = 10 * 1024

/** Max failure output per check (2K chars) */
const MAX_FAILURE_OUTPUT_PER_CHECK = 2_000

/** Max total failure context (10K chars) */
const MAX_FAILURE_CONTEXT_CHARS = 10_000

/** Default command timeout (60 seconds) */
const DEFAULT_TIMEOUT_MS = 60_000

/** Package.json script keys to probe */
const PACKAGE_SCRIPT_KEYS = ["typecheck", "lint", "test"] as const

/** Known safe command prefixes */
const KNOWN_COMMAND_PREFIXES = new Set([
  "npm", "npx", "yarn", "pnpm", "bun", "bunx", "deno",
  "node", "ts-node", "tsx", "tsc",
  "python", "python3", "pytest",
  "cargo", "go", "make", "gradle",
])

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveredCommands {
  commands: string[]
  source: "task-plan" | "preference" | "package-json" | "python-project" | "node-test-file" | "none"
}

export interface VerificationResult {
  checks: VerificationCheckResult[]
  discoverySource: DiscoveredCommands["source"]
  timestamp: number
}

export interface VerificationCheckResult {
  command: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

// ─── Command Discovery ──────────────────────────────────────────────────────

/**
 * Discover verification commands using first-non-empty-wins strategy:
 *   1. Task plan verify field
 *   2. Explicit preference commands
 *   3. package.json scripts (typecheck, lint, test)
 *   4. Python pytest project markers
 *   5. None found
 */
export function discoverCommands(
  cwd: string,
  taskVerify?: string,
  preferenceCommands?: string[],
): DiscoveredCommands {
  // 1. Task plan verify field
  if (taskVerify && taskVerify.trim()) {
    const commands = taskVerify
      .split(/\r?\n/)
      .map(c => c.trim())
      .filter(Boolean)
      .filter(c => validateCommand(c))

    if (commands.length > 0) {
      return { commands, source: "task-plan" }
    }
  }

  // 2. Preference commands
  if (preferenceCommands && preferenceCommands.length > 0) {
    const filtered = preferenceCommands.map(c => c.trim()).filter(Boolean)
    if (filtered.length > 0) {
      return { commands: filtered, source: "preference" }
    }
  }

  // 3. package.json scripts
  const pkgPath = join(cwd, "package.json")
  if (existsSync(pkgPath)) {
    try {
      const raw = readFileSync(pkgPath, "utf-8")
      const pkg = JSON.parse(raw)
      if (pkg?.scripts && typeof pkg.scripts === "object") {
        const commands: string[] = []
        for (const key of PACKAGE_SCRIPT_KEYS) {
          if (typeof pkg.scripts[key] === "string") {
            commands.push(`npm run ${key}`)
          }
        }
        if (commands.length > 0) {
          return { commands, source: "package-json" }
        }
      }
    } catch {
      // Malformed package.json — fall through
    }
  }

  // 4. Python pytest
  const pythonCommand = discoverPythonPytest(cwd)
  if (pythonCommand) {
    return { commands: [pythonCommand], source: "python-project" }
  }

  return { commands: [], source: "none" }
}

// ─── Evidence Collection ─────────────────────────────────────────────────────

/**
 * Collect verification evidence for a task.
 *
 * Runs discovered commands and captures exit codes, stdout, stderr.
 */
export function collectEvidence(
  task: PlanTask,
  workingDir: string,
  preferenceCommands?: string[],
): VerificationResult {
  const { commands, source } = discoverCommands(
    workingDir,
    task.verification?.join("\n"),
    preferenceCommands,
  )

  const checks: VerificationCheckResult[] = []
  const timestamp = Date.now()

  for (const command of commands) {
    const result = runCommand(command, workingDir)
    checks.push(result)
  }

  return { checks, discoverySource: source, timestamp }
}

/**
 * Run a single verification command.
 */
function runCommand(command: string, cwd: string): VerificationCheckResult {
  const startTime = Date.now()

  try {
    // Use cross-platform shell invocation
    const isWindows = process.platform === "win32"
    const shell = isWindows ? "cmd" : "sh"
    const flag = isWindows ? "/c" : "-c"

    const result = spawnSync(shell, [flag, command], {
      cwd,
      timeout: DEFAULT_TIMEOUT_MS,
      encoding: "utf-8",
      maxBuffer: MAX_OUTPUT_BYTES * 2,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    })

    return {
      command,
      exitCode: result.status ?? 1,
      stdout: truncate(result.stdout ?? "", MAX_OUTPUT_BYTES),
      stderr: truncate(result.stderr ?? "", MAX_OUTPUT_BYTES),
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      command,
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    }
  }
}

// ─── Quality Gates ───────────────────────────────────────────────────────────

/**
 * Evaluate quality gates for a unit based on evidence.
 */
export function evaluateGates(
  unit: Unit,
  evidence: VerificationResult,
): QualityGate[] {
  const gates: QualityGate[] = []

  // Gate: All verification commands passed
  const failedChecks = evidence.checks.filter(c => c.exitCode !== 0)
  gates.push({
    gateId: "verification-commands",
    scope: unit.type === "task" ? "task" : unit.type === "slice" ? "slice" : "milestone",
    status: "evaluated",
    verdict: failedChecks.length === 0 ? "pass" : "fail",
    rationale: failedChecks.length === 0
      ? "All verification commands passed"
      : `${failedChecks.length} verification command(s) failed`,
    findings: failedChecks.map(c => `${c.command} exited with code ${c.exitCode}`),
    evaluatedAt: new Date(),
  })

  // Gate: No verification commands discovered (warn)
  if (evidence.checks.length === 0) {
    gates.push({
      gateId: "verification-discovery",
      scope: unit.type === "task" ? "task" : unit.type === "slice" ? "slice" : "milestone",
      status: "evaluated",
      verdict: "fail",
      rationale: "No verification commands discovered",
      findings: ["No typecheck, lint, or test commands found"],
      evaluatedAt: new Date(),
    })
  }

  // Gate: Output quality (warn on large stderr)
  const largeStderr = evidence.checks.filter(c => c.stderr.length > MAX_OUTPUT_BYTES / 2)
  if (largeStderr.length > 0) {
    gates.push({
      gateId: "output-quality",
      scope: unit.type === "task" ? "task" : unit.type === "slice" ? "slice" : "milestone",
      status: "evaluated",
      verdict: "pass",
      rationale: "Verification produced large stderr output (informational)",
      findings: largeStderr.map(c => `${c.command} produced ${(c.stderr.length / 1024).toFixed(1)}KB stderr`),
      evaluatedAt: new Date(),
    })
  }

  return gates
}

// ─── Failure Formatting ─────────────────────────────────────────────────────

/**
 * Format failure context for prompt injection.
 */
export function formatFailureContext(result: VerificationResult): string {
  const failures = result.checks.filter(c => c.exitCode !== 0)
  if (failures.length === 0) return ""

  const blocks: string[] = []

  for (const check of failures) {
    const hasStderr = (check.stderr ?? "").trim().length > 0
    const outputLabel = hasStderr ? "stderr" : "stdout"
    let output = hasStderr ? check.stderr ?? "" : check.stdout ?? ""
    if (output.length > MAX_FAILURE_OUTPUT_PER_CHECK) {
      output = output.slice(0, MAX_FAILURE_OUTPUT_PER_CHECK) + "\n…[truncated]"
    }

    blocks.push(
      `### ❌ \`${check.command}\` (exit code ${check.exitCode})\n\`\`\`${outputLabel}\n${output}\n\`\`\``,
    )
  }

  let body = blocks.join("\n\n")
  const header = "## Verification Failures\n\n"

  if (header.length + body.length > MAX_FAILURE_CONTEXT_CHARS) {
    body =
      body.slice(0, MAX_FAILURE_CONTEXT_CHARS - header.length) +
      "\n\n…[remaining failures truncated]"
  }

  return header + body
}

/**
 * Format failure signature for deduplication.
 */
export function formatFailureSignature(result: VerificationResult): string {
  return result.checks
    .filter(c => c.exitCode !== 0)
    .map(c => `${c.command.trim()}#${c.exitCode}`)
    .sort()
    .join("\n")
}

// ─── Evidence Rendering ──────────────────────────────────────────────────────

/**
 * Render evidence table as markdown.
 */
export function renderEvidenceTable(evidence: VerificationResult): string {
  if (evidence.checks.length === 0) {
    return "No verification evidence collected."
  }

  const lines = [
    "## Verification Evidence",
    "",
    "| Command | Exit Code | Duration | Status |",
    "|---------|-----------|----------|--------|",
  ]

  for (const check of evidence.checks) {
    const status = check.exitCode === 0 ? "✅ Pass" : "❌ Fail"
    const duration = `${check.durationMs}ms`
    lines.push(`| \`${check.command}\` | ${check.exitCode} | ${duration} | ${status} |`)
  }

  lines.push("")
  lines.push(`**Discovery source:** ${evidence.discoverySource}`)

  return lines.join("\n")
}

/**
 * Render evidence as JSON for persistence.
 */
export function renderEvidenceJSON(evidence: VerificationResult): string {
  return JSON.stringify(evidence, null, 2)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate a verification command (basic safety check).
 */
function validateCommand(command: string): boolean {
  if (!command || command.length > 500) return false
  if (/[`$()]/.test(command)) return false // No command substitution
  if (/;\s*\w/.test(command)) return false // No chained commands
  if (/\|\|/.test(command) || /&&/.test(command)) return false // No shell operators
  return true
}

/**
 * Discover Python pytest command.
 */
function discoverPythonPytest(cwd: string): string | null {
  const hasPytestConfig = existsSync(join(cwd, "pytest.ini"))
  const pyprojectPath = join(cwd, "pyproject.toml")

  if (hasPytestConfig) {
    return "python3 -m pytest"
  }

  if (existsSync(pyprojectPath)) {
    try {
      const pyproject = readFileSync(pyprojectPath, "utf-8")
      if (
        pyproject.includes("[tool.pytest]") ||
        pyproject.includes("[tool.pytest.") ||
        pyproject.includes("[pytest]") ||
        pyproject.includes("[tool:pytest]")
      ) {
        return "python3 -m pytest"
      }
    } catch {
      // Ignore unreadable pyproject.toml
    }
  }

  return null
}

/**
 * Truncate a string to max bytes.
 */
function truncate(value: string | null | undefined, maxBytes: number): string {
  if (!value) return ""
  if (Buffer.byteLength(value, "utf-8") <= maxBytes) return value
  const buf = Buffer.from(value, "utf-8").subarray(0, maxBytes)
  return buf.toString("utf-8") + "\n…[truncated]"
}