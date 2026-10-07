import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import type { Resolved } from "@codo-ai/tui/config"
import { TuiConfig } from "@/config/tui"
import { resolveRunTuiConfig } from "@/cli/cmd/run/runtime.boot"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"

function config(input?: { forceShaping?: boolean | "auto" }): Resolved {
  return createTuiResolvedConfig({
    ...(input?.forceShaping !== undefined && { rtl: { forceShaping: input.forceShaping } }),
  })
}

describe("run rtl config", () => {
  afterEach(() => {
    mock.restore()
  })

  test("preserves rtl.forceShaping from resolved tui config", async () => {
    spyOn(TuiConfig, "get").mockResolvedValue(config({ forceShaping: true }))

    const result = await resolveRunTuiConfig()

    expect(result.rtl?.forceShaping).toBe(true)
  })

  test("preserves auto policy and stays undefined when unset", async () => {
    spyOn(TuiConfig, "get").mockResolvedValue(config({ forceShaping: "auto" }))
    await expect(resolveRunTuiConfig().then((item) => item.rtl?.forceShaping)).resolves.toBe("auto")

    mock.restore()
    spyOn(TuiConfig, "get").mockResolvedValue(config())
    await expect(resolveRunTuiConfig().then((item) => item.rtl?.forceShaping)).resolves.toBeUndefined()
  })
})
