# COdo

> A security-native AI coding agent — personas, scoped pentesting, and auditable findings.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/Mosalah4351/COdo/releases/latest&query=tag_name&label=release)](https://github.com/Mosalah4351/COdo/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#)

```text
 ██████╗  ██████╗  ██████╗   ██████╗
██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔═══██╗
██║      ██║   ██║ ██║  ██║ ██║   ██║
██║      ██║   ██║ ██║  ██║ ██║   ██║
╚██████╗ ╚██████╔╝ ██████╔╝ ╚██████╔╝
 ╚═════╝  ╚═════╝  ╚═════╝   ╚═════╝
```

**COdo** is an AI agent for developers who need the assistant to be security-aware by
default. Not just "it writes code" — but also "it tells you when the code it's about to write
introduces risk, it scopes pen-test activity to an explicit authorization file, and it
remembers security findings across sessions."

---

## Why COdo (and not OpenCode)?

OpenCode is a general-purpose AI coding assistant. It writes code.

COdo is a persona-organized agent with first-class security workflows:

- **Six security personas** covering the SDLC — architect, appsec, devsecops, pentest, secops
- **A persistent findings store** — every vulnerability has an ID, severity, evidence, remediation,
  and a status you can query (not a markdown note you lose)
- **A scope gate** — pentest can't touch a target unless `.codo/security-scope.json` is signed,
  unexpired, and names the target explicitly
- **An orchestrator model** — `compose` routes work through 33 GSD subagents with structured
  artifacts (plan → roadmap → execute → verify → review)

If you're writing software where security review is part of the workflow — not a separate
step you pay someone else for — COdo is the agent.

For the full technical comparison with OpenCode and Claude Code, see
**[`docs/not-a-fork/VISIBLE-DIFFERENCES.md`](docs/not-a-fork/VISIBLE-DIFFERENCES.md)**.

---

## Quick start

### Install

```bash
curl -fsSL https://codo.run/install | bash
```

Or with a specific version:

```bash
curl -fsSL https://codo.run/install | bash -s -- --version 1.0.0
```

### First run

```bash
codo
```

You'll see the COdo banner, a session canvas, and a persona chip rail. Default agent is `compose`
(for orchestrated multi-step work) with `@sec-test` available for security asks.

### Persona entry points

| Type | Purpose |
|---|---|
| `@compose` … | Orchestrated multi-phase work (plan → execute → verify) |
| `@sec-test` … | Security question, audit, pentest, or compliance |
| `@sec-appsec` … | Code-level audit (OWASP Top 10) |
| `@sec-pentest` … | Authorized dynamic testing (scope-gated) |
| `@sec-architect` … | Pre-implementation threat model |
| `@sec-devsecops` … | CI/CD, SBOM, and supply-chain review |

### Example flows

**Threat-model a new feature:**
```
@sec-test threat-model the new payment flow before we build it
```
→ produces `.planning/security/threat-models/payment-flow.md` with trust boundaries, STRIDE
enumeration, and ASVS mapping.

**Audit the current diff:**
```
@sec-test audit this branch's changes for security issues
```
→ runs `sec-appsec`, finds e.g. SQL injection in `src/api/users.ts:42`, writes a
`.planning/security/findings/2026-08-10-audit.md` entry **and** a row in the
`security_finding` SQLite table.

**Authorized pentest:**
```
@sec-test scope staging.example.com
@sec-test pentest (scope file is written, persona asks for active-scan permission)
```

**Posture summary at the end of the week:**
```
@sec-test report
```
→ reads findings table + markdown tree, produces `posture-YYYY-MM-DD.md` + updates
`.planning/security/posture.md`.

---

## Repository layout

```
packages/
  codo/         # CLI, agents, skills, session runtime, storage
  core/         # Effect-based services, drizzle schema, migration runner
  tui/          # Terminal UI (solid+opentui)
  app/          # SolidJS web app (workbench view)
  desktop/      # Electron shell
  sdk/          # JS/TS SDK generated from the OpenAPI spec
  plugin/       # Plugin API contract (third-party)
docs/
  sec-test/     # The full sec-test documentation set (idea, guide, impl)
  not-a-fork/   # Why COdo is its own thing (visible differences)
  archive/      # Historical docs (kept for reference)
.planning/
  codebase/     # Architecture summary read by compose
  phases/       # Active phase state
```

---

## Development

```bash
# Setup
git clone https://github.com/Mosalah4351/COdo.git
cd COdo
bun install

# Run the CLI directly
bun run packages/codo

# Typecheck (per package)
cd packages/codo && bun typecheck
cd ../core && bun typecheck

# Tests (per package)
cd packages/codo && bun test                                          # full suite
bun test test/agent/sec-test-registry.test.ts                          # scoped
bun test test/security/scope-gate.test.ts                              # gate logic

# Build the native binary
cd packages/codo && bun run build
# Output lands in packages/codo/dist/codo-<platform>-<arch>/
```

The repo is a Bun workspace with Turbo for orchestration. Root `bun typecheck` runs every
package.

---

## Security posture

Sec-test is itself the test lab: every PR against the `sec-test` branch is audited by the
`@sec-test` agent before merge. The `security_finding` table for this repo is queryable by
anyone with a clone. See [`docs/sec-test/`](docs/sec-test/) for the documentation on how the
system works.

If you find a vulnerability in COdo, **please do not open a public issue.** Email
`security@codo.run` with a proof-of-concept. We rotate disclosed findings into the posture
report within 24h.

---

## License

MIT — see [`LICENSE`](LICENSE).

COdo was initially derived from OpenCode (MIT). The MIT license text for OpenCode's components
is preserved at [`LICENSES/OPENCODE-LICENSE.txt`](LICENSES/OPENCODE-LICENSE.txt), and a longer
attribution story lives in [`NOTICES.md`](NOTICES.md).

---

## Community

- **Issues** → https://github.com/Mosalah4351/COdo/issues
- **Discussions** → https://github.com/Mosalah4351/COdo/discussions (use this for
  "should we adopt this?" questions, not defect reports)
- **Docs** → https://codo.run/docs (mostly the markdown under `docs/`)

Contribution guide is at [`CONTRIBUTING.md`](CONTRIBUTING.md). The short version: personas
live in `packages/codo/src/agent/prompt/`, skills live in
`packages/codo/src/skill/<name>/SKILL.md`, findings live in the `security_finding`
drizzle table. Adding a new skill is ~30 lines of markdown; adding a new persona is a
prompt + a permission block in `packages/codo/src/agent/agent.ts`.
