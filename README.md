# COdo

> The security-native AI coding agent. Six specialized security personas, scope-gated
> pentesting, a durable findings store, and an orchestrated multi-agent workflow — all in
> one terminal-first CLI.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#)
[![npm](https://img.shields.io/npm/v/codo-ai)](https://www.npmjs.com/package/codo-ai)

```text
 ██████╗  ██████╗  ██████╗   ██████╗
██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔═══██╗
██║      ██║   ██║ ██║  ██║ ██║   ██║
██║      ██║   ██║ ██║  ██║ ██║   ██║
╚██████╗ ╚██████╔╝ ██████╔╝ ╚██████╔╝
 ╚═════╝  ╚═════╝  ╚═════╝   ╚═════╝
```

COdo is an AI coding agent for teams that treat security as part of the workflow, not a
separate step. It writes code like any agent — and then it audits that code, threat-models
the features you're about to build, scopes and executes authorized penetration tests, and
remembers every finding across sessions. Stop losing vulnerabilities in markdown notes;
every finding gets an ID, a severity, evidence, and a remediation path.

---

## Installation

```bash
npm install -g codo-ai
```

The npm package `codo-ai` installs a native binary for your platform (macOS, Linux, or
Windows; Intel or Apple Silicon/ARM64; glibc or musl; baseline AVX2 fallbacks included) via
a zero-dependency postinstall. No Node runtime required after install.

```bash
codo
```

You'll land in the COdo TUI. The default agent is `compose` for orchestrated multi-step
work, and `@sec-test` handles everything security-related. Type `/help` to see the built-in
commands.

---

## ✦ sec-test: security at the heart of the agent

`@sec-test` is not a script or a lint rule — it's the full security lifecycle, built from
**six specialized personas** and a **29-skill library**. You invoke it the same way you ask
any other question; COdo routes to the right specialist.

### The six personas

| Persona | Phase | What it does |
|---|---|---|
| **`sec-architect`** | Design | Threat-model features before code exists (STRIDE/PASTA, ASVS mapping) |
| **`sec-appsec`** | Code | Static audit of any diff or PR — injection, secrets, authz, OWASP Top 10 |
| **`sec-devsecops`** | Build/ship | Pipeline hardening (NIST SSDF), SBOMs, container scans, supply-chain attestation |
| **`sec-pentest`** | Validate | Scope-gated dynamic testing against running targets |
| **`sec-qa`** | Verify | Test generation, coverage audits, mutation testing, regression guards |
| **`sec-secops`** | Operate | Audits COdo itself, tracks posture trend over time |

### What makes it different

- **A durable findings store.** Every vulnerability is written to a SQLite
  `security_finding` table — ID, severity, CVSS, evidence, remediation, status. Query it,
  report on it, watch it age. Re-running a scan de-duplicates instead of duplicating.
- **A real scope gate.** `sec-pentest` cannot send a single packet to a target unless
  `.codo/security-scope.json` exists, is signed, unexpired, and names that target. The
  network path is code-enforced — `curl`, `nmap`, and friends are denied for personas.
- **29 ready-to-run skills.** From `threat-model` and `code-audit` to `secrets-scan`,
  `dependency-audit`, `fuzz`, `exploit-verify`, `mutation-test`, `incident-runbook`,
  `regression-guard`, and `posture-report`.
- **Human-readable + machine-readable.** Every skill writes markdown under
  `.planning/security/` *and* records findings in the store; `codo sec report` exports
  markdown, JSON, or SARIF for your CI.
- **Regression guards for every fix.** When a finding is fixed, `sec-qa` can convert it
  into a permanent test so the bug can't come back unnoticed.

### Example flows

```text
# Threat-model a feature before it's built
@sec-test threat-model the new payment flow

# Audit the current branch's changes
@sec-test audit this branch for security issues

# Authorize and pentest a running target (scope file required)
@sec-test scope https://staging.example.com
@sec-test pentest

# Weekly posture digest
@sec-test report
```

---

## compose: orchestrated multi-agent work

For everything that's not security — and the glue around it — COdo routes through the
**`compose` agent**: an orchestrator that plans your request, dispatches specialized
subagents (33 workflow agents), and produces structured artifacts as it goes:

```text
discuss → plan → execute → verify → review
```

Ask for a feature and get a roadmap, a numbered plan, parallel waves of implementation,
and verification against acceptance criteria — with commit hygiene built in. `compose`
also runs the GSD workflow system for milestone-driven development (`.planning/` project
state, phases, cross-agent audits).

---

## And more

- **Terminal-first TUI** — SolidJS + OpenTUI, with an embedded web workbench
  (`codo web`) and an optional Electron desktop shell.
- **Persistent sessions** — durable session inputs, crash-safe resume, and process-local
  execution orchestration with EventV2 replay.
- **Every major model provider** — OpenAI, Anthropic, Google, Bedrock, Azure, Groq,
  Mistral, xAI, OpenRouter, and more via the AI SDK gateway, plus OAuth sign-in.
- **Plugins** — a typed plugin API for extending the agent, tools, and skills.
- **Generated SDK** — the HTTP API is spec-first, with a JS/TS SDK generated from the
  OpenAPI schema.

---

## Requirements

- macOS 12+, Linux (glibc or musl), or Windows 10+ (x64 with AVX2, or baseline fallback)
- ARM64 (Apple Silicon / AArch64 Linux / Windows on ARM) supported natively

## License

MIT — see [`LICENSE`](LICENSE). COdo was initially derived from OpenCode (MIT); the
OpenCode license text is preserved at [`LICENSES/OPENCODE-LICENSE.txt`](LICENSES/OPENCODE-LICENSE.txt).

## Contributors

- **Muse Spark** — AI contributor (session title generation, Muse prompt restore, release tooling). Commits carry a `Co-Authored-By: Muse Spark` trailer.

## Community

- **Issues** → <https://github.com/Mosalah4351/COdo/issues>
- **Discussions** → <https://github.com/Mosalah4351/COdo/discussions>
- **Docs** → <https://codo-ai.vercel.app/docs>

If you find a vulnerability in COdo, please do **not** open a public issue — email
`security@codo.run` with a proof-of-concept.