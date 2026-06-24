import { Effect, Layer } from "effect"
import { SessionExecution } from "@codo-ai/core/session/execution"
import { SessionRunner } from "@codo-ai/core/session/runner"
import { SessionSchema } from "@codo-ai/core/session/schema"
import { SessionStatus } from "./status"

/**
 * Wraps SessionExecution with SessionStatus busy/idle management.
 * Sets status to "busy" when a drain starts and "idle" when it completes.
 */
export const layer = Layer.effect(
  SessionExecution.Service,
  Effect.gen(function* () {
    const inner = yield* SessionExecution.Service
    const status = yield* SessionStatus.Service

    const withStatus = <A, E>(sessionID: SessionSchema.ID, effect: Effect.Effect<A, E>) =>
      Effect.gen(function* () {
        yield* status.set(sessionID, { type: "busy" })
        const exit = yield* effect.pipe(Effect.exit)
        yield* status.set(sessionID, { type: "idle" })
        return yield* Effect.fromExit(exit)
      })

    return SessionExecution.Service.of({
      resume: (sessionID) => withStatus(sessionID, inner.resume(sessionID)),
      wake: (sessionID, seq) => withStatus(sessionID, inner.wake(sessionID, seq)),
      interrupt: inner.interrupt,
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(SessionStatus.defaultLayer))
