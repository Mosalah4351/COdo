import { Effect, Option, Schema } from "effect"
import { FSUtil } from "@codo-ai/core/fs-util"

const BaselineFile = Schema.Struct({
  version: Schema.optional(Schema.Number),
  entries: Schema.Array(
    Schema.Struct({
      fingerprint: Schema.String,
      reason: Schema.String,
      /** Optional ISO-8601 sunset. Omit for a permanent acceptance. */
      expires: Schema.optional(Schema.String),
    }),
  ),
})

export type Baseline = typeof BaselineFile.Type
export type BaselineEntry = Baseline["entries"][number]

export const RELATIVE_PATH = ".codo/security-baseline.json"

export type LoadResult =
  | { ok: true; entries: Map<string, BaselineEntry>; expired: BaselineEntry[] }
  /** Absent is the normal case, not an error — it just means nothing is suppressed. */
  | { ok: true; entries: Map<string, BaselineEntry>; expired: BaselineEntry[]; missing: true }
  | { ok: false; reason: "unparseable"; detail: string }

/**
 * Load `.codo/security-baseline.json` — the list of findings the project has
 * consciously accepted, keyed by the fingerprint `sec_finding` assigns.
 *
 * A suppressed finding is still recorded; it is stored as `accepted-risk` with
 * the reason attached rather than silently dropped. Dropping it would make the
 * posture report lie about what the scanner actually saw.
 *
 * Entries expire the same way the scope gate expires, so an acceptance cannot
 * quietly outlive the review that granted it. An expired entry is reported back
 * to the caller so it can be surfaced instead of failing closed or open.
 */
export function loadBaseline(options: {
  projectDir: string
  fs: Pick<FSUtil.Interface, "existsSafe" | "readFileStringSafe">
  /** ISO timestamp to evaluate expiry against. Defaults to now. Mostly for tests. */
  now?: Date
}): Effect.Effect<LoadResult, FSUtil.Error> {
  const path = `${options.projectDir}/${RELATIVE_PATH}`
  const now = options.now ?? new Date()
  return Effect.gen(function* () {
    const exists = yield* options.fs.existsSafe(path)
    if (!exists) return { ok: true, entries: new Map(), expired: [], missing: true } as const

    const raw = yield* options.fs.readFileStringSafe(path)
    if (raw === undefined) return { ok: true, entries: new Map(), expired: [], missing: true } as const

    const decoded = Schema.decodeUnknownOption(Schema.fromJsonString(BaselineFile))(raw)
    if (Option.isNone(decoded)) {
      return { ok: false, reason: "unparseable", detail: `${RELATIVE_PATH} is not valid JSON for the baseline schema` } as const
    }

    const entries = new Map<string, BaselineEntry>()
    const expired: BaselineEntry[] = []
    for (const entry of decoded.value.entries) {
      if (entry.expires === undefined) {
        entries.set(entry.fingerprint, entry)
        continue
      }
      const at = new Date(entry.expires)
      // An unparseable expiry is treated as already expired: a malformed date
      // must never grant an indefinite suppression.
      if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) {
        expired.push(entry)
        continue
      }
      entries.set(entry.fingerprint, entry)
    }
    return { ok: true, entries, expired } as const
  })
}

export * as SecurityBaseline from "./baseline"
