# sec-test: hardening, enforcement, and QA expansion

## Goal

Turn `sec-test` from a well-designed but largely inert feature into COdo's flagship security **and** testing agent. Today the prompts and 24 skills describe a coherent methodology, but the runtime wiring prevents most of it from executing: personas cannot load any skill, the pentest scope gate is prose-only, the findings table has no write path, and one persona's primary output file is unwritable.

This plan fixes the correctness defects, makes the safety guarantees code-enforced, adds a 6th QA persona for general software testing, and adds a CI surface (SARIF, baseline suppression, exit codes).

## Locked decisions

| # | Decision |
|---|---|
| D1 | Pentest gate enforced by a new `sec_probe` tool that calls `evaluateGate()` internally. Raw network bash (`curl`, `nmap`, `nikto`, `nuclei`, `zap-*`) becomes `deny` for `sec-pentest` — no raw network path exists. |
| D2 | Skills reach personas via a baked `<execution_context>` preamble (mirroring `gsd.ts:479-529`) **plus** a narrow per-persona `skill` allow-list. |
| D3 | `security_finding` becomes real via a `sec_finding` tool. DB is canonical; `.planning/security/findings/**` markdown is a derived view. |
| D4 | Scope expands to general software testing via a 6th persona, `sec-qa`. |
| D5 | `sec-qa` may write only test-shaped paths; runner config files are `ask`. |
| D6 | `sec-qa` may execute an allow-list of test runners. Accepted escalation: running a suite executes arbitrary project code. |
| D7 | Add the full CI surface: SARIF 2.1.0 export, `.codo/security-baseline.json` suppression, `--fail-on <severity>` exit codes, non-interactive mode. |
| D8 | `sec-test` stays the hardcoded default agent (`agent.ts:578-581`). Accepted risk — see Risks. |

## Verified current-state defects

All line references verified against the working tree.

**P0-1 — All 24 skills are unreachable by all 5 personas.**
Each persona sets `"*": "deny"` (`agent.ts:263, 294, 331, 363, 401`) and never re-allows `skill`. Resolution is `findLast` over a flat rule array (`permission/index.ts:39-49`) and `Wildcard.match("skill", "*")` is true, so the deny wins. `Skill.available()` filters on exactly this (`skill/index.ts:400`) → personas see zero skills; `tool/skill.ts:29` also asks under `permission: "skill"` → denied even if listed. Therefore `sec-pentest.txt:8` ("BEFORE doing any work, invoke `sec-test:scope-gate`") is structurally impossible, as are the `## HARD GATE` blocks in `pentest`, `api-security-test`, `auth-test`, `exploit-verify`, and `fuzz`.

**P0-2 — `evaluateGate()` is never called at runtime.**
`security/scope-gate.ts` is correct (the `targetMatches` host-suffix and userinfo hardening at lines 44-68 is sound) but is referenced only by `test/security/scope-gate.test.ts`. Meanwhile `sec-pentest` has `"curl*": "allow"` (`agent.ts:370`) with no scope check anywhere in the enforcement path. The feature's central safety claim is unenforced.

**P0-3 — `sec-secops`' primary deliverable is unwritable.**
The allow pattern `path.join(".planning","security","**","*")` compiles to `^\.planning/security/.*.*/.*$`, which **requires an intermediate directory**. `write.ts:56` and `edit.ts:104` pass `path.relative(worktree, filepath)`, so `.planning/security/findings/x.md` matches but `.planning/security/posture.md` does not → denied. `posture.md` is `sec-secops`' only named output (`sec-secops.txt:26`) and is also written by `report` step 6, `learn` step 3, `posture-report` step 3, and `exploit-verify` reporting. `sec-test:pentest` step 5's `.planning/security/pentest-*.md` is denied for the same reason.

**P0-4 — `security_finding` has no write path.**
`SecurityFindingTable` appears only in `core/src/security/sql.ts`, `storage/schema.ts:6`, a *comment* at `finding.ts:45`, and two tests. `fingerprintFinding`/`validateFinding` are imported by nothing in `src/`. So `report/SKILL.md` step 2 (upsert on `(project_id, fingerprint)`) and `posture-report/SKILL.md` step 1 ("Inputs: `security_finding` table") are unimplementable. Additionally `finding.ts:31` names the function `sha1` but implements 32-bit FNV-1a (docs and `report/SKILL.md:20` both claim sha1); a 32-bit key under a `UNIQUE` index silently discards distinct findings on collision.

**P0-5 — `question` denied for every persona, two are told to use it.**
`defaults` sets `question: "deny"` (`agent.ts:141`) and personas re-deny via `"*"`. But `sec-architect.txt:14` and `response/SKILL.md:15` both instruct use of the `question` tool.

**P1-1 — `sec-appsec` cannot perform the dependency work assigned to it.**
`sec-appsec.txt:15` requires OSV cross-referencing, but the persona has no `webfetch`, no `websearch`, and no `osv-scanner` grant (devsecops-only, `agent.ts:341`). `sec-devsecops` also lacks `webfetch`/`websearch`. Only `sec-architect` has both (`agent.ts:268-269`). `03-IMPLEMENTATION.md:107` assigns `dependency-audit` to `sec-appsec` while the skill body declares `persona: sec-devsecops`.

**P1-2 — `sec-secops` cannot reach its own audit targets.**
`agent-surface-audit` step 1 enumerates `~/.agents/skills/` and `~/.config/codo/codo.jsonc`, but its `external_directory` allows only `Global.Path.data/**/*` (`agent.ts:412`). `defaults` whitelists `skillDirs` (`agent.ts:139`) but the persona's `"*": "deny"` discards that via `findLast`.

**P1-3 — Completion markers collide.** Eight skills return `## POSTURE REPORT COMPLETE`; three return `## CODE AUDIT COMPLETE`; `supply-chain-attest` returns `## PIPELINE HARDEN COMPLETE`. The orchestrator cannot distinguish an agent-surface audit from a lessons-learned append. Nothing parses them.

**P1-4 — `sec-test.txt:61` claims an `<execution_context>` preamble is auto-injected. It is not.** Only GSD agents get `withPrompt()` (`agent.ts:168` → `gsd.ts:479-529`); sec-* entries pass `prompt:` verbatim. Personas never learn the project dir or their deliverable path.

**P1-5 — Inconsistent finding paths.** `sec-test:pentest` step 5 writes `.planning/security/pentest-*.md` (outside `findings/`), contradicting `sec-pentest.txt:29`; either way `report`'s glob `findings/**/*.md` would miss it.

**P1-6 — Tests cannot catch any of the above.** `sec-test-registry.test.ts` greps `agent.ts` source text; `expect(block).toContain("ask")` / `toContain("deny")` pass for any block containing those words. Zero behavioral coverage of permission evaluation, skill availability, gate enforcement, or write reachability.

**P1-7 — Doc drift.** `03-IMPLEMENTATION.md` says 23 skills in three places (§3.3 heading, table, §3.7); code and tests say 24. `scope-gate` is missing from the §3.3 table. §3.2 permission table omits the `webfetch`/`websearch`/`question` reality.

**P2 — Minor.** `"bun test --fuzz*"` (`agent.ts:310`) is not a real Bun flag. Skills instruct `id: <app-generated>` "the runtime assigns" but nothing assigns it. No tool-presence preflight, so "tool missing" degradation depends entirely on model compliance.

---

## Task list

### Phase 1 — Correctness: make the existing design actually run

1. **Fix the `.planning/security` write pattern (P0-3).**
   In all persona `edit` blocks, replace `path.join(".planning","security","**","*")` with `path.join(".planning","security","*")`. Because `Wildcard.match` expands `*` to `.*` under the `s` flag, a single `*` matches across path separators and therefore covers both top-level and nested files. Verify `path.relative` output cannot escape the prefix (a target outside the worktree yields a leading `..` and will not match).

2. **Grant a per-persona `skill` allow-list (P0-1).**
   Add a `skill` key to each persona's `fromConfig` object, **positioned after `"*": "deny"`** — `fromConfig` preserves object key order and `evaluate` uses `findLast`, so ordering is load-bearing. Document that constraint in a comment.
   - `sec-architect`: `threat-model`, `context`
   - `sec-appsec`: `code-audit`, `secrets-scan`, `dependency-audit`, `fuzz`, `context`
   - `sec-devsecops`: `pipeline-harden`, `sbom`, `container-scan`, `supply-chain-attest`, `dependency-audit`, `context`
   - `sec-pentest`: `pentest`, `scope-gate`, `api-security-test`, `auth-test`, `exploit-verify`, `fuzz`, `context`
   - `sec-secops`: `agent-surface-audit`, `logging-audit`, `incident-runbook`, `posture-report`, `response`, `learn`, `report`, `context`
   Each list is `{ "*": "deny", "<name>": "allow", ... }`.

3. **Bake an `<execution_context>` preamble into each persona prompt (P1-4, D2).**
   Add `packages/codo/src/agent/sec.ts` exporting a `secExecutionContext(spec, projectDir)` helper modeled on `gsd.ts:479-529`. It must state: persona name, working directory, resolved `.planning/security/` root, the persona's primary deliverable path, the mandatory-first-skill instruction, and that Write creates new files while Edit updates. Register sec-* agents through it (`prompt: withSecPrompt(ctx.directory)`), the same way `agent.ts:168` does for GSD. This makes `sec-test.txt:61` true.

4. **Allow `question` where the prompts require it (P0-5).** Add `question: "allow"` to `sec-architect` and `sec-secops`. Leave the other three denied and remove the `question` instruction from `response/SKILL.md:15` if `sec-secops` ownership changes.

5. **Fix capability/assignment mismatches (P1-1).**
   - Add `webfetch: "allow"` and `websearch: "allow"` to `sec-appsec` and `sec-devsecops` (needed for OSV/CVE/advisory lookups).
   - Add `"osv-scanner*": "allow"` to `sec-appsec`.
   - Resolve the `dependency-audit` owner: assign to `sec-devsecops` (matches the skill body's `persona:` field), grant it to both personas' skill lists, and correct `03-IMPLEMENTATION.md:107`.
   - Remove `"bun test --fuzz*"` from `sec-appsec` bash rules (not a real flag).

6. **Fix `sec-secops` external directory reach (P1-2).** Extend its `external_directory` allow list with `Global.Path.config/**/*`, the resolved `skillDirs` (same values `defaults` uses at `agent.ts:139`), and `~/.agents/skills/**/*`. Keep `"*": "deny"` first.

7. **Normalize finding output paths (P1-5).** Make every skill write findings under `.planning/security/findings/YYYY-MM-DD-<slug>.md`. Fix `pentest/SKILL.md` step 5 to match `sec-pentest.txt:29`.

### Phase 2 — Real enforcement and real persistence

8. **Add the `sec_probe` tool (D1, P0-2).**
   New `packages/codo/src/tool/sec_probe.ts`:
   - Params: `url`, `method`, `headers?`, `body?`, `note?`.
   - Resolve the project dir, call `evaluateGate({ projectDir, fs, target: url })`. On `ok: false`, return a structured blocked result carrying `reason` and `detail` verbatim — **without issuing any request**.
   - When `allow_active_scan` is `false`, permit only `GET`/`HEAD` with no body; reject anything else as out-of-mode.
   - Enforce a per-dispatch budget (default ≤10 req/s, ≤100 requests) and refuse destructive methods regardless of scope.
   - Redact `authorization`, `cookie`, and `set-cookie` from recorded evidence; truncate bodies to 2KB.
   - Return status, redacted headers, truncated body, and a replayable request description suitable for a finding's `evidence`/`repro`.
   - Use `HttpClient.HttpClient`, not raw `fetch`.
   - Ask under a new `sec_probe` permission key so users can deny it globally.
   Registry: `sec-pentest` gets `sec_probe: "allow"` and its `bash` block collapses to `{"*": "deny"}` — remove the `curl`/`nmap`/`nikto`/`nuclei`/`zap-*` entries. Confirm `webfetch` stays denied.
   Update `sec-pentest.txt`, `pentest`, `api-security-test`, `auth-test`, `exploit-verify`, and `fuzz` (live mode) to call `sec_probe` instead of `curl`, and to stop restating gate logic.

9. **Add the `sec_finding` tool (D3, P0-4).**
   New `packages/codo/src/tool/sec_finding.ts`:
   - Params: an array of findings shaped like `FindingRowIn` minus `id`, `project_id`, `session_id`, `fingerprint` — the runtime assigns all four (this is what the skills already promise).
   - Validate through the existing `FindingRowIn` schema; reject unknown severity/confidence/status before touching SQLite (CHECK constraints are the second line of defence).
   - Compute the fingerprint with real SHA-256 (`node:crypto`), truncated to 32 hex chars. **Replace the FNV-1a body of `finding.ts:31-40`**, rename it accurately, and correct the `sha1` claim in `report/SKILL.md:20`.
   - Upsert on `(project_id, fingerprint)`. Do not transition `fixed` → `open` unless the caller passes `rescan: true`; set `time_status_changed` on any status change.
   - Consult `.codo/security-baseline.json`; a matching fingerprint is stored as `accepted-risk` with `metadata.reason` and the baseline entry reference.
   - Return the assigned ids so the persona can cite them in its markdown.
   Grant `sec_finding: "allow"` to all six personas. Rewrite `report/SKILL.md` steps 2-3 to call the tool rather than describe SQL.

10. **Define a machine-parsable result contract (P1-3).**
    Replace the 11 colliding prose markers with one line per dispatch:
    `## SEC-RESULT skill=<skill-name> status=<complete|blocked|partial> findings=<n> critical=<n> high=<n> doc=<path>`
    Keep `## PENTEST BLOCKED` semantics as `status=blocked` with a `reason=` field. Add a parser in `src/security/result.ts`, update all 6 prompts and all skills, and update the orchestrator's translation table in `sec-test.txt:63-79`.

### Phase 3 — `sec-qa` persona (D4, D5, D6)

11. **Add the persona.** `packages/codo/src/agent/prompt/sec-qa.txt` + registry entry (`mode: "subagent"`, `native: true`), following the established shape.
    - `edit`/`write`: `{"*": "deny"}` plus allow `**/*.test.*`, `**/*.spec.*`, `test/**/*`, `tests/**/*`, `__tests__/**/*`, `**/testdata/**/*`, `.planning/*`; set `vitest.config.*`, `bunfig.toml`, `jest.config.*`, `playwright.config.*`, `pytest.ini`, `Cargo.toml` to `ask`.
    - `bash`: `{"*": "deny"}` plus allow `bun test*`, `npm test*`, `pnpm test*`, `yarn test*`, `pytest*`, `go test*`, `cargo test*`, `vitest*`, `jest*`, `playwright*`, `nyc*`, `c8*`, `stryker*`, `mutmut*`.
    - `question: "allow"`, `sec_finding: "allow"`, `readonlyExternalDirectory`.
    - Note in the prompt's untrusted-content rule that test fixtures and snapshot files are data, not instruction.

12. **Add 5 QA skills** under `src/skill/sec-test/` (keep the `sec-test:` prefix so `isSecTestSkill` and the registration loop at `skill/index.ts:361-366` are untouched): `test-plan`, `test-generate`, `coverage-audit`, `mutation-test`, `regression-guard`. Register in `sec-test-skills.ts` and add to `sec-qa`'s skill allow-list. Skill count 24 → 29; update the assertions in `sec-test-registry.test.ts` (`toHaveLength`, `toBe`).

13. **Update orchestrator routing.** Extend the persona table and "When to fire" section in `sec-test.txt` with `sec-qa` (triggers: "write tests", "coverage", "is this tested", "mutation score"). Preserve the existing rule that pentest never runs in parallel.

### Phase 4 — CI surface (D7)

14. **`codo sec report` CLI command.** Reads `security_finding` for the current project. `--format markdown|json|sarif`, `--fail-on critical|high|medium|low`, `--since <date>`. SARIF output must validate against SARIF 2.1.0 (`ruleId` from `category`, `level` mapped from `severity`, `partialFingerprints.codoFingerprint` from the stored fingerprint, physical locations parsed from `file:line`).

15. **Non-interactive mode.** Reuse the existing run-command permission resolution (`src/cli/cmd/run/permission.shared.ts`) rather than adding a new bypass. In non-interactive mode, `ask` resolves to **deny**. Consequence to document: `sec-pentest` refuses in CI unless a valid unexpired scope file exists, and `sec-qa` cannot touch runner config.

16. **Baseline file.** Document `.codo/security-baseline.json` (`{ version, entries: [{ fingerprint, reason, expires? }] }`), add a schema + loader in `src/security/baseline.ts`, consume it from `sec_finding`, and expire entries the same way the scope gate expires (`expires` strictly in the future).

17. **Tool-presence preflight.** Add a small helper personas call before scanning to report which of `semgrep`/`gitleaks`/`osv-scanner`/`syft`/`grype`/`trivy`/`cosign` are actually on PATH, so the `<coverage>` disclosures the skills promise are grounded rather than guessed.

### Phase 5 — Tests and docs

18. **Replace grep-based tests with behavioral tests (P1-6).** Delete the `registryBlock`/`toContain` approach in `sec-test-registry.test.ts` and assert against the constructed registry:
    - `Skill.available(persona)` returns exactly the expected set for each of the 6 personas (locks P0-1).
    - `Permission.evaluate("edit", ".planning/security/posture.md", persona.permission).action === "allow"` (locks P0-3).
    - `Permission.evaluate("bash", "curl http://x", secPentest.permission).action === "deny"` (locks D1).
    - `Permission.evaluate("question", "*", secArchitect.permission).action === "allow"` (locks P0-5).
    - `Permission.evaluate("edit", "src/index.ts", secQa.permission).action === "deny"` and `"src/index.test.ts"` allowed (locks D5).
19. **New test files.** `test/tool/sec-probe.test.ts` (each gate reason blocks with zero requests issued, via a stubbed `HttpClient` using `Layer.mock`; active-scan mode restrictions; redaction; budget). `test/tool/sec-finding.test.ts` (validation rejection, upsert dedup, `fixed` not reopened without `rescan`, baseline → `accepted-risk`). `test/security/baseline.test.ts`. `test/security/result.test.ts` (every skill's declared marker parses; markers are unique). `test/cli/sec-report.test.ts` (SARIF validity, `--fail-on` exit codes).
20. **Docs.** Update `docs/sec-test/03-IMPLEMENTATION.md`: 23 → 29 skills in all three places, add `scope-gate` and the 5 QA skills to §3.3, correct the §3.2 permission table, add `sec_probe`/`sec_finding`/`sec-qa`/CLI sections, and refresh §3.7 and §7. Update `02-USER-GUIDE.md` with the CI workflow and baseline file. Reflect the new scope in `01-IDEA.md`.

---

## Risks and accepted tradeoffs

- **`sec-test` remains the default agent (D8, accepted).** `sec-test.txt` is a security dispatch table with no general-coding branch, so a user typing "fix this bug" lands in an agent whose `<CRITICAL-DEFAULTS>` instruct it to route to a security persona. Accepted as product identity. Mitigation available later at `agent.ts:578-581` or via `default_agent` in config.
- **`sec-qa` breaks the read-only invariant (D5/D6, accepted).** It is the only sec-* persona that writes outside `.planning/` and the only one that executes arbitrary project code (a suite runs `pretest` hooks and fixture code). The path allow-list and runner allow-list are the containment; a poisoned test fixture is the residual risk.
- **Denying raw scanners narrows pentest breadth (D1).** `nmap`/`nuclei` coverage is lost in exchange for an unbypassable gate. A future `sec_scan` tool could wrap them behind the same `evaluateGate()` call.
- **Rule ordering is load-bearing.** `fromConfig` preserves object key order and `evaluate` uses `findLast`, so any `skill`/`edit`/`bash` sub-map must appear *after* `"*": "deny"`. A reordering during future edits silently re-breaks P0-1. Task 18's behavioral tests are the guard.
- **Standards hardcoded in prompts.** OWASP Top 10:2025, API Top 10:2023, ASVS 5.0, CWE Top 25 are embedded as literal text with no refresh mechanism; they will drift annually.

## Validation

Run from package directories — tests cannot run from the repo root (`do-not-run-tests-from-root`).

```
cd packages/codo && bun typecheck
cd packages/codo && bun test test/agent/sec-test-registry.test.ts test/agent/sec-test-finding-table.test.ts test/security/ test/tool/sec-probe.test.ts test/tool/sec-finding.test.ts test/cli/sec-report.test.ts
cd packages/core  && bun typecheck && bun test test/database-migration.test.ts
```

Manual acceptance:
1. `codo agent list` shows all 7 `sec-*` agents (6 subagents + orchestrator).
2. Dispatch `sec-appsec` on a file with a known injection → a finding row exists in `security_finding` **and** a markdown file appears under `.planning/security/findings/`.
3. Dispatch `sec-secops` → `.planning/security/posture.md` is written (this fails today).
4. Dispatch `sec-pentest` with no scope file → `status=blocked reason=missing`, and no outbound request is made.
5. Create a valid scope file for a local target, then request an out-of-scope host → `status=blocked reason=target-not-in-scope`.
6. `codo sec report --format sarif` produces SARIF 2.1.0 that GitHub code scanning accepts; `--fail-on critical` exits non-zero when a critical is open.
7. Dispatch `sec-qa` → tests written only under test paths; an attempt to edit `src/index.ts` is denied.

## Out of scope

- Rewriting `compose.txt`'s intent router beyond the existing `sec-test` entry at line 113.
- A TUI findings panel (still noted as a limitation in `03-IMPLEMENTATION.md:368`).
- The `Agent.list` Windows flake documented at `03-IMPLEMENTATION.md:366` (pre-existing, unrelated).
- Wrapping `nmap`/`nuclei` in a gated `sec_scan` tool (future follow-up).
