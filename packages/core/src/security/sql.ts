import { sqliteTable, text, integer, index, uniqueIndex, real } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../database/schema.sql"
import { ProjectTable } from "../project/sql"
import { SessionTable } from "../session/sql"
import type { ProjectV2 } from "../project"
import type { SessionSchema } from "../session/schema"

/**
 * Persistent record of a security finding produced by any sec-* persona.
 *
 * Findings live here as the canonical store; the markdown reports written
 * under `.planning/security/findings/` are derived views. Re-running a
 * scanner up-serts by `fingerprint` (a stable hash of persona+category+
 * file+normalized evidence) so a finding history survives re-discovery
 * without duplicating rows.
 */
export const SecurityFindingTable = sqliteTable(
  "security_finding",
  {
    /** Stable row id (cuid/uuid). */
    id: text().primaryKey(),
    /** Persona that produced the finding (e.g. "sec-appsec", "sec-pentest"). */
    persona: text().notNull(),
    /** OWASP / CWE / framework category tag (e.g. "A03-injection", "CWE-798"). */
    category: text().notNull(),
    /**
     * Code or asset location. Prefer `path/to/file.ts:LINE`; for runtime
     * findings use the URL/host. Stored as plain text — relative paths are
     * resolved against `project_id`'s root when presented.
     */
    location: text().notNull(),
    /** Reporter confidence in the finding (high|medium|low). CHECK-constrained. */
    confidence: text({
      enum: ["high", "medium", "low"],
    }).notNull(),
    /** Severity tier (critical|high|medium|low|info). CHECK-constrained. */
    severity: text({
      enum: ["critical", "high", "medium", "low", "info"],
    }).notNull(),
    /** One-sentence description of the issue. */
    finding: text().notNull(),
    /** Quoted snippet, request/response, or reproduction evidence. */
    evidence: text().notNull(),
    /** Concrete remediation guidance tied to the project stack. */
    remediation: text().notNull(),
    /**
     * Lifecycle status. "fixed" ONLY when the scanner reran clean —
     * a code change by itself does NOT close a finding. CHECK-constrained.
     */
    status: text({
      enum: ["open", "fixed", "accepted-risk", "false-positive"],
    })
      .notNull()
      .default("open"),
    /** Optional CVSS v3.1 base score (0.0–10.0). */
    cvss_score: real(),
    /** Optional CVSS v3.1 vector string. */
    cvss_vector: text(),
    /** Optional EPSS probability (0.0–1.0) when known. */
    epss_score: real(),
    /**
     * Stable dedup fingerprint: hash of (persona, category, location,
     * normalized evidence). Unique per project — repeat scanner runs
     * up-sert against this rather than insert duplicates.
     */
    fingerprint: text().notNull(),
    /** Owning project. Cascade-deletes when the project is removed. */
    project_id: text()
      .$type<ProjectV2.ID>()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    /**
     * Optional session that produced the finding (set when the persona ran
     * inside a `task` dispatch). Nullable because findings may also be
     * written by out-of-band tooling.
     */
    session_id: text()
      .$type<SessionSchema.ID>()
      .references(() => SessionTable.id, { onDelete: "set null" }),
    /** Extra structured metadata (scan tool version, rule id, links). */
    metadata: text({ mode: "json" }).$type<Record<string, unknown>>(),
    ...Timestamps,
    /** Set when `status` last transitioned — used for aging reports. */
    time_status_changed: integer("time_status_changed"),
  },
  (table) => [
    index("security_finding_project_idx").on(table.project_id),
    index("security_finding_session_idx").on(table.session_id),
    index("security_finding_status_idx").on(table.status),
    index("security_finding_severity_idx").on(table.severity),
    index("security_finding_persona_idx").on(table.persona),
    uniqueIndex("security_finding_fingerprint_project_idx").on(table.project_id, table.fingerprint),
  ],
)

export namespace SecurityFinding {
  export type Row = typeof SecurityFindingTable.$inferSelect
  export type Insert = typeof SecurityFindingTable.$inferInsert
  export type Severity = Row["severity"]
  export type Confidence = Row["confidence"]
  export type Status = Row["status"]

  /**
   * Hard enforcement for the enum columns. drift in any future persona prompt
   * can no longer silently corrupt the store: an "info"/"warning" write
   * thrown by a stale prompt fails the Schema step before reaching SQLite,
   * and the same values are CHECK-constrained in the migration so raw SQL
   * writers can't skip around them either.
   */
  export const Severity = ["critical", "high", "medium", "low", "info"] as const
  export const Confidence = ["high", "medium", "low"] as const
  export const Status = ["open", "fixed", "accepted-risk", "false-positive"] as const
  export function isSeverity(x: unknown): x is Severity {
    return typeof x === "string" && Severity.includes(x as Severity)
  }
  export function isConfidence(x: unknown): x is Confidence {
    return typeof x === "string" && Confidence.includes(x as Confidence)
  }
  export function isStatus(x: unknown): x is Status {
    return typeof x === "string" && Status.includes(x as Status)
  }
}
