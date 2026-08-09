import { Schema } from "effect"
import { SecurityFinding } from "@codo-ai/core/security/sql"

/**
 * Persona-tier fingerprint for a finding. The SQL table's unique index is
 * on (project_id, fingerprint); personas running scanners produce up-serts
 * instead of duplicates.
 */
export function fingerprintFinding(input: {
  persona: string
  category: string
  location: string
  evidence: string
}): string {
  const normalized = normalizeEvidence(input.evidence)
  const raw = `${input.persona}|${input.category}|${input.location}|${normalized}`
  return sha1(raw)
}

/** Lowercase, trim, collapse whitespace — strips volatile tokens (timestamps, temp paths). */
function normalizeEvidence(evidence: string): string {
  return evidence
    .toLowerCase()
    .replaceAll(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, "<ts>")        // ISO timestamps
    .replaceAll(/\b[0-9a-f]{8,64}\b/g, "<hex>")                                  // opaque ids
    .replaceAll(/[A-Za-z]:[\\\/][^\s"']*[/\\]temp[/\\][^\s"']*/gi, "<tmp>")    // temp paths
    .replaceAll(/\s+/g, " ")
    .trim()
}

function sha1(input: string): string {
  // FNV-1a is available without node:crypto and plenty for a string dedup key.
  // (SHA1 not required here — collision resistance isn't the property that
  // matters for the unique index.)
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619)
  }
  return h.toString(16).padStart(8, "0")
}

/**
 * Read-side validation: enforce the enum contract on every insert path.
 * Use this helper inside the report skill's persist step instead of calling
 * db.insert(SecurityFindingTable).values(...) directly.
 */
export const FindingRowIn = Schema.Struct({
  persona: Schema.String,
  category: Schema.String,
  location: Schema.String,
  confidence: Schema.Literals(SecurityFinding.Confidence),
  severity: Schema.Literals(SecurityFinding.Severity),
  finding: Schema.String,
  evidence: Schema.String,
  remediation: Schema.String,
  status: Schema.Literals(SecurityFinding.Status),
  fingerprint: Schema.String,
  project_id: Schema.String,
  session_id: Schema.optional(Schema.String),
  cvss_score: Schema.optional(Schema.Number),
  cvss_vector: Schema.optional(Schema.String),
  epss_score: Schema.optional(Schema.Number),
  metadata: Schema.optional(Schema.Unknown),
})

export type FindingRowIn = typeof FindingRowIn.Type

export function validateFinding(input: unknown): FindingRowIn {
  return Schema.decodeUnknownSync(FindingRowIn)(input)
}
