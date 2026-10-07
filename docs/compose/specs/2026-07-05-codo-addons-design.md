# COdo Addon Marketplace — Design Spec

**Date:** 2026-07-05
**Status:** Draft
**Author:** Compose Agent

## [S1] Problem

COdo currently supports plugins via `codo plugin <module>` which installs an npm package and registers it in `CODO.json`'s `plugin[]` field. However:

1. The user must **know the npm package name** to install a plugin — there's no discoverability
2. There's no way to **browse available features** or toggle them on/off
3. Agent Browser (our recently-built browser automation feature) requires `agent-browser` to be installed separately, with **no guided install flow**
4. There's no mechanism for a user to **discover and install skill packs** from within COdo

Users need a **marketplace/addon experience**: a catalog of features they can browse, toggle on/off, and install with a guided flow — similar to VS Code extensions but for COdo capabilities.

## [S2] Solution Overview

A new `/addons` CLI command with an interactive TUI that lets users:

1. **Browse** a built-in catalog of available addons
2. **Toggle** addons on/off (install when enabling, unregister when disabling)
3. **Choose scope** — install locally (project `.codo/`) or globally (`~/.config/COdo/`)
4. **See addon skills** in `/skills` once installed
5. **Manage** addons via interactive list + non-interactive CLI subcommands

Architecture:

```
User runs /addons
  │
  ├── Interactive mode (@clack/prompts)
  │     ├── Step 1: Show addon list with status (● enabled / ○ disabled)
  │     ├── Step 2: Select addon → show details → toggle / install
  │     ├── Step 3: If install → prompt local or global scope
  │     └── Step 4: Spinners for npm install, skill registration, config patch
  │
  └── Non-interactive mode (codo addons install/list/remove)
        └── Same backend, different entry point

Backend:
  ├── Catalog (built-in list of addon definitions)
  ├── Installer (Npm.add + copy skill files)
  ├── Config patcher (add/remove from CODO.json addons[] + skills.paths[])
  └── Skill files (bundled SKILL.md per addon)
```

## [S3] Catalog

A built-in addon catalog in `packages/codo/src/cli/cmd/addons/catalog.ts`:

```ts
export interface AddonEntry {
  name: string                    // "agent-browser"
  label: string                   // "Agent Browser"
  description: string             // "Browser automation via agent-browser CLI"
  npmPackage: string              // "agent-browser" — npm install target
  skills: AddonSkill[]            // SKILL.md files to register
  requires?: string[]             // Additional npm packages
}

export interface AddonSkill {
  name: string                    // "agent-browser-core"
  description: string             // "Browser automation workflow"
  content: string                 // SKILL.md content (bundled in source)
}
```

**First addon: Agent Browser**
- npm package: `agent-browser`
- Skills: core, dogfood, slack, electron skills bundled as strings in the catalog
- No additional config beyond npm install + skill path registration

```ts
export const addonCatalog: Record<string, AddonEntry> = {
  "agent-browser": {
    name: "agent-browser",
    label: "Agent Browser",
    description: "Browser automation via agent-browser CLI — navigate pages, fill forms, take screenshots, and inspect network traffic",
    npmPackage: "agent-browser",
    skills: [
      { name: "agent-browser-core", description: "...", content: "..." },
      { name: "agent-browser-dogfood", description: "...", content: "..." },
    ],
  },
}
```

The catalog is a **TypeScript constant** in the source — no external registry needed for MVP. Addons ship with COdo updates. A remote registry can be added later.

## [S4] CLI Command

### Interactive mode: `codo addons` (no subcommand)

Uses `@clack/prompts` for a multi-step interactive flow, following the same pattern as `codo plugin` (in `packages/codo/src/cli/cmd/plug.ts`). The experience groups logically related prompts together so it feels like a flowing TUI page rather than separate CLI questions.

**Step 1 — Addon selection (using @clack/prompts `select`):**

All catalog addons shown as selectable options. Each option's `hint` field shows its current status:

```
┌─ COdo Addons ─────────────────────────────────────────────┐
│  Select an addon:                                          │
│                                                             │
│  › Agent Browser                     [● enabled · local]   │
│    [future addon]                    [○ not installed]     │
│                                                             │
│  [↓/↑] navigate  [Enter] select  [Esc] cancel              │
└─────────────────────────────────────────────────────────────┘
```

- **● enabled** = installed + active in config
- **○ disabled** = installed but toggled off
- **○ not installed** = never installed

**Step 2 — Action menu (after selecting an addon):**

```
┌─ Agent Browser ───────────────────────────────────────────┐
│                                                             │
│  Agent Browser — Browser automation CLI                    │
│  Provides: core skills, navigation, screenshot tools        │
│                                                             │
│  What would you like to do?                                 │
│                                                             │
│  › Enable (local scope)         Install in project .codo/  │
│    Enable (global scope)        Install in ~/.config/COdo/ │
│    Disable                      Remove from skills         │
│    Show details                 More info                  │
│    Back                                                    │
└─────────────────────────────────────────────────────────────┘
```

Action options are contextual:
- **Not installed:** Shows `Enable (local)`, `Enable (global)`, `Show details`, `Back`
- **Installed + enabled:** Shows `Disable`, `Show details`, `Back`
- **Installed + disabled:** Shows `Enable` (no scope prompt — reuses original scope), `Show details`, `Back`

**Step 3 — Progress (after selecting an action):**

```
✔ Installing npm package...
✔ Writing skill files...
✔ Config updated
✔ Agent Browser enabled (local scope)
```

A `@clack/prompts` spinner sequence with progress messages, matching the same pattern as `codo plugin plug.ts`.

**Step 4 — Outcome:**
- On success: `outro("Done")` with summary
- On failure: `log.error()` with details (same pattern as `plug.ts`)
- Returns to Step 1 (addon list) after completion so user can manage more addons

### Non-interactive subcommands

| Command | Effect |
|---------|--------|
| `codo addons list` | Table view of addons with status |
| `codo addons enable <name> [--global]` | Install & enable an addon |
| `codo addons disable <name>` | Disable without uninstalling |
| `codo addons status` | Show detailed status of all addons |

### Implementation pattern

Follows the existing `effectCmd` pattern from `packages/codo/src/cli/effect-cmd.ts`:

```ts
// Root command with subcommands via yargs builder
export const AddonCommand = effectCmd({
  command: "addons [action]",
  describe: "manage COdo addons",
  instance: false,
  builder: (yargs) =>
    yargs
      .command(AddonListCommand)
      .command(AddonEnableCommand)
      .command(AddonDisableCommand)
      .command(AddonStatusCommand)
      .positional("action", { type: "string", describe: "addon name" }),
  handler: ..., // interactive mode when no subcommand
})
```

## [S5] Config Storage

A new `addons` field in CODO.json schema, defined in `packages/core/src/v1/config/addon.ts`:

```ts
export const AddonInfo = Schema.Struct({
  name: Schema.String,                    // "agent-browser"
  enabled: Schema.Boolean,                // true
  scope: Schema.Literal("local", "global"), // install location
  npmPackage: Schema.String,              // "agent-browser"
  skills: Schema.Array(Schema.String),    // paths to skill .codo/ dirs
  installedAt: Schema.optional(Schema.String), // npm install path
})
```

Added to the top-level `ConfigV1.Info` struct in `config.ts`:

```ts
addons: Schema.optional(Schema.Record(Schema.String, AddonInfo)),
```

Example CODO.json entry:

```json
{
  "addons": {
    "agent-browser": {
      "name": "agent-browser",
      "enabled": true,
      "scope": "local",
      "npmPackage": "agent-browser",
      "skills": [".codo/addons/agent-browser/skills"],
      "installedAt": "~/.cache/codo/packages/agent-browser/"
    }
  }
}
```

**Skill path registration:** When an addon is enabled, its `skills[]` paths are automatically added to `skills.paths[]` so the skill scanner picks them up. When disabled, the paths are removed from `skills.paths[]`.

## [S6] Install Flow

When a user enables (installs) an addon:

1. **Resolve scope** — prompt local or global, or `--global` flag
2. **Npm.add(pkg)** — install npm package to `~/.cache/codo/packages/<name>/` using existing `Npm.service`
3. **Create skill directory** — `.codo/addons/<name>/skills/` (local) or `~/.config/COdo/addons/<name>/skills/` (global)
4. **Write skill files** — write bundled SKILL.md content from catalog to skill directory
5. **Patch CODO.json** — add entry to `addons{}` and skill paths to `skills.paths[]`
6. **Verify** — confirm the addon's tools/binary are reachable

**Scope paths:**

| Scope | Config dir | Skill dir |
|-------|-----------|-----------|
| Local | `<project>/.codo/` | `<project>/.codo/addons/<name>/skills/` |
| Global | `~/.config/COdo/` | `~/.config/COdo/addons/<name>/skills/` |

**Reuse of existing plumbing:**
- `Npm.add()` from `packages/core/src/npm.ts` for package installation
- CODO.json patching (jsonc-modify pattern) from `packages/codo/src/plugin/install.ts`
- Skill discovery from `packages/codo/src/skill/index.ts` reads from `skills.paths[]` automatically

## [S7] Lifecycle

### Enable (first time)
npm install → write skills → patch config → verify

### Enable (re-enable after disable)
Patch config to add `skills.paths[]` back → set `enabled: true`

### Disable
Remove `skills.paths[]` entries → set `enabled: false`
Do NOT uninstall npm package (kept for fast re-enable)

### Uninstall (future)
Remove from `addons{}` field → optionally remove cached npm package → remove skill files

### Status
Check `addons{}` in CODO.json for each addon in the catalog:
- Not in config → "not installed"
- `enabled: false` → "disabled"
- `enabled: true` → "enabled"

## [S8] Files to Create / Modify

### New files:

| File | Purpose |
|------|---------|
| `packages/codo/src/cli/cmd/addons/index.ts` | Root CLI command + interactive mode |
| `packages/codo/src/cli/cmd/addons/catalog.ts` | Built-in addon catalog (TypeScript constant) |
| `packages/codo/src/cli/cmd/addons/install.ts` | Install logic (npm + skills + config patch) |
| `packages/codo/src/cli/cmd/addons/manage.ts` | Enable/disable/status logic |
| `packages/codo/src/cli/cmd/addons/skills/agent-browser-core.md` | Bundled SKILL.md for agent-browser core |
| `packages/codo/src/cli/cmd/addons/skills/agent-browser-dogfood.md` | Bundled SKILL.md for agent-browser dogfood |
| `packages/core/src/v1/config/addon.ts` | AddonInfo schema |

### Modified files:

| File | Change |
|------|--------|
| `packages/core/src/v1/config/config.ts` | Add `addons` field to `ConfigV1.Info` |
| `packages/codo/src/index.ts` | Register `AddonCommand` in CLI |
| `packages/codo/src/skill/index.ts` | No change needed — skills.paths[] auto-discovery handles it |

## [S9] Edge Cases & Error Handling

- **Addon already installed:** Re-enable is a no-op config change (already have npm, skills)
- **npm install fails:** Show clear error (reuse the error display from `plug.ts`), roll back any partial changes
- **Skill write fails:** Show error, roll back config change, keep npm package
- **Config patch conflicts:** Use the same jsonc-modify patterns as `plug.ts` (handle invalid JSON, missing file)
- **Addon not in catalog:** Non-interactive `enable <name>` with unknown name shows available list
- **Agent Browser tools not working after install:** The existing browser tool registration already does `BrowserDaemon.ensureInstalled()` — no change needed here
- **Multiple scopes:** If an addon is installed both locally and globally, local takes precedence (like `.codo/` config overrides global)

## [S10] Future Considerations

- **Remote registry:** Fetch addon catalog from a URL (like `skills.urls[]` pattern) for community addons
- **Version management:** `codo addons update <name>` to upgrade an addon
- **Dependency resolution:** Addons that depend on other addons (e.g., a Playwright addon that depends on Agent Browser)
- **GUI integration:** Show addon management in COdo Desktop App
- **Uninstall:** Full removal including npm package cleanup
- **Analytics:** Track which addons are popular (opt-in)
- **Plugin-type addons:** Addons that also register COdo plugins (server/tui hooks), not just tools + skills
