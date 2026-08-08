# Sec-Test Implementation Reference

**Audience:** maintainers of COdo who need to modify, extend, or audit the sec-test feature. Every file path, every schema field, every test, every commit is enumerated. Pairs with `01-IDEA.md` (rationale) and `02-USER-GUIDE.md` (operation).

---

## 1. Branch + commits

Branch: `sec-test` (cut from `addon-marketplace`)

```
a81ebbc feat(codo): complete 23-skill sec-test catalog with context, response, learn
fc5d4a7 feat(codo): phase 4 secops skills + orchestration
fa8b0ce feat(codo): phase 3 scope gate + pentest skill family
b0aca5a feat(codo): phase 2 DevSecOps skills (sbom, container-scan, supply-chain-attest)
cb71b88 feat(codo): wire security_finding into report skill + add migration coverage
161abcf feat(core): add security_finding table via drizzle migration
9d988b2 fix(codo): harden bootstrap gate and installer secondary roots
c042b9a feat(codo): add sec-test agent with 5 persona subagents and 10 bundled skills
```

Total: 47 files touched, +2630 / −111 LOC. All commits are signed by Mohamed Salah.

---

## 2. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│  User prompt: "@sec-test <request>"                                     │
│  ▶ routed via registry to sec-test primary agent                        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  sec-test orchestrator (PROMPT_SEC_TEST)                                │
│  • Reads .planning/security/ existing posture                           │
│  • Routes to persona via task(subagent_type=...)                        │
│  • Translates structured results back to plain English                  │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
       ┌──────────┬──────────┬────┴──────┬───────────┐
       ▼          ▼          ▼           ▼           ▼
  architect   appsec     devsecops    pentest     secops
   (design)   (code)     (CI/CD)      (validate)  (operate)
   STRIDE     OWASP      SSDF         PTES        LLM/MCP
              CWE        SLSA                      AST
```

Sub-agents run as native COdo subagents (`mode: "subagent", native: true`) with strictly narrower permission than the orchestrator.

---

## 3. File inventory (every path-modifying file)

### 3.1 Agent prompts (persona text; bundled into binary at build)

| Persona | Path | Bytes |
|---|---|---|
| sec-test (orchestrator) | `packages/codo/src/agent/prompt/sec-test.txt` | ~3.7KB |
| sec-architect | `packages/codo/src/agent/prompt/sec-architect.txt` | ~1.6KB |
| sec-appsec | `packages/codo/src/agent/prompt/sec-appsec.txt` | ~2.4KB |
| sec-devsecops | `packages/codo/src/agent/prompt/sec-devsecops.txt` | ~1.5KB |
| sec-pentest | `packages/codo/src/agent/prompt/sec-pentest.txt` | ~3.4KB |
| sec-secops | `packages/codo/src/agent/prompt/sec-secops.txt` | ~1.6KB |

Each is imported in `packages/codo/src/agent/agent.ts:14-20` as text and passed via the `prompt:` field of the agent registry entry.

### 3.2 Agent registry entries (where permissions live)

File: `packages/codo/src/agent/agent.ts` lines 237–413.

```
237  "sec-test": { ... mode: "primary", native: true, prompt: PROMPT_SEC_TEST }
256  "sec-architect": { ... mode: "subagent", native: true, prompt: PROMPT_SEC_ARCHITECT }
287  "sec-appsec":    { ... mode: "subagent", native: true, prompt: PROMPT_SEC_APPSEC }
318  "sec-devsecops": { ... mode: "subagent", native: true, prompt: PROMPT_SEC_DEVSECOPS }
350  "sec-pentest":   { ... mode: "subagent", native: true, prompt: PROMPT_SEC_PENTEST }
386  "sec-secops":    { ... mode: "subagent", native: true, prompt: PROMPT_SEC_SECOPS }
```

#### Permissions per persona (TL;DR)

| Agent | bash | edit | external_directory |
|---|---|---|---|
| sec-test | inherited from defaults | inherited from defaults | inherited |
| sec-architect | `git log/diff` allow, rest deny | only `.planning/security/**` | readonlyExternalDirectory |
| sec-appsec | semgrep/opengrep/gitleaks/trufflehog allow | only `.planning/security/**` | readonlyExternalDirectory |
| sec-devsecops | syft/grype/trivy/osv-scanner/cosign allow | only `.planning/security/**` | readonlyExternalDirectory |
| sec-pentest | curl allow; nmap/nikto/nuclei ask; sqlmap/zap-full deny; rest deny | only `.planning/security/**` | `*`: deny |
| sec-secops | (no bash grants beyond defaults) | only `.planning/security/**` | `*`: deny, but `Global.Path.data` allow |

### 3.3 Skill catalog (23 skills)

Index file: `packages/codo/src/skill/sec-test-skills.ts`

Registration loop: `packages/codo/src/skill/index.ts` (search for "Register sec-test skills as built-in skills")

| Skill | Bundled file | Persona it belongs to |
|---|---|---|
| `sec-test:brief` | `packages/codo/src/skill/sec-test/brief/SKILL.md` | orchestrator |
| `sec-test:scope` | `packages/codo/src/skill/sec-test/scope/SKILL.md` | orchestrator |
| `sec-test:report` | `packages/codo/src/skill/sec-test/report/SKILL.md` | orchestrator |
| `sec-test:threat-model` | `packages/codo/src/skill/sec-test/threat-model/SKILL.md` | sec-architect |
| `sec-test:code-audit` | `packages/codo/src/skill/sec-test/code-audit/SKILL.md` | sec-appsec |
| `sec-test:secrets-scan` | `packages/codo/src/skill/sec-test/secrets-scan/SKILL.md` | sec-appsec |
| `sec-test:dependency-audit` | `packages/codo/src/skill/sec-test/dependency-audit/SKILL.md` | sec-appsec |
| `sec-test:pipeline-harden` | `packages/codo/src/skill/sec-test/pipeline-harden/SKILL.md` | sec-devsecops |
| `sec-test:sbom` | `packages/codo/src/skill/sec-test/sbom/SKILL.md` | sec-devsecops |
| `sec-test:container-scan` | `packages/codo/src/skill/sec-test/container-scan/SKILL.md` | sec-devsecops |
| `sec-test:supply-chain-attest` | `packages/codo/src/skill/sec-test/supply-chain-attest/SKILL.md` | sec-devsecops |
| `sec-test:pentest` | `packages/codo/src/skill/sec-test/pentest/SKILL.md` | sec-pentest |
| `sec-test:api-security-test` | `packages/codo/src/skill/sec-test/api-security-test/SKILL.md` | sec-pentest |
| `sec-test:auth-test` | `packages/codo/src/skill/sec-test/auth-test/SKILL.md` | sec-pentest |
| `sec-test:exploit-verify` | `packages/codo/src/skill/sec-test/exploit-verify/SKILL.md` | sec-pentest |
| `sec-test:agent-surface-audit` | `packages/codo/src/skill/sec-test/agent-surface-audit/SKILL.md` | sec-secops |
| `sec-test:logging-audit` | `packages/codo/src/skill/sec-test/logging-audit/SKILL.md` | sec-secops |
| `sec-test:incident-runbook` | `packages/codo/src/skill/sec-test/incident-runbook/SKILL.md` | sec-secops |
| `sec-test:posture-report` | `packages/codo/src/skill/sec-test/posture-report/SKILL.md` | sec-secops |
| `sec-test:fuzz` | `packages/codo/src/skill/sec-test/fuzz/SKILL.md` | sec-appsec ↔ sec-pentest |
| `sec-test:context` | `packages/codo/src/skill/sec-test/context/SKILL.md` | orchestrator |
| `sec-test:response` | `packages/codo/src/skill/sec-test/response/SKILL.md` | sec-secops |
| `sec-test:learn` | `packages/codo/src/skill/sec-test/learn/SKILL.md` | orchestrator |

### 3.4 Database layer

| File | Purpose |
|---|---|
| `packages/core/src/security/sql.ts` | SecurityFindingTable definition + `SecurityFinding` type namespace |
| `packages/core/src/database/migration/20260807123904_security_finding.ts` | Drizzle-effect migration (auto-generated then renamed by hand) |
| `packages/core/src/database/migration.gen.ts` | Registry of all migrations (security_finding import added) |
| `packages/core/src/database/schema.gen.ts` | Bare-install schema baseline (security_finding CREATE TABLE added) |
| `packages/core/schema.json` | Drizzle snapshot |
| `packages/codo/src/storage/schema.ts` | Public re-export so codo code can `import { SecurityFindingTable }` |
| `packages/core/script/migration.ts` | Windows path normalization fix (backslash handling in generatedMigrations) |

### 3.5 Scope gate runtime

File: `packages/codo/src/security/scope-gate.ts`

```
evaluateGate({ projectDir, fs, target?, now? }) → Effect<GateResult, FSUtil.Error>
```

`GateResult` is discriminated union:

- `{ ok: true, scope: SecurityScope }`
- `{ ok: false, reason: "missing" | "unparseable" | "expired" | "no-targets" | "target-not-in-scope", detail: string }`

Schema (effect Schema 4.x idiomatic):

```ts
Schema.Struct({
  version: Schema.optional(Schema.Number),
  created: Schema.optional(Schema.String),
  expires: Schema.String,
  targets: Schema.NonEmptyArray(Schema.Struct({
    type: Schema.Literals(["web", "api", "host"]),
    value: Schema.String,
    notes: Schema.optional(Schema.String),
  })),
  allow_active_scan: Schema.optional(Schema.Boolean),
  out_of_scope: Schema.optional(Schema.Array(Schema.String)),
  contact: Schema.optional(Schema.String),
})
```

### 3.6 Bootstrap / installer hardening (carrying-over unrelated fixes bundled onto same branch)

| File | Change |
|---|---|
| `packages/codo/src/agent/prompt/compose.txt` | compose gate reworded to forbid literal `codo run` summon; tells user to run `/gsd-new-project` themselves |
| `packages/codo/src/skill/gsd-installer.ts` | `secondaryInstallRoots` exported — install mirrors to `.agents/gsd-core` (project + global) |
| `packages/codo/test/agent/compose-bootstrap.test.ts` | Updated to assert the new gate text and forbid `codo run` affirmative instructions |

### 3.7 Tests

| Test file | Assertions | What it covers |
|---|---|---|
| `packages/codo/test/agent/sec-test-registry.test.ts` | 11 | Agent registry contains all 6 sec-* agents; permissions match shape; skills count is 23 |
| `packages/codo/test/agent/sec-test-finding-table.test.ts` | 7 | SecurityFindingTable export shape, migration SQL contains expected columns, schema.gen.ts mirrors it, codo re-export is wired |
| `packages/codo/test/security/scope-gate.test.ts` | 7 | Each `GateBlockReason` reachable; valid + invalid files behave as expected |
| `packages/codo/test/agent/compose-bootstrap.test.ts` | 5 | Compose gate forbids summon attempts, maps choices to slash commands, hands off immediately |
| `packages/core/test/database-migration.test.ts` | 14 (extended to include security_finding check) | All migrations apply; new table is present after fresh apply |

Total: 30 sec-test scoped tests + 14 migration tests = 44 directly tied to sec-test.

---

## 4. SQL schema for `security_finding`

The authoritative shape lives in `packages/core/src/database/migration/20260807123904_security_finding.ts` (and the mirrored block in `schema.gen.ts`).

```sql
CREATE TABLE `security_finding` (
  `id`                   text PRIMARY KEY,
  `persona`              text NOT NULL,
  `category`             text NOT NULL,
  `location`             text NOT NULL,
  `confidence`           text NOT NULL,             -- high | medium | low
  `severity`             text NOT NULL,             -- critical | high | medium | low | info
  `finding`              text NOT NULL,
  `evidence`             text NOT NULL,
  `remediation`          text NOT NULL,
  `status`               text NOT NULL DEFAULT 'open',
                                                      -- open | fixed | accepted-risk | false-positive
  `cvss_score`           real,                       -- 0.0–10.0
  `cvss_vector`          text,                       -- CVSS:3.1/AV:N/AC:L/...
  `epss_score`           real,                       -- 0.0–1.0
  `fingerprint`          text NOT NULL,              -- sha1(persona|category|location|normalize(evidence))
  `project_id`           text NOT NULL,
  `session_id`           text,
  `metadata`             text,                       -- JSON blob
  `time_created`         integer NOT NULL,
  `time_updated`         integer NOT NULL,
  `time_status_changed`  integer,
  CONSTRAINT `fk_security_finding_project_id_project_id_fk`
    FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_security_finding_session_id_session_id_fk`
    FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE SET NULL
);
CREATE INDEX `security_finding_project_idx`    ON `security_finding` (`project_id`);
CREATE INDEX `security_finding_session_idx`    ON `security_finding` (`session_id`);
CREATE INDEX `security_finding_status_idx`     ON `security_finding` (`status`);
CREATE INDEX `security_finding_severity_idx`   ON `security_finding` (`severity`);
CREATE INDEX `security_finding_persona_idx`    ON `security_finding` (`persona`);
CREATE UNIQUE INDEX `security_finding_fingerprint_project_idx`
  ON `security_finding` (`project_id`,`fingerprint`);
```

### Drizzle interface (TypeScript side)

```ts
import { SecurityFindingTable } from "@codo-ai/core/security/sql"
// or via the codo re-export
import { SecurityFindingTable } from "@/storage/schema"

// Insert
await db.insert(SecurityFindingTable).values({
  id: "fin_cuid_xyz",
  persona: "sec-appsec",
  category: "A03-injection",
  location: "src/api/users.ts:42",
  confidence: "high",
  severity: "critical",
  finding: "...",
  evidence: "...",
  remediation: "...",
  status: "open",
  fingerprint: sha1("sec-appsec|A03-injection|src/api/users.ts:42|<normalized evidence>"),
  project_id: project.id,
  session_id: session.id,
}).run()
```

---

## 5. Build + verification

### 5.1 Build the binary

```bash
cd packages/codo
bun script/build.ts --single --skip-embed-web-ui --skip-install
```

Output: `packages/codo/dist/codo-windows-x64/bin/codo-0.0.0-sec-test-<timestamp>.exe` (or whatever the host platform / target is — `--single` restricts to host).

### 5.2 Verify sec-test is in the binary

```bash
packages/codo/dist/codo-windows-x64/bin/codo-0.0.0-sec-test-*.exe agent list | grep -E "^sec-"
```

Expected output:

```
sec-appsec (subagent)
sec-architect (subagent)
sec-devsecops (subagent)
sec-pentest (subagent)
sec-secops (subagent)
sec-test (primary)
```

### 5.3 Run all relevant tests

```bash
cd packages/codo
bun test test/agent/sec-test-registry.test.ts \
        test/agent/sec-test-finding-table.test.ts \
        test/agent/compose-bootstrap.test.ts \
        test/security/scope-gate.test.ts
# Expected: 30 pass, 0 fail

cd ../core
bun test test/database-migration.test.ts
# Expected: 14 pass, 0 fail (sqlite_master check finds security_finding)
```

### 5.4 Re-running the drizzle migration generator

If you add another column, run:

```bash
cd packages/core
bun script/migration.ts            # regenerates schema.gen.ts, snapshot, and migration file
bun script/migration.ts --check    # asserts nothing is stale (linux-only in CI test)
```

The `--check` test in `packages/core/test/database-migration.test.ts` runs only on Linux because `bun drizzle-kit` was unreliable on Windows at the time of writing.

---

## 6. Common extension patterns

### 6.1 Adding a new skill

1. `mkdir packages/codo/src/skill/sec-test/<name>` and write `SKILL.md` (see existing skills for the frontmatter shape — `name`, `description`, optional `hidden: true`).
2. Add an `import <Name>Content from "./sec-test/<name>/SKILL.md" with { type: "text" }` to `packages/codo/src/skill/sec-test-skills.ts`.
3. Add the descriptor object to `secTestSkills`:
   ```ts
   { name: "sec-test:<name>", description: "...", content: <Name>Content },
   ```
4. Bump the hardcoded count assertions in `packages/codo/test/agent/sec-test-registry.test.ts` (search for `toHaveLength(23)` and `toBe(23)`).
5. Re-run tests, commit, rebuild binary.

### 6.2 Adding a new persona

1. Write `packages/codo/src/agent/prompt/sec-<name>.txt`.
2. Add `import PROMPT_SEC_<NAME> from "./prompt/sec-<name>.txt"` to `agent.ts`.
3. Add the entry:
   ```ts
   "sec-<name>": {
     name: "sec-<name>",
     description: "...",
     options: {},
     permission: Permission.merge(
       defaults,
       Permission.fromConfig({ /* tool rules */ }),
       user,
     ),
     prompt: PROMPT_SEC_<NAME>,
     mode: "subagent",
     native: true,
   },
   ```
4. Update `packages/codo/test/agent/sec-test-registry.test.ts` to assert the new agent exists, mode is `subagent`, native is `true`.

### 6.3 Extending the findings table

Edit `packages/core/src/security/sql.ts` (add a column via `text()`, `integer()`, `real()`, etc). Then run the migration generator (see §5.4).

The migration generator will create a new file under `packages/core/src/database/migration/<timestamp>_<random-name>.ts` and update `schema.gen.ts` + `migration.gen.ts` accordingly. Don't hand-edit those.

### 6.4 Adding a new scope-gate reason

1. Extend `GateBlockReason` union in `packages/codo/src/security/scope-gate.ts`.
2. Add the corresponding check in `evaluateGate`.
3. Add a test in `packages/codo/test/security/scope-gate.test.ts` covering the new failure path.

---

## 7. Known limitations / open follow-ups

- **`Agent.list` flake on Windows:** `test/agent/agent.test.ts` "keeps the default agent first" and "defaultAgent throws when all primary disabled" intermittently fail on this hardware under load. Reproducible on the pre-sec-test base commit; unrelated to sec-test. Likely timeout + RAM pressure — consider raising mocha timeout or running serially.
- **Compose skill routing predates sec-test:** compose's intent router still routes "is this secure?" to `gsd-security-auditor`. Long-run, compose should defer to `@sec-test` similarly to how it defers to `@gsd-*` for software lifecycle. Out of scope for Phase 0–5.
- **No UI surface**: findings don't (yet) appear in the COdo TUI as a dedicated panel. Querying is via markdown reports + sqlite CLI.
- **Pentest active scan always `ask`-gated by permission**: beyond the scope file's `allow_active_scan` toggle, individual invasive tools still require interactive approval. To run truly automated pentests, both layers must be satisfied.
- **Effect schema 4.0 idioms**: this codebase is on `effect@4.0.0-beta.74`. `Schema.decodeUnknownEither` is gone; use `Schema.decodeUnknownOption` + `Option.isNone` instead. The scope-gate module is the canonical example.

---

## 8. Where to read more

- Plan / rationale: `docs/sec-test/01-IDEA.md`
- User guide: `docs/sec-test/02-USER-GUIDE.md`
- Standards referenced: OWASP Top 10:2025, OWASP API Security Top 10:2023, ASVS 5.0, CWE Top 25, NIST SSDF SP 800-218, SLSA v1.1, PTES, OWASP LLM Top 10 2025, MCP Top 10 (beta), Agentic Security Top 10 (Dec 2025).
