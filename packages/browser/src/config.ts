export * as BrowserConfig from "./config"

import { Schema } from "effect"

export const BrowserPluginSchema = Schema.Struct({
  name: Schema.String,
  command: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
  capabilities: Schema.Array(Schema.String),
})

export const BrowserConfigSchema = Schema.Struct({
  headless: Schema.optional(Schema.Boolean).pipe(Schema.withDecodingDefault(Schema.succeed(true))),
  default_timeout_ms: Schema.optional(Schema.Number).pipe(Schema.withDecodingDefault(Schema.succeed(25000))),
  screenshot_format: Schema.optional(Schema.Literals("png", "jpeg")).pipe(Schema.withDecodingDefault(Schema.succeed("png" as const))),
  screenshot_quality: Schema.optional(Schema.Number).pipe(Schema.withDecodingDefault(Schema.succeed(80))),
  plugins: Schema.optional(Schema.Array(BrowserPluginSchema)).pipe(Schema.withDecodingDefault(Schema.succeed([]))),
  allowed_domains: Schema.optional(Schema.Array(Schema.String)).pipe(Schema.withDecodingDefault(Schema.succeed([]))),
  content_boundaries: Schema.optional(Schema.Boolean).pipe(Schema.withDecodingDefault(Schema.succeed(false))),
  max_output_chars: Schema.optional(Schema.Number).pipe(Schema.withDecodingDefault(Schema.succeed(50000))),
})

export type BrowserConfig = Schema.Schema.Type<typeof BrowserConfigSchema>
