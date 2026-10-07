# What COdo Is — and Isn't

**COdo is not OpenCode.** It doesn't compete with it; it doesn't aim to be another distribution of
it; and it doesn't inherit its roadmap. COdo is a security-first AI agent for developers, built
on the idea that an agent is only useful if you can trust it.

If you're reading this because you searched "opencode codo" or because someone pointed you at a
fork — this document clears up what the differences actually are.

---

## 1. The foundational difference

OpenCode is a general-purpose AI coding assistant. The product assumption is: *model writes code,
you review or accept, ship it*.

COdo is a **(security × workflow) agent**. The product assumption is: *before code leaves the
machine, it's been audited, scoped, and (if you opt in) pen-tested*. The agent doesn't just write;
it asks "should this be allowed to exist?"

In practice:

- OpenCode has a single `build` agent that handles everything.
- COdo has six security personas (`sec-architect`, `sec-appsec`, `sec-devsecops`, `sec-pentest`,
  `sec-secops`, plus the `sec-test` orchestrator), each with its own permission profile, its own
  prompt, and its own bounded tool allow-list.

### What this looks like in practice

**OpenCode:**
```
User: "audit this for vulnerabilities"
opencode → reads code → free-form markdown report
```

**COdo:**
```
User: "@sec-test audit this diff"
sec-test → sec-appsec dispatches SAST + secrets scan + dependency audit,
           every finding lands in `security_finding` with severity / confidence /
           evidence / remediation / status — queryable via SQL, trended over time
```

The first is a paragraph of markdown. The second is a structured finding report you can grep,
index, alert on, or feed to a security team inbox.

---

## 2. Sec-Test (the named feature)

Five personas, 23 skills, a runtime gate for active scanning, and a queryable store for findings.

- **Design (before code exists):** `sec-architect` runs STRIDE or PASTA threat models against the
  planned feature; outputs `.planning/security/threat-models/<slug>.md`.
- **Code (while writing):** `sec-appsec` walks OWASP Top 10:2025 + CWE Top 25 against the diff;
  findings land in `security_finding` (SQLite) with dedup fingerprint.
- **Build / ship:** `sec-devsecops` runs NIST SSDF and SLSA walks over CI configs, Dockerfiles,
  publish scripts, generates SBOMs, verifies Sigstore signatures.
- **Validate (on demand, gated):** `sec-pentest` refuses to touch a target unless
  `.codo/security-scope.json` is present, parses, unexpired, and lists the target. Scope includes
  `allow_active_scan` toggle — defaults to false.
- **Operate (meta):** `sec-secops` audits COdo itself — installed skills, plugins, MCP servers,
  downloaded agent bundles — against OWASP LLM Top 10, MCP Top 10, and the Agentic Top 10 (ASI01-10).

The security architecture is documented in `docs/sec-test/` on this branch (01-IDEA, 02-USER-GUIDE,
03-IMPLEMENTATION).

---

## 3. Findings persist; findings are queryable

OpenCode (like every other AI agent we evaluated) outputs vulnerability reports as markdown. The
report is useful today; it's invisible in six months.

COdo's `security_finding` SQLite table (migration `20260807123904_security_finding`) stores
every finding with structured fields:

```
id, persona, category, location, confidence, severity,
finding, evidence, remediation, status,
cvss_score, cvss_vector, epss_score,
fingerprint (dedup key), project_id, session_id,
metadata (JSON), time_created, time_updated, time_status_changed
```

The markdown report under `.planning/security/findings/` is a derived view. The database is the
source of truth.

This means:

- You can answer "what's our current open criticals count?" without grep.
- You can see whether a finding reappeared after a fix (fingerprint matches; status flips from
  `fixed` → `open`).
- You can build dashboards over posture trends.

---

## 4. Agents don't hold the world in their head

OpenCode's model is "one smart agent that knows everything." When that doesn't work (multi-agent
coordination, state handoffs, security gating), you run out of room in the context window.

COdo's bet is the opposite: many specialized agents, each with a tight system prompt and a
structured state contract. The orchestrator is the only component that sees everything. The
personas each see only what they need for their SDLC phase.

This also means agents run with explicitly bounded permissions. `sec-pentest` cannot write to
`.ssh/`, `~/.aws/`, or anything outside the project's `.planning/security/` output directory. The
permission layer is enforced, not aspirational.

---

## 5. Scope-gate enforcement

The pen-test persona cannot work without an explicit, time-boxed, auditable authorization file.

`.codo/security-scope.json` looks like:

```json
{
  "version": 1,
  "created": "2026-08-08T10:00:00Z",
  "expires": "2026-08-15T10:00:00Z",
  "targets": [
    { "type": "web",  "value": "https://staging.example.com" },
    { "type": "api",  "value": "https://api.staging.example.com" }
  ],
  "allow_active_scan": false,
  "out_of_scope": ["production domains", "third-party SaaS"],
  "contact": "sec-team@example.com"
}
```

`sec-pentest` refuses to send any request to any host not in `targets`, refuses to send malformed
requests when `allow_active_scan: false`, and refuses entirely once the file expires. URL matching
blocks classic prefix-bypass tricks (e.g. `staging.example.com.attacker.net` cannot satisfy
`staging.example.com`).

Every other agent we've reviewed skips this entirely. Without a gate, the only thing preventing
an AI probing prod is the prompt — and prompts can be talked around.

---

## 6. The compose workflow

COdo also ships `compose`, an orchestrated workflow mode that takes you from idea → domain
research → roadmap → plan → executor → verifier → reviewer — through 33 specialist GSD subagents
(project-researcher, roadmapper, planner, executor, debugger, nyquist-auditor, and the like).

Each subagent has its own `<execution_context>` preamble, its own workflow files from the
`.codo/gsd/` install tree, and its own completion marker. You don't write "make this feature";
you type `@compose` and the orchestrator routes, dispatches, and translates.

OpenCode doesn't have workflow orchestration of this depth.

---

## 7. Addon marketplace

COdo supports installing addons (`COdo addon enable <name>`) as a first-class mechanism. Skills,
prompts, plugin hooks, and MCP servers can be toggled per-project or globally without forking
user config.

OpenCode ships its addon support but gates it behind a plugin model where users have to know the
internal structure to configure.

---

## 8. Who should use which

| Use OpenCode if… | Use COdo if… |
|---|---|
| You want a straightforward AI pair-programmer and nothing else | You want the writing to come with an audit trail |
| You don't care about compliance telemetry | You need SOC2-grade SDLC evidence keyed to findings |
| You're shipping consumer products with no PII | You're shipping anything security-adjacent |
| Solo hacking on personal scripts | Team workflows with principled delegation |

If you only want the writing part, OpenCode will be sufficient forever and works fine. COdo is
built for the moments when "the model wrote something" isn't the end of the conversation.

---

## 9. The things COdo still inherits

Honesty section. COdo still uses:

- The session/core model (SessionV2, Effect runtime, storage layer)
- The TUI renderer base (opentui)
- Provider abstractions that started life as AI SDK wrappers

We consider these "shared DNA," not "fork surface." They've been rewritten for COdo's persona
model and security guarantees; the interfaces are similar but the implementations are COdo
code. `NOTICES.md` covers the legal attribution.
