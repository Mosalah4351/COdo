export interface AddonEntry {
  name: string
  label: string
  description: string
  npmPackage: string
  /** Name of the skill-data directory inside the npm package to copy skills from */
  skillDataDir: string
}

export const addonCatalog: Record<string, AddonEntry> = {
  "agent-browser": {
    name: "agent-browser",
    label: "Agent Browser",
    description: "Browser automation via agent-browser CLI — navigate pages, fill forms, take screenshots, and inspect network traffic",
    npmPackage: "agent-browser",
    skillDataDir: "skill-data",
  },
}

export function getAddon(name: string): AddonEntry | undefined {
  return addonCatalog[name]
}

export function listAddons(): AddonEntry[] {
  return Object.values(addonCatalog)
}
