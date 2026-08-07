import { Effect, Option, Schema } from "effect"
import { FSUtil } from "@codo-ai/core/fs-util"

const ScopeFile = Schema.Struct({
  version: Schema.optional(Schema.Number),
  created: Schema.optional(Schema.String),
  expires: Schema.String,
  targets: Schema.NonEmptyArray(
    Schema.Struct({
      type: Schema.Literals(["web", "api", "host"]),
      value: Schema.String,
      notes: Schema.optional(Schema.String),
    }),
  ),
  allow_active_scan: Schema.optional(Schema.Boolean),
  out_of_scope: Schema.optional(Schema.Array(Schema.String)),
  contact: Schema.optional(Schema.String),
})

export type SecurityScope = typeof ScopeFile.Type

export type GateBlockReason =
  | "missing"
  | "unparseable"
  | "expired"
  | "no-targets"
  | "target-not-in-scope"

export type GateResult =
  | { ok: true; scope: SecurityScope }
  | { ok: false; reason: GateBlockReason; detail: string }

/**
 * Validate .codo/security-scope.json for the given project. This is the gate
 * the sec-pentest persona invokes before any dynamic testing.
 *
 * Returns a discriminated GateResult — callers should not need to inspect
 * thrown exceptions. The filesystem reading lives in Effect for composability
 * inside agent runtimes; the parsing/expiry logic is pure.
 */
export function evaluateGate(options: {
  projectDir: string
  fs: Pick<FSUtil.Interface, "existsSafe" | "readFileStringSafe">
  /** Explicit target from the dispatch prompt. When provided, we confirm it appears in scope.targets. */
  target?: string
  /** ISO timestamp to evaluate expiry against. Defaults to now. Mostly for tests. */
  now?: Date
}): Effect.Effect<GateResult, FSUtil.Error> {
  const path = `${options.projectDir}/.codo/security-scope.json`
  const now = options.now ?? new Date()
  return Effect.gen(function* () {
    const exists = yield* options.fs.existsSafe(path)
    if (!exists) return { ok: false, reason: "missing", detail: `no scope file at ${path}` } as const
    const raw = yield* options.fs.readFileStringSafe(path)
    if (raw === undefined) {
      return { ok: false, reason: "missing", detail: `scope file unreadable at ${path}` } as const
    }
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch (err) {
      return { ok: false, reason: "unparseable", detail: `scope file is not valid JSON` } as const
    }
    const parsed = Schema.decodeUnknownOption(ScopeFile)(json)
    if (Option.isNone(parsed)) {
      return { ok: false, reason: "unparseable", detail: `scope file fails schema validation` } as const
    }
    const scope = parsed.value
    const expires = new Date(scope.expires)
    if (Number.isNaN(expires.getTime())) {
      return { ok: false, reason: "unparseable", detail: `expires '${scope.expires}' is not ISO-8601` } as const
    }
    if (expires.getTime() <= now.getTime()) {
      return { ok: false, reason: "expired", detail: `scope expired at ${scope.expires}`, } as const
    }
    if (scope.targets.length === 0) {
      return { ok: false, reason: "no-targets", detail: "scope file has an empty targets array" } as const
    }
    if (options.target) {
      const target = options.target
      const hit = scope.targets.some((t) => t.value === target || target.startsWith(t.value))
      if (!hit) {
        return {
          ok: false,
          reason: "target-not-in-scope",
          detail: `target '${target}' is not listed in scope.targets`,
        } as const
      }
    }
    return { ok: true, scope } as const
  })
}
