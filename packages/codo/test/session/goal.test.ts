import { beforeEach, describe, expect, mock, test } from "bun:test"
import { Deferred, Effect, Exit, Layer } from "effect"
import type { LanguageModelV3 } from "@ai-sdk/provider"
import { ProviderV2 } from "@codo-ai/core/provider"
import { ModelV2 } from "@codo-ai/core/model"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config/config"
import { EventV2Bridge } from "../../src/event-v2-bridge"
import { Provider } from "../../src/provider/provider"
import { SessionID } from "../../src/session/schema"
import { awaitWithTimeout, testEffect } from "../lib/effect"
import { ProviderTest } from "../fake/provider"
import { GlobalBus } from "@/bus/global"

// Force generateObject/generateText to reject so judge failures can be
// exercised without a live provider. Scripted entries are consumed one per
// call: an Error rejects, anything else resolves as the verdict object/text.
// Unscripted calls fall through to the flags / real implementation.
let generateObjectShouldReject = false
let generateObjectScript: Array<Error | Record<string, unknown>> = []
let generateObjectCalls = 0
let generateTextShouldReject = false
let generateTextScript: Array<Error | string> = []
let generateTextCalls = 0
const actualAi = await import("ai")
void mock.module("ai", () => ({
  ...actualAi,
  generateObject: (...args: Parameters<typeof actualAi.generateObject>) => {
    generateObjectCalls++
    const next = generateObjectScript.shift()
    if (next instanceof Error) return Promise.reject(next)
    if (next) return Promise.resolve({ object: next })
    return generateObjectShouldReject
      ? Promise.reject(new Error("simulated provider outage"))
      : actualAi.generateObject(...args)
  },
  generateText: (...args: Parameters<typeof actualAi.generateText>) => {
    generateTextCalls++
    const next = generateTextScript.shift()
    if (next instanceof Error) return Promise.reject(next)
    if (next !== undefined) return Promise.resolve({ text: next })
    return generateTextShouldReject
      ? Promise.reject(new Error("simulated provider outage"))
      : actualAi.generateText(...args)
  },
}))

// Import after mocking so goal.ts picks up the patched ai module.
const { Goal } = await import("../../src/session/goal")

// Mock state is per-test: reset everything before each test so scripted
// entries and reject flags never leak across tests.
beforeEach(() => {
  generateObjectShouldReject = false
  generateObjectScript = []
  generateObjectCalls = 0
  generateTextShouldReject = false
  generateTextScript = []
  generateTextCalls = 0
})

const it = testEffect(Goal.defaultLayer)

// Judge tests stub Provider so evaluate reaches the mocked generateObject.
const judgeProvider = ProviderTest.fake({
  getLanguage: () => Effect.succeed({} as LanguageModelV3),
}).layer

const judgeTest = testEffect(
  Goal.layer.pipe(
    Layer.provide(judgeProvider),
    Layer.provide(Auth.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(EventV2Bridge.defaultLayer),
  ),
)

// Judge tests for a provider without function-calling: the judge must route
// straight through the free-text path and never touch generateObject.
const textOnlyProvider = ProviderTest.fake({
  getLanguage: () => Effect.succeed({} as LanguageModelV3),
  model: ProviderTest.model({
    capabilities: {
      toolcall: false,
      attachment: false,
      reasoning: false,
      temperature: true,
      interleaved: false,
      input: { text: true, image: false, audio: false, video: false, pdf: false },
      output: { text: true, image: false, audio: false, video: false, pdf: false },
    },
  }),
}).layer

const textJudgeTest = testEffect(
  Goal.layer.pipe(
    Layer.provide(textOnlyProvider),
    Layer.provide(Auth.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(EventV2Bridge.defaultLayer),
  ),
)

// Gate tests for an unresolvable judge model: getModel fails with
// ModelNotFoundError (with suggestions) instead of dying like the default fake.
const missingModelTest = testEffect(
  Goal.layer.pipe(
    Layer.provide(
      ProviderTest.fake({
        getModel: () =>
          Effect.fail(
            new Provider.ModelNotFoundError({
              providerID: ProviderV2.ID.make("openai"),
              modelID: ModelV2.ID.make("deleted-model"),
              suggestions: ["gpt-5.2"],
            }),
          ),
      }).layer,
    ),
    Layer.provide(Auth.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(EventV2Bridge.defaultLayer),
  ),
)

// Gate tests for an auth outage: auth.get fails, which evaluate turns into a
// defect via Effect.orDie (fail closed, never fail open).
const brokenAuthTest = testEffect(
  Goal.layer.pipe(
    Layer.provide(judgeProvider),
    Layer.provide(
      Layer.mock(Auth.Service, {
        get: () => Effect.fail(new Auth.AuthError({ message: "simulated auth outage" })),
      }),
    ),
    Layer.provide(Config.defaultLayer),
    Layer.provide(EventV2Bridge.defaultLayer),
  ),
)

function makeSessionID(): SessionID {
  return SessionID.descending()
}

type WatchedVerdict = {
  ok: boolean
  error?: boolean
  attempt: number
  messageID?: string
}

// Capture published goal verdicts for gate tests: the bus listener records
// every lastVerdict payload and completes `first` on the first one.
function watchVerdicts() {
  return Effect.gen(function* () {
    const seen: WatchedVerdict[] = []
    const first = yield* Deferred.make<WatchedVerdict>()
    const listener = (event: {
      payload: {
        type?: string
        properties?: { lastVerdict?: WatchedVerdict }
      }
    }) => {
      if (event.payload.type !== Goal.Event.Updated.type) return
      const verdict = event.payload.properties?.lastVerdict
      if (!verdict) return
      seen.push(verdict)
      Deferred.doneUnsafe(first, Effect.succeed(verdict))
    }
    GlobalBus.on("event", listener)
    yield* Effect.addFinalizer(() => Effect.sync(() => GlobalBus.off("event", listener)))
    return { seen, first }
  })
}

describe("Goal Service", () => {
  it.instance("set and get goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Initially no goal
      const initial = yield* goal.get(sessionID)
      expect(initial).toBeUndefined()

      // Set a goal
      yield* goal.set(sessionID, "fix all bugs", "main")

      // Get the goal
      const active = yield* goal.get(sessionID)
      expect(active).toBeDefined()
      expect(active?.condition).toBe("fix all bugs")
      expect(active?.react).toBe(0)
    }),
  )

  it.instance("stored goal exposes the agent it was armed with", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      yield* goal.set(sessionID, "tell me 10 jokes", "sec-test")

      const active = yield* goal.get(sessionID)
      expect(active?.agent).toBe("sec-test")
    }),
  )

  it.instance("clear goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Set a goal
      yield* goal.set(sessionID, "fix all bugs", "main")
      const active = yield* goal.get(sessionID)
      expect(active).toBeDefined()

      // Clear the goal
      yield* goal.clear(sessionID)

      // Verify cleared
      const cleared = yield* goal.get(sessionID)
      expect(cleared).toBeUndefined()
    }),
  )

  it.instance("bumpReact increments counter", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Set a goal
      yield* goal.set(sessionID, "fix all bugs", "main")

      // Bump react counter
      const react1 = yield* goal.bumpReact(sessionID)
      expect(react1).toBe(1)

      const react2 = yield* goal.bumpReact(sessionID)
      expect(react2).toBe(2)

      const react3 = yield* goal.bumpReact(sessionID)
      expect(react3).toBe(3)
    }),
  )

  it.instance("bumpReact returns 0 when no goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Bump without setting a goal
      const react = yield* goal.bumpReact(sessionID)
      expect(react).toBe(0)
    }),
  )

  it.instance("multiple sessions have independent goals", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const session1 = makeSessionID()
      const session2 = makeSessionID()

      // Set different goals for different sessions
      yield* goal.set(session1, "fix bug A", "main")
      yield* goal.set(session2, "fix bug B", "main")

      // Verify independence
      const goal1 = yield* goal.get(session1)
      const goal2 = yield* goal.get(session2)

      expect(goal1?.condition).toBe("fix bug A")
      expect(goal2?.condition).toBe("fix bug B")

      // Clear one, other remains
      yield* goal.clear(session1)
      expect(yield* goal.get(session1)).toBeUndefined()
      expect(yield* goal.get(session2)).toBeDefined()
    }),
  )

  it.instance("set replaces existing goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Set first goal
      yield* goal.set(sessionID, "first goal", "main")
      expect((yield* goal.get(sessionID))?.condition).toBe("first goal")

      // Set second goal (replaces first)
      yield* goal.set(sessionID, "second goal", "main")
      const updated = yield* goal.get(sessionID)
      expect(updated?.condition).toBe("second goal")
      expect(updated?.react).toBe(0) // react counter resets
    }),
  )

  it.instance("bumpReact after set resets on new set", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Set and bump
      yield* goal.set(sessionID, "first goal", "main")
      yield* goal.bumpReact(sessionID)
      yield* goal.bumpReact(sessionID)
      expect((yield* goal.get(sessionID))?.react).toBe(2)

      // Set new goal resets react
      yield* goal.set(sessionID, "second goal", "main")
      expect((yield* goal.get(sessionID))?.react).toBe(0)
    }),
  )
})

describe("Goal Verdict Schema", () => {
  test("parse ok verdict", () => {
    const verdict = Goal.Verdict.parse({ ok: true, reason: "condition met" })
    expect(verdict.ok).toBe(true)
    expect(verdict.reason).toBe("condition met")
    expect(verdict.impossible).toBeUndefined()
  })

  test("parse ok verdict with impossible false", () => {
    const verdict = Goal.Verdict.parse({ ok: true, impossible: false, reason: "done" })
    expect(verdict.ok).toBe(true)
    expect(verdict.impossible).toBe(false)
  })

  test("parse not ok verdict", () => {
    const verdict = Goal.Verdict.parse({ ok: false, reason: "not done yet" })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe("not done yet")
  })

  test("parse impossible verdict", () => {
    const verdict = Goal.Verdict.parse({ ok: false, impossible: true, reason: "cannot be done" })
    expect(verdict.ok).toBe(false)
    expect(verdict.impossible).toBe(true)
    expect(verdict.reason).toBe("cannot be done")
  })
})

describe("Goal Event", () => {
  it.effect("event schema defines correct type", () =>
    Effect.gen(function* () {
      // Just verify the event is defined correctly
      expect(Goal.Event.Updated.type).toBe("session.goal")
    }),
  )
})

describe("Goal Judge Failures", () => {
  judgeTest.instance("evaluate maps generateObject rejection to JudgeError", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectShouldReject = true
      const error = yield* goal
        .evaluate({
          condition: "fix all bugs",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        })
        .pipe(Effect.flip)

      expect(error).toBeInstanceOf(Goal.JudgeError)
    }),
  )

  judgeTest.instance("evaluate returns the parsed verdict from a single attempt", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ ok: true, reason: "condition met" }]
      const verdict = yield* goal.evaluate({
        condition: "fix all bugs",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
      })

      expect(verdict).toEqual({ ok: true, reason: "condition met" })
      expect(generateObjectCalls).toBe(1)
    }),
  )

  judgeTest.instance("failed evaluate leaves the goal active without consuming react", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectShouldReject = true
      const exit = yield* goal
        .evaluate({
          condition: "fix all bugs",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        })
        .pipe(Effect.exit)
      generateObjectShouldReject = false

      expect(Exit.isFailure(exit)).toBe(true)

      // Degradation contract at the service level: evaluate itself never
      // touches goal state; the prompt gate owns fail-open clearing.
      const active = yield* goal.get(sessionID)
      expect(active?.condition).toBe("fix all bugs")
      expect(active?.react).toBe(0)
    }),
  )

  judgeTest.instance("evaluate makes exactly one attempt and surfaces the failure", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectShouldReject = true
      const exit = yield* goal
        .evaluate({
          condition: "fix all bugs",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        })
        .pipe(Effect.exit)

      expect(Exit.isFailure(exit)).toBe(true)
      // MiMo semantics: ONE judge attempt, no retries anywhere — the prompt
      // gate fails open immediately on the surfaced error.
      expect(generateObjectCalls).toBe(1)
    }),
  )

  judgeTest.instance("evaluate falls back to text when the object verdict is unparseable", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ unexpected: "shape" }]
      generateTextScript = ['Verdict:\n```json\n{"ok": false, "reason": "missing X"}\n```']
      const verdict = yield* goal.evaluate({
        condition: "fix all bugs",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
      })

      expect(verdict).toEqual({ ok: false, reason: "missing X" })
      expect(generateObjectCalls).toBe(1)
      expect(generateTextCalls).toBe(1)
    }),
  )

  judgeTest.instance("evaluate defaults to not-ok when the text fallback is unparseable", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ unexpected: "shape" }]
      generateTextScript = ["no json here"]
      const verdict = yield* goal.evaluate({
        condition: "fix all bugs",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
      })

      // Output-shape issues never throw: the loop keeps working the goal.
      expect(verdict.ok).toBe(false)
      expect(verdict.reason).toContain("unparseable output")
    }),
  )

  textJudgeTest.instance("evaluate routes straight through text without structured output", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateTextScript = ['{"ok": true, "reason": "done per transcript"}']
      const verdict = yield* goal.evaluate({
        condition: "fix all bugs",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
      })

      expect(verdict).toEqual({ ok: true, reason: "done per transcript" })
      expect(generateObjectCalls).toBe(0)
      expect(generateTextCalls).toBe(1)
    }),
  )

  judgeTest.instance("unparseable object verdict with rejecting text fallback surfaces JudgeError", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service

      generateObjectScript = [{ unexpected: "shape" }]
      generateTextShouldReject = true
      const error = yield* goal
        .evaluate({
          condition: "fix all bugs",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        })
        .pipe(Effect.flip)

      // Exactly one structured attempt plus one text fallback — no retries.
      expect(error).toBeInstanceOf(Goal.JudgeError)
      expect(generateObjectCalls).toBe(1)
      expect(generateTextCalls).toBe(1)
    }),
  )
})

describe("Goal Gate", () => {
  judgeTest.instance("judge rejection releases the gate: error verdict, goal cleared, loop exits", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")
      const { first } = yield* watchVerdicts()

      // The judge fails end to end: unparseable structured output falls
      // back to text, the text call rejects, and JudgeError surfaces.
      generateObjectScript = [{ unexpected: "shape" }]
      generateTextShouldReject = true
      const decision = yield* goal.gate({
        sessionID,
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-1",
      })

      // Fail-open contract through the real gate wiring (not failOpen
      // directly): released lets the loop fall through to the exit — never
      // continue, never rethrow — after exactly 1+1 judge calls.
      expect(decision).toMatchObject({ status: "released", attempt: 1 })
      expect(generateObjectCalls).toBe(1)
      expect(generateTextCalls).toBe(1)
      const verdict = yield* awaitWithTimeout(Deferred.await(first), "timed out waiting for goal error verdict")
      expect(verdict).toMatchObject({ ok: true, error: true, attempt: 1, messageID: "msg-1" })
      expect(yield* goal.get(sessionID)).toBeUndefined()
    }),
  )

  judgeTest.instance("satisfied verdict clears the goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")
      const { first } = yield* watchVerdicts()

      generateObjectScript = [{ ok: true, reason: "condition met" }]
      const decision = yield* goal.gate({
        sessionID,
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-2",
      })

      expect(decision).toMatchObject({ status: "satisfied", attempt: 1 })
      const verdict = yield* awaitWithTimeout(Deferred.await(first), "timed out waiting for goal verdict")
      expect(verdict).toMatchObject({ ok: true, attempt: 1, messageID: "msg-2" })
      expect(verdict.error).toBeUndefined()
      expect(yield* goal.get(sessionID)).toBeUndefined()
    }),
  )

  judgeTest.instance("impossible verdict clears the goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ ok: false, impossible: true, reason: "cannot be done" }]
      const decision = yield* goal.gate({
        sessionID,
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-3",
      })

      expect(decision).toMatchObject({ status: "impossible", attempt: 1 })
      expect(yield* goal.get(sessionID)).toBeUndefined()
    }),
  )

  judgeTest.instance("unmet verdict keeps the goal and consumes one react", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ ok: false, reason: "not done yet" }]
      const decision = yield* goal.gate({
        sessionID,
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-4",
      })

      // Pending is the only decision that re-enters the loop; the goal
      // stays armed with the react counter consumed.
      expect(decision).toMatchObject({ status: "pending", attempt: 1 })
      const active = yield* goal.get(sessionID)
      expect(active?.condition).toBe("fix all bugs")
      expect(active?.react).toBe(1)
    }),
  )

  judgeTest.instance("no goal is inactive without touching the judge", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const decision = yield* goal.gate({
        sessionID: makeSessionID(),
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-5",
      })

      expect(decision).toMatchObject({ status: "inactive" })
      expect(generateObjectCalls).toBe(0)
      expect(generateTextCalls).toBe(0)
    }),
  )

  judgeTest.instance("turn from another agent skips the judge and leaves the goal armed", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      generateObjectScript = [{ ok: true, reason: "condition met" }]
      const decision = yield* goal.gate({
        sessionID,
        agent: "other-agent",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-6",
      })

      // Agent-scoped judging: a foreign turn never judges, never consumes
      // react, and never clears — the goal stays armed for its own agent.
      expect(decision).toMatchObject({ status: "foreign", agent: "main" })
      expect(generateObjectCalls).toBe(0)
      expect(generateTextCalls).toBe(0)
      const active = yield* goal.get(sessionID)
      expect(active?.condition).toBe("fix all bugs")
      expect(active?.react).toBe(0)
    }),
  )

  judgeTest.instance("react limit exhausts the goal without touching the judge", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")
      yield* Effect.forEach(Array.from({ length: Goal.MAX_GOAL_REACT }), () => goal.bumpReact(sessionID), {
        discard: true,
      })

      const decision = yield* goal.gate({
        sessionID,
        agent: "main",
        msgs: [],
        model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
        messageID: "msg-7",
      })

      expect(decision).toMatchObject({ status: "exhausted", attempt: Goal.MAX_GOAL_REACT + 1 })
      expect(generateObjectCalls).toBe(0)
      expect(generateTextCalls).toBe(0)
      expect(yield* goal.get(sessionID)).toBeUndefined()
    }),
  )

  missingModelTest.instance("unresolvable judge model fails closed with suggestions", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      const error = yield* goal
        .gate({
          sessionID,
          agent: "main",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("deleted-model") },
          messageID: "msg-8",
        })
        .pipe(Effect.flip)

      // Resolution failures propagate (fail closed) with suggestions instead
      // of being swallowed into a silent fail-open: the judge never ran and
      // the goal stays armed.
      expect(error).toBeInstanceOf(Provider.ModelNotFoundError)
      expect(error.suggestions).toEqual(["gpt-5.2"])
      expect(generateObjectCalls).toBe(0)
      expect(generateTextCalls).toBe(0)
      expect((yield* goal.get(sessionID))?.condition).toBe("fix all bugs")
    }),
  )

  brokenAuthTest.instance("auth failure fails closed as a defect", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()
      yield* goal.set(sessionID, "fix all bugs", "main")

      const exit = yield* goal
        .gate({
          sessionID,
          agent: "main",
          msgs: [],
          model: { providerID: ProviderV2.ID.make("openai"), modelID: ModelV2.ID.make("gpt-5.2") },
          messageID: "msg-9",
        })
        .pipe(Effect.exit)

      // Auth failures die (defect via Effect.orDie) — never a typed
      // JudgeError, so the gate cannot fail open: the judge never ran and
      // the goal stays armed.
      expect(Exit.isFailure(exit)).toBe(true)
      expect(Exit.hasDies(exit)).toBe(true)
      expect(Exit.hasFails(exit)).toBe(false)
      expect(generateObjectCalls).toBe(0)
      expect((yield* goal.get(sessionID))?.condition).toBe("fix all bugs")
    }),
  )
})
