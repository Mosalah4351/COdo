import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import fs from "fs/promises"
import { Skill } from "../../src/skill"
import { BusinessBundle } from "../../src/skill/business-bundle"
import { loadBusinessBundle } from "../../src/skill/business-bundle.macro"
import { FSUtil } from "@codo-ai/core/fs-util"
import { Global } from "@codo-ai/core/global"
import { CrossSpawnSpawner } from "@codo-ai/core/cross-spawn-spawner"
import { tmpdir, testInstanceStoreLayer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const node = CrossSpawnSpawner.defaultLayer

const it = testEffect(Layer.mergeAll(Skill.defaultLayer, node, testInstanceStoreLayer))

function frontmatterName(skillMd: string): string {
  const match = skillMd.match(/^name: (.+)$/m)
  if (!match) throw new Error("SKILL.md has no name frontmatter")
  return match[1].trim()
}

describe("business bundle", () => {
  test("embeds every skill with its full file tree", () => {
    const bundle = loadBusinessBundle()
    const names = Object.keys(bundle.skills).toSorted()
    expect(names.length).toBe(18)
    for (const name of names) {
      const files = Object.keys(bundle.skills[name])
      expect(files).toContain("SKILL.md")
      expect(frontmatterName(bundle.skills[name]["SKILL.md"])).toBe(
        name === "business" ? "business" : `business:${name}`,
      )
    }
    expect(Object.keys(bundle.skills["sales"]).length).toBe(67)
    expect("workflows/index/SKILL.md" in bundle.skills["sales"]).toBe(true)
    expect("workflows/index/SKILL.md" in bundle.skills["data-analytics"]).toBe(true)
    expect("references/topic-survey.md" in bundle.skills["super-research"]).toBe(true)
    expect("scripts/arxiv.py" in bundle.skills["arxiv"]).toBe(true)
  })

  test("extracts the bundle to the data dir", async () => {
    await using tmp = await tmpdir()
    const live = Layer.mergeAll(FSUtil.defaultLayer, Global.layerWith({ data: tmp.path }))
    const root = await Effect.runPromise(
      Effect.gen(function* () {
        const fsys = yield* FSUtil.Service
        const global = yield* Global.Service
        return yield* BusinessBundle.extract(fsys, global)
      }).pipe(Effect.provide(live)),
    )
    expect(root.startsWith(tmp.path)).toBe(true)
    const salesIndex = path.join(root, "sales", "workflows", "index", "SKILL.md")
    expect((await fs.readFile(salesIndex, "utf8")).length).toBeGreaterThan(0)
    expect((await fs.readFile(path.join(root, "sales", "SKILL.md"), "utf8")).length).toBeGreaterThan(0)
    const again = await Effect.runPromise(
      Effect.gen(function* () {
        const fsys = yield* FSUtil.Service
        const global = yield* Global.Service
        return yield* BusinessBundle.extract(fsys, global)
      }).pipe(Effect.provide(live)),
    )
    expect(again).toBe(root)
  })

  it.instance("registers business skills at real on-disk locations", () =>
    Effect.gen(function* () {
      const skill = yield* Skill.Service
      const sales = yield* skill.require("business:sales")
      expect(sales.location.endsWith(".md")).toBe(true)
      expect(sales.location.includes("<built-in")).toBe(false)
      const content = yield* Effect.promise(() => fs.readFile(sales.location, "utf8"))
      expect(content).toContain("workflows/index/SKILL.md")
      expect(yield* Effect.promise(() => fs.stat(path.join(path.dirname(sales.location), "workflows", "index", "SKILL.md")))).toBeDefined()
      const names = (yield* skill.all()).map((s) => s.name)
      for (const expected of [
        "business",
        "business:arxiv",
        "business:data-analytics",
        "business:deep-research",
        "business:design-blueprint",
        "business:docx-official",
        "business:frontend-design",
        "business:html-to-video-pipeline",
        "business:learn-everything",
        "business:modern-python-toolchain",
        "business:pdf-official",
        "business:pptx-official",
        "business:product-design",
        "business:research-paper-writing",
        "business:sales",
        "business:skill-creator",
        "business:super-research",
        "business:xlsx-official",
      ]) {
        expect(names).toContain(expected)
      }
      expect(yield* skill.dirs()).toContain(path.dirname(sales.location))
    }),
  )
})
