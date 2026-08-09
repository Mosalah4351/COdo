export * as BrowserPlugin from "./plugin"

export const PROTOCOL = "agent-browser.plugin.v1" as const

export type PluginRequest = {
  protocol: typeof PROTOCOL
  type: string
  capability: string
  request: Record<string, unknown>
}

export type PluginResponse = {
  protocol: typeof PROTOCOL
  success: true
  data?: Record<string, unknown>
  credential?: { username: string; password: string }
  browser?: { cdpUrl: string }
  launch?: { args?: string[]; extensions?: string[]; initScripts?: string[] }
  manifest?: { name: string; capabilities: string[]; description?: string }
}

export type PluginConfig = {
  name: string
  command: string
  args?: string[]
  capabilities: string[]
}
