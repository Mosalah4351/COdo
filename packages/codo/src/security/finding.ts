import { createHash } from "node:crypto"
import { Schema } from "effect"
import { SecurityFinding } from "@codo-ai/core/security/sql"

/**
 * Persona-tier fingerprint for a finding. The SQL table's unique index is
 * on (project_id, fingerprint); personas running scanners produce up-serts
 * instead of duplicates.
 *
 * This is a truncated SHA-256, not a 32-bit hash. Collision resistance DOES
 * matter here: the value backs a UNIQUE index, so two distinct findings that
 * collide would silently up-sert onto one row and the second finding would
 * disappear. 128 bits keeps that probability negligible for any realistic
 * finding count.
 */
export function fingerprintFinding(input: {
  persona: string
  category: string
  location: string
  evidence: string
}): string {
  const raw = `${input.persona}|${input.category}|${input.location}|${normalizeEvidence(input.evidence)}`
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32)
}

/** Lowercase, trim, collapse whitespace — strips volatile tokens (timestamps, temp paths). */
function normalizeEvidence(evidence: string): string {
  return evidence
    .toLowerCase()
    .replaceAll(/\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}[^\s]*/g, "<ts>") // ISO timestamps
    .replaceAll(/\b[0-9a-f]{8,64}\b/g, "<hex>") // opaque ids
    .replaceAll(/[A-Za-z]:[\\/][^\s"']*[/\\]temp[/\\][^\s"']*/gi, "<tmp>") // temp paths
    .replaceAll(/\s+/g, " ")
    .trim()
}

/**
 * What a persona is allowed to supply for a finding.
 *
 * Deliberately omits `id`, `fingerprint`, `project_id`, and `session_id`:
 * the runtime assigns all four. The skills promise "the runtime assigns" for
 * `id`, and letting a model mint its own fingerprint would defeat dedup.
 */
export const FindingInput = Schema.Struct({
  category: Schema.String,
  location: Schema.String,
  confidence: Schema.Literals(SecurityFinding.Confidence),
  severity: Schema.Literals(SecurityFinding.Severity),
  finding: Schema.String,
  evidence: Schema.String,
  remediation: Schema.String,
  status: Schema.optional(Schema.Literals(SecurityFinding.Status)),
  cvss_score: Schema.optional(Schema.Number),
  cvss_vector: Schema.optional(Schema.String),
  epss_score: Schema.optional(Schema.Number),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

export type FindingInput = typeof FindingInput.Type

/**
 * Full row contract, enforced on every insert path so a stale prompt cannot
 * write an out-of-vocabulary severity/confidence/status. The same values are
 * CHECK-constrained in the migration, so raw SQL writers can't skip around
 * this either.
 */
export const FindingRowIn = Schema.Struct({
  ...FindingInput.fields,
  persona: Schema.String,
  status: Schema.Literals(SecurityFinding.Status),
  fingerprint: Schema.String,
  project_id: Schema.String,
  session_id: Schema.optional(Schema.String),
})

export type FindingRowIn = typeof FindingRowIn.Type

export function validateFinding(input: unknown): FindingRowIn {
  return Schema.decodeUnknownSync(FindingRowIn)(input)
}
