/**
 * Doctor checks — health validation for .planning/ directory.
 *
 * Simplified from GSD-Pi's doctor system.
 * Runs basic health checks and reports issues.
 */

import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"

import type { DoctorCheck } from "./types"

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run doctor checks on a project directory.
 */
export async function runDoctor(projectDir: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = []

  // Check .planning/ exists
  checks.push(checkPlanningDir(projectDir))

  // Check STATE.md
  checks.push(checkStateFile(projectDir))

  // Check ROADMAP.md
  checks.push(checkRoadmapFile(projectDir))

  // Check phases directory
  checks.push(checkPhasesDir(projectDir))

  // Check phase structure
  const phasesDir = join(projectDir, ".planning", "phases")
  if (existsSync(phasesDir)) {
    const phaseEntries = readdirSync(phasesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())

    for (const phase of phaseEntries) {
      const phaseDir = join(phasesDir, phase.name)
      checks.push(checkPhaseStructure(projectDir, phase.name, phaseDir))
    }
  }

  // Check templates directory
  checks.push(checkTemplatesDir(projectDir))

  // Check gitignore
  checks.push(checkGitignore(projectDir))

  return checks
}

/**
 * Render doctor results as markdown.
 */
export function renderDoctorResults(checks: DoctorCheck[]): string {
  const lines = [
    "## Health Check Results",
    "",
  ]

  const passed = checks.filter(c => c.status === "pass").length
  const failed = checks.filter(c => c.status === "fail").length
  const warned = checks.filter(c => c.status === "warn").length

  lines.push(`**Summary:** ${passed} passed, ${failed} failed, ${warned} warnings`)
  lines.push("")

  // Show failures first
  const failures = checks.filter(c => c.status === "fail")
  if (failures.length > 0) {
    lines.push("### ❌ Failures")
    lines.push("")
    for (const check of failures) {
      lines.push(`- **${check.name}**: ${check.message}`)
      if (check.fix) {
        lines.push(`  - Fix: ${check.fix}`)
      }
    }
    lines.push("")
  }

  // Then warnings
  const warnings = checks.filter(c => c.status === "warn")
  if (warnings.length > 0) {
    lines.push("### ⚠️ Warnings")
    lines.push("")
    for (const check of warnings) {
      lines.push(`- **${check.name}**: ${check.message}`)
      if (check.fix) {
        lines.push(`  - Fix: ${check.fix}`)
      }
    }
    lines.push("")
  }

  // Then passes
  const passes = checks.filter(c => c.status === "pass")
  if (passes.length > 0) {
    lines.push("### ✅ Passed")
    lines.push("")
    for (const check of passes) {
      lines.push(`- **${check.name}**: ${check.message}`)
    }
  }

  return lines.join("\n")
}

// ─── Individual Checks ───────────────────────────────────────────────────────

function checkPlanningDir(projectDir: string): DoctorCheck {
  const planningDir = join(projectDir, ".planning")
  if (!existsSync(planningDir)) {
    return {
      name: ".planning/ directory",
      status: "fail",
      message: ".planning/ directory does not exist",
      fix: "Run `gsd:new-project` to initialize .planning/",
    }
  }

  return {
    name: ".planning/ directory",
    status: "pass",
    message: ".planning/ directory exists",
  }
}

function checkStateFile(projectDir: string): DoctorCheck {
  const statePath = join(projectDir, ".planning", "STATE.md")
  if (!existsSync(statePath)) {
    return {
      name: "STATE.md",
      status: "warn",
      message: "STATE.md does not exist",
      fix: "Create STATE.md to track project state",
    }
  }

  try {
    const content = readFileSync(statePath, "utf-8")
    if (content.trim().length === 0) {
      return {
        name: "STATE.md",
        status: "warn",
        message: "STATE.md is empty",
      }
    }
    return {
      name: "STATE.md",
      status: "pass",
      message: "STATE.md exists and has content",
    }
  } catch {
    return {
      name: "STATE.md",
      status: "fail",
      message: "STATE.md exists but cannot be read",
    }
  }
}

function checkRoadmapFile(projectDir: string): DoctorCheck {
  const roadmapPath = join(projectDir, ".planning", "ROADMAP.md")
  if (!existsSync(roadmapPath)) {
    return {
      name: "ROADMAP.md",
      status: "warn",
      message: "ROADMAP.md does not exist",
      fix: "Create ROADMAP.md to define project milestones",
    }
  }

  return {
    name: "ROADMAP.md",
    status: "pass",
    message: "ROADMAP.md exists",
  }
}

function checkPhasesDir(projectDir: string): DoctorCheck {
  const phasesDir = join(projectDir, ".planning", "phases")
  if (!existsSync(phasesDir)) {
    return {
      name: "phases/ directory",
      status: "warn",
      message: "phases/ directory does not exist",
      fix: "Create phases/ directory to store phase artifacts",
    }
  }

  const entries = readdirSync(phasesDir, { withFileTypes: true })
  const phaseCount = entries.filter(e => e.isDirectory()).length

  return {
    name: "phases/ directory",
    status: "pass",
    message: `phases/ directory exists with ${phaseCount} phase(s)`,
  }
}

function checkPhaseStructure(projectDir: string, phaseName: string, phaseDir: string): DoctorCheck {
  const requiredFiles = ["CONTEXT.md", "ROADMAP.md"]
  const missing: string[] = []

  for (const file of requiredFiles) {
    if (!existsSync(join(phaseDir, file))) {
      missing.push(file)
    }
  }

  if (missing.length > 0) {
    return {
      name: `Phase ${phaseName} structure`,
      status: "warn",
      message: `Phase ${phaseName} is missing: ${missing.join(", ")}`,
      fix: `Add missing files to .planning/phases/${phaseName}/`,
    }
  }

  return {
    name: `Phase ${phaseName} structure`,
    status: "pass",
    message: `Phase ${phaseName} has required files`,
  }
}

function checkTemplatesDir(projectDir: string): DoctorCheck {
  const templatesDir = join(projectDir, ".planning", "templates")
  if (!existsSync(templatesDir)) {
    return {
      name: "templates/ directory",
      status: "warn",
      message: "templates/ directory does not exist",
      fix: "Templates are optional but recommended for consistency",
    }
  }

  return {
    name: "templates/ directory",
    status: "pass",
    message: "templates/ directory exists",
  }
}

function checkGitignore(projectDir: string): DoctorCheck {
  const gitignorePath = join(projectDir, ".gitignore")
  if (!existsSync(gitignorePath)) {
    return {
      name: ".gitignore",
      status: "warn",
      message: ".gitignore does not exist",
      fix: "Create .gitignore to exclude .planning/ if desired",
    }
  }

  try {
    const content = readFileSync(gitignorePath, "utf-8")
    if (content.includes(".planning")) {
      return {
        name: ".gitignore",
        status: "pass",
        message: ".gitignore includes .planning/",
      }
    }
    return {
      name: ".gitignore",
      status: "warn",
      message: ".gitignore does not exclude .planning/",
      fix: "Add `.planning/` to .gitignore if you don't want to track planning files",
    }
  } catch {
    return {
      name: ".gitignore",
      status: "warn",
      message: ".gitignore exists but cannot be read",
    }
  }
}