import { LayerNode } from "@codo-ai/core/effect/layer-node"
import { Effect, Layer, Context, Schema, Option } from "effect"
import { generateObject, generateText, streamObject, type ModelMessage } from "ai"
import z from "zod"
import * as OtelTracer from "@effect/opentelemetry/Tracer"
import { InstanceState } from "@/effect/instance-state"
import { Provider, type ModelNotFoundError } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import type { ProviderV2 } from "@codo-ai/core/provider"
import type { ModelV2 } from "@codo-ai/core/model"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { EventV2Bridge } from "@/event-v2-bridge"
import { SessionV1 } from "@codo-ai/core/v1/session"
import { SessionID } from "./schema"
import { MessageV2 } from "./message-v2"
import { Event } from "./goal-event"

export { Event }

/**
 * Per-session stop-condition goal. `/goal`: once a goal
 * is set, the main runLoop refuses to stop until an independent judge model
 * decides the condition is satisfied (or genuinely impossible). The judge is a
 * separate model call that only reads the transcript — it does not do the work,
 * so its verdict stays cold relative to the working agent's optimism.
 *
 * State lives in InstanceState (per project instance), keyed by sessionID, and
 * is cleared on instance teardown. See run-state.ts for the sibling pattern.
 */

export type Goal = {
  condition: string
  /** The agent the goal was armed with; only turns from this agent judge the goal. */
  agent: string
  /** Number of judge-driven re-entries so far; bounded by MAX_GOAL_REACT in prompt.ts. */
  react: number
}

export const Verdict = z.object({
  ok: z.boolean(),
  impossible: z.boolean().optional(),
  reason: z.string(),
})

export type Verdict = z.infer<typeof Verdict>

/** Bound on judge-driven re-entries before the gate releases the loop. */
export const MAX_GOAL_REACT = 20

export type GateDecision =
  | { readonly status: "inactive" }
  | { readonly status: "foreign"; readonly agent: string }
  | { readonly status: "released"; readonly attempt: number }
  | { readonly status: "exhausted"; readonly attempt: number }
  | { readonly status: "satisfied"; readonly verdict: Verdict; readonly attempt: number }
  | { readonly status: "impossible"; readonly verdict: Verdict; readonly attempt: number }
  | { readonly status: "pending"; readonly verdict: Verdict; readonly attempt: number }

export class JudgeError extends Schema.TaggedErrorClass<JudgeError>()("SessionGoalJudgeError", {
  cause: Schema.Defect,
}) {}

// ---- Judge prompts  ----

const JUDGE_SYSTEM = `You are evaluating a stop-condition hook in COdo. Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied.

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from the transcript that satisfies the condition>"}
- {"ok": false, "reason": "<quote what is missing or what blocks the condition>"}
- {"ok": false, "impossible": true, "reason": "<explain why the condition can never be satisfied>"}

Always include a "reason" field, quoting specific text from the transcript whenever possible. If the transcript does not contain clear evidence that the condition is satisfied, return {"ok": false, "reason": "insufficient evidence in transcript"}.

Only assistant and tool turns can satisfy the condition — user turns state the request and are never satisfaction evidence, so quote the assistant or tool text that satisfies it. Judge the condition itself, not the request restated in a user turn.

Only use {"ok": false, "impossible": true} when the condition is genuinely unachievable in this session — for example: the condition is self-contradictory, it depends on a resource or capability that is unavailable, or the assistant has explicitly tried, exhausted reasonable approaches, and stated it cannot be done. Apply your own judgment when deciding this — the assistant claiming the goal is impossible is evidence, not proof; independently confirm the condition is genuinely unachievable rather than deferring to the assistant's self-assessment. Do not use it just because the goal has not been reached yet or because progress is slow. When in doubt, return {"ok": false} without "impossible".`

// The closing question appended after the full conversation.
const judgeUser = (condition: string) =>
  `Based on the conversation transcript above, has the following stopping condition been satisfied? Answer based on transcript evidence only.

Condition: ${condition}`

// Lenient verdict extraction from free text: take the outermost {...}
// span and decode it as JSON, then validate. Returns undefined when the
// text holds no parseable verdict so the caller can fall back.
function parseVerdictText(text: string): Verdict | undefined {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return undefined
  const decoded = Schema.decodeUnknownOption(Schema.UnknownFromJsonString)(text.slice(start, end + 1))
  if (Option.isNone(decoded)) return undefined
  const parsed = Verdict.safeParse(decoded.value)
  if (!parsed.success) return undefined
  return parsed.data
}

// Marker for the synthetic goal-check re-entry prompt.ts injects as a user
// turn on every pending verdict ("[Goal check — attempt …] The goal condition
// has not been met yet…"). It must never reach the judge: the next round
// would read the prior false verdict as transcript evidence and anchor on
// it (self-reinforcement). Only fully-synthetic user turns carrying the
// marker are dropped — a genuine user turn quoting the phrase is kept.
const GOAL_REENTRY_MARKER = "The goal condition has not been met yet"

function withoutGoalReentries(msgs: SessionV1.WithParts[]): SessionV1.WithParts[] {
  return msgs.filter((msg) => {
    if (msg.info.role !== "user") return true
    const texts = msg.parts.filter((part): part is SessionV1.TextPart => part.type === "text")
    if (texts.length === 0) return true
    if (!texts.every((part) => part.synthetic === true)) return true
    return !texts.some((part) => part.text.includes(GOAL_REENTRY_MARKER))
  })
}

type JudgeResult = {
  verdict: Verdict
  /** False for the synthesized not-ok default, which bypasses the guard. */
  produced: boolean
}

// Transcript-integrity guard against the blind-judge failure mode: a
// confident {ok:false} produced from a transcript the judge could not
// actually see (assistant turns silently dropped upstream, so an
// "insufficient evidence" claim has nothing behind it), claiming no
// assistant turn exists while the transcript it read has one, or quoting
// evidence that never appears in what the judge read. Such verdicts are
// unverifiable — accepting one as pending publishes a false verdict and
// re-injects it as a synthetic re-entry the next round anchors on.
const INSUFFICIENT_EVIDENCE_PATTERN = /insufficient evidence/i
const MIN_QUOTE_LENGTH = 4
const MIN_SINGLE_QUOTE_LENGTH = 8

// Rule C: the judge claims no assistant turn exists while the transcript it
// read has one. Such absence claims contradict the judge's own input, so the
// verdict is unverifiable regardless of what else the reason quotes.
const ABSENCE_CLAIM_PATTERNS = [
  /transcript only contains/i,
  /only (contains|has) (a |the )?user/i,
  /no assistant (answer|response|message|turn)/i,
  /without (any |an )?assistant (answer|response|message)/i,
  /assistant has not (yet )?(responded|replied|answered)/i,
  /assistant (never|did not|didn't) (respond|reply|answer)/i,
  /no response from (the )?assistant/i,
]

function hasAssistantTurn(conversation: ModelMessage[]): boolean {
  return conversation.some((msg) => msg.role === "assistant")
}

function claimsNoAssistantTurn(reason: string): boolean {
  return ABSENCE_CLAIM_PATTERNS.some((pattern) => pattern.test(reason))
}

function quotedSpans(reason: string): string[] {
  const doubleQuoted = Array.from(reason.matchAll(/"([^"]+)"/g)).flatMap((match) => {
    const span = match[1]?.trim() ?? ""
    if (span.length < MIN_QUOTE_LENGTH) return []
    return [span.toLowerCase()]
  })
  // Single-quoted spans need a higher bar (multi-word, ≥8 chars) so
  // contractions like don't/it's can never false-positive.
  const singleQuoted = Array.from(reason.matchAll(/'([^']+)'/g)).flatMap((match) => {
    const span = match[1]?.trim() ?? ""
    if (span.length < MIN_SINGLE_QUOTE_LENGTH) return []
    if (!span.includes(" ")) return []
    return [span.toLowerCase()]
  })
  return [...doubleQuoted, ...singleQuoted]
}

function isUnverifiableVerdict(input: {
  verdict: Verdict
  conversation: ModelMessage[]
  condition: string
}): boolean {
  if (input.verdict.ok) return false
  if (input.verdict.impossible) return false
  if (INSUFFICIENT_EVIDENCE_PATTERN.test(input.verdict.reason) && !hasAssistantTurn(input.conversation))
    return true
  if (claimsNoAssistantTurn(input.verdict.reason) && hasAssistantTurn(input.conversation)) return true
  const spans = quotedSpans(input.verdict.reason)
  if (spans.length === 0) return false
  const haystack = `${JSON.stringify(input.conversation)}\n${input.condition}`.toLowerCase()
  return spans.some((span) => !haystack.includes(span))
}

// Met-side observability (no enforcement): an ok verdict whose quoted spans
// ground only outside assistant/tool turns cites the request — or the
// condition text — as satisfaction evidence. Logged so future enforcement has
// data; never retried or failed open (a false pending burns re-entries, a
// false release drops the goal silently).
function okVerdictGroundsOnlyOutsideAssistantTurn(input: {
  verdict: Verdict
  conversation: ModelMessage[]
  condition: string
}): boolean {
  const spans = quotedSpans(input.verdict.reason)
  if (spans.length === 0) return false
  const assistantHaystack = JSON.stringify(
    input.conversation.filter((msg) => msg.role === "assistant" || msg.role === "tool"),
  ).toLowerCase()
  if (spans.some((span) => assistantHaystack.includes(span))) return false
  const haystack = `${JSON.stringify(input.conversation)}\n${input.condition}`.toLowerCase()
  return spans.some((span) => haystack.includes(span))
}

export interface Interface {
  readonly set: (sessionID: SessionID, condition: string, agent: string) => Effect.Effect<void>
  readonly get: (sessionID: SessionID) => Effect.Effect<Goal | undefined>
  readonly clear: (sessionID: SessionID) => Effect.Effect<void>
  /** Increment the re-entry counter, returning the new count. */
  readonly bumpReact: (sessionID: SessionID) => Effect.Effect<number>
  /**
   * Fail-open release for the prompt stop gate: publish an error verdict and
   * clear the goal so the loop exits instead of aborting on a
   * model-dependent judge failure.
   */
  readonly failOpen: (input: {
    sessionID: SessionID
    attempt: number
    messageID: string
  }) => Effect.Effect<void>
  /**
   * Run one stop-gate pass for a turn that is about to stop.
   *
   * Failure taxonomy (fail-open vs fail-closed):
   * - JudgeError (transport/provider-call failure inside the judge: the
   *   generateObject/streamObject/generateText calls reject) → fail OPEN:
   *   an error verdict is published, the goal is cleared, and `released`
   *   lets the loop exit. The judge is advisory; infra hiccups must not
   *   wedge the session.
   * - ModelNotFoundError (resolution: unknown or deleted judge model) →
   *   fail CLOSED: propagates with suggestions so the misconfiguration
    *   surfaces loudly instead of silently dropping the goal.
    * - Auth failures → defect (fail closed): missing credentials are setup
    *   problems, never silent.
    * - Output-shape issues (unparseable verdicts) → never throw: the text
    *   fallback and the not-ok default keep the loop working the goal.
    * - Successful-but-unverifiable verdicts (transcript-integrity guard) →
    *   fail OPEN as JudgeError after one retry: never accepted as pending.
    *
   * Only `pending` re-enters the loop; every other decision falls through
   * to the loop exit. Only the agent the goal was armed with is judged —
   * other agents' turns return `foreign` with the goal left armed.
   */
  readonly gate: (input: {
    sessionID: SessionID
    /** Agent of the turn that just stopped; only this agent's goals are judged. */
    agent: string
    msgs: SessionV1.WithParts[]
    model: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
    messageID: string
  }) => Effect.Effect<GateDecision, ModelNotFoundError>
  /**
   * Run the judge over the conversation against the active goal's condition.
   * `msgs` is the main thread's message list; it is converted to native model
   * messages (tool calls/results/images preserved) so the judge independently
    * confirms the work rather than trusting the assistant's self-report.
    *
    * Fails with JudgeError on transport/provider-call failures, when the judge
     * twice returns a successful-but-unverifiable verdict (transcript-integrity
     * guard: an "insufficient evidence" claim with no assistant turn behind it,
     * an absence claim contradicted by an assistant turn in the transcript,
     * or quoted evidence absent from the transcript — retried once first), and
    * with ModelNotFoundError when the judge model cannot be resolved. See `gate`
    * for how each failure class is handled at the stop gate.
    *
    * Prior synthetic goal-check re-entries are excluded from the judge's
    * conversation input so past verdicts cannot anchor the next round.
    */
  readonly evaluate: (input: {
    condition: string
    msgs: SessionV1.WithParts[]
    model: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
  }) => Effect.Effect<Verdict, ModelNotFoundError | JudgeError>
}

export class Service extends Context.Service<Service, Interface>()("@codo/SessionGoal") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const provider = yield* Provider.Service
    const auth = yield* Auth.Service
    const config = yield* Config.Service
    const events = yield* EventV2Bridge.Service

    const state = yield* InstanceState.make(
      Effect.fn("SessionGoal.state")(function* () {
        return {
          goals: new Map<string, Goal>(),
        }
      }),
    )

    const set = Effect.fn("SessionGoal.set")(function* (sessionID: SessionID, condition: string, agent: string) {
      const data = yield* InstanceState.get(state)
      data.goals.set(sessionID, { condition, agent, react: 0 })
      yield* Effect.logInfo("goal set", { sessionID, condition, agent })
      yield* events.publish(Event.Updated, { sessionID, goal: { condition } })
    })

    const get = Effect.fn("SessionGoal.get")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      return data.goals.get(sessionID)
    })

    const clear = Effect.fn("SessionGoal.clear")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      data.goals.delete(sessionID)
      yield* Effect.logInfo("goal cleared", { sessionID })
      yield* events.publish(Event.Updated, { sessionID, goal: undefined })
    })

    const bumpReact = Effect.fn("SessionGoal.bumpReact")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      const goal = data.goals.get(sessionID)
      if (!goal) return 0
      goal.react += 1
      return goal.react
    })

    const failOpen = Effect.fn("SessionGoal.failOpen")(function* (input: {
      sessionID: SessionID
      attempt: number
      messageID: string
    }) {
      yield* events.publish(Event.Updated, {
        sessionID: input.sessionID,
        lastVerdict: {
          ok: true,
          reason: "judge error",
          error: true,
          attempt: input.attempt,
          messageID: input.messageID,
        },
      })
      yield* clear(input.sessionID)
    })

    const evaluate = Effect.fn("SessionGoal.evaluate")(function* (input: {
      condition: string
      msgs: SessionV1.WithParts[]
      model: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
    }) {
      const cfg = yield* config.get()
      const resolved = yield* provider.getModel(input.model.providerID, input.model.modelID)
      const language = yield* provider.getLanguage(resolved)
      const tracer = cfg.experimental?.openTelemetry
        ? Option.getOrUndefined(yield* Effect.serviceOption(OtelTracer.OtelTracer))
        : undefined

      const authInfo = yield* auth.get(resolved.providerID).pipe(Effect.orDie)
      const isOpenaiOauth = resolved.providerID === "openai" && authInfo?.type === "oauth"

      // Convert the conversation to native model messages so the judge sees the
      // real tool calls/results/images — same context the working agent had.
      // Prior synthetic goal-check re-entries are filtered out first so the
      // judge weighs only original turns instead of anchoring on past verdicts.
      //
      // `ensureNonEmptyContent` is applied by hand here because this is the ONE
      // persisted-parts→provider site that does not run `ProviderTransform.message`:
      // `model: language` below is the RAW model, with no `wrapLanguageModel` and no
      // middleware anywhere in this file, so the pre-send invariant that every other
      // build site inherits from the middleware would otherwise be absent. An empty
      // user message here reaches the judge's provider unrepaired. Dropped
      // assistant turns are logged: an empty judge-side transcript behind a
      // confident verdict is exactly the blind-judge failure mode.
      const judgeMsgs = withoutGoalReentries(input.msgs)
      const rawConversation = yield* MessageV2.toModelMessagesEffect(judgeMsgs, resolved)
      const dropped: ModelMessage[] = []
      const conversation = ProviderTransform.ensureNonEmptyContent(rawConversation, (msg) => {
        dropped.push(msg)
      })
      if (dropped.length > 0)
        yield* Effect.logWarning("goal judge input dropped empty assistant turns", {
          condition: input.condition,
          dropped: dropped.length,
        })

      // Diagnostic: dump the FULL message array sent to the judge. Long strings
      // (e.g. base64 image data) are clipped with a length marker so the log
      // stays readable. Debug-level — it dumps the whole transcript on every
      // judge call, so it stays out of production info logs.
      const clip = (_key: string, value: unknown) =>
        typeof value === "string" && value.length > 500
          ? `«${value.length} chars: ${value.slice(0, 200)}…»`
          : value
      const fullMessages = [
        ...(isOpenaiOauth ? [] : [{ role: "system", content: JUDGE_SYSTEM }]),
        ...conversation,
        { role: "user", content: judgeUser(input.condition) },
      ]
      yield* Effect.logDebug("goal judge transcript", {
        condition: input.condition,
        messageCount: fullMessages.length,
        messages: JSON.stringify(fullMessages, clip),
      })

      // `Verdict.impossible` is optional by design, which strict mode rejects.
      // See ProviderTransform.structuredOutputOptions for the full reasoning.
      // undefined for SDKs that don't default json_schema strict on, so those
      // models keep sending no provider options at all.
      const structuredOutput = ProviderTransform.structuredOutputOptions(resolved)
      const temperature = ProviderTransform.temperature(resolved)

      const messages = [
        ...(isOpenaiOauth ? [] : [{ role: "system", content: JUDGE_SYSTEM } satisfies ModelMessage]),
        ...conversation,
        {
          role: "user",
          content: judgeUser(input.condition),
        } satisfies ModelMessage,
      ]

      const telemetry = {
        experimental_telemetry: {
          isEnabled: cfg.experimental?.openTelemetry,
          tracer,
          metadata: { userId: cfg.username ?? "unknown" },
        },
      }

      // Free-text judge: one generateText call, lenient {...} extraction, and
      // a not-ok default when the output is unparseable. Output-shape issues
      // never surface as JudgeError — only transport failures do. `produced`
      // marks whether the verdict came from the judge (guarded) or is the
      // synthesized default (already the conservative keep-working verdict,
      // so it bypasses the integrity guard).
      const judgeFromText = Effect.fn("SessionGoal.judgeFromText")(function* () {
        const text = yield* Effect.tryPromise({
          try: () =>
            generateText({
              ...telemetry,
              ...(temperature !== undefined ? { temperature } : {}),
              maxOutputTokens: ProviderTransform.maxOutputTokens(resolved),
              messages,
              model: language,
              ...(isOpenaiOauth
                ? {
                    providerOptions: ProviderTransform.providerOptions(resolved, {
                      instructions: JUDGE_SYSTEM,
                      store: false,
                    }),
                  }
                : {}),
            }).then((r) => r.text),
          catch: (error) => new JudgeError({ cause: error }),
        })
        const verdict = parseVerdictText(text)
        if (verdict) return { verdict, produced: true } satisfies JudgeResult
        return {
          verdict: {
            ok: false,
            reason: `judge returned unparseable output: ${text.slice(0, 200)}`,
          },
          produced: false,
        } satisfies JudgeResult
      })

      const runJudge = Effect.fn("SessionGoal.runJudge")(function* () {
        // Providers without function-calling have no constrained decoding to
        // offer — judge straight from free text instead of failing the gate.
        if (resolved.capabilities.toolcall === false) return yield* judgeFromText()

        const params = {
          ...telemetry,
          ...(temperature !== undefined ? { temperature } : {}),
          maxOutputTokens: ProviderTransform.maxOutputTokens(resolved),
          messages,
          model: language,
          schema: Verdict,
          providerOptions: structuredOutput && ProviderTransform.providerOptions(resolved, structuredOutput),
        } satisfies Parameters<typeof generateObject>[0]

        if (isOpenaiOauth) {
          const object = yield* Effect.tryPromise({
            try: async () => {
              const result = streamObject({
                ...params,
                providerOptions: ProviderTransform.providerOptions(resolved, {
                  instructions: JUDGE_SYSTEM,
                  store: false,
                  ...structuredOutput,
                }),
                onError: () => {},
              })
              for await (const part of result.fullStream) {
                if (part.type === "error") throw part.error
              }
              return (await result.object) as unknown
            },
            catch: (error) => new JudgeError({ cause: error }),
          })
          const parsed = Verdict.safeParse(object)
          if (parsed.success) return { verdict: parsed.data, produced: true } satisfies JudgeResult
          return yield* judgeFromText()
        }

        const object = yield* Effect.tryPromise({
          try: () => generateObject(params).then((r) => r.object as unknown),
          catch: (error) => new JudgeError({ cause: error }),
        })
        const parsed = Verdict.safeParse(object)
        if (parsed.success) return { verdict: parsed.data, produced: true } satisfies JudgeResult
        return yield* judgeFromText()
      })

      // Met-side observability for ok verdicts: log when the cited evidence
      // grounds only outside assistant/tool turns. Advisory only — ok verdicts
      // are never retried or failed open here.
      const observeOkGrounding = Effect.fn("SessionGoal.observeOkGrounding")(function* (result: JudgeResult) {
        if (!result.verdict.ok) return
        if (!result.produced) return
        if (
          !okVerdictGroundsOnlyOutsideAssistantTurn({
            verdict: result.verdict,
            conversation,
            condition: input.condition,
          })
        )
          return
        yield* Effect.logWarning("goal judge ok verdict cites only non-assistant evidence", {
          condition: input.condition,
          reason: result.verdict.reason,
        })
      })

      // Transcript-integrity guard: a judge-produced plain {ok:false} that
      // fails the check retries once; a second failure surfaces as JudgeError
      // so the gate fails open via the existing path instead of pending on a
      // verdict the judge could not have grounded. Satisfied, impossible, and
      // synthesized-default verdicts bypass the guard.
      const acceptIfVerifiable = (result: JudgeResult): Verdict | undefined => {
        if (result.verdict.ok) return result.verdict
        if (result.verdict.impossible) return result.verdict
        if (!result.produced) return result.verdict
        if (!isUnverifiableVerdict({ verdict: result.verdict, conversation, condition: input.condition }))
          return result.verdict
        return undefined
      }

      const first = yield* runJudge()
      yield* observeOkGrounding(first)
      const accepted = acceptIfVerifiable(first)
      if (accepted) return accepted
      yield* Effect.logWarning("goal judge verdict failed transcript-integrity check; retrying once", {
        condition: input.condition,
        reason: first.verdict.reason,
      })
      const second = yield* runJudge()
      yield* observeOkGrounding(second)
      const acceptedRetry = acceptIfVerifiable(second)
      if (acceptedRetry) return acceptedRetry
      yield* Effect.logWarning("goal judge verdict failed transcript-integrity check twice", {
        condition: input.condition,
        reason: second.verdict.reason,
      })
      return yield* new JudgeError({
        cause: new Error("goal judge returned unverifiable verdicts twice"),
      })
    })

    const gate = Effect.fn("SessionGoal.gate")(function* (input: {
      sessionID: SessionID
      agent: string
      msgs: SessionV1.WithParts[]
      model: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
      messageID: string
    }) {
      const stored = yield* get(input.sessionID)
      if (!stored) return { status: "inactive" } as const
      if (stored.agent !== input.agent) {
        yield* Effect.logInfo("goal armed for another agent, skipping judge", {
          "session.id": input.sessionID,
          goalAgent: stored.agent,
          turnAgent: input.agent,
        })
        return { status: "foreign", agent: stored.agent } as const
      }
      const attempt = yield* bumpReact(input.sessionID)
      if (attempt > MAX_GOAL_REACT) {
        yield* Effect.logWarning("goal react limit exceeded, clearing goal", {
          "session.id": input.sessionID,
          attempt,
        })
        yield* clear(input.sessionID)
        return { status: "exhausted", attempt } as const
      }
      yield* Effect.logInfo("goal judge evaluating", {
        "session.id": input.sessionID,
        condition: stored.condition,
        attempt,
      })
      // Fail-open, narrowed to JudgeError only: a transport/provider-call
      // failure releases the stop gate (error verdict published, goal
      // cleared, loop falls through to the exit). ModelNotFoundError
      // propagates so a missing/deleted judge model surfaces with
      // suggestions instead of silently dropping the goal.
      const outcome = yield* evaluate({
        condition: stored.condition,
        msgs: input.msgs,
        model: input.model,
      }).pipe(
        Effect.map(Option.some),
        Effect.catchTag("SessionGoalJudgeError", () =>
          Effect.gen(function* () {
            yield* Effect.logWarning("goal judge failed; allowing stop", {
              "session.id": input.sessionID,
              attempt,
            })
            yield* failOpen({ sessionID: input.sessionID, attempt, messageID: input.messageID })
            return Option.none<Verdict>()
          }),
        ),
      )
      if (Option.isNone(outcome)) return { status: "released", attempt } as const
      const verdict = outcome.value
      yield* events.publish(Event.Updated, {
        sessionID: input.sessionID,
        lastVerdict: { ...verdict, attempt, messageID: input.messageID },
      })
      if (verdict.ok) {
        yield* Effect.logInfo("goal satisfied, clearing", {
          "session.id": input.sessionID,
          reason: verdict.reason,
        })
        yield* clear(input.sessionID)
        return { status: "satisfied", verdict, attempt } as const
      }
      if (verdict.impossible) {
        yield* Effect.logInfo("goal impossible, clearing", {
          "session.id": input.sessionID,
          reason: verdict.reason,
        })
        yield* clear(input.sessionID)
        return { status: "impossible", verdict, attempt } as const
      }
      yield* Effect.logInfo("goal not met, continuing", {
        "session.id": input.sessionID,
        reason: verdict.reason,
        attempt,
      })
      return { status: "pending", verdict, attempt } as const
    })

    return Service.of({ set, get, clear, bumpReact, failOpen, evaluate, gate })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Provider.defaultLayer),
  Layer.provide(Auth.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(EventV2Bridge.defaultLayer),
)

export const node = LayerNode.make(layer, [Provider.node, Auth.node, Config.node, EventV2Bridge.node])

export * as Goal from "./goal"
