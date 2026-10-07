import { Effect, Schema } from "effect"
import { and, eq } from "drizzle-orm"
import { Database } from "@codo-ai/core/database/database"
import { SecurityFindingTable } from "@codo-ai/core/security/sql"
import { Identifier } from "@codo-ai/core/id/id"
import { FSUtil } from "@codo-ai/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import { FindingInput, fingerprintFinding } from "@/security/finding"
import { loadBaseline } from "@/security/baseline"
import * as Tool from "./tool"
import DESCRIPTION from "./sec_finding.txt"

export const Parameters = Schema.Struct({
  findings: Schema.Array(FindingInput).annotate({
    description: "One entry per finding. id and fingerprint are assigned by the runtime.",
  }),
  rescan: Schema.optional(Schema.Boolean).annotate({
    description:
      "Set true only when a scanner actually re-ran. Required to transition a previously `fixed` finding back to `open`.",
  }),
})

export const SecFindingTool = Tool.define(
  "sec_finding",
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const fs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context): Effect.Effect<Tool.ExecuteResult> =>
        Effect.gen(function* () {
          if (params.findings.length === 0) {
            return {
              title: "no findings recorded",
              metadata: { recorded: 0 },
              output: "No findings supplied. Nothing recorded.",
            }
          }

          const instance = yield* InstanceState.context
          const projectID = instance.project.id
          const baseline = yield* loadBaseline({ projectDir: instance.directory, fs })
          const suppressed = baseline.ok ? baseline.entries : new Map()

          yield* ctx.ask({
            permission: "sec_finding",
            patterns: [projectID],
            always: ["*"],
            metadata: { count: params.findings.length, persona: ctx.agent },
          })

          const now = Date.now()
          const rows: { id: string; fingerprint: string; status: string; severity: string; deduped: boolean }[] = []

          for (const input of params.findings) {
            const fingerprint = fingerprintFinding({
              persona: ctx.agent,
              category: input.category,
              location: input.location,
              evidence: input.evidence,
            })
            const accepted = suppressed.get(fingerprint)
            const status = accepted ? ("accepted-risk" as const) : (input.status ?? ("open" as const))
            const metadata = accepted
              ? { ...(input.metadata ?? {}), reason: accepted.reason, suppressed_by: "security-baseline" }
              : input.metadata

            const existing = yield* db
              .select()
              .from(SecurityFindingTable)
              .where(
                and(eq(SecurityFindingTable.project_id, projectID), eq(SecurityFindingTable.fingerprint, fingerprint)),
              )
              .get()

            // A `fixed` row is only reopened when a scanner actually re-ran.
            // Without this guard every audit pass would resurrect closed
            // findings and the trend line would be meaningless.
            if (existing && existing.status === "fixed" && status === "open" && params.rescan !== true) {
              rows.push({
                id: existing.id,
                fingerprint,
                status: "fixed",
                severity: existing.severity,
                deduped: true,
              })
              continue
            }

            const id = existing?.id ?? Identifier.ascending("finding")
            const statusChanged = existing ? existing.status !== status : true

            yield* db
              .insert(SecurityFindingTable)
              .values({
                id,
                persona: ctx.agent,
                category: input.category,
                location: input.location,
                confidence: input.confidence,
                severity: input.severity,
                finding: input.finding,
                evidence: input.evidence,
                remediation: input.remediation,
                status,
                cvss_score: input.cvss_score,
                cvss_vector: input.cvss_vector,
                epss_score: input.epss_score,
                metadata,
                fingerprint,
                project_id: projectID,
                session_id: ctx.sessionID,
                time_created: now,
                time_updated: now,
                time_status_changed: statusChanged ? now : (existing?.time_status_changed ?? null),
              })
              .onConflictDoUpdate({
                target: [SecurityFindingTable.project_id, SecurityFindingTable.fingerprint],
                set: {
                  severity: input.severity,
                  confidence: input.confidence,
                  finding: input.finding,
                  evidence: input.evidence,
                  remediation: input.remediation,
                  status,
                  cvss_score: input.cvss_score,
                  cvss_vector: input.cvss_vector,
                  epss_score: input.epss_score,
                  metadata,
                  session_id: ctx.sessionID,
                  time_updated: now,
                  ...(statusChanged ? { time_status_changed: now } : {}),
                },
              })

            rows.push({ id, fingerprint, status, severity: input.severity, deduped: Boolean(existing) })
          }

          const bySeverity = rows.reduce<Record<string, number>>((acc, r) => {
            acc[r.severity] = (acc[r.severity] ?? 0) + 1
            return acc
          }, {})
          const newCount = rows.filter((r) => !r.deduped).length

          return {
            title: `recorded ${rows.length} finding${rows.length === 1 ? "" : "s"} (${newCount} new)`,
            metadata: { recorded: rows.length, new: newCount, bySeverity },
            output: [
              `Recorded ${rows.length} finding(s) for project ${projectID}: ${newCount} new, ${rows.length - newCount} already known.`,
              ``,
              `By severity: ${Object.entries(bySeverity).map(([k, v]) => `${k}=${v}`).join(" ") || "none"}`,
              ...(baseline.ok && baseline.expired.length > 0
                ? [
                    ``,
                    `WARNING: ${baseline.expired.length} baseline suppression(s) have expired and no longer apply:`,
                    ...baseline.expired.map((e) => `  - ${e.fingerprint}: ${e.reason}`),
                  ]
                : []),
              ...(baseline.ok === false ? [``, `WARNING: security-baseline.json ignored — ${baseline.detail}`] : []),
              ``,
              `Assigned ids (cite these in your markdown report):`,
              ...rows.map((r) => `  - ${r.id} [${r.severity}/${r.status}] fingerprint=${r.fingerprint}`),
            ].join("\n"),
          }
          // A failure to persist a finding is a defect, not a security signal —
          // surface it as a defect rather than silently reporting success.
        }).pipe(Effect.orDie),
    }
  }),
)
