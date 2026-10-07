# Sec-Test: The Idea

**A security-native agent for AI-assisted coding, with five specialized sub-agents, twenty-three skills, and a signed authorization contract.**

---

## The short version

Every other AI coding agent — Claude Code, Codex, OpenCode, Cursor, Aider — teaches the model how to write code. Sec-test teaches COdo how to *defend* the code the model writes.

Sec-test adds a single new top-level agent to COdo — `sec-test` — which orchestrates five specialized sub-agents, each one corresponding to a phase of the software development lifecycle:

| Phase | Persona | What it does |
|---|---|---|
| **Design** (before code) | `sec-architect` | Threat model — STRIDE/PASTA against the planned feature |
| **Code** (while writing) | `sec-appsec` | OWASP Top 10:2025 + CWE Top 25 static audit |
| **Build** (CI/CD) | `sec-devsecops` | NIST SSDF + SLSA + Sigstore pipeline hardening |
| **Validate** (running app) | `sec-pentest` | PTES-guided dynamic testing, **gated by a signed scope file** |
| **Operate** (agents themselves) | `sec-secops` | Audits COdo's own skills, plugins, MCP servers — the agent-surface |

Twenty-three skills cover the operational details: SBOM generation, container scanning, secrets detection, finding persistence in SQLite, scope-file authoring, exploit verification (without exploit escalation).

---

## Why this exists

The standard pitch for AI coding tools is "write code faster". But the threaten-by-default reality is:

1. **Code written by LLMs inherits LLM biases.** The model has seen a million SQL tutorials with string-concatenation queries; it will produce one unless you ask explicitly for parameterization.
2. **Modern code is shipped to platforms that get attacked** (npm, Docker Hub, GitHub Releases). Vulnerabilities in CI/CD and supply chain are now a larger attack class than direct exploits.
3. **Agents themselves are attack surface.** Skills, plugins, MCP servers, hooks — every agent runtime is now a complex marketplace-borne plugin system. None of the mainstream tools audit *that* layer.
4. **Compliance is shifting left.** SOC2 Type II requires the SDLC to demonstrably include threat modeling, vulnerability scanning, and incident response. A single-person team can't hire a security engineer; they need an agent who does it.

Existing tools punt on each of these. Sec-test is COdo's answer.

---

## Why COdo over Claude Code / Codex / OpenCode

### Claude Code (Anthropic)

- Security work is one generic agent prompt with no documented threat model.
- No built-in persistence layer for findings; the model tells you about a SQL injection, you fix it, the next session the model has forgotten.
- No scope-gate for live testing — if you ask Claude to "probe this endpoint", it'll happily try against any URL with no authorization framework.

### Codex (OpenAI)

- Cloud-first; your code travels to OpenAI servers. For a security audit, that's a compliance problem before it's a correctness problem.
- Sandboxed execution is on-by-default, but no mechanism for *signing* the sandboxes scope.
- No concept of distinct design/code/build pentest personas — it's one undifferentiated agent.

### OpenCode (SST)

- **Closest competitor.** Open source, brings agent-per-task structure.
- Marketplace-borne plugins are powerful but the Agent/plugin audit surface goes unaddressed.
- No persisted findings store — markdown files work but you can't query them.
- No scope-gate abstraction in the permission system; pentest-mode is permissive-by-default.

### COdo + Sec-Test

| Property | How sec-test does it |
|---|---|
| **Persona specialization** | Five distinct sub-agents with their own prompts, permission profiles, and tool allowlists. sec-pentest literally cannot write to `.env` files, sec-architect cannot edit source. |
| **Scope gate** | `.codo/security-scope.json` — required for any dynamic testing. Validates expiry, target allowlist, active-scan toggle. Missing file → refusal. |
| **Persistence** | `security_finding` SQLite table with fingerprint dedup. Findings survive sessions, scans re-ran produce up-serts not duplicates. |
| **Agent surface audit** | `sec-secops` audits COdo itself (skills, plugins, MCP servers) against OWASP LLM Top 10 + MCP Top 10 + Agentic Top 10. |
| **Open Development** | TypeScript, runs on Bun, contributions are PRs. No API key hostage. |
| **Cross-target** | CLI, TUI, Web, ACP server, MCP server — same agent runs everywhere. |

---

## Who sec-test is for

- **Solo developers** who can't afford a $200k/yr application security engineer but want SOC2-grade SDLC evidence
- **Startups pre-product-market-fit** that need to ship fast today without being the next "Startup X exposes DB" headline
- **Enterprise security teams** evaluating AI agents as potentially-malicious tooling — sec-test is the audit surface
- **Compliance auditors** producing evidence for SOC2 Type II / ISO 27001 audits
- **Educators** — the markdown output of sec-test *is* a course in application security

---

## The SDLC security story, end-to-end

```
1. Design a feature        → sec-architect produces threat model + ASVS mapping
2. Write the code          → sec-appsec audits (OWASP, CWE)
3. Cut a release           → sec-devsecops hardens pipeline, generates SBOM, signs artifacts
4. Pen-test (if authorized) → sec-pentest verifies (with scope file)
5. Continuous operation    → sec-secops audits the agent's own skills/plugins/MCP
6. Findings persist        → security_finding table + markdown reports under .planning/security/
7. Trend over time         → sec-test:posture-report, sec-test:learn
```

Each phase emits structured findings, not prose. Findings have IDs, severity, confidence, evidence, and a remediation that references *your* project's stack.

---

## The four-phase delivery

Sec-test was implemented in phases so each layer is independently testable:

- **Phase 0** (commit c042b9a) — register `sec-test` + 5 sub-agents in COdo's agent registry, write the persona prompts, ship 10 read-only skills.
- **Phase 1** (commit 161abcf + cb71b88) — `security_finding` SQLite table in `@codo-ai/core/security/sql.ts`, drizzle migration `20260807123904_security_finding`, sec-test:report skill reads/writes both markdown and the table.
- **Phase 2** (commit b0aca5a) — DevSecOps skills: SBOM generation, container scanning, supply-chain attestation.
- **Phase 3** (commit fa8b0ce) — scope-gate runtime + pentest personas: api-security-test, auth-test, exploit-verify.
- **Phase 4** (commit fc5d4a7) — SecOps: logging audit, incident runbook, posture report, fuzz.
- **Phase 5** (commit a81ebbc) — mission-cycle skills: context hydration, real-time response, lessons-learned.

**Current state: 29 skills, 7 agents, 1 SQL table, 98+ targeted tests green.**

---

## Licensing and openness

- Fully open source under the COdo project license.
- Persona prompts are plain `.txt` files — auditable, fork-able.
- Skills are markdown with frontmatter — diff-able, review-able.
- The scope-gate is public code, not a licensing shim.
