import { SEC_TEST_SKILL_NAMES } from "@/skill/sec-test-skills"

/**
 * The single line every sec-* persona ends its dispatch with, so the
 * orchestrator can route on a parsed value instead of matching prose.
 *
 * Replaces the previous per-skill prose markers, which collided badly: eight
 * skills all returned `## POSTURE REPORT COMPLETE` and three returned
 * `## CODE AUDIT COMPLETE`, so the orchestrator could not tell an
 * agent-surface audit from a lessons-learned append.
 *
 *   ## SEC-RESULT skill=sec-test:code-audit status=complete findings=3 critical=1 high=2 doc=.planning/...
 *   ## SEC-RESULT skill=sec-test:pentest status=blocked reason=missing
 */
export const MARKER = "## SEC-RESULT"

export type Status = "complete" | "blocked" | "partial"

const STATUSES = new Set<Status>(["complete", "blocked", "partial"])

export interface SecResult {
  skill: string
  status: Status
  findings?: number
  critical?: number
  high?: number
  doc?: string
  reason?: string
  /** Fields present on the line that this contract does not define. */
  extra: Record<string, string>
}

export type ParseResult =
  | { ok: true; result: SecResult }
  | { ok: false; reason: "no-marker" | "unknown-status" | "missing-skill" | "unknown-skill"; detail: string }

/**
 * Parse the last SEC-RESULT line in a persona's final message.
 *
 * The LAST occurrence wins: a persona may quote the contract while explaining
 * itself, and its own real result is always emitted last.
 */
export function parse(text: string): ParseResult {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith(MARKER))
    .at(-1)
  if (line === undefined) return { ok: false, reason: "no-marker", detail: `no line starting with '${MARKER}'` }

  const fields = new Map<string, string>()
  // `key=value` pairs, value runs to the next space-delimited `key=`.
  for (const match of line.slice(MARKER.length).matchAll(/([a-z_]+)=(\S+)/g)) {
    fields.set(match[1]!, match[2]!)
  }

  const skill = fields.get("skill")
  if (skill === undefined) return { ok: false, reason: "missing-skill", detail: "no skill= field" }
  if (!SEC_TEST_SKILL_NAMES.has(skill)) {
    return { ok: false, reason: "unknown-skill", detail: `'${skill}' is not a registered sec-test skill` }
  }

  const status = fields.get("status")
  if (status === undefined || !STATUSES.has(status as Status)) {
    return { ok: false, reason: "unknown-status", detail: `status must be one of ${[...STATUSES].join("|")}` }
  }

  const number = (key: string) => {
    const raw = fields.get(key)
    if (raw === undefined) return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  return {
    ok: true,
    result: {
      skill,
      status: status as Status,
      findings: number("findings"),
      critical: number("critical"),
      high: number("high"),
      doc: fields.get("doc"),
      reason: fields.get("reason"),
      extra: Object.fromEntries(
        [...fields].filter(([k]) => !["skill", "status", "findings", "critical", "high", "doc", "reason"].includes(k)),
      ),
    },
  }
}

/** Render the contract line. Used by tests and by tooling that synthesizes results. */
export function format(result: Omit<SecResult, "extra">): string {
  return [
    MARKER,
    `skill=${result.skill}`,
    `status=${result.status}`,
    ...(result.findings === undefined ? [] : [`findings=${result.findings}`]),
    ...(result.critical === undefined ? [] : [`critical=${result.critical}`]),
    ...(result.high === undefined ? [] : [`high=${result.high}`]),
    ...(result.reason === undefined ? [] : [`reason=${result.reason}`]),
    ...(result.doc === undefined ? [] : [`doc=${result.doc}`]),
  ].join(" ")
}

export * as SecResultContract from "./result"
