import { Effect, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { FSUtil } from "@codo-ai/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as Tool from "./tool"
import DESCRIPTION from "./sec_probe.txt"
import { evaluateGate, type GateBlockReason } from "@/security/scope-gate"

/** Response bodies are evidence, not content to consume. Keep them small. */
const MAX_BODY_BYTES = 8 * 1024
const EVIDENCE_BODY_CHARS = 2 * 1024
const REQUEST_TIMEOUT = 20 * 1000

/** Per-dispatch budget. A pentest confirms a hypothesis; it does not sweep. */
const MAX_REQUESTS_PER_SESSION = 100
const MIN_INTERVAL_MS = 100 // <= 10 req/s

/** Headers that must never be echoed into a findings document. */
const REDACTED_HEADERS = new Set(["authorization", "proxy-authorization", "cookie", "set-cookie"])

const PASSIVE_METHODS = new Set(["GET", "HEAD"])

export const Parameters = Schema.Struct({
  url: Schema.String.annotate({ description: "Absolute http(s) URL. Must be inside the scope file's targets." }),
  method: Schema.optional(Schema.Literals(["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"])).annotate({
    description: "HTTP method. Defaults to GET. DELETE is always refused.",
  }),
  headers: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: "Extra request headers.",
  }),
  body: Schema.optional(Schema.String).annotate({
    description: "Request body. Requires allow_active_scan in the scope file.",
  }),
  note: Schema.optional(Schema.String).annotate({
    description: "One line on what this request is meant to prove.",
  }),
})

/**
 * Reason codes returned to the model. The scope gate's own vocabulary is
 * reused verbatim so a persona can relay it without translation, plus the
 * modes this tool enforces on top of the gate.
 */
export type BlockReason =
  | GateBlockReason
  | "destructive-method"
  | "active-scan-required"
  | "budget-exhausted"
  | "bad-url"

export const SecProbeTool = Tool.define(
  "sec_probe",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const fs = yield* FSUtil.Service

    /**
     * Request budget, per session, for the lifetime of this tool instance.
     * Lives here rather than in the prompt because a budget the model can
     * choose to ignore is not a budget.
     */
    const budget = new Map<string, { count: number; last: number }>()

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context): Effect.Effect<Tool.ExecuteResult> =>
        Effect.gen(function* () {
          const method = params.method ?? "GET"
          const blocked = (reason: BlockReason, detail: string, recommendation: string): Tool.ExecuteResult => ({
            title: `sec_probe blocked (${reason})`,
            metadata: { blocked: true, reason },
            output: [
              `## SEC-RESULT skill=sec-test:scope-gate status=blocked reason=${reason}`,
              ``,
              `Target: ${params.url}`,
              `Detail: ${detail}`,
              `Recommendation: ${recommendation}`,
              ``,
              `No request was sent. Relay this reason to the user verbatim and stop.`,
            ].join("\n"),
          })

          if (!/^https?:\/\//i.test(params.url)) {
            return blocked("bad-url", `'${params.url}' is not an absolute http(s) URL`, "Pass a full URL including scheme.")
          }
          if (method === "DELETE") {
            return blocked(
              "destructive-method",
              "DELETE is refused regardless of scope",
              "Confirm the authorization weakness with a read-only request instead; never exercise the destructive path.",
            )
          }

          const instance = yield* InstanceState.context
          const gate = yield* evaluateGate({ projectDir: instance.directory, fs, target: params.url })
          if (!gate.ok) {
            return blocked(
              gate.reason,
              gate.detail,
              gate.reason === "missing"
                ? "Create .codo/security-scope.json via the sec-test:scope skill, then retry."
                : gate.reason === "expired"
                  ? "Refresh the scope file's `expires` after re-confirming authorization."
                  : gate.reason === "target-not-in-scope"
                    ? "Add the target to scope.targets only with explicit user authorization."
                    : "Fix the scope file so it satisfies the schema.",
            )
          }

          const active = gate.scope.allow_active_scan === true
          if (!active && !PASSIVE_METHODS.has(method)) {
            return blocked(
              "active-scan-required",
              `method ${method} needs allow_active_scan, which is false`,
              "Ask the user to authorize active scanning, or confirm the finding passively.",
            )
          }
          if (!active && params.body !== undefined) {
            return blocked(
              "active-scan-required",
              "a request body needs allow_active_scan, which is false",
              "Ask the user to authorize active scanning, or drop the body.",
            )
          }

          const seen = budget.get(ctx.sessionID) ?? { count: 0, last: 0 }
          if (seen.count >= MAX_REQUESTS_PER_SESSION) {
            return blocked(
              "budget-exhausted",
              `this session has already issued ${seen.count} probes (cap ${MAX_REQUESTS_PER_SESSION})`,
              "Report what you have. Start a new dispatch if genuinely more coverage is authorized.",
            )
          }

          yield* ctx.ask({
            permission: "sec_probe",
            patterns: [params.url],
            // Deliberately NOT ["*"]: an "always allow" on this tool would let a
            // later in-scope approval silently cover a different host.
            always: [params.url],
            metadata: { url: params.url, method, note: params.note, active_scan: active },
          })

          const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - seen.last))
          if (wait > 0) yield* Effect.sleep(wait)
          budget.set(ctx.sessionID, { count: seen.count + 1, last: Date.now() })

          const request = HttpClientRequest.make(method)(params.url).pipe(
            HttpClientRequest.setHeaders({
              "User-Agent": "COdo-sec-pentest (authorized scope-gated probe)",
              ...(params.headers ?? {}),
            }),
            params.body === undefined ? (r) => r : HttpClientRequest.bodyText(params.body),
          )

          // A refused connection, DNS failure, or TLS error is a legitimate
          // observation for a pentester — the target's posture is part of the
          // finding. Capture it as a result instead of failing the tool.
          const attempt = yield* Effect.result(
            Effect.gen(function* () {
              const response = yield* http.execute(request).pipe(
                Effect.timeoutOrElse({
                  duration: REQUEST_TIMEOUT,
                  orElse: () => Effect.die(new Error(`sec_probe timed out after ${REQUEST_TIMEOUT}ms`)),
                }),
              )
              const buffer = yield* response.arrayBuffer
              return { response, buffer }
            }),
          )

          if (attempt._tag === "Failure") {
            return {
              title: `${method} ${params.url} → transport error`,
              metadata: { method, url: params.url, transport_error: true },
              output: [
                `## SEC-RESULT skill=sec-test:pentest status=partial reason=transport-error`,
                ``,
                `Target: ${params.url}`,
                `The request was authorized and sent, but the transport failed:`,
                "```",
                String(attempt.failure),
                "```",
                ``,
                `This is an observation, not a vulnerability. Confirm the host is reachable`,
                `and the port/scheme are right before treating it as a finding.`,
              ].join("\n"),
            }
          }

          const response = attempt.success.response
          const buffer = attempt.success.buffer
          const truncatedTransport = buffer.byteLength > MAX_BODY_BYTES
          const text = Buffer.from(buffer.slice(0, MAX_BODY_BYTES)).toString("utf8")
          const evidence = text.length > EVIDENCE_BODY_CHARS ? text.slice(0, EVIDENCE_BODY_CHARS) : text

          const headers = Object.entries(response.headers)
            .map(([k, v]) => `${k}: ${REDACTED_HEADERS.has(k.toLowerCase()) ? "<redacted>" : v}`)
            .toSorted()

          return {
            title: `${method} ${params.url} → ${response.status}`,
            metadata: {
              status: response.status,
              method,
              url: params.url,
              active_scan: active,
              probe_count: seen.count + 1,
            },
            output: [
              `## SEC-RESULT skill=sec-test:pentest status=complete probe=${seen.count + 1}`,
              ``,
              ...(params.note ? [`Intent: ${params.note}`, ``] : []),
              `Status: ${response.status}`,
              ``,
              `Response headers (secrets redacted):`,
              ...headers.map((h) => `  ${h}`),
              ``,
              `Response body${truncatedTransport ? " (truncated)" : ""}:`,
              "```",
              evidence,
              "```",
              ``,
              `Replayable repro:`,
              "```bash",
              reproCommand(params.url, method, params.headers, params.body),
              "```",
            ].join("\n"),
          }
        }).pipe(Effect.orDie),
    }
  }),
)

/**
 * A curl line a developer can paste to reproduce the probe. Authorization and
 * cookie headers are placeholdered rather than printed so a findings document
 * committed to the repo never carries a live credential.
 */
function reproCommand(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  body: string | undefined,
): string {
  return [
    `curl -i -X ${method}`,
    ...Object.keys(headers ?? {}).map(
      (k) => `  -H '${k}: ${REDACTED_HEADERS.has(k.toLowerCase()) ? "<your-credential>" : headers![k]}'`,
    ),
    ...(body === undefined ? [] : [`  --data '${body.replaceAll("'", "'\\''")}'`]),
    `  '${url}'`,
  ].join(" \\\n")
}
