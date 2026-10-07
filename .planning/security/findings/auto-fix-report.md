---
date: 2026-08-26
pipeline: sec-test:auto-fix
orchestrator: sec-test
status: complete — first pass (top 10 of 46 findings fixed, verified, rescanned)
---

# Auto-Fix Pipeline Report — COdo full security scan

## Pipeline summary

| Phase | Result |
|---|---|
| SCAN | 4 audits → **46 findings** (0 critical · 8 high · 17 medium · rest low/info) |
| TRIAGE | Top 10 actionable selected (severity × exploitability) |
| FIX | All 10 applied (+1 sibling hole caught at rescan = 11 total fixes) |
| VERIFY | **31/31 regression tests pass** (`packages/codo/test/security-autofix/`), incl. proof-of-detection probes that fail against pre-fix code |
| RESCAN | **10/10 triaged findings confirmed closed**; 2 new findings filed (1 fixed immediately, 1 deferred) |

## What was broken and what closed it

| # | Risk in plain English | Fix | Verified by |
|---|---|---|---|
| 1 | One crafted HTTP request could force-delete any folder on your machine | Worktree remove now refuses paths outside the project worktree | `worktree-remove-containment.test.ts` (3 tests incl. `../..` traversal) |
| 2 | `--mdns` exposed the whole unauthenticated API to your LAN | Non-loopback binds now refuse to start without `CODO_SERVER_PASSWORD` | `cli-network.test.ts` + rescan |
| 2b | Same hole in `cli/cmd/acp.ts` (missed location, caught at rescan) | Same fail-closed gate added | typecheck + manual read |
| 3 | A malicious webpage could drive the agent via DNS rebinding / CSRF (approve permissions, spawn processes) | Global Origin+Host gate (`originGuard`) on every API route; loopback binds reject rebound hosts | `cors.test.ts` (18 tests) + `httpapi-origin-guard.test.ts` (forged Origin → 403) |
| 4 | Cloning a hostile repo + running workflow verify = silent RCE from committed PLAN.md lines | Only known build/test runners accepted; redirects/pipes/chains/%VAR% blocked | `workflow-verification.test.ts` (5 tests) |
| 5 | `/slash-command` from a cloned repo executed `` !`cmd` `` with no prompt | Each substitution now goes through the normal bash permission ask; denial aborts the template | Manual read at rescan (test gap noted below) |
| 6 | vite dev server on `0.0.0.0` leaked `.env` files (5 known bypass CVEs) | vite 7.1.4 → 7.3.5 in catalog + lockfile | lockfile resolution |
| 7 | opencode.ai compromise = RCE with secrets in 6 CI workflows | All `curl \| bash` installs pinned to `opencode-ai@1.18.23` | grep: 0 curl-pipes remain |
| 8 | npm releases shipped with zero build provenance (SLSA L1 cap) | `NPM_CONFIG_PROVENANCE: false` deleted; `--provenance` on all 4 publish scripts | rescan read |
| 9 | Dispatch input interpolated into bash (close-prs.yml) | Passed via env var instead | rescan read |
| 10 | Triage agent ate attacker issue text with secrets in env and no tool denies | Explicit bash/edit/webfetch deny block added; verified honored by pinned binary | rescan read |

## Still needs a human decision

1. **Rotate two committed credentials** (cannot be done by code change):
   - Format-valid Google API key at `packages/http-recorder/test/record-replay.test.ts:138`
   - Stripe `pk_test_…` publishable key in `packages/console/app/package.json:9` (test-mode, low impact)
2. **Workspace trust gate** (HIGH, deferred as architectural): opening any directory auto-imports `{tool,tools}/*.{js,ts}`, plugins, and runs npm installs from repo-committed config with no first-open consent prompt. Peer products gate this behind an explicit trust dialog. Needs product design, not a spot fix.
3. **`@solidjs/start` from pkg.pr.new** (MEDIUM): framework dep served by a community PR mirror; also leaves nested `vite@7.1.10` copies in the tree. Move to a published npm release.
4. **Remaining dependency bumps**: electron ≥42.9.3 (heap-overflow CVE), astro ≥5.15.8, ghostty-web pin to commit SHA, prune `minimumReleaseAgeExcludes`.
5. **CI hardening backlog** (mediums/lows): digest-pin container bases, fail-open Authenticode verify steps in publish.yml, `gh*` allowlist narrowing in review.yml, missing permissions blocks ×3, SECURITY.md + Dependabot + CI secret scanning.
6. **Slash-command permission ask has no regression test** — verified by manual read only; worth a test when the session test harness allows driving command templates.
7. **Pin maintenance**: `opencode-ai@1.18.23` in 6 workflows needs deliberate bumps (that's the point — but it will age).

## Honest coverage limits

- gitleaks/trufflehog/osv-scanner/semgrep not installed — history scan was format-based, dependency audit watchlist-based, code audits manual walks. Install the scanners for exhaustive passes.
- Pre-existing typecheck errors exist in user WIP files (goal.set arity, models-dev.ts, some tests) — unrelated to these fixes; my changes add zero new errors vs baseline.
- Working tree mixes these ~25 fix files with large pre-existing user changes; nothing was committed.

## Artifacts

- Scan reports: `pipeline-harden.md`, `secrets-dependency-audit.md`, `code-audit-security-server.md`, `code-audit-session-tool-cli.md` (this directory)
- Verification: `auto-fix-verify.md` + `packages/codo/test/security-autofix/*.test.ts` (31 passing)
