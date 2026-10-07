# Agent Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser automation capability to COdo by wrapping the `agent-browser` CLI as built-in COdo tools, with support for session management, plugin integration, React DevTools, network interception, and configuration.

**Architecture:** New `packages/browser` (`@codo-ai/browser`) package in the monorepo. Each browser tool shells out to `agent-browser <command>` via child process. The agent-browser daemon persists between commands automatically. Tools register in COdo's existing tool registry alongside bash/read/edit. agent-browser's native plugin system (`agent-browser.plugin.v1` stdio JSON protocol) is used for credential providers, cloud browser providers, launch customization, and custom commands.

**Tech Stack:** TypeScript, Effect.ts (for tools using `Tool.define`), child_process / Effect's ChildProcessSpawner, agent-browser CLI (prerequisite), Schema (Effect) for input validation, `@codo-ai/core/tool` for `Tool.define` pattern.

**Spec:** `docs/compose/specs/2026-07-05-agent-browser-design.md`

---

### Task 1: Create `packages/browser` package scaffolding

**Covers:** [S3]

**Files:**
- Create: `packages/browser/package.json`
- Create: `packages/browser/tsconfig.json`
- Create: `packages/browser/src/index.ts`
- Modify: `packages/browser/AGENTS.md`
- Create: `packages/browser/src/agent-browser.ts`

- [ ] **Step 1: Create `packages/browser/package.json`**

```jsonc
{
  "name": "@codo-ai/browser",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./agent-browser": "./src/agent-browser.ts",
    "./config": "./src/config.ts",
    "./daemon": "./src/daemon.ts",
    "./plugin": "./src/plugin.ts",
    "./tools/core": "./src/tools/core.ts",
    "./tools/tab": "./src/tools/tab.ts",
    "./tools/react": "./src/tools/react.ts",
    "./tools/network": "./src/tools/network.ts"
  },
  "dependencies": {
    "@codo-ai/core": "workspace:*",
    "@codo-ai/plugin": "workspace:*",
    "effect": "catalog:",
    "@ai-sdk/provider": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@tsconfig/bun": "catalog:"
  }
}
```

- [ ] **Step 2: Create `packages/browser/tsconfig.json`**

```jsonc
{
  "extends": "@tsconfig/bun/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/browser/src/agent-browser.ts`**

This module wraps the `agent-browser` CLI. It provides:
- `exec(args: string[], options?: { session?: string, timeout?: number })` — spawn `agent-browser` with given args, return stdout parsed as JSON or text
- `detect()` — check if `agent-browser` is available on PATH via `which`/`where`
- `verify()` — run `agent-browser doctor --offline --quick --json` to verify installation

```typescript
export * as AgentBrowserCLI from "./agent-browser"

import { spawn } from "child_process"
import { Effect } from "effect"

export function isInstalled(): Effect.Effect<boolean> {
  return Effect.async<boolean>((resume) => {
    const cmd = process.platform === "win32" ? "where" : "which"
    spawn(cmd, ["agent-browser"]).on("close", (code) => {
      resume(Effect.succeed(code === 0))
    })
  })
}

export type ExecResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; error: string; stderr: string; code: number | null }

export function exec(args: string[], options?: {
  session?: string
  timeout?: number
  env?: Record<string, string>
}): Effect.Effect<ExecResult> {
  return Effect.async<ExecResult>((resume) => {
    const env = { ...process.env, ...options?.env }
    if (options?.session) {
      env["AGENT_BROWSER_SESSION"] = options.session
    }
    const proc = spawn("agent-browser", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env,
      timeout: options?.timeout ?? 30000,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    proc.stdout.on("data", (chunk) => stdout.push(chunk))
    proc.stderr.on("data", (chunk) => stderr.push(chunk))
    proc.on("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf-8")
      const err = Buffer.concat(stderr).toString("utf-8")
      if (code === 0) {
        resume(Effect.succeed({ ok: true, stdout: out.trim(), stderr: err.trim() }))
      } else {
        resume(Effect.succeed({ ok: false, error: out.trim() || err.trim(), stderr: err.trim(), code }))
      }
    })
    proc.on("error", (err) => {
      resume(Effect.succeed({ ok: false, error: err.message, stderr: "", code: null }))
    })
  })
}

/**
 * Run doctor to verify the installation (offline, quick mode).
 */
export function doctor(): Effect.Effect<ExecResult> {
  return exec(["doctor", "--offline", "--quick", "--json"])
}
```

- [ ] **Step 4: Create `packages/browser/src/index.ts` — package entry, exports Layer**

```typescript
export * as Browser from "./index"

import { Effect, Layer } from "effect"
import { AgentBrowserCLI } from "./agent-browser"
import { BrowserConfig } from "./config"
import { BrowserTools } from "./tools/core"

/**
 * Returns true if agent-browser is available on the system.
 * Browser tools are only registered when this is true.
 */
export const browserAvailable = AgentBrowserCLI.isInstalled()

/**
 * Layer that registers all browser tools with Tools.Service.
 * Only include when agent-browser is detected.
 */
export const browserLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const available = yield* browserAvailable
    if (!available) return // silently skip — missing agent-browser is handled per-tool
    // Tools are registered via BrowserTools.layer
    yield* BrowserTools.layer
  }),
)
```

- [ ] **Step 5: Commit**

```bash
git add packages/browser/package.json packages/browser/tsconfig.json packages/browser/src/index.ts packages/browser/src/agent-browser.ts
git commit -m "feat(browser): scaffold packages/browser package"
```

---

### Task 2: Implement core browser tools (open, close, snapshot, click, fill, type, press, screenshot, read, eval, wait, get)

**Covers:** [S4] (Core Tools)

**Files:**
- Create: `packages/browser/src/tools/core.ts`
- Create: `packages/browser/src/config.ts`
- Create: `packages/browser/src/daemon.ts`

- [ ] **Step 1: Create `packages/browser/src/config.ts`**

Config schema for browser section in CODO.json. Import the existing `Schema` from effect.

```typescript
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
```

- [ ] **Step 2: Create `packages/browser/src/daemon.ts`**

Daemon lifecycle manager — checks installation on startup and provides a `ensureSession` helper.

```typescript
export * as BrowserDaemon from "./daemon"

import { Effect } from "effect"
import { AgentBrowserCLI } from "./agent-browser"

/**
 * Ensure agent-browser is available. If not, return an error message.
 */
export function ensureInstalled(): Effect.Effect<boolean, string> {
  return Effect.gen(function* () {
    const installed = yield* AgentBrowserCLI.isInstalled()
    if (!installed) {
      return yield* Effect.fail(
        "agent-browser is not installed. Install it with: npm install -g agent-browser\n" +
        "Or see: https://github.com/vercel-labs/agent-browser"
      )
    }
    return true
  })
}

/**
 * Run a command with session binding.
 * sessionID is a string like "codo-<COdoSessionID>"
 */
export function runCommand(args: string[], sessionID?: string, extraEnv?: Record<string, string>) {
  const env: Record<string, string> = {
    AGENT_BROWSER_IDLE_TIMEOUT_MS: "300000",
    ...extraEnv,
  }
  return AgentBrowserCLI.exec(args, { session: sessionID, env })
}
```

- [ ] **Step 3: Create `packages/browser/src/tools/core.ts`**

This is the main file containing all core browser tools. Each tool uses the `Tool.define` pattern from `packages/codo/src/tool/tool.ts`:

```typescript
export * as BrowserTools from "./core"

import { Effect, Layer, Schema } from "effect"
import * as Tool from "@codo-ai/codo/tool"  // Use the codo Tool.define pattern
import { BrowserDaemon } from "../daemon"
import { AgentBrowserCLI } from "../agent-browser"

// --- Input schemas ---

const OpenParams = Schema.Struct({
  url: Schema.String.annotate({ description: "The URL to navigate to" }),
  headless: Schema.optional(Schema.Boolean).annotate({ description: "Whether to run headless (default: true)" }),
  session: Schema.optional(Schema.String).annotate({ description: "Browser session identifier" }),
  enable_react_devtools: Schema.optional(Schema.Boolean).annotate({ description: "Enable React DevTools hook" }),
})

const SnapshotParams = Schema.Struct({
  interactive: Schema.optional(Schema.Boolean).annotate({ description: "Show interactive elements only" }),
  compact: Schema.optional(Schema.Boolean).annotate({ description: "Remove empty structural elements" }),
  depth: Schema.optional(Schema.Number).annotate({ description: "Limit tree depth" }),
  selector: Schema.optional(Schema.String).annotate({ description: "Scope to CSS selector" }),
})

const ClickParams = Schema.Struct({
  ref: Schema.optional(Schema.String).annotate({ description: "Element ref from snapshot (e.g. @e1)" }),
  selector: Schema.optional(Schema.String).annotate({ description: "CSS selector, text= or xpath=" }),
  new_tab: Schema.optional(Schema.Boolean).annotate({ description: "Open in new tab" }),
})

const FillParams = Schema.Struct({
  ref: Schema.optional(Schema.String).annotate({ description: "Element ref from snapshot" }),
  selector: Schema.optional(Schema.String).annotate({ description: "CSS selector" }),
  value: Schema.String.annotate({ description: "Value to fill" }),
})

const TypeParams = Schema.Struct({
  ref: Schema.optional(Schema.String),
  selector: Schema.optional(Schema.String),
  text: Schema.String.annotate({ description: "Text to type" }),
})

const PressParams = Schema.Struct({
  key: Schema.String.annotate({ description: "Key to press (e.g. Enter, Tab)" }),
})

const ScreenshotParams = Schema.Struct({
  full_page: Schema.optional(Schema.Boolean).annotate({ description: "Full page screenshot" }),
  annotate: Schema.optional(Schema.Boolean).annotate({ description: "Annotate with numbered labels" }),
})

const ReadParams = Schema.Struct({
  url: Schema.optional(Schema.String).annotate({ description: "URL to read (omit for current page)" }),
})

const EvalParams = Schema.Struct({
  js: Schema.String.annotate({ description: "JavaScript code to run" }),
})

const WaitParams = Schema.Struct({
  selector: Schema.optional(Schema.String).annotate({ description: "Wait for element to be visible" }),
  timeout_ms: Schema.optional(Schema.Number).annotate({ description: "Timeout in milliseconds" }),
  text: Schema.optional(Schema.String).annotate({ description: "Wait for text to appear" }),
  load_state: Schema.optional(Schema.Literals("load", "domcontentloaded", "networkidle")).annotate({
    description: "Wait for page load state",
  }),
})

const GetParams = Schema.Struct({
  property: Schema.Literals("url", "title").annotate({ description: "Property to get" }),
  ref: Schema.optional(Schema.String),
  attr: Schema.optional(Schema.String),
})

const TabParams = Schema.Struct({
  action: Schema.Literals("list", "new", "switch", "close").annotate({ description: "Tab action" }),
  url: Schema.optional(Schema.String),
  tab_id: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
})

// --- Tool implementations ---

function buildArgs(base: string[], params: Record<string, any>): string[] {
  const args = [...base]
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (typeof value === "boolean") {
      if (value) args.push(`--${key.replace(/_/g, "-")}`)
    } else {
      args.push(`--${key.replace(/_/g, "-")}`, String(value))
    }
  }
  return args
}

function parseScreenshotOutput(result: AgentBrowserCLI.ExecResult, title: string) {
  // agent-browser screenshot returns a file path on success
  // We read the screenshot file and return it as an attachment
  if (!result.ok) return { output: result.error, title: "", metadata: {} }
  return { output: result.stdout, title, metadata: {} }
}

function parseJsonOutput(result: AgentBrowserCLI.ExecResult) {
  if (!result.ok) return { output: result.error, title: "", metadata: {} }
  return { output: result.stdout, title: "", metadata: {} }
}

// --- browser_open ---
export const browserOpen = Tool.define(
  "browser_open",
  Effect.gen(function* () {
    return {
      description: "Launch a browser and navigate to a URL. Uses Chrome via agent-browser. Defaults to headless mode.",
      parameters: OpenParams,
      execute: (params: Schema.Schema.Type<typeof OpenParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_open", patterns: [params.url], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args = ["open", params.url]
          if (params.headless === false) args.push("--headed")
          if (params.enable_react_devtools) args.push("--enable", "react-devtools")
          const result = yield* BrowserDaemon.runCommand(args, params.session)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_snapshot ---
export const browserSnapshot = Tool.define(
  "browser_snapshot",
  Effect.gen(function* () {
    return {
      description: "Get the accessibility tree of the current page with element refs (@e1, @e2, etc). Best for AI agents to understand page structure.",
      parameters: SnapshotParams,
      execute: (params: Schema.Schema.Type<typeof SnapshotParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_snapshot", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["snapshot"]
          if (params.interactive) args.push("-i")
          if (params.compact) args.push("-c")
          if (params.depth) args.push("-d", String(params.depth))
          if (params.selector) args.push("-s", params.selector)
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_click ---
export const browserClick = Tool.define(
  "browser_click",
  Effect.gen(function* () {
    return {
      description: "Click an element on the page by ref (@e1 from snapshot) or CSS selector.",
      parameters: ClickParams,
      execute: (params: Schema.Schema.Type<typeof ClickParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_click", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const sel = params.ref || params.selector || ""
          const args = ["click", sel]
          if (params.new_tab) args.push("--new-tab")
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_fill ---
export const browserFill = Tool.define(
  "browser_fill",
  Effect.gen(function* () {
    return {
      description: "Clear and fill a form field by ref or selector.",
      parameters: FillParams,
      execute: (params: Schema.Schema.Type<typeof FillParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_fill", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const sel = params.ref || params.selector || ""
          const result = yield* BrowserDaemon.runCommand(["fill", sel, params.value])
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_type ---
export const browserType = Tool.define(
  "browser_type",
  Effect.gen(function* () {
    return {
      description: "Type text into an element by ref or selector (does not clear existing content).",
      parameters: TypeParams,
      execute: (params: Schema.Schema.Type<typeof TypeParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_type", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const sel = params.ref || params.selector || ""
          const result = yield* BrowserDaemon.runCommand(["type", sel, params.text])
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_press ---
export const browserPress = Tool.define(
  "browser_press",
  Effect.gen(function* () {
    return {
      description: "Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.).",
      parameters: PressParams,
      execute: (params: Schema.Schema.Type<typeof PressParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_press", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const result = yield* BrowserDaemon.runCommand(["press", params.key])
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_screenshot ---
export const browserScreenshot = Tool.define(
  "browser_screenshot",
  Effect.gen(function* () {
    return {
      description: "Take a screenshot of the current browser viewport. Returns the screenshot as an image.",
      parameters: ScreenshotParams,
      execute: (params: Schema.Schema.Type<typeof ScreenshotParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_screenshot", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["screenshot"]
          if (params.full_page) args.push("--full")
          if (params.annotate) args.push("--annotate")
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_read ---
export const browserRead = Tool.define(
  "browser_read",
  Effect.gen(function* () {
    return {
      description: "Read the page content as agent-friendly text. If a URL is provided, fetches it directly. Otherwise reads the current page DOM.",
      parameters: ReadParams,
      execute: (params: Schema.Schema.Type<typeof ReadParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_read", patterns: [params.url ?? "current_page"], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["read"]
          if (params.url) args.push(params.url)
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_eval ---
export const browserEval = Tool.define(
  "browser_eval",
  Effect.gen(function* () {
    return {
      description: "Run JavaScript code in the browser page context and return the result.",
      parameters: EvalParams,
      execute: (params: Schema.Schema.Type<typeof EvalParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_eval", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const result = yield* BrowserDaemon.runCommand(["eval", params.js])
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_wait ---
export const browserWait = Tool.define(
  "browser_wait",
  Effect.gen(function* () {
    return {
      description: "Wait for a condition on the page (element, text, load state).",
      parameters: WaitParams,
      execute: (params: Schema.Schema.Type<typeof WaitParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_wait", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["wait"]
          if (params.selector) args.push(params.selector)
          if (params.text) args.push("--text", params.text)
          if (params.load_state) args.push("--load", params.load_state)
          // timeout is handled by agent-browser's default
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_get ---
export const browserGet = Tool.define(
  "browser_get",
  Effect.gen(function* () {
    return {
      description: "Get page URL, title, or element attribute/property.",
      parameters: GetParams,
      execute: (params: Schema.Schema.Type<typeof GetParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_get", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["get", params.property]
          if (params.ref) args.push(params.ref)
          if (params.attr) args.push("--attr", params.attr)
          const result = yield* BrowserDaemon.runCommand(args)
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// --- browser_close ---
export const browserClose = Tool.define(
  "browser_close",
  Effect.gen(function* () {
    return {
      description: "Close the current browser instance and clean up the session.",
      parameters: Schema.Struct({}),
      execute: (_params: {}, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_close", patterns: [], always: ["*"], metadata: {} })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const result = yield* BrowserDaemon.runCommand(["close"])
          return parseJsonOutput(result)
        }).pipe(Effect.orDie),
    }
  }),
)

// Layer that registers all core browser tools
export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    // The tools are defined but not registered here — registration happens in the tool registry layer
    // This file exports the tool definitions; the registry imports and registers them
  }),
)
```

**Important note:** The above is the STRUCTURE of the tools. Each tool must follow the exact pattern used by existing tools in `packages/codo/src/tool/`. The key patterns are:
- Uses `Tool.define(id, Effect.gen(...))` where ID is the string tool name
- The effect yields `{ description, parameters, execute }`
- `execute` receives parsed params and a `Tool.Context` with `ask()` for permissions
- Results are `{ output, title, metadata, attachments? }`
- Use `Effect.orDie` at the end of execute

- [ ] **Step 4: Create description text files**

Create `packages/browser/src/tools/browser_open.txt`, `browser_snapshot.txt`, etc. with full descriptions for each tool (like the other tools do with their `.txt` files).

Each text file should contain a concise but informative description of what the tool does, its limitations, and usage guidance. For example:

```
browser_open.txt:
Open a URL in the browser. The browser starts in headless mode by default.
Uses Chrome via the agent-browser CLI. Each session gets its own browser instance.
The browser daemon persists between commands and auto-shuts down after 5 minutes of inactivity.

Use browser_snapshot after navigation to get interactive elements with refs.
Use browser_click with @eN refs to interact with elements.
```

- [ ] **Step 5: Commit**

```bash
git add packages/browser/src/tools/core.ts packages/browser/src/config.ts packages/browser/src/daemon.ts packages/browser/src/tools/*.txt
git commit -m "feat(browser): implement core browser tools (open, snapshot, click, fill, etc.)"
```

---

### Task 3: Register browser tools in COdo's tool registry

**Covers:** [S4], [S9]

**Files:**
- Modify: `packages/codo/src/tool/registry.ts`
- Modify: `packages/codo/src/tool/tool.ts` (if needed)

- [ ] **Step 1: Add browser tool imports to registry.ts**

In `packages/codo/src/tool/registry.ts`, add:

```typescript
import { BrowserCoreTool } from "@codo-ai/browser/tools/core"
```

- [ ] **Step 2: Initialize browser tools in the registry layer**

In the registry's `layer`, after the other tool initializations:

```typescript
const browserAvailable = yield* BrowserDaemon.ensureInstalled().pipe(Effect.isSuccess)

// Only init browser tools if agent-browser is installed
const browser = browserAvailable
  ? yield* Effect.all({
      open: Tool.init(BrowserCoreTool.browserOpen),
      snapshot: Tool.init(BrowserCoreTool.browserSnapshot),
      click: Tool.init(BrowserCoreTool.browserClick),
      fill: Tool.init(BrowserCoreTool.browserFill),
      type: Tool.init(BrowserCoreTool.browserType),
      press: Tool.init(BrowserCoreTool.browserPress),
      screenshot: Tool.init(BrowserCoreTool.browserScreenshot),
      read: Tool.init(BrowserCoreTool.browserRead),
      eval: Tool.init(BrowserCoreTool.browserEval),
      wait: Tool.init(BrowserCoreTool.browserWait),
      get: Tool.init(BrowserCoreTool.browserGet),
      close: Tool.init(BrowserCoreTool.browserClose),
    })
  : undefined
```

Then add browser tools to the builtin array:

```typescript
builtin: [
  tool.invalid,
  ...(browser ? [
    browser.open,
    browser.snapshot,
    browser.click,
    browser.fill,
    browser.type,
    browser.press,
    browser.screenshot,
    browser.read,
    browser.eval,
    browser.wait,
    browser.get,
    browser.close,
  ] : []),
  ...existing tools...
]
```

- [ ] **Step 3: Commit**

```bash
git add packages/codo/src/tool/registry.ts
git commit -m "feat(browser): register browser tools in tool registry"
```

---

### Task 4: Implement tab management tool

**Covers:** [S4] (tabs)

**Files:**
- Create: `packages/browser/src/tools/tab.ts`

- [ ] **Step 1: Create `packages/browser/src/tools/tab.ts`**

```typescript
export * as BrowserTabTool from "./tab"

import { Effect, Schema } from "effect"
import * as Tool from "@codo-ai/codo/tool"
import { BrowserDaemon } from "../daemon"

const TabParams = Schema.Struct({
  action: Schema.Literals("list", "new", "switch", "close").annotate({
    description: "list: list all tabs | new: open new tab | switch: switch to tab by id/label | close: close tab",
  }),
  url: Schema.optional(Schema.String).annotate({ description: "URL for new tab" }),
  tab_id: Schema.optional(Schema.String).annotate({ description: "Tab ID (t1, t2, etc.) or label" }),
  label: Schema.optional(Schema.String).annotate({ description: "Label for new tab" }),
})

export const browserTab = Tool.define(
  "browser_tab",
  Effect.gen(function* () {
    return {
      description: "Manage browser tabs — list, create, switch, or close tabs.",
      parameters: TabParams,
      execute: (params: Schema.Schema.Type<typeof TabParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_tab", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["tab"]
          if (params.action === "list") {
            // just "tab" lists tabs
          } else if (params.action === "new") {
            args.push("new")
            if (params.url) args.push(params.url)
            if (params.label) args.push("--label", params.label)
          } else if (params.action === "switch") {
            args.push(params.tab_id || "")
          } else if (params.action === "close") {
            args.push("close")
            if (params.tab_id) args.push(params.tab_id)
          }
          const result = yield* BrowserDaemon.runCommand(args)
          return {
            output: result.ok ? result.stdout : result.error,
            title: "",
            metadata: {},
          }
        }).pipe(Effect.orDie),
    }
  }),
)
```

- [ ] **Step 2: Register browser_tab in the tool registry** (extend Task 3's registry changes)

- [ ] **Step 3: Commit**

```bash
git add packages/browser/src/tools/tab.ts
git commit -m "feat(browser): add tab management tool"
```

---

### Task 5: Implement React DevTools tools

**Covers:** [S4] (React)

**Files:**
- Create: `packages/browser/src/tools/react.ts`

- [ ] **Step 1: Create `packages/browser/src/tools/react.ts`**

```typescript
export * as BrowserReactTool from "./react"

import { Effect, Schema } from "effect"
import * as Tool from "@codo-ai/codo/tool"
import { BrowserDaemon } from "../daemon"

const ReactTreeParams = Schema.Struct({})

const ReactInspectParams = Schema.Struct({
  fiber_id: Schema.String.annotate({ description: "Fiber ID from react_tree output" }),
})

const VitalsParams = Schema.Struct({
  url: Schema.optional(Schema.String).annotate({ description: "URL to measure (omit for current page)" }),
})

export const browserReactTree = Tool.define(
  "browser_react_tree",
  Effect.gen(function* () {
    return {
      description: "Get the React component tree of the current page. Requires browser launched with enable_react_devtools.",
      parameters: ReactTreeParams,
      execute: (_params: {}, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_react_tree", patterns: [], always: ["*"], metadata: {} })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const result = yield* BrowserDaemon.runCommand(["react", "tree"])
          return { output: result.ok ? result.stdout : result.error, title: "", metadata: {} }
        }).pipe(Effect.orDie),
    }
  }),
)

export const browserReactInspect = Tool.define(
  "browser_react_inspect",
  Effect.gen(function* () {
    return {
      description: "Inspect a React fiber by ID — shows props, hooks, state, and source location.",
      parameters: ReactInspectParams,
      execute: (params: Schema.Schema.Type<typeof ReactInspectParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_react_inspect", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const result = yield* BrowserDaemon.runCommand(["react", "inspect", params.fiber_id])
          return { output: result.ok ? result.stdout : result.error, title: "", metadata: {} }
        }).pipe(Effect.orDie),
    }
  }),
)

export const browserVitals = Tool.define(
  "browser_vitals",
  Effect.gen(function* () {
    return {
      description: "Get Web Vitals metrics (LCP, CLS, TTFB, FCP, INP) for the current page or a specific URL.",
      parameters: VitalsParams,
      execute: (params: Schema.Schema.Type<typeof VitalsParams>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "browser_vitals", patterns: [], always: ["*"], metadata: params })
          yield* Effect.orDieFail(BrowserDaemon.ensureInstalled())
          const args: string[] = ["vitals"]
          if (params.url) args.push(params.url)
          const result = yield* BrowserDaemon.runCommand(args)
          return { output: result.ok ? result.stdout : result.error, title: "", metadata: {} }
        }).pipe(Effect.orDie),
    }
  }),
)
```

- [ ] **Step 2: Register React tools in the tool registry** (conditionally)

In registry.ts, only include React tools when the session's model or config requests them (defer to user config).

- [ ] **Step 3: Commit**

```bash
git add packages/browser/src/tools/react.ts
git commit -m "feat(browser): add React DevTools tools (react_tree, react_inspect, vitals)"
```

---

### Task 6: Implement network interception tools

**Covers:** [S4] (Network)

**Files:**
- Create: `packages/browser/src/tools/network.ts`

- [ ] **Step 1: Create `packages/browser/src/tools/network.ts`**

Following the same pattern, implement tools for:
- `browser_network_route` — intercept, block, or mock network requests
- `browser_network_requests` — view tracked network requests with filters
- `browser_network_har` — start/stop HAR recording

Each tool wraps the corresponding `agent-browser network ...` command.

- [ ] **Step 2: Register network tools in the tool registry**

- [ ] **Step 3: Commit**

```bash
git add packages/browser/src/tools/network.ts
git commit -m "feat(browser): add network interception tools"
```

---

### Task 7: Implement plugin system types and CLI commands

**Covers:** [S6]

**Files:**
- Create: `packages/browser/src/plugin.ts`
- Create: `packages/browser/src/cli/index.ts`
- Create: `packages/browser/src/cli/plugin.ts`
- Modify: `packages/codo/src/index.ts` (or appropriate CLI entry point to add `codo browser ...` commands)

- [ ] **Step 1: Create `packages/browser/src/plugin.ts`**

Types for the agent-browser plugin protocol:

```typescript
export * as BrowserPlugin from "./plugin"

/**
 * agent-browser.plugin.v1 protocol types
 */

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
```

- [ ] **Step 2: Create `packages/browser/src/cli/plugin.ts`**

CLI handler for `codo browser plugin <add|list|show>`. Wraps `agent-browser plugin ...`:

```typescript
export function createPluginAddHandler(...) {
  // Parses ref, calls agent-browser plugin add <ref> [--global] [--capability ...]
}

export function createPluginListHandler(...) {
  // Calls agent-browser plugin list
}

export function createPluginShowHandler(...) {
  // Calls agent-browser plugin show <name>
}
```

- [ ] **Step 3: Register CLI commands**

Add `codo browser <command>` and `codo browser plugin <subcommand>` as new CLI commands in the COdo CLI entry point.

- [ ] **Step 4: Add plugin config to CODO.json integration**

In `packages/core/src/config.ts`, add the browser config schema. When browser tools are used or when the CLI runs, pass plugin config to agent-browser via `AGENT_BROWSER_PLUGINS` env var.

- [ ] **Step 5: Commit**

```bash
git add packages/browser/src/plugin.ts packages/browser/src/cli/
git commit -m "feat(browser): add plugin protocol types and CLI commands"
```

---

### Task 8: Add workspace and package.json root references

**Covers:** [S3], [S9]

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add browser package to root workspace**

In root `package.json`, add `"packages/browser"` to the workspaces array (if not auto-discovered by glob).

- [ ] **Step 2: Add browser package to turbo.json (if needed)**

Add build task for `@codo-ai/browser` to `turbo.json`.

- [ ] **Step 3: Commit**

```bash
git add package.json turbo.json
git commit -m "chore(browser): register browser package in workspace"
```

---

### Task 9: Edge cases, error handling, and cleanup

**Covers:** [S7], [S10]

**Files:**
- Modify: `packages/browser/src/daemon.ts`
- Modify: `packages/browser/src/agent-browser.ts`
- Create: `packages/browser/src/cleanup.ts`

- [ ] **Step 1: Add shutdown/cleanup handler**

On COdo shutdown, run `agent-browser close --all` to clean up any running browser sessions. Hook into COdo's existing shutdown/cleanup lifecycle.

- [ ] **Step 2: Add graceful tool error messages**

When agent-browser is not installed, tools return a clear, actionable error message:

```
"agent-browser is required for browser automation.
Install it with: npm install -g agent-browser"
```

When agent-browser is installed but no browser session is active (shouldn't happen normally), tools should handle the error gracefully.

- [ ] **Step 3: Add timeouts for long-running operations**

Each tool call to agent-browser should have a configurable timeout (default 30s). If agent-browser doesn't respond in time, return a timeout error.

- [ ] **Step 4: Commit**

```bash
git add packages/browser/src/cleanup.ts packages/browser/src/daemon.ts packages/browser/src/agent-browser.ts
git commit -m "feat(browser): add error handling, timeouts, and cleanup"
```

---

### Task 10: Observability — screenshots as tool output in TUI

**Covers:** [S4] (Screenshot)

**Files:**
- Modify: `packages/browser/src/tools/core.ts` (screenshot tool)

- [ ] **Step 1: Enhance screenshot tool to return image attachments**

The `browser_screenshot` tool should:
1. Take the screenshot via `agent-browser screenshot`
2. agent-browser returns a file path (in temp directory)
3. Read the file and return it as a `data:` URI attachment in the tool result

This requires reading the temp file from agent-browser's output path. The `toModelOutput` function should produce `{ type: "file", data, mime }` entries for screenshots:

```typescript
execute: (params, ctx) =>
  Effect.gen(function* () {
    // ... take screenshot ...
    // agent-browser output format: "Screenshot saved to /tmp/screenshot-xxx.png"
    const filePath = parseFilePath(result.stdout)
    if (filePath && (yield* fileExists(filePath))) {
      const imageData = yield* readFile(filePath)
      const base64 = Buffer.from(imageData).toString("base64")
      return {
        output: "Screenshot taken",
        title: "Browser Screenshot",
        metadata: {},
        attachments: [{
          type: "file" as const,
          mime: "image/png",
          url: `data:image/png;base64,${base64}`,
        }],
      }
    }
    return { output: result.stdout, title: "", metadata: {} }
  }).pipe(Effect.orDie),
```

- [ ] **Step 2: Commit**

```bash
git add packages/browser/src/tools/core.ts
git commit -m "feat(browser): return screenshots as image attachments"
```

---

## Phase 2 (Post-MVP)

These tasks are deferred to future iterations:

1. **Embedded viewport in Desktop app** — embed browser viewport in COdo Desktop App via WebView
2. **Bundled agent-browser binary** — bundle agent-browser with COdo's Docker/npm/Homebrew distributions
3. **Deep plugin hooks** — COdo plugin hooks for browser events (navigation, console, network)
4. **Mobile emulation** — device emulation for mobile testing
5. **Accessibility auditing** — automated a11y checks via browser snapshots
