---
name: self-extend
hidden: true
description: Use when you want to evolve your own capabilities — create new tools to avoid repeating patterns, add hooks to improve your own behavior, build skills to accumulate domain knowledge, or override built-in tools to adapt to project needs. This is your self-iteration interface.
---

## Workflow Routing

If the active workflow is **GSD**, invoke **`gsd:settings`** (basic config), **`gsd:settings-advanced`** (power-user), or **`gsd:profile-user`** (developer profile) via the skill tool instead of following the instructions below. These configure GSD behavior rather than extending COdo's platform.

**DO NOT skip this routing** — GSD applies to ALL projects, even standalone tools. The reasoning "this is a standalone project, GSD doesn't apply" is WRONG. (Other workflows TBD.)

# Self-Extension

## Overview

You can extend your own capabilities by writing files to `.codo/`. Changes to tools, hooks, and skills take effect immediately (next turn) — no restart needed.

## Creating Tools

Write to `.codo/tools/<name>.ts`:

```ts
import { tool } from "@codo/plugin"

export default tool({
  description: "What this tool does",
  args: {
    param1: tool.schema.string().describe("Parameter description"),
  },
  async execute(args, ctx) {
    // ctx.directory — project root
    // ctx.worktree — git worktree root
    // ctx.abort — AbortSignal
    return `Result: ${args.param1}`
  },
})
```

Multiple tools per file: use named exports instead of default.

## Creating Hooks

Write to `.codo/hooks/<name>.ts` — export a Hooks object:

```ts
export default {
  "tool.execute.before": async (input, output) => {
    if (input.tool === "bash" && output.args.command?.includes("rm -rf /")) {
      output.cancel = true
      output.cancelReason = "Blocked dangerous command"
    }
  },
  "experimental.chat.system.transform": async (input, output) => {
    output.system.push("Additional instruction here.")
  },
}
```

### Hook Events

| Event | Capability |
|-------|-----------|
| `tool.execute.before` | Modify args or `cancel=true` to block |
| `tool.execute.after` | Modify tool output |
| `tool.definition` | Modify tool description/parameters |
| `chat.params` | Modify temperature, topP, maxOutputTokens |
| `experimental.chat.system.transform` | Append to system prompt |
| `experimental.chat.messages.transform` | Modify message list sent to LLM |
| `permission.ask` | Auto-allow/deny permission requests |
| `shell.env` | Inject environment variables |

## Tool Override

A custom tool with the same id as a built-in replaces it:

```ts
// .codo/tools/bash.ts — overrides built-in bash
import { tool } from "@codo/plugin"
import { execSync } from "child_process"

export default tool({
  description: "Shell with safety checks",
  args: { command: tool.schema.string() },
  async execute(args, ctx) {
    if (args.command.includes("sudo")) return "Error: sudo not allowed"
    return execSync(args.command, { encoding: "utf-8", cwd: ctx.directory })
  },
})
```

## Creating Skills

Write to `.codo/skills/<name>/SKILL.md`:

```markdown
---
name: my-skill
description: Use when [conditions]
---
Instructions here...
```

## File Locations

| Type | Path | Hot-reload |
|------|------|-----------|
| Tools | `.codo/tools/*.ts` | next turn |
| Hooks | `.codo/hooks/*.ts` | next turn |
| Skills | `.codo/skills/*/SKILL.md` | next turn |

## When to Use What

| I want to... | Use |
|-------------|-----|
| Wrap a repeated bash/API pattern | Tool |
| Block or modify a tool's behavior | Hook (`tool.execute.before`) |
| Inject context into system prompt | Hook (`chat.system.transform`) |
| Accumulate domain knowledge for future use | Skill |
| Override how a built-in tool works | Tool (same name as builtin) |

## Constraints

- Tools/hooks have same permissions as bash — no privilege escalation
- Cannot modify the permission system
- Tool output truncated at 50KB / 2000 lines
- Prefer small, composable extensions over monolithic ones
