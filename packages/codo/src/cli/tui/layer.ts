import { run as runTui, type TuiInput } from "@codo-ai/tui"
import { Global } from "@codo-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
