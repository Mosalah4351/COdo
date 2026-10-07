# Agent Browser — Design Spec

**Date:** 2026-07-05
**Status:** Draft
**Author:** Compose Agent

## [S1] Problem

COdo's AI agent has no way to control a real web browser. The existing `webfetch` tool can only make basic HTTP requests (no JavaScript execution, no interactive elements). The `websearch` tool is for search results only. Many tasks require a real browser: filling forms, clicking buttons, taking screenshots, reading JavaScript-rendered content, network interception, and testing web applications.

[agent-browser](https://github.com/vercel-labs/agent-browser) is a mature, open-source Rust CLI for browser automation (37.8k stars, 92 releases). It uses a client-daemon architecture over Chrome DevTools Protocol (CDP) and already has session management, plugin support, cloud browser providers, React DevTools integration, and an observability dashboard. Rather than reimplementing browser automation, COdo should leverage agent-browser as its browser backend.

## [S2] Solution Overview

The Agent Browser feature adds browser automation capability to COdo by wrapping the `agent-browser` CLI as a set of built-in COdo tools. The architecture follows a "built-in tools + external daemon" pattern:

```
COdo AI Agent  ──>  Tool Registry  ──>  agent-browser CLI  ──>  agent-browser Daemon  ──>  Chrome (CDP)
                                              │
                                              └──> Plugin System (stdio JSON protocol)
                                                     │
                                                     ├── credential.read (vault)
                                                     ├── browser.provider (cloud)
                                                     ├── launch.mutate (stealth)
                                                     └── command.run (custom)
```

Key principles:
- COdo does NOT reimplement browser automation — it delegates everything to agent-browser
- agent-browser is a prerequisite binary (like git)
- Browser tools are first-class built-in tools in COdo's tool registry
- Each tool shells out to `agent-browser <command>` via child process
- The agent-browser daemon starts on first command and persists between commands
- agent-browser's native plugin system is used for extensions (credential providers, cloud browser providers, stealth, custom commands)

## [S3] Package Structure

A new `packages/browser` package in the monorepo:

```
packages/browser/
├── src/
│   ├── index.ts              # Public API: Layer that registers all browser tools
│   ├── agent-browser.ts      # CLI wrapper: spawns agent-browser, parses output
│   ├── daemon.ts             # Daemon lifecycle: check, start, ensure-running
│   ├── config.ts             # Config schema for browser section in CODO.json
│   ├── plugin.ts             # Plugin protocol types (agent-browser.plugin.v1)
│   ├── tools/
│   │   ├── core.ts           # open, close, snapshot, click, fill, type, press, screenshot, read, eval, wait, get
│   │   ├── tab.ts            # Tab management (list, new, switch, close)
│   │   ├── react.ts          # React DevTools (react_tree, react_inspect, vitals)
│   │   └── network.ts        # Network interception (route, requests, har)
│   └── cli/
│       ├── index.ts          # `codo browser ...` CLI commands
│       └── plugin.ts         # `codo browser plugin <add|list|show>` commands
├── package.json
├── tsconfig.json
└── AGENTS.md
```

Package name: `@codo-ai/browser`

## [S4] Tool Definitions (MVP)

### Core Browser Tools

| Tool ID | Description | Input Schema | agent-browser mapping |
|---------|-------------|-------------|----------------------|
| `browser_open` | Launch browser and navigate to URL. Defaults to headless mode. | `{ url: string, headless?: boolean, session?: string, enable_react_devtools?: boolean }` | `open <url>` with optional flags; headless defaults to true |
| `browser_snapshot` | Get accessibility tree with element refs | `{ interactive?: boolean, compact?: boolean, depth?: number, selector?: string }` | `snapshot [-i] [-c] [-d <n>] [-s <sel>]` |
| `browser_click` | Click element by ref or selector | `{ ref?: string, selector?: string, new_tab?: boolean }` | `click <sel>` |
| `browser_fill` | Clear and fill a form field | `{ ref?: string, selector?: string, value: string }` | `fill <sel> <value>` |
| `browser_type` | Type text into an element | `{ ref?: string, selector?: string, text: string }` | `type <sel> <text>` |
| `browser_press` | Press a keyboard key | `{ key: string }` | `press <key>` |
| `browser_screenshot` | Take a browser screenshot | `{ full_page?: boolean, annotate?: boolean }` | `screenshot [--full] [--annotate]` |
| `browser_read` | Read page content as text | `{ url?: string }` | `read [url]` |
| `browser_eval` | Run JavaScript in the browser | `{ js: string }` | `eval <js>` |
| `browser_wait` | Wait for a condition | `{ selector?: string, timeout_ms?: number, text?: string, load_state?: 'load' \| 'domcontentloaded' \| 'networkidle' }` | `wait ...` |
| `browser_get` | Get page info or element property | `{ property: 'url' \| 'title', ref?: string, attr?: string }` | `get <prop> [sel]` |
| `browser_close` | Close the browser instance | `{}` | `close` |
| `browser_tab` | Manage browser tabs | `{ action: 'list' \| 'new' \| 'switch' \| 'close', url?: string, tab_id?: string, label?: string }` | `tab ...` |

### React DevTools Tools (conditional on `enable_react_devtools`)

| Tool ID | Description | Input Schema | agent-browser mapping |
|---------|-------------|-------------|----------------------|
| `browser_react_tree` | Get React component tree | `{}` | `react tree` |
| `browser_react_inspect` | Inspect a React fiber | `{ fiber_id: string }` | `react inspect <fiberId>` |
| `browser_vitals` | Get Web Vitals (LCP/CLS/TTFB/FCP/INP) | `{ url?: string }` | `vitals [url]` |

### Network Tools

| Tool ID | Description | Input Schema | agent-browser mapping |
|---------|-------------|-------------|----------------------|
| `browser_network_route` | Intercept or block network requests | `{ url_pattern: string, action: 'block' \| 'mock', method?: string, status_code?: number, body?: string }` | `network route <url> ...` |
| `browser_network_requests` | View tracked network requests | `{ filter?: string, type?: string, method?: string, status?: string }` | `network requests ...` |
| `browser_network_har` | Start/stop HAR recording | `{ action: 'start' \| 'stop' }` | `network har <start\|stop>` |

## [S5] Session Management

- Each COdo session maps to an isolated agent-browser session via `--session codo-<sessionID>`
- Session ID follows the format: `codo-<COdoSessionID>` (e.g., `codo-ses_abc123`)
- State persistence uses agent-browser's `--restore` flag: cookies and localStorage are auto-saved/restored per session
- The daemon is started on first browser tool invocation and shut down on COdo session end
- Multiple parallel sessions are supported (different COdo sessions = different browser instances)

## [S6] Plugin System Integration

agent-browser has its own plugin system using the `agent-browser.plugin.v1` stdio JSON protocol:

```json
// Request
{ "protocol": "agent-browser.plugin.v1", "type": "credential.resolve", "capability": "credential.read", "request": {} }
// Response
{ "protocol": "agent-browser.plugin.v1", "success": true, "credential": { "username": "...", "password": "..." } }
```

**Capability types supported:**

| Capability | Request Type | Usage |
|-----------|-------------|-------|
| `credential.read` | `credential.resolve` | Vault-backed login credentials |
| `browser.provider` | `browser.launch` / `browser.close` | Cloud browser providers (Browserless, Browserbase, etc.) |
| `launch.mutate` | `launch.mutate` | Chrome launch customization (stealth args, extensions, init scripts) |
| `command.run` | Custom | Domain-specific commands (CAPTCHA solving) |
| Custom (e.g. `captcha.solve`) | Custom | Extensible capability set |

**COdo integration:**
1. Plugin config stored in `CODO.json` under `browser.plugins` — passed to agent-browser via `AGENT_BROWSER_PLUGINS` env var
2. CLI commands: `codo browser plugin add <ref>`, `codo browser plugin list`, `codo browser plugin show <name>`
3. These wrap `agent-browser plugin ...` commands
4. agent-browser plugins run OUT-OF-PROCESS — COdo only manages config and provides CLI surface
5. The plugin protocol is handled entirely by agent-browser's daemon

## [S7] Daemon Lifecycle

1. **Detection:** On first browser tool invocation, COdo checks if `agent-browser` is available via `which`/`where`
2. **Verification:** Runs `agent-browser doctor --offline --quick --json` to verify the installation
3. **Install prompt:** If missing, COdo offers to auto-install via `npm install -g agent-browser` (requires Node.js/npm) or provides manual instructions for Homebrew/Cargo
4. **Auto-start:** The first `agent-browser` command automatically starts the daemon
5. **Session binding:** Tools pass `--session codo-<id>` to isolate per-COdo-session browser instances
6. **Idle timeout:** Set `AGENT_BROWSER_IDLE_TIMEOUT_MS=300000` (5min) so daemon auto-shuts down
7. **Cleanup:** On COdo shutdown, run `agent-browser close --all` to clean up browser sessions

## [S8] Configuration

Configuration lives in `CODO.json` under a `browser` key:

```jsonc
{
  "browser": {
    "headless": true,
    "default_timeout_ms": 25000,
    "screenshot_format": "png",
    "screenshot_quality": 80,
    "plugins": [
      {
        "name": "vault",
        "command": "agent-browser-plugin-vault",
        "capabilities": ["credential.read"]
      },
      {
        "name": "cloud-browser",
        "command": "agent-browser-plugin-cloud-browser",
        "capabilities": ["browser.provider"]
      }
    ],
    "allowed_domains": [],
    "content_boundaries": false,
    "max_output_chars": 50000
  }
}
```

## [S9] Build & Packaging

- **Prerequisite:** `agent-browser` CLI binary installed on the system
- **New package:** `packages/browser` (`@codo-ai/browser`)
- **Layer export:** `packages/browser/src/index.ts` exports a `Layer` that registers all browser tools with `Tools.Service`
- **Registration:** `packages/codo/src/tool/registry.ts` imports the browser layer and includes it conditionally (when agent-browser is detected)
- **Publishing:** `@codo-ai/browser` is published to npm alongside other packages
- **Note:** agent-browser's Rust CLI is NOT bundled with COdo — it remains a separate install

## [S10] Edge Cases & Error Handling

- **agent-browser not installed:** Tools return a clear error message with install instructions, rather than crashing
- **Browser crash:** agent-browser daemon auto-restarts on next command; tool returns timeout error with retry suggestion
- **Session mismatch:** If a tool targets a session that was closed externally, agent-browser returns a session-not-found error
- **Plugin failure:** Plugin errors are surfaced through agent-browser's error output; COdo wraps them in ToolFailure
- **Timeout:** agent-browser has a 25s default timeout; COdo's tool layer adds its own timeout wrapper
- **Large output:** Screenshots and snapshot output follow COdo's existing truncation patterns (managed output paths)
- **Concurrent access:** Multiple COdo sessions each get their own agent-browser session — no shared state

## [S11] Future Considerations (Post-MVP)

- **Bundled agent-browser:** Bundle the Rust binary with COdo's distribution (Docker, npm, Homebrew tap)
- **Embedded viewport:** Embed browser viewport in COdo Desktop App via WebView
- **Deep plugin integration:** COdo plugin hooks for browser events (navigation, console, network)
- **Record/replay:** Browser session recording for debugging and replay
- **Mobile emulation:** Device emulation (iOS, Android viewports)
- **Accessibility auditing:** Automated a11y checks via browser snapshots
