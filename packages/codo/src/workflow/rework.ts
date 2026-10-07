/**
 * Rework briefs — generate actionable fix instructions for failed verifications.
 *
 * Simplified from GSD-Pi's rework system.
 * Takes evidence and gates, produces a structured brief for the agent to follow.
 */

import type {
  VerificationEvidence,
  QualityGate,
  ReworkBrief,
  ReworkFinding,
} from "./types"

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a rework brief from failed evidence and gates.
 */
export function createReworkBrief(
  evidence: VerificationEvidence[],
  gates: QualityGate[],
  context?: {
    milestoneId?: string
    sliceId?: string
    taskId?: string
  },
): ReworkBrief {
  const findings: ReworkFinding[] = []

  // Convert failed evidence to findings
  for (const ev of evidence) {
    if (ev.verdict === "fail") {
      findings.push({
        findingId: `evidence-${ev.id}`,
        severity: "blocking",
        description: `Command \`${ev.command}\` failed with exit code ${ev.exitCode}`,
        requiredFix: extractRequiredFix(ev.output),
        verificationCommands: [ev.command],
        status: "pending",
      })
    }
  }

  // Convert failed gates to findings
  for (const gate of gates) {
    if (gate.verdict === "fail") {
      findings.push({
        findingId: `gate-${gate.gateId}`,
        severity: gate.scope === "task" ? "blocking" : "major",
        description: `Quality gate "${gate.gateId}" failed: ${gate.rationale}`,
        requiredFix: formatGateFix(gate),
        verificationCommands: [],
        status: "pending",
      })
    }
  }

  return {
    id: `rework-${Date.now()}`,
    milestoneId: context?.milestoneId ?? "",
    sliceId: context?.sliceId ?? "",
    taskId: context?.taskId ?? "",
    findings,
    createdAt: new Date(),
  }
}

/**
 * Render a rework brief as markdown.
 */
export function renderReworkBrief(brief: ReworkBrief): string {
  if (brief.findings.length === 0) {
    return "## Rework Brief\n\nNo findings to address."
  }

  const lines = [
    "## Rework Brief",
    "",
    `**Brief ID:** ${brief.id}`,
    `**Created:** ${brief.createdAt.toISOString()}`,
    "",
    `### Findings (${brief.findings.length})`,
    "",
  ]

  for (const finding of brief.findings) {
    const icon = finding.severity === "blocking" ? "🔴" : finding.severity === "major" ? "🟡" : "🔵"
    lines.push(`${icon} **${finding.findingId}** (${finding.severity})`)
    lines.push("")
    lines.push(`**Description:** ${finding.description}`)
    lines.push("")
    lines.push(`**Required Fix:** ${finding.requiredFix}`)
    lines.push("")

    if (finding.verificationCommands.length > 0) {
      lines.push("**Verification Commands:**")
      for (const cmd of finding.verificationCommands) {
        lines.push(`- \`${cmd}\``)
      }
      lines.push("")
    }

    lines.push("---")
    lines.push("")
  }

  // Summary
  const blocking = brief.findings.filter(f => f.severity === "blocking").length
  const major = brief.findings.filter(f => f.severity === "major").length
  const minor = brief.findings.filter(f => f.severity === "minor").length

  lines.push("### Summary")
  lines.push("")
  lines.push(`- **Blocking:** ${blocking}`)
  lines.push(`- **Major:** ${major}`)
  lines.push(`- **Minor:** ${minor}`)
  lines.push("")
  lines.push(`**Status:** ${blocking > 0 ? "⛔ Cannot proceed until blocking issues are resolved" : "⚠️ Can proceed with caution"}`)

  return lines.join("\n")
}

/**
 * Render rework brief as JSON for persistence.
 */
export function renderReworkBriefJSON(brief: ReworkBrief): string {
  return JSON.stringify(brief, null, 2)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract required fix instruction from command output.
 */
function extractRequiredFix(output: string): string {
  // Look for common error patterns
  const lines = output.split("\n").filter(l => l.trim())

  // TypeScript errors
  const tsErrors = lines.filter(l => l.includes("error TS"))
  if (tsErrors.length > 0) {
    return `Fix TypeScript errors:\n${tsErrors.slice(0, 5).map(l => `  ${l}`).join("\n")}`
  }

  // Test failures
  const testFailures = lines.filter(l => l.includes("FAIL") || l.includes("failed"))
  if (testFailures.length > 0) {
    return `Fix test failures:\n${testFailures.slice(0, 5).map(l => `  ${l}`).join("\n")}`
  }

  // Lint errors
  const lintErrors = lines.filter(l => l.includes("error") || l.includes("warning"))
  if (lintErrors.length > 0) {
    return `Fix lint issues:\n${lintErrors.slice(0, 5).map(l => `  ${l}`).join("\n")}`
  }

  return "Review command output and fix the reported issues"
}

/**
 * Format gate failure as fix instruction.
 */
function formatGateFix(gate: QualityGate): string {
  const findings = gate.findings.length > 0
    ? gate.findings.map(f => `  - ${f}`).join("\n")
    : "  (no specific findings)"

  return `Address quality gate failure:\n${findings}`
}