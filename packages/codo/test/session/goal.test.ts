import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { SessionV1 } from "@codo-ai/core/v1/session"
import { ProviderV2 } from "@codo-ai/core/provider"
import { ModelV2 } from "@codo-ai/core/model"
import { Goal } from "../../src/session/goal"
import { SessionID, MessageID } from "../../src/session/schema"
import { testEffect } from "../lib/effect"
import { TestInstance } from "../fixture/fixture"

const it = testEffect(Goal.defaultLayer)

function makeSessionID(): SessionID {
  return SessionID.descending()
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
      yield* goal.set(sessionID, "fix all bugs")

      // Get the goal
      const active = yield* goal.get(sessionID)
      expect(active).toBeDefined()
      expect(active?.condition).toBe("fix all bugs")
      expect(active?.react).toBe(0)
    }),
  )

  it.instance("clear goal", () =>
    Effect.gen(function* () {
      const goal = yield* Goal.Service
      const sessionID = makeSessionID()

      // Set a goal
      yield* goal.set(sessionID, "fix all bugs")
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
      yield* goal.set(sessionID, "fix all bugs")

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
      yield* goal.set(session1, "fix bug A")
      yield* goal.set(session2, "fix bug B")

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
      yield* goal.set(sessionID, "first goal")
      expect((yield* goal.get(sessionID))?.condition).toBe("first goal")

      // Set second goal (replaces first)
      yield* goal.set(sessionID, "second goal")
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
      yield* goal.set(sessionID, "first goal")
      yield* goal.bumpReact(sessionID)
      yield* goal.bumpReact(sessionID)
      expect((yield* goal.get(sessionID))?.react).toBe(2)

      // Set new goal resets react
      yield* goal.set(sessionID, "second goal")
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
