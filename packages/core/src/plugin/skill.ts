/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { Effect } from "effect"
import { PluginV2 } from "../plugin"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeCOdoContent from "./skill/customize-COdo.md" with { type: "text" }

export const CustomizeCOdoContent = customizeCOdoContent

export const Plugin = PluginV2.define({
  id: PluginV2.ID.make("skill"),
  effect: Effect.gen(function* () {
    const skill = yield* SkillV2.Service
    const transform = yield* skill.transform()

    yield* transform((editor) => {
      editor.source(
        new SkillV2.EmbeddedSource({
          type: "embedded",
          skill: new SkillV2.Info({
            name: "customize-COdo",
            description:
              "Use ONLY when the user is editing or creating COdo's own configuration: COdo.json, COdo.jsonc, files under .COdo/, or files under ~/.config/COdo/. Also use when creating or fixing COdo agents, subagents, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring COdo itself.",
            location: AbsolutePath.make("/builtin/customize-COdo.md"),
            content: CustomizeCOdoContent,
          }),
        }),
      )
    })
  }),
})
