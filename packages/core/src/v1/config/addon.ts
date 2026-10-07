export * as ConfigAddonV1 from "./addon"

import { Schema } from "effect"

export const AddonInfo = Schema.Struct({
  name: Schema.String,
  enabled: Schema.Boolean,
  scope: Schema.Union([Schema.Literal("local"), Schema.Literal("global")]),
  npmPackage: Schema.String,
  skills: Schema.Array(Schema.String),
  installedAt: Schema.optional(Schema.String),
}).annotate({ identifier: "ConfigAddonV1" })

export type Info = Schema.Schema.Type<typeof AddonInfo>
