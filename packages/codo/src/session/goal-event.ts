import { Schema } from "effect"
import { EventV2 } from "@codo-ai/core/event"
import { SessionID } from "./schema"

/**
 * Broadcast whenever a session's goal changes — set, judged, or cleared. The
 * TUI mirrors this into its sync store to render the active-goal indicator and
 * the latest judge verdict. `goal` undefined means there is no active goal
 * (cleared / satisfied / impossible). Mirrors session/status.ts's Event.Status.
 */
export const Event = {
  Updated: EventV2.define({
    type: "session.goal",
    schema: {
      sessionID: SessionID,
      goal: Schema.Struct({ condition: Schema.String }).pipe(Schema.optional),
      lastVerdict: Schema.Struct({
        ok: Schema.Boolean,
        impossible: Schema.optional(Schema.Boolean),
        reason: Schema.String,
        attempt: Schema.Number,
        messageID: Schema.optional(Schema.String),
        error: Schema.optional(Schema.Boolean),
      }).pipe(Schema.optional),
    },
  }),
}
