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
   * Run the judge over the conversation against the active goal's condition.
   * `msgs` is the main thread's message list; it is converted to native model
   * messages (tool calls/results/images preserved) so the judge independently
   * confirms the work rather than trusting the assistant's self-report.
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
      //
      // `ensureNonEmptyContent` is applied by hand here because this is the ONE
      // persisted-parts→provider site that does not run `ProviderTransform.message`:
      // `model: language` below is the RAW model, with no `wrapLanguageModel` and no
      // middleware anywhere in this file, so the pre-send invariant that every other
      // build site inherits from the middleware would otherwise be absent. An empty
      // user message here reaches the judge's provider unrepaired.
      const conversation = ProviderTransform.ensureNonEmptyContent(
        yield* MessageV2.toModelMessagesEffect(input.msgs, resolved),
      )

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
      // never surface as JudgeError — only transport failures do.
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
        return (
          parseVerdictText(text) ?? {
            ok: false,
            reason: `judge returned unparseable output: ${text.slice(0, 200)}`,
          }
        )
      })

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
        if (parsed.success) return parsed.data
        return yield* judgeFromText()
      }

      const object = yield* Effect.tryPromise({
        try: () => generateObject(params).then((r) => r.object as unknown),
        catch: (error) => new JudgeError({ cause: error }),
      })
      const parsed = Verdict.safeParse(object)
      if (parsed.success) return parsed.data
      return yield* judgeFromText()
    })

    return Service.of({ set, get, clear, bumpReact, failOpen, evaluate })
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
