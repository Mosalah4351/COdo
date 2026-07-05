export interface AddonSkill {
  name: string
  description: string
  content: string
}

export interface AddonEntry {
  name: string
  label: string
  description: string
  npmPackage: string
  skills: AddonSkill[]
}

import { coreSkillContent } from "./skills/agent-browser-core"
import { dogfoodSkillContent } from "./skills/agent-browser-dogfood"

export const addonCatalog: Record<string, AddonEntry> = {
  "agent-browser": {
    name: "agent-browser",
    label: "Agent Browser",
    description: "Browser automation via agent-browser CLI — navigate pages, fill forms, take screenshots, and inspect network traffic",
    npmPackage: "agent-browser",
    skills: [
      {
        name: "agent-browser-core",
        description: "Core browser automation workflow using agent-browser's snapshot-and-ref pattern",
        content: coreSkillContent,
      },
      {
        name: "agent-browser-dogfood",
        description: "QA and dogfood testing workflow for systematic browser testing",
        content: dogfoodSkillContent,
      },
    ],
  },
}

export function getAddon(name: string): AddonEntry | undefined {
  return addonCatalog[name]
}

export function listAddons(): AddonEntry[] {
  return Object.values(addonCatalog)
}
