# COdo Addon Marketplace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/addons` CLI command that lets users browse, install, enable/disable addons from a built-in catalog.

**Architecture:** New `packages/codo/src/cli/cmd/addons/` directory with catalog, install, manage, and CLI modules. New config schema `packages/core/src/v1/config/addon.ts`. Interactive mode uses `@clack/prompts` (same as `plug.ts`). Non-interactive subcommands use `effectCmd` pattern. Install reuses `Npm.add()` and jsonc-modify patterns from the plugin system.

**Tech Stack:** TypeScript, Effect, @clack/prompts, jsonc-parser, yargs

---

### Task 1: AddonInfo Config Schema

**Covers:** [S5]

**Files:**
- Create: `packages/core/src/v1/config/addon.ts`
- Modify: `packages/core/src/v1/config/config.ts` (import + add to `Info`)
- Verify: typecheck from `packages/core`

- [ ] **Step 1: Create addon.ts schema**

Write `packages/core/src/v1/config/addon.ts`:

```typescript
export * as ConfigAddonV1 from "./addon"

import { Schema } from "effect"

export const AddonInfo = Schema.Struct({
  name: Schema.String,
  enabled: Schema.Boolean,
  scope: Schema.Literal("local", "global"),
  npmPackage: Schema.String,
  skills: Schema.Array(Schema.String),
  installedAt: Schema.optional(Schema.String),
}).annotate({ identifier: "ConfigAddonV1" })

export type Info = Schema.Schema.Type<typeof AddonInfo>
```

- [ ] **Step 2: Wire into config.ts**

In `packages/core/src/v1/config/config.ts`, add the import at line 18 (after the other ConfigV1 imports):

```typescript
import { ConfigAddonV1 } from "./addon"
```

Then add the `addons` field to the `Info` struct. Insert after the `attachment` field (after line 130, before `enterprise` on line 131):

```typescript
  addons: Schema.optional(Schema.Record(Schema.String, ConfigAddonV1.AddonInfo)).annotate({
    description: "Installed addons and their configuration",
  }),
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/core && bun typecheck`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/v1/config/addon.ts packages/core/src/v1/config/config.ts
git commit -m "feat(core): add AddonInfo config schema"
```

---

### Task 2: Addon Catalog

**Covers:** [S3]

**Files:**
- Create: `packages/codo/src/cli/cmd/addons/catalog.ts`
- Create: `packages/codo/src/cli/cmd/addons/skills/agent-browser-core.md`
- Verify: `bun typecheck` from `packages/codo`

- [ ] **Step 1: Define types and catalog**

Write `packages/codo/src/cli/cmd/addons/catalog.ts`:

```typescript
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
```

- [ ] **Step 2: Create agent-browser-core skill file**

Write `packages/codo/src/cli/cmd/addons/skills/agent-browser-core.ts`:

```typescript
// Bundled SKILL.md content for agent-browser core workflow
// Source: https://github.com/agent-browser/skill-data
export const coreSkillContent = `---
name: agent-browser-core
description: Use when you need to control a web browser — navigate, click, fill forms, take screenshots, extract data, or test web applications
---

# Agent Browser — Core Workflow

agent-browser is a browser automation CLI. It uses a **snapshot-and-ref** pattern:

1. **Snapshot** the page to get an accessibility tree with element references
2. **Use refs** (@e1, @e2, ...) to interact with elements
3. **Re-snapshot** after every action that changes the page

## Basic Commands

- \`browser_open\` — Launch browser and navigate to a URL
- \`browser_snapshot\` — Get accessibility tree with interactive elements
- \`browser_click\` — Click an element by ref or CSS selector
- \`browser_fill\` — Clear and fill a form field
- \`browser_type\` — Type text into an element
- \`browser_press\` — Press a keyboard key
- \`browser_screenshot\` — Take a browser screenshot
- \`browser_read\` — Read page content as clean text
- \`browser_eval\` — Run JavaScript in the page context
- \`browser_wait\` — Wait for a condition (selector, text, load state)
- \`browser_get\` — Get page URL, title, or element attributes
- \`browser_close\` — Close the browser session
- \`browser_tab\` — Manage tabs (list, new, switch, close)

## Critical Rules

1. **Refs are per-snapshot.** Refs like @e1, @e2 are assigned fresh on every snapshot. They become stale the moment the page changes.
2. **Always snapshot before interaction.** Never guess refs from a previous snapshot if the page has changed.
3. **Use -i (interactive) for most tasks.** The interactive snapshot mode filters to clickable/focusable elements only.
4. **Fall back to CSS selectors** when refs are inconvenient (e.g., \`click { selector: "#submit-btn" }\`).
5. **Screenshot for visual verification.** After navigation or complex interactions, take a screenshot to confirm state.

## Typical Workflow

1. \`browser_open { url: "https://example.com" }\` — Open the page
2. \`browser_snapshot { interactive: true }\` — Get interactive elements
3. \`browser_click { ref: "@e3" }\` — Click a button/link
4. \`browser_snapshot { interactive: true }\` — Re-snapshot after navigation
5. \`browser_fill { ref: "@e5", value: "search query" }\` — Fill a form field
6. \`browser_press { key: "Enter" }\` — Submit form
7. \`browser_screenshot { full_page: true }\` — Capture the result
8. \`browser_read {}\` — Extract visible text content
`
```

- [ ] **Step 3: Create agent-browser-dogfood skill file**

Write `packages/codo/src/cli/cmd/addons/skills/agent-browser-dogfood.ts`:

```typescript
export const dogfoodSkillContent = `---
name: agent-browser-dogfood
description: Use when performing QA or dogfood testing of web applications — systematically explore, document issues, and capture evidence
---

# Agent Browser — QA & Dogfood Testing

Structured workflow for testing web applications:

## Phase 1: Explore
1. Open the target URL: \`browser_open { url: "<url>" }\`
2. Take a full-page screenshot: \`browser_screenshot { full_page: true }\`
3. Snapshot the interactive elements: \`browser_snapshot { interactive: true }\`
4. Read the page content: \`browser_read {}\`

## Phase 2: Test Core Flows
For each user flow (login, search, purchase, etc.):
1. Navigate to the starting page
2. Execute the flow step by step (click, fill, press)
3. After each action, re-snapshot to verify state
4. Screenshot key states

## Phase 3: Document
Report findings with:
- Screenshots of each issue
- The step sequence that led to the issue
- Expected vs actual behavior
`
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/codo && bun typecheck`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/codo/src/cli/cmd/addons/catalog.ts packages/codo/src/cli/cmd/addons/skills/
git commit -m "feat: add addon catalog with agent-browser entry"
```

---

### Task 3: Install Logic

**Covers:** [S6, S7, S9]

**Files:**
- Create: `packages/codo/src/cli/cmd/addons/install.ts`

- [ ] **Step 1: Write install logic**

Write `packages/codo/src/cli/cmd/addons/install.ts`:

```typescript
import path from "path"
import { Effect } from "effect"
import { Npm } from "@codo-ai/core/npm"
import { Global } from "@codo-ai/core/global"
import { FSUtil } from "@codo-ai/core/fs-util"
import { ConfigPaths } from "@/config/paths"
import { Filesystem } from "@/util/filesystem"
import { type AddonEntry } from "./catalog"

export interface InstallDeps {
  npmAdd: (pkg: string) => Promise<{ directory: string }>
  exists: (file: string) => Promise<boolean>
  mkdir: (dir: string) => Promise<void>
  write: (file: string, text: string) => Promise<void>
  readText: (file: string) => Promise<string>
  writeText: (file: string, text: string) => Promise<void>
  files: (dir: string) => string[]
  configDir: string
}

const defaultDeps = (global: boolean): InstallDeps => ({
  npmAdd: (pkg) => Effect.runPromise(Npm.add(pkg)),
  exists: (file) => Filesystem.exists(file),
  mkdir: async (dir) => { await Filesystem.mkdir(dir, { recursive: true }) },
  write: async (file, text) => { await Filesystem.write(file, text) },
  readText: (file) => Filesystem.readText(file),
  writeText: async (file, text) => { await Filesystem.write(file, text) },
  files: (dir) => ConfigPaths.fileInDirectory(dir, "COdo"),
  configDir: global ? Global.Path.config : "",
})

export type InstallResult =
  | { ok: true; configDir: string; skillDir: string }
  | { ok: false; error: string }

export async function installAddon(
  addon: AddonEntry,
  scope: "local" | "global",
  projectDir: string,
): Promise<InstallResult> {
  const global = scope === "global"
  const deps = defaultDeps(global)
  const configDir = global ? deps.configDir : path.join(projectDir, ".codo")
  const skillDir = path.join(configDir, "addons", addon.name, "skills")

  try {
    // Step 1: Install npm package
    await deps.npmAdd(addon.npmPackage)

    // Step 2: Create skill directory
    await deps.mkdir(skillDir)

    // Step 3: Write skill files
    for (const skill of addon.skills) {
      const skillPath = path.join(skillDir, `${skill.name}.md`)
      // Write as proper SKILL.md format with frontmatter
      const content = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.content}`
      await deps.write(skillPath, content)
    }

    return { ok: true, configDir, skillDir }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function removeSkillDir(
  addonName: string,
  scope: "local" | "global",
  projectDir: string,
): Promise<boolean> {
  const global = scope === "global"
  const configDir = global ? Global.Path.config : path.join(projectDir, ".codo")
  const skillDir = path.join(configDir, "addons", addonName, "skills")
  try {
    await Filesystem.rm(skillDir, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/codo && bun typecheck`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/codo/src/cli/cmd/addons/install.ts
git commit -m "feat: add addon install logic (npm + skills + config patch)"
```

---

### Task 4: Config Patch Logic

**Covers:** [S5, S6, S7]

**Files:**
- Create: `packages/codo/src/cli/cmd/addons/patch.ts`

- [ ] **Step 1: Write config patcher**

Write `packages/codo/src/cli/cmd/addons/patch.ts`:

This module handles reading/writing `addons{}` and `skills.paths[]` in CODO.json, using the same `jsonc-parser` pattern as `packages/codo/src/plugin/install.ts`.

```typescript
import path from "path"
import {
  type ParseError as JsoncParseError,
  applyEdits,
  modify,
  parse as parseJsonc,
  printParseErrorCode,
} from "jsonc-parser"
import { Filesystem } from "@/util/filesystem"
import { ConfigPaths } from "@/config/paths"
import { Global } from "@codo-ai/core/global"

export type Scope = "local" | "global"

export type PatchDeps = {
  readText: (file: string) => Promise<string>
  write: (file: string, text: string) => Promise<void>
  exists: (file: string) => Promise<boolean>
  files: (dir: string) => string[]
}

export interface PatchResult {
  ok: boolean
  error?: string
  configFile?: string
}

const defaultDeps: PatchDeps = {
  readText: (file) => Filesystem.readText(file),
  write: async (file, text) => { await Filesystem.write(file, text) },
  exists: (file) => Filesystem.exists(file),
  files: (dir) => ConfigPaths.fileInDirectory(dir, "COdo"),
}

/**
 * Patch CODO.json to enable an addon:
 * 1. Add to `addons{}` with addon info
 * 2. Add skill path to `skills.paths[]`
 */
export async function enableAddonInConfig(
  addonName: string,
  addonValue: Record<string, unknown>,
  skillDir: string,
  scope: Scope,
  projectDir: string,
  deps: PatchDeps = defaultDeps,
): Promise<PatchResult> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = deps.files(configDir)
  let cfg = files[0]
  for (const file of files) {
    if (await deps.exists(file)) { cfg = file; break }
  }

  const src = await deps.readText(cfg).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return "{}"
    return err
  })
  if (src instanceof Error) return { ok: false, error: src.message }

  const text = src.trim() ? src : "{}"
  const errs: JsoncParseError[] = []
  const data = parseJsonc(text, errs, { allowTrailingComma: true })
  if (errs.length) {
    const err = errs[0]; const lines = text.substring(0, err.offset).split("\n")
    return { ok: false, error: `JSON parse error at line ${lines.length}: ${printParseErrorCode(err.error)}` }
  }

  let out = text

  // Set addons.<name> = { ... }
  out = applyEdits(out, modify(out, ["addons", addonName], addonValue, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  }))

  // Add skill dir to skills.paths[] if not already present
  const existingPaths: string[] = (data as any)?.skills?.paths ?? []
  if (!existingPaths.includes(skillDir)) {
    const newPaths = [...existingPaths, skillDir]
    if (!(data as any)?.skills) {
      out = applyEdits(out, modify(out, ["skills"], { paths: newPaths }, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    } else {
      out = applyEdits(out, modify(out, ["skills", "paths"], newPaths, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    }
  }

  await deps.write(cfg, out)
  return { ok: true, configFile: cfg }
}

/**
 * Patch CODO.json to disable an addon:
 * 1. Remove skill path from `skills.paths[]`
 * 2. Set `addons.<name>.enabled = false`
 */
export async function disableAddonInConfig(
  addonName: string,
  skillDir: string,
  scope: Scope,
  projectDir: string,
  deps: PatchDeps = defaultDeps,
): Promise<PatchResult> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = deps.files(configDir)
  let cfg = files[0]
  for (const file of files) {
    if (await deps.exists(file)) { cfg = file; break }
  }

  const src = await deps.readText(cfg).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return "{}"
    return err
  })
  if (src instanceof Error) return { ok: false, error: src.message }

  const text = src.trim() ? src : "{}"
  const errs: JsoncParseError[] = []
  const data = parseJsonc(text, errs, { allowTrailingComma: true })
  if (errs.length) {
    const err = errs[0]; const lines = text.substring(0, err.offset).split("\n")
    return { ok: false, error: `JSON parse error at line ${lines.length}: ${printParseErrorCode(err.error)}` }
  }

  let out = text

  // Remove skill dir from skills.paths[]
  const existingPaths: string[] = (data as any)?.skills?.paths ?? []
  const filteredPaths = existingPaths.filter((p: string) => p !== skillDir)
  if (filteredPaths.length !== existingPaths.length) {
    if (filteredPaths.length === 0) {
      out = applyEdits(out, modify(out, ["skills", "paths"], undefined, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    } else {
      out = applyEdits(out, modify(out, ["skills", "paths"], filteredPaths, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }))
    }
  }

  // Set enabled = false
  out = applyEdits(out, modify(out, ["addons", addonName, "enabled"], false, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  }))

  await deps.write(cfg, out)
  return { ok: true, configFile: cfg }
}

/**
 * Read current addon state from CODO.json
 */
export async function readAddonState(
  addonName: string,
  scope: Scope,
  projectDir: string,
): Promise<{ enabled: boolean; installed: boolean; configDir: string } | null> {
  const configDir = scope === "global" ? Global.Path.config : path.join(projectDir, ".codo")
  const files = ConfigPaths.fileInDirectory(configDir, "COdo")
  let cfg = files[0]
  for (const file of files) {
    if (await Filesystem.exists(file)) { cfg = file; break }
  }

  const src = await Filesystem.readText(cfg).catch(() => "{}")
  const errs: JsoncParseError[] = []
  const data = parseJsonc(src, errs, { allowTrailingComma: true })
  if (errs.length) return null

  const addons = (data as any)?.addons
  if (!addons || !addons[addonName]) return null

  const entry = addons[addonName]
  return {
    enabled: Boolean(entry.enabled),
    installed: true,
    configDir,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/codo && bun typecheck`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/codo/src/cli/cmd/addons/patch.ts
git commit -m "feat: add config patch logic for addon enable/disable"
```

---

### Task 5: Manage Logic

**Covers:** [S4, S7]

**Files:**
- Create: `packages/codo/src/cli/cmd/addons/manage.ts`

- [ ] **Step 1: Write manage module**

Write `packages/codo/src/cli/cmd/addons/manage.ts`:

```typescript
import path from "path"
import { addonCatalog, getAddon, listAddons } from "./catalog"
import { installAddon, removeSkillDir } from "./install"
import { enableAddonInConfig, disableAddonInConfig, readAddonState, type Scope } from "./patch"

export type AddonStatus = "not_installed" | "enabled" | "disabled"

export interface AddonWithStatus {
  name: string
  label: string
  description: string
  status: AddonStatus
  scope?: Scope
}

/**
 * Get the full status of all addons in the catalog
 */
export async function getAllAddonStatuses(projectDir: string): Promise<AddonWithStatus[]> {
  const results: AddonWithStatus[] = []
  for (const addon of listAddons()) {
    // Check local first, then global
    const localState = await readAddonState(addon.name, "local", projectDir)
    const globalState = localState ? null : await readAddonState(addon.name, "global", projectDir)
    const state = localState ?? globalState

    if (!state) {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "not_installed" })
    } else if (state.enabled) {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "enabled", scope: localState ? "local" : "global" })
    } else {
      results.push({ name: addon.name, label: addon.label, description: addon.description, status: "disabled", scope: localState ? "local" : "global" })
    }
  }
  return results
}

/**
 * Enable an addon: install + config patch, or just config patch if already installed
 */
export async function enableAddon(
  name: string,
  scope: Scope,
  projectDir: string,
): Promise<{ ok: boolean; error?: string; skillDir?: string }> {
  const addon = getAddon(name)
  if (!addon) return { ok: false, error: `Addon "${name}" not found in catalog` }

  // Check if already installed
  const existing = await readAddonState(name, scope, projectDir)

  if (existing && existing.installed && existing.enabled) {
    return { ok: true, skillDir: path.join(scope === "global" ? "~/.config/COdo" : projectDir + "/.codo", "addons", name, "skills") }
  }

  if (!existing || !existing.installed) {
    // First-time install: npm + skills + config
    const installResult = await installAddon(addon, scope, projectDir)
    if (!installResult.ok) return { ok: false, error: installResult.error }

    const skillDir = installResult.skillDir
    const patchResult = await enableAddonInConfig(
      name,
      { name, enabled: true, scope, npmPackage: addon.npmPackage, skills: [skillDir] },
      skillDir,
      scope,
      projectDir,
    )
    if (!patchResult.ok) return { ok: false, error: patchResult.error }

    return { ok: true, skillDir }
  }

  // Re-enable: just config patch
  const skillDir = path.join(scope === "global" ? "~/.config/COdo" : projectDir + "/.codo", "addons", name, "skills")
  const patchResult = await enableAddonInConfig(
    name,
    { name, enabled: true, scope, npmPackage: addon.npmPackage, skills: [skillDir] },
    skillDir,
    scope,
    projectDir,
  )
  if (!patchResult.ok) return { ok: false, error: patchResult.error }

  return { ok: true, skillDir }
}

/**
 * Disable an addon: config patch only, keep npm + skills
 */
export async function disableAddon(
  name: string,
  projectDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const addon = getAddon(name)
  if (!addon) return { ok: false, error: `Addon "${name}" not found in catalog` }

  // Check local first, then global
  const localState = await readAddonState(name, "local", projectDir)
  const globalState = localState ? null : await readAddonState(name, "global", projectDir)
  const state = localState ?? globalState

  if (!state) return { ok: false, error: `Addon "${name}" is not installed` }

  const scope: Scope = localState ? "local" : "global"
  const configDir = scope === "global" ? "~/.config/COdo" : path.join(projectDir, ".codo")
  const skillDir = path.join(configDir, "addons", name, "skills")

  const result = await disableAddonInConfig(name, skillDir, scope, projectDir)
  if (!result.ok) return { ok: false, error: result.error }

  return { ok: true }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/codo && bun typecheck`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/codo/src/cli/cmd/addons/manage.ts
git commit -m "feat: add addon lifecycle management (enable/disable/status)"
```

---

### Task 6: CLI Command

**Covers:** [S2, S4]

**Files:**
- Create: `packages/codo/src/cli/cmd/addons/index.ts`
- Modify: `packages/codo/src/index.ts` (register command)

- [ ] **Step 1: Write the CLI command**

Write `packages/codo/src/cli/cmd/addons/index.ts`:

```typescript
import { intro, outro, select, spinner, log, isCancel } from "@clack/prompts"
import { Effect } from "effect"
import { cmd } from "../cmd"
import { effectCmd } from "../../effect-cmd"
import { UI } from "../../ui"
import { getAddon } from "./catalog"
import { getAllAddonStatuses, enableAddon, disableAddon, type AddonStatus } from "./manage"
import { InstanceRef } from "@/effect/instance-ref"

function statusBadge(status: AddonStatus, scope?: string): string {
  if (status === "enabled") return `● enabled${scope ? ` · ${scope}` : ""}`
  if (status === "disabled") return `○ disabled`
  return `○ not installed`
}

/**
 * Interactive addon management loop
 */
async function interactiveMode(projectDir: string) {
  intro("COdo Addons")

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const statuses = await getAllAddonStatuses(projectDir)

    const options = statuses.map((s) => ({
      label: s.label,
      value: s.name,
      hint: statusBadge(s.status, s.scope),
    }))

    const selected = await select({
      message: "Select an addon to manage",
      options,
    })

    if (isCancel(selected)) {
      outro("Goodbye!")
      return
    }

    const addon = getAddon(selected as string)
    if (!addon) {
      log.error(`Addon "${selected}" not found`)
      continue
    }

    const current = statuses.find((s) => s.name === selected)!

    // Build contextual action menu
    const actions: { label: string; value: string; hint?: string }[] = []

    if (current.status === "not_installed") {
      actions.push(
        { label: "Enable (local scope)", value: "enable-local", hint: "Install in project .codo/" },
        { label: "Enable (global scope)", value: "enable-global", hint: "Install in ~/.config/COdo/" },
      )
    } else if (current.status === "disabled") {
      actions.push({ label: "Enable", value: "enable", hint: "Re-enable with existing install" })
    } else if (current.status === "enabled") {
      actions.push({ label: "Disable", value: "disable", hint: "Remove from skills, keep files" })
    }

    actions.push({ label: "Show details", value: "details" })
    actions.push({ label: "Back", value: "back" })

    const action = await select({
      message: `${addon.label}`,
      options: actions,
    })

    if (isCancel(action) || action === "back") continue

    if (action === "details") {
      log.info(`${addon.label}`)
      log.info(`${addon.description}`)
      log.info(`npm package: ${addon.npmPackage}`)
      log.info(`Skills: ${addon.skills.map((s) => s.name).join(", ")}`)
      continue
    }

    const spin = spinner()

    if (action === "enable-local" || action === "enable-global" || action === "enable") {
      const scope = action === "enable-global" ? "global" : "local"

      spin.start(action === "enable" ? "Enabling addon..." : "Installing addon...")

      const result = await enableAddon(addon.name, scope, projectDir)
      if (!result.ok) {
        spin.stop("Failed", 1)
        log.error(result.error ?? "Unknown error")
        continue
      }

      spin.stop("Done!")
      log.success(`${addon.label} enabled (${scope} scope)`)
      if (addon.skills.length > 0) {
        log.info(`Skills available: ${addon.skills.map((s) => s.name).join(", ")}`)
      }
    } else if (action === "disable") {
      spin.start("Disabling addon...")

      const result = await disableAddon(addon.name, projectDir)
      if (!result.ok) {
        spin.stop("Failed", 1)
        log.error(result.error ?? "Unknown error")
        continue
      }

      spin.stop("Done!")
      log.success(`${addon.label} disabled`)
    }
  }
}

// Non-interactive subcommands

export const AddonListCommand = effectCmd({
  command: "list",
  describe: "list all available addons and their status",
  instance: true,
  handler: Effect.fn("Cli.addons.list")(function* () {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const statuses = yield* Effect.promise(() => getAllAddonStatuses(ctx.directory))
    for (const s of statuses) {
      console.log(`${statusBadge(s.status, s.scope)}  ${s.label} — ${s.description}`)
    }
  }),
})

export const AddonEnableCommand = effectCmd({
  command: "enable <name>",
  describe: "enable (install if needed) an addon",
  instance: true,
  builder: (yargs) =>
    yargs
      .positional("name", { type: "string", describe: "addon name" })
      .option("global", { alias: "g", type: "boolean", default: false, describe: "install globally" }),
  handler: Effect.fn("Cli.addons.enable")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const name = String(args.name ?? "").trim()
    if (!name) { UI.error("addon name is required"); process.exitCode = 1; return }

    const scope = args.global ? "global" : "local"
    const spin = spinner()
    spin.start(`Enabling ${name}...`)

    const result = yield* Effect.promise(() => enableAddon(name, scope, ctx.directory))
    if (!result.ok) {
      spin.stop("Failed", 1)
      UI.error(result.error ?? "Unknown error")
      process.exitCode = 1
      return
    }

    spin.stop("Done!")
    UI.success(`${name} enabled (${scope} scope)`)
  }),
})

export const AddonDisableCommand = effectCmd({
  command: "disable <name>",
  describe: "disable an addon",
  instance: true,
  builder: (yargs) =>
    yargs.positional("name", { type: "string", describe: "addon name" }),
  handler: Effect.fn("Cli.addons.disable")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const name = String(args.name ?? "").trim()
    if (!name) { UI.error("addon name is required"); process.exitCode = 1; return }

    const spin = spinner()
    spin.start(`Disabling ${name}...`)

    const result = yield* Effect.promise(() => disableAddon(name, ctx.directory))
    if (!result.ok) {
      spin.stop("Failed", 1)
      UI.error(result.error ?? "Unknown error")
      process.exitCode = 1
      return
    }

    spin.stop("Done!")
    UI.success(`${name} disabled`)
  }),
})

export const AddonStatusCommand = effectCmd({
  command: "status",
  describe: "show detailed status of all addons",
  instance: true,
  handler: Effect.fn("Cli.addons.status")(function* () {
    const ctx = yield* InstanceRef
    if (!ctx) return

    const statuses = yield* Effect.promise(() => getAllAddonStatuses(ctx.directory))
    for (const s of statuses) {
      console.log(`${statusBadge(s.status, s.scope)}  ${s.label}`)
      console.log(`  ${s.description}`)
      console.log()
    }
  }),
})

// Root command uses cmd() (not effectCmd) to avoid yargs conflicts with subcommands.
// Subcommands use effectCmd with InstanceRef independently.
export const AddonCommand = cmd({
  command: "addons",
  describe: "manage COdo addons (interactive mode with no subcommand)",
  builder: (yargs) =>
    yargs
      .command(AddonListCommand)
      .command(AddonEnableCommand)
      .command(AddonDisableCommand)
      .command(AddonStatusCommand),
  async handler() {
    // Interactive mode — runs when no subcommand is matched
    await interactiveMode(process.cwd())
  },
})
```

- [ ] **Step 2: Register in index.ts**

In `packages/codo/src/index.ts`, add the import at line 31 (after `BrowserCommand`):

```typescript
import { AddonCommand } from "./cli/cmd/addons"
```

And register the command after line 104 (after `.command(BrowserCommand)`):

```typescript
  .command(AddonCommand)
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/codo && bun typecheck`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/codo/src/cli/cmd/addons/index.ts packages/codo/src/index.ts
git commit -m "feat: add /addons CLI command with interactive and non-interactive modes"
```

---

### Task 7: Verification

**Covers:** [S9]

**Files:** None (verification only)

- [ ] **Step 1: Full typecheck**

```bash
cd packages/core && bun typecheck
cd packages/codo && bun typecheck
```

Expected: No errors from either package

- [ ] **Step 2: Manual smoke test**

Run `bun run build` from `packages/codo` to build the CLI, then:

```bash
# Verify command is registered
codo addons --help
# Expected: Shows addons commands (list, enable, disable, status)

# Interactive mode
codo addons
# Expected: Interactive prompt showing Agent Browser addon

# Non-interactive list
codo addons list
# Expected: Shows "○ not installed  Agent Browser — ..."

# Non-interactive status
codo addons status
# Expected: Shows detailed status

# If agent-browser is published on npm, also test:
# codo addons enable agent-browser --local
```

- [ ] **Step 3: Final check**

Verify all files are committed and the command shows up in help output.
