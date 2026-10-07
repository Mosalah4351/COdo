# Sec-Test User Guide: A Complete Course

**Audience:** anyone using COdo's sec-test agent — developers, security-minded engineers, students. Format: course-style, one module per concept, with every agent and every skill covered.

---

## Module 0 — Orientation

### What you'll learn

After this course, you'll be able to:

1. Invoke the sec-test agent and explain which persona should handle a given task.
2. Describe the 29 skills under `sec-test:*` and when each fires.
3. Author a scope file (`.codo/security-scope.json`) so the pentest persona will work.
4. Read a finding report and know exactly what "A03 injection, severity critical, evidence: ..." means.
5. Query the `security_finding` table to build dashboards over time.
6. Run the migration + test suites to validate a sec-test installation.

### Why course-style

Every stage of sec-test corresponds to a phase of the software development lifecycle. Treating this as a course forces the SDLC structure into your head: *design → code → build → validate → operate*. Learn the mapping, and the tools become easy.

---

## Module 0.5 — Vibecoder Quick Start

You ship fast. You don't have a security team. You need SOC2-grade security posture without becoming a security expert. Here's how sec-test works for you.

### The one-liner

> You vibe code it, sec-test defends it. Just talk to `@sec-test` like you'd talk to a security engineer.

### The 5 scenarios

#### Scenario 1: "I just wrote a feature, is it safe?"

```
You:    @sec-test audit this diff for security issues
```

`sec-appsec` runs OWASP Top 10:2025 + CWE Top 25 against your code. You get structured findings:

```
## CODE AUDIT COMPLETE — 3 findings (1 critical, 1 high, 1 medium)

CRITICAL: A05-injection | src/api/users.ts:42
  SQL query built by concatenating request.params.id
  Fix: Use parameterized queries via db.query("SELECT * FROM users WHERE id = $1", [id])

HIGH: A01-access-control | src/routes/admin.ts:15
  Missing role check on admin endpoint
  Fix: Add requireRole("admin") middleware before the handler
```

You fix the code, run it again, the finding disappears. Done.

#### Scenario 2: "I'm about to ship to production"

```
You:    @sec-test audit the CI pipeline and generate SBOM
```

`sec-devsecops` checks your GitHub Actions, generates a Software Bill of Materials, verifies SLSA compliance level, and flags unpinned action SHAs. You get a roadmap: "pin these 3 actions → you're SLSA L1."

#### Scenario 3: "I found a bug, write a regression test"

```
You:    @sec-test write a regression test for this finding
```

`sec-qa` writes the narrowest test that fails on old code and passes on fix. It never weakens existing tests, never edits production source. You get a test file, run it, confirm green.

#### Scenario 4: "My staging app is live, test it"

```
You:    @sec-test create scope file for staging.myapp.com expiring in 7 days
You:    @sec-test pentest staging.myapp.com
```

First, `sec-test:scope` creates `.codo/security-scope.json` (the authorization contract). Then `sec-pentest` runs PTES stages: passive recon, enumeration, active testing (if allowed), exploit verification. Every request is validated against the scope file first.

#### Scenario 5: "Am I logging sensitive data?"

```
You:    @sec-test audit my logging for sensitive data leaks
```

`sec-secops` finds console.log calls with passwords, missing auth event logs, secrets in error messages. Output: structured findings with exact file:line evidence.

### The security lifecycle (in plain English)

```
You design   → sec-architect threat-models it     (before code)
You code     → sec-appsec audits it               (while coding)
You build    → sec-devsecops hardens pipeline      (CI/CD)
You ship     → sec-devsecops signs + SBOMs it      (release)
You validate → sec-pentest tests it                (with scope file)
You operate  → sec-secops audits COdo itself       (ongoing)
You regress  → sec-qa writes the test              (after fix)
```

Each step produces structured findings in SQLite — not prose. Findings have IDs, severity, evidence, and concrete fix recommendations. They survive sessions. A rescan upserts, not duplicates.

---

### 1.1 The orchestrator: `sec-test`

**What:** A single top-level agent you can switch to with `@sec-test`. It does zero scanning, zero analysis, zero testing. Its only job: take your request and route it to the right persona.

**How to use:**

```
You:    @sec-test audit this diff for security issues
sec-test: → reads your diff
         → dispatches sec-appsec with context
         → returns "## CODE AUDIT COMPLETE — 4 findings (1 critical, 2 high, 1 medium)"
```

**Key property:** *the orchestrator never runs security tools.* Every persona is a separate process-limited agent with its own permission rules.

### 1.2 Personas (the "subagents")

#### `sec-architect` — Design phase

- **When fires:** before any code exists. New feature being planned? `@sec-test → sec-architect`.
- **What it does:** STRIDE (default) or PASTA (high-stakes only). Reads `.planning/PROJECT.md` if present, builds a threat model mapped to ASVS 5.0.
- **Outputs:** `.planning/security/threat-models/<slug>.md` — a numbered threat table mitigations per threat.
- **Forbidden:** cannot edit source code (permission `edit: { "*": "deny" }`, only `.planning/security/**` allowed).

#### `sec-appsec` — Code phase

- **When fires:** any diff exists, a PR is open, you typed "review this for bugs".
- **What it does:** OWASP Top 10:2025 (A01 Broken Access Control … A10 SSRF) + CWE Top 25. Runs Semgrep / OpenGrep / CodeQL when available.
- **Outputs:** `.planning/security/findings/YYYY-MM-DD-<slug>.md` with structured YAML frontmatter per finding.
- **Tool budget:** semgrep, opengrep, gitleaks, trufflehog. No nmap, no curl, no docker.

#### `sec-devsecops` — Build / Ship phase

- **When fires:** CI changed, about to publish a release, Dockerfile changed.
- **What it does:** NIST SSDF * Protect the Software / Produce Well-Secured Software; SLSA Build Track 0–3; Sigstore signing verification.
- **Outputs:** pipeline findings + a "level roadmap" (what changes get you from SLSA L0 → L1 → L2 → L3).
- **Tool budget:** syft, grype, trivy, osv-scanner, cosign.

#### `sec-pentest` — Validate phase ⛔ HARD GATED

- **When fires:** you explicitly ask for security testing against a running system. **Refuses to run without a signed scope file.**
- **Scope file:** `.codo/security-scope.json`. Missing / unreadable / expired / no-targets / wrong-target → all return `## PENTEST BLOCKED`.
- **What it does:** PTES stages. Passive recon always allowed; active scan (`allow_active_scan: true`) only against listed targets.
- **Tool budget:** curl, nmap (ask), nikto (ask), nuclei (ask). **Hard-denied:** sqlmap, ZAP full scan, any `external_directory` access.

#### `sec-secops` — Operate phase (meta)

- **When fires:** "audit COdo itself", "are my plugins safe", "what's our posture".
- **What it does:** Audits the agent attack surface — installed skills, plugin hooks, MCP servers, downloaded agent bundles — against OWASP LLM Top 10, MCP Top 10 (beta), Agentic Top 10 (ASI01-10).
- **Outputs:** posture trends under `.planning/security/posture.md`, incident runbooks under `.planning/security/runbooks/`, surface audits under `.planning/security/findings/`.

#### `sec-qa` — Verify phase (testing)

- **When fires:** "write a test for this", "what's our coverage", "mutation test this module".
- **What it does:** Writes/audits tests, measures coverage, runs mutation testing. The only persona that writes outside `.planning/` — test-shaped paths only (`*.test.*`, `*.spec.*`, `test/`, `tests/`).
- **Outputs:** test files, coverage reports, mutation scores under `.planning/testing/`.
- **Forbidden:** never edits production source, never weakens existing tests, never marks findings fixed on code diff alone.

### 1.3 The discipline — `sec-test` does NOT GSD-style rambling

If you're used to compose, note the difference: compose can research, then plan, then execute partly because it has access to `workflow({ action: "next-step" })`. Sec-test has a *firmer* discipline:

- Read-only personas (architect/appsec/devsecops/secops) → no user prompt required to start, just dispatch.
- Pentest → refuse unless the scope file is present and unexpired.
- All personas → return a structured completion marker the orchestrator listens for.

---

## Module 2 — The Skill Catalog (all 29)

Every skill is markdown with YAML frontmatter, lives under `packages/codo/src/skill/sec-test/<name>/SKILL.md`, and is registered with COdo's skill loader at startup. Below: every one, grouped by persona.

### Group A — Orchestrator skills (fire under sec-test)

#### A.1 `sec-test:brief`

Read the user's request, classify it (design | code | build | validate | operate), and pick the right persona. Asks one clarifying question if ambiguous (e.g. "audit this" — *what*? the diff? the running app?).

**Deliverable:** the dispatch prompt that goes into `task(subagent_type=...)`.

#### A.2 `sec-test:scope`

Author a new `.codo/security-scope.json`. Only this skill touches that file. Asks the user for: target URLs/IPs, allow active scanning (default false), expiry (default 7 days, max 90).

**Hard rule:** pentest cannot extend its own scope — different skill for creating, different persona for using.

#### A.3 `sec-test:report`

Roll up findings from `.planning/security/findings/**/*.md` AND from the `security_finding` SQLite table. Generates a posture report at `.planning/security/reports/YYYY-MM-DD-posture.md`.

**Looking glass:** when both markdown and DB exist, they're merged by fingerprint — `sha1(persona | category | location | normalized_evidence)` — so a rescan up-serts instead of duplicating.

### Group B — Architect skills

#### B.1 `sec-test:threat-model`

STRIDE-by-default, PASTA for high-stakes (financial, medical, auth). Output is a threat model document with ASVS 5.0 chapter mapping.

**Key callout:** the model is only as good as the trust boundaries it draws. Always re-validate that list before enumerating threats.

### Group C — AppSec skills

#### C.1 `sec-test:code-audit`

Runs OWASP Top 10:2025 + CWE Top 25 against the diff or tree. Prefers Semgrep with auto config; falls back to OpenGrep; falls back to manual review.

**Output schema:** every finding has `id, persona, category, location, confidence, severity, finding, evidence, remediation, status`.

#### C.2 `sec-test:secrets-scan`

Scan git history via gitleaks or trufflehog. Key claim: a secret deleted in a later commit is still leaked — only rotation closes the finding.

**Classification:** `confirmed` (scanner verified), `likely`, `possible`, `false-positive`.

#### C.3 `sec-test:dependency-audit`

Walk every lockfile (bun.lock, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements.txt, Pipfile.lock, poetry.lock, go.sum, Cargo.lock, Gemfile.lock, composer.lock, pom.xml). Use osv-scanner, fall back to grype/trivy.

**Triage:** maps each advisory to reachable/unreachable, fix availability, CVSS+EPSS.

### Group D — DevSecOps skills

#### D.1 `sec-test:pipeline-harden`

Audit `.github/workflows`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Makefile`, `justfile`, etc. against NIST SSDF practice groups + SLSA Build Track + Sigstore.

**Common findings:** unpinned action SHAs, `pull_request_target` with write tokens, OIDC absent (long-lived AWS keys).

#### D.2 `sec-test:sbom`

Generate a Software Bill of Materials — CycloneDX by default, SPDX for compliance. Output goes under `.planning/security/sbom/`.

**Why it matters:** the SBOM is the substrate for downstream scanners (grype, trivy). Without it you're just doing point-checks.

#### D.3 `sec-test:container-scan`

Trivy or Grype against a container image. Understands base-layer vs app-layer splits and never pushes.

#### D.4 `sec-test:supply-chain-attest`

Verify Sigstore signatures + SLSA provenance of built artifacts. Read-only — never signs.

**Policy:** unsigned public artifact = finding. Unsigned internal artifact = note.

### Group E — Pentest skills (all gated)

#### E.1 `sec-test:pentest`

The master workflow: PTES stages from recon to reporting. **HARD GATE on `.codo/security-scope.json`.**

#### E.2 `sec-test:api-security-test`

OWASP API Security Top 10:2023 — BOLA, broken auth, unrestricted resource consumption, SSRF, security misconfiguration.

#### E.3 `sec-test:auth-test`

Session fixation, cookie attributes (HttpOnly/Secure/SameSite), JWT alg allow-list, refresh rotation, logout semantics, MFA bypass, password reset hygiene.

#### E.4 `sec-test:exploit-verify`

Confirmation-only exploitation. One request, one verification. Never escalate. False positives transition the finding to `false-positive` with a reason.

### Group F — SecOps skills (meta / ongoing)

#### F.1 `sec-test:agent-surface-audit`

Reviews the *agent itself*: skills, plugins, MCP servers, downloaded bundles. Classifies by trust tier (first-party / official-npm / third-party-arbitrary-url).

#### F.2 `sec-test:logging-audit`

OWASP A09 check — what's logged (auth events, sensitive data writes), what's leaked (secrets in logs), what's missing (alerting).

#### F.3 `sec-test:incident-runbook`

Draft per-scenario response plans: leaked credential, malicious dep, PII exposure, DDoS, ransomware-touch. Under 100 lines each.

#### F.4 `sec-test:posture-report`

Weekly/monthly digest combining `security_finding` table + `.planning/security/posture.md` + recent scan reports.

### Group G — Tooling / cross-cutting

#### G.1 `sec-test:fuzz`

Coverage-guided fuzzing of parsers. Local code: no scope file needed (it's pure input validation). Live endpoints: requires the pentest scope gate.

#### G.2 `sec-test:context`

Hydrates the session with `.planning/PROJECT.md`, REQUIREMENTS.md, posture.md, recent findings. Passes the block to every persona in `Context:` field.

#### G.3 `sec-test:response`

Real-time incident response companion — keeps the user on the runbook during an active incident, maintains the append-only incident log.

#### G.4 `sec-test:learn`

Distills a finding, runbook execution, or incident report into a "lesson learned" entry appended to `posture.md`.

### Group H — QA skills (testing / verification)

#### H.1 `sec-test:test-plan`

Decide what to test and in what order before writing a single test. Produces a risk-ranked plan: auth > authorization > money movement > data deletion > input parsing > cryptography. Output: `.planning/testing/<slug>-plan.md`.

**Rule:** plan only. Never writes tests.

#### H.2 `sec-test:test-generate`

Write real, running tests for the surface identified by `test-plan`. Reads existing test conventions first, writes minimal tests, covers negative paths, runs the suite until green.

**Rule:** never weakens existing tests (no `.skip`, no widening matchers, no timeout increases).

#### H.3 `sec-test:coverage-audit`

Report what the suite actually verifies. Branch coverage is the headline number, not line coverage. Ranks uncovered regions by risk. Distinguishes "not covered" from "not worth covering."

#### H.4 `sec-test:mutation-test`

The only metric that answers: "would this suite fail if the code broke?" Runs Stryker/mutmut/go-mutesting against the highest-risk module, triages every survivor, reports a real mutation score.

#### H.5 `sec-test:regression-guard`

Convert a specific defect into the narrowest test that fails on the old behavior and passes on the fix. Proves the test can fail first. Finds the boundary (off-by-one reintroductions are the most common regression).

---

## Module 3 — Findings: reading, writing, persisting

### 3.1 The finding schema (YAML frontmatter)

```yaml
id: SEC-2026-001
persona: sec-appsec                # which persona produced it
category: A03-injection            # OWASP Top 10 or CWE-###
location: src/api/users.ts:42     # file:line or URL
confidence: high                   # high | medium | low
severity: critical                 # critical | high | medium | low | info
finding: SQL query built by concatenating request.params.id
evidence: |
  const q = "SELECT * FROM users WHERE id = " + req.params.id
remediation: |
  Use parameterized queries via db.query("SELECT * FROM users WHERE id = $1", [id])
status: open                       # open | fixed | accepted-risk | false-positive
cvss_score: 9.8
cvss_vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
epss_score: 0.94
```

### 3.2 The status lifecycle

```
open ──┐
       │ scanner re-ran clean
       ▼
    fixed     (auto-transition by sec-test:report)

open ──┐
       │ human sign-off
       ▼
  accepted-risk    (requires metadata.reason)

open ──┐
       │ verifier determined it's not a real issue
       ▼
  false-positive    (requires metadata.reason)
```

**Hard rule:** a code change alone does NOT transition a finding to `fixed`. Only a *scanner rerun* that no longer matches the fingerprint does.

### 3.3 The SQLite table

`security_finding` is the canonical store. Fields (see IMPLEMENTATION doc for the full SQL):

- All the YAML fields above
- Plus: `fingerprint` (dedup key), `project_id`, `session_id`, timestamps

Finding files (markdown) are *derived views* — the DB is the source of truth.

### 3.4 Reading the report

When `sec-test:report` runs, expect output like:

```
## POSTURE REPORT COMPLETE

7 open findings:
- 1 critical  (A03-injection, src/api/users.ts:42)
- 2 high      (A02-crypto, A07-auth)
- 4 medium    (misc)

Delta since last report (2026-08-06): -2 critical, +1 medium
```

---

## Module 4 — The scope gate (for pentest only)

### 4.1 Why it exists

Live testing without authorization is both legally wrong (Computer Fraud and Abuse Act in the US, similar statutes elsewhere) and operationally risky (you might break prod). The scope gate forces authorization *into the workflow*.

### 4.2 The file

`.codo/security-scope.json`:

```json
{
  "version": 1,
  "created": "2026-08-08T10:00:00Z",
  "expires": "2026-08-15T10:00:00Z",
  "targets": [
    { "type": "web", "value": "https://staging.example.com", "notes": "staging only, auth by IP" },
    { "type": "api", "value": "https://api.staging.example.com" }
  ],
  "allow_active_scan": false,
  "out_of_scope": [
    "production domains",
    "third-party SaaS",
    "any data-modifying payload"
  ],
  "contact": "sec-team@example.com"
}
```

### 4.3 Gate logic (five checks)

1. **File exists** — missing → `## PENTEST BLOCKED`
2. **Parses as JSON** — syntax error → `## PENTEST BLOCKED`
3. **Schema validates** — required fields, types → `## PENTEST BLOCKED`
4. **`expires` is in the future** — past → `## PENTEST BLOCKED`
5. **Requested target is in `targets`** (prefix match OK) → else `## PENTEST BLOCKED`

### 4.4 `allow_active_scan: false` vs `true`

- **false**: passive recon only. Reading HTTP responses, public docs, sitemaps. No malformed requests.
- **true**: active scanning allowed, but **still bounded** — no sqlmap, no ZAP full scan (those are hard-denied by permission).

---

## Module 5 — Running sec-test

### 5.1 Inside COdo

```
> @sec-test audit this PR for security issues
> @sec-test run a threat model for the upcoming payment flow
> @sec-test scan my dependencies
> @sec-test pentest https://staging.myapp.com   # will check scope file first
```

### 5.2 From the CLI

```
codo run --agent sec-test "audit the current diff"
codo agent list | grep sec               # verify registration
```

### 5.3 Security report CLI

Query the `security_finding` table from the command line — no COdo session needed:

```bash
# Markdown summary (default)
codo sec report

# Machine-readable JSON
codo sec report --format json

# SARIF output for GitHub code scanning / CI integration
codo sec report --format sarif

# CI gate: exit 1 if any high or critical findings exist
codo sec report --fail-on high

# Only findings from the last 2 weeks
codo sec report --since 2026-08-01

# Only open findings
codo sec report --status open
```

**CI pipeline example** (GitHub Actions):

```yaml
- name: Security gate
  run: |
    codo sec report --format sarif --fail-on high > results.sarif
  continue-on-error: false

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

### 5.4 Verifying installation

Run the test suite:

```bash
cd packages/codo
bun test test/agent/sec-test-registry.test.ts     # 11 assertions on the agents + skills
bun test test/agent/sec-test-finding-table.test.ts  # 7 assertions on the SQL layer
bun test test/security/scope-gate.test.ts          # 7 assertions on the gate
bun test test/agent/compose-bootstrap.test.ts      # 5 assertions on the compose gate fix

cd ../core
bun test test/database-migration.test.ts            # 14 assertions, including security_finding presence
```

Expected: **84+ sec-test scoped green**, plus the 14/14 migration battery.

---

## Module 6 — Common workflows

### Workflow A: Pre-merge security review

1. Stage your PR
2. `@sec-test audit this diff`
3. `sec-appsec` produces findings file
4. Fix each finding; rerun scanner to confirm `status: fixed`
5. `@sec-test generate posture report` → files the milestone

### Workflow B: First-time threat model for a new project

1. `@sec-test threat model for <feature>`
2. `sec-architect` reads PROJECT.md, builds STRIDE model
3. Output: `.planning/security/threat-models/<slug>.md`
4. Subsequent sprints reference the model, add to it as the feature evolves

### Workflow C: Harden the CI/CD pipeline

1. `@sec-test audit the pipeline`
2. `sec-devsecops` walks `.github/workflows/*.yml`
3. Output: findings + level roadmap (how to get from SLSA L0 → L1)
4. Iterate: pin action SHAs, enable OIDC, add SLSA provenance

### Workflow D: Authorized pentest

1. `@sec-test create a scope file for staging.myapp.com expiring in 7 days`
2. `sec-test:scope` skill prompts for targets, writes `.codo/security-scope.json`
3. `@sec-test pentest staging.myapp.com`
4. `sec-pentest` → reads scope → validates → runs PTES
5. Findings land in the markdown tree; `sec-test:report` rolls them up

---

## Module 7 — Insider tips

- **`@sec-test` always**: bypasses compose's GSD flow; flat security routing.
- **The scope file is the only authorization mechanism.** Don't try to bypass it — the personas will refuse.
- **Personas compose**: you can run `@sec-test threat-model + code-audit on this branch` and they'll run in parallel.
- **The findings table is queryable directly**: `sqlite3 ~/.local/share/codo/<project>/storage.db "SELECT severity, COUNT(*) FROM security_finding GROUP BY severity"`.
- **The skill files are markdown**: open any `packages/codo/src/skill/sec-test/<name>/SKILL.md` and you can read exactly what the persona will do.

---

## Module 9 — Power Moves

### The 4 habits that change everything

| When | What you do | Why |
|---|---|---|
| **Pre-commit** | `@sec-test scan my dependencies` | Catch CVEs before they enter your repo |
| **Pre-merge** | `@sec-test audit this diff` | Catch injection, XSS, broken access before merge |
| **Pre-deploy** | `codo sec report --fail-on high` | Gate releases on security posture |
| **Post-incident** | `@sec-test write incident runbook for <scenario>` | Next time, `@sec-test respond to <scenario>` — you're on the runbook |

### The 10-prompt SaaS shipping walkthrough

You're building a payments feature for your SaaS. Here's the full security lifecycle:

```
1.  @sec-test threat model for the payment flow
    → sec-architect: STRIDE model, trust boundaries, ASVS mapping

2.  @sec-test audit the payment API diff
    → sec-appsec: finds SQL injection in charge handler

3.  Fix the SQL injection (parameterized query)

4.  @sec-test scan my dependencies
    → sec-appsec: finds CVE in stripe SDK, CVSS 7.5

5.  @sec-test audit the CI pipeline
    → sec-devsecops: unpinned actions, missing OIDC

6.  @sec-test generate SBOM for the release
    → sec-devsecops: CycloneDX SBOM under .planning/security/sbom/

7.  @sec-test create scope file for staging.myapp.com
    → sec-test:scope: writes .codo/security-scope.json

8.  @sec-test pentest staging.myapp.com
    → sec-pentest: auth testing, API security, 2 findings

9.  @sec-test write regression test for the auth bypass finding
    → sec-qa: test file that fails on old code, passes on fix

10. @sec-test generate posture report
    → sec-test:report: full posture with trends, fed to codo sec report --format sarif
```

**Result:** 10 prompts, SOC2-grade evidence trail. Threat model, findings table, SBOM, pentest results, regression tests, posture report — all in `.planning/security/`.

### Querying findings directly

```sql
-- Severity breakdown
sqlite3 ~/.local/share/codo/<project>/storage.db \
  "SELECT severity, COUNT(*) FROM security_finding GROUP BY severity"

-- Open criticals
sqlite3 ~/.local/share/codo/<project>/storage.db \
  "SELECT location, finding FROM security_finding WHERE status='open' AND severity='critical'"

-- Findings by persona
sqlite3 ~/.local/share/codo/<project>/storage.db \
  "SELECT persona, COUNT(*) FROM security_finding GROUP BY persona"
```

---

## Module 8 — What sec-test is NOT

- **Not a replacement for a red team.** Personas simulate expertise; they don't replace an actual adversarial operator.
- **Not a general testing framework.** For unit tests, use `compose:tdd`. Sec-test is *security* testing (fuzzing, exploit verification). `sec-qa` writes security regression tests, not feature tests.
- **Not a CVE feed.** Findings reflect your code, not the world's threat intel.
- **Not auto-patching.** Every persona that produces fixes does so as a recommendation; you (or the user-driven executor) applies them.
- **Not a bypass for the scope gate.** Pentest personas will refuse to run without `.codo/security-scope.json`. This is by design.

---

## Closing

Sec-test moves the security conversation from "we should really think about this" into "we have a fingerprinted finding at src/api/users.ts:42 with severity critical and a concrete fix recommendation". For a solo developer, that's the difference between SOC2-eligible and not.

For the deep technical reference — file paths, migration IDs, permission shapes — see `03-IMPLEMENTATION.md` in the same directory. For the quick-start scenarios, see Module 0.5 above.
