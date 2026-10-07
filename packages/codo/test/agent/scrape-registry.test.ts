import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Agent } from "@/agent/agent"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { Permission } from "@/permission"
import { Provider } from "@/provider/provider"
import { Plugin } from "@/plugin"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { Skill } from "@/skill"
import { LocationServiceMap } from "@codo-ai/core/location-layer"
import { SCRAPE_AGENTS, SCRAPE_TOPIC_SPECS } from "@/agent/scrape-topic"
import { scrapeSkills, SCRAPE_SKILL_NAMES, isScrapeSkill } from "@/skill/scrape-skills"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

/**
 * Runs against the REAL Agent layer so the assertions cover what actually
 * ships — defaults merged with persona rules merged with user config — not the
 * source text of agent.ts.
 */
const itLayer = testEffect(
  Layer.mergeAll(
    Agent.layer.pipe(
      Layer.provide(Plugin.defaultLayer),
      Layer.provide(Provider.defaultLayer),
      Layer.provide(Auth.defaultLayer),
      Layer.provide(Config.defaultLayer),
      Layer.provide(Skill.defaultLayer),
      Layer.provide(LocationServiceMap.layer),
      Layer.provide(RuntimeFlags.layer({})),
    ),
    Skill.defaultLayer.pipe(Layer.provide(Config.defaultLayer), Layer.provide(RuntimeFlags.layer({}))),
  ),
)

afterEach(async () => {
  await disposeAllInstances()
})

const agent = (name: string) =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const found = agents.find((a) => a.name === name)
    expect(found).toBeDefined()
    return found!
  })

const can = (a: Agent.Info, permission: string, pattern: string) =>
  Permission.evaluate(permission, pattern, a.permission).action

describe("scrape registry", () => {
  itLayer.instance("registers the scrape orchestrator as a native primary agent", () =>
    Effect.gen(function* () {
      const s = yield* agent("scrape")
      expect(s.mode).toBe("primary")
      expect(s.native).toBe(true)
      // Regression guard: an agent registered without `permission` 500-crashes
      // every boot via the /agent endpoint dereference.
      expect(s.permission).toBeDefined()
    }),
  )

  itLayer.instance("registers scrape-topic as a native subagent with baked preamble", () =>
    Effect.gen(function* () {
      const t = yield* agent("scrape-topic")
      expect(t.mode).toBe("subagent")
      expect(t.native).toBe(true)
      expect(t.permission).toBeDefined()
      expect(t.prompt?.startsWith("<execution_context>")).toBe(true)
      expect(t.prompt).toContain(SCRAPE_TOPIC_SPECS[0]!.firstSkill)
    }),
  )

  itLayer.instance("scrape-topic may write checkpoints but not source or spawn tasks", () =>
    Effect.gen(function* () {
      const t = yield* agent("scrape-topic")
      expect(can(t, "edit", ".codo/scrape/run-1/delivery_cities.jsonl")).toBe("allow")
      expect(can(t, "edit", "src/index.ts")).toBe("deny")
      expect(can(t, "task", "anything")).toBe("deny")
    }),
  )

  itLayer.instance("topic worker loads rung skills, never planner-only skills", () =>
    Effect.gen(function* () {
      const t = yield* agent("scrape-topic")
      expect(can(t, "skill", "scrape:politeness")).toBe("allow")
      expect(can(t, "skill", "scrape:static-fetch")).toBe("allow")
      expect(can(t, "skill", "scrape:api-discovery")).toBe("allow")
      expect(can(t, "skill", "scrape:brief")).not.toBe("allow")
      expect(can(t, "skill", "scrape:deliver")).not.toBe("allow")
    }),
  )
})

describe("scrape skill descriptors", () => {
  test("registers exactly nine bundled skills", () => {
    expect(scrapeSkills).toHaveLength(9)
    expect(SCRAPE_SKILL_NAMES.size).toBe(9)
    expect(isScrapeSkill("scrape:brief")).toBe(true)
    expect(isScrapeSkill("sec-test:code-audit")).toBe(false)
  })

  test("frontmatter name matches descriptor name for every skill", () => {
    for (const skill of scrapeSkills) {
      const match = skill.content.match(/^name:\s*(.+)$/m)
      expect(match?.[1]?.trim()).toBe(skill.name)
    }
  })
})
