---
name: sec-test:agent-surface-audit
hidden: true
description: "Audit COdo's own agent surface (skills, plugins, MCP servers, hooks) against OWASP LLM Top 10 / MCP Top 10 / Agentic Top 10"
---

# Agent Surface Audit

## Overview

COdo — like any agent — has an attack surface distinct from the code it writes: installed skills, plugin hooks, MCP server configs, downloaded tools. This skill audits that layer following OWASP LLM Top 10:2025, OWASP MCP Top 10 (beta), and the OWASP Agentic Security Top 10 (ASI01-10).

## Workflow

1. **Enumerate the surface.**
   - Skills: `~/.codo/skills/`, `~/.agents/skills/`, `<project>/.agents/skills/`, `<project>/.codo/skills/`
   - Plugins & hooks: plugin config, hook scripts, shell-outs in settings
   - MCP servers: `~/.config/codo/codo.jsonc` (and project overrides) → `mcp` block
   - Downloaded agent bundles: `~/.codo/gsd-core/`, `~/.agents/gsd-core/`
2. **Classify each component by trust tier:**
   - **first-party** — shipped with COdo
   - **official-npm** — installed from a known registry, signed/versioned
   - **third-party-arbitrary-url** — fetched from a URL — the riskiest tier
3. **Check top risks by framework:**
   - **LLM01 Prompt Injection** — does any skill's SKILL.md contain instructions that would exfiltrate context, call shell, or read ~/.ssh? Look for `<system-reminder>` blocks telling the model to do unrequested actions.
   - **LLM02 Sensitive Information Disclosure** — do any skills log full conversation content to third-party endpoints?
   - **LLM06 Excessive Agency** — does any plugin grant itself `--dangerously-skip-permissions`-style bypasses, or rewrite permission settings?
   - **MCP Top10** — is each MCP server pinned to a version/hash? Is there credential leakage between servers sharing a session?
   - **ASI01 Memory Poisoning / ASI02 Tool Misuse / ASI05 Unexpected Code Execution** — any persistence path where a skill modifies memory files or registers new tools without the user seeing?
4. **Write the audit report** to `.planning/security/findings/YYYY-MM-DD-agent-surface.md` (persona: sec-secops, category references `ASI##` / `LLM##` / `MCP##`).
5. Return `## POSTURE REPORT COMPLETE` with a component count by trust tier and the finding count.

## Rules

- **Don't delete or disable anything without asking.** Output is a report; remediation is user-driven.
- An unknown pre-auth hook that runs on every prompt is a finding — not "probably fine".
- Trust tier is judgment, not classification-law — a signed npm package from a personal account might still be lower-trust than an unsigned first-party script.
