import type { Argv } from "yargs"
import { Effect } from "effect"
import { eq, and, gte, sql } from "drizzle-orm"
import { Database } from "@codo-ai/core/database/database"
import { SecurityFindingTable } from "@codo-ai/core/security/sql"
import { effectCmd, fail } from "../../effect-cmd"
import { InstanceRef } from "@/effect/instance-ref"

type Severity = "critical" | "high" | "medium" | "low" | "info"
type Status = "open" | "fixed" | "accepted-risk" | "false-positive"
type Format = "markdown" | "json" | "sarif"

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
}

function severityToSarifLevel(severity: Severity): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") return "error"
  if (severity === "medium") return "warning"
  return "note"
}

function parseLocation(loc: string): { file: string; line?: number } {
  const match = /^(.+):(\d+)$/.exec(loc)
  if (match) return { file: match[1], line: Number(match[2]) }
  return { file: loc }
}

function formatMarkdown(findings: FindingRow[], projectID: string): string {
  if (findings.length === 0) return "No findings recorded for this project.\n"
  const bySeverity = groupBy(findings, (f) => f.severity)
  const lines: string[] = [`# Security Findings — ${projectID}`, ""]
  for (const sev of ["critical", "high", "medium", "low", "info"] as Severity[]) {
    const group = bySeverity[sev]
    if (!group || group.length === 0) continue
    lines.push(`## ${sev.toUpperCase()} (${group.length})`, "")
    for (const f of group) {
      lines.push(`### ${f.finding}`)
      lines.push(`- **ID:** ${f.id}`)
      lines.push(`- **Category:** ${f.category}`)
      lines.push(`- **Location:** \`${f.location}\``)
      lines.push(`- **Status:** ${f.status}`)
      lines.push(`- **Persona:** ${f.persona}`)
      if (f.cvss_score != null) lines.push(`- **CVSS:** ${f.cvss_score}`)
      lines.push(`- **Evidence:** ${f.evidence}`)
      lines.push(`- **Remediation:** ${f.remediation}`)
      lines.push("")
    }
  }
  return lines.join("\n")
}

function formatJson(findings: FindingRow[]): string {
  return JSON.stringify(
    findings.map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      confidence: f.confidence,
      status: f.status,
      finding: f.finding,
      location: f.location,
      evidence: f.evidence,
      remediation: f.remediation,
      persona: f.persona,
      fingerprint: f.fingerprint,
      cvss_score: f.cvss_score,
      cvss_vector: f.cvss_vector,
      epss_score: f.epss_score,
      time_created: f.time_created,
      time_status_changed: f.time_status_changed,
    })),
    null,
    2,
  )
}

function formatSarif(findings: FindingRow[]): string {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0" as const,
    runs: [
      {
        tool: {
          driver: {
            name: "codo-sec",
            version: "1.0.0",
            rules: findings.map((f) => ({
              id: f.category,
              shortDescription: { text: f.finding },
              defaultConfiguration: { level: severityToSarifLevel(f.severity) },
            })),
          },
        },
        results: findings.map((f) => {
          const loc = parseLocation(f.location)
          return {
            ruleId: f.category,
            level: severityToSarifLevel(f.severity),
            message: { text: f.finding },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: loc.file },
                  ...(loc.line != null ? { region: { startLine: loc.line } } : {}),
                },
              },
            ],
            partialFingerprints: { codoFingerprint: f.fingerprint },
            properties: {
              id: f.id,
              severity: f.severity,
              confidence: f.confidence,
              status: f.status,
              persona: f.persona,
              evidence: f.evidence,
              remediation: f.remediation,
            },
          }
        }),
      },
    ],
  }
  return JSON.stringify(sarif, null, 2)
}

interface FindingRow {
  id: string
  persona: string
  category: string
  location: string
  confidence: string
  severity: string
  finding: string
  evidence: string
  remediation: string
  status: string
  fingerprint: string
  cvss_score: number | null
  cvss_vector: string | null
  epss_score: number | null
  time_created: number
  time_status_changed: number | null
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    ;(result[k] ??= []).push(item)
  }
  return result
}

export const SecReportCommand = effectCmd({
  command: "report",
  describe: "show security findings for the current project",
  builder: (yargs: Argv) =>
    yargs
      .option("format", {
        type: "string",
        choices: ["markdown", "json", "sarif"] as const,
        default: "markdown",
        describe: "output format",
      })
      .option("fail-on", {
        type: "string",
        choices: ["critical", "high", "medium", "low", "info"] as const,
        describe: "exit non-zero if any finding at or above this severity exists",
      })
      .option("since", {
        type: "string",
        describe: "only show findings created after this date (ISO 8601)",
      })
      .option("status", {
        type: "string",
        choices: ["open", "fixed", "accepted-risk", "false-positive"] as const,
        describe: "filter by status (default: all)",
      }),
  handler: Effect.fn("Cli.sec.report")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const { db } = yield* Database.Service
    const projectID = ctx.project.id

    const conditions = [eq(SecurityFindingTable.project_id, projectID)]

    if (args.status) {
      conditions.push(eq(SecurityFindingTable.status, args.status as Status))
    }
    if (args.since) {
      const since = Date.parse(args.since)
      if (isNaN(since)) return yield* fail(`Invalid date: ${args.since}`)
      conditions.push(gte(SecurityFindingTable.time_created, since))
    }

    const rows = yield* db
      .select()
      .from(SecurityFindingTable)
      .where(and(...conditions))
      .all()
      .pipe(Effect.orDie) as Effect.Effect<FindingRow[]>

    const findings = rows as FindingRow[]

    const format = (args.format ?? "markdown") as Format
    if (format === "json") {
      console.log(formatJson(findings))
    } else if (format === "sarif") {
      console.log(formatSarif(findings))
    } else {
      console.log(formatMarkdown(findings, projectID))
    }

    if (args.failOn) {
      const threshold = SEVERITY_RANK[args.failOn as Severity]
      const hasMatching = findings.some((f) => SEVERITY_RANK[f.severity as Severity] >= threshold)
      if (hasMatching) process.exitCode = 1
    }
  }),
})
