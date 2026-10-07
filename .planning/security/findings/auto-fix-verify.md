# Auto-Fix Verification — Security Fix Regression Tests

- **Date:** 2026-08-26
- **Persona:** sec-qa (verify) via sec-test:regression-guard
- **Scope:** five security fixes in `packages/codo`, locked in with regression tests under `packages/codo/test/security-autofix/`
- **Runner:** `bun test test/security-autofix/<file>` from `packages/codo` (never repo root), bun 1.3.14, Windows (win32)
- **Execution note:** running the suite executes project code (Effect layers, git child processes, the httpapi web handler). This is the user's own working tree at `D:\COdo`; no production source was modified. All new files are test-shaped (`packages/codo/test/security-autofix/*.test.ts`) plus this report.

## Result: all five fixes verified — 31 passed / 0 failed

| # | Fix | Source | Test file | Result |
|---|-----|--------|-----------|--------|
| 1 | `Worktree.remove()` refuses unregistered directories outside the project worktree (`RemoveFailedError`); inside-worktree removal still allowed | `src/worktree/index.ts:404-439` | `test/security-autofix/worktree-remove-containment.test.ts` | ✅ 3 pass / 0 fail |
| 2 | CORS exports: `isLoopbackHostname`, `isAllowedRequestHost`, `requestOriginAllowed` (cross-site rejection, tauri/renderer/localhost acceptance, DNS-rebind Host gate, bare & bracketed IPv6 parsing) | `src/server/cors.ts` | `test/security-autofix/cors.test.ts` | ✅ 18 pass / 0 fail |
| 3 | `requiresPassword(hostname)` — loopback false; `0.0.0.0`, LAN IPs, mDNS domains true; case-insensitive | `src/cli/network.ts:43-45` | `test/security-autofix/cli-network.test.ts` | ✅ 4 pass / 0 fail |
| 4 | `validateCommand` allowlist + shell-metacharacter filter, exercised through exported `discoverCommands(cwd, taskVerify)` | `src/workflow/verification.ts:360-368` (private), `:86-141` (public surface) | `test/security-autofix/workflow-verification.test.ts` | ✅ 5 pass / 0 fail |
| 5 | Forged `Origin: https://attacker.example` on the httpapi web handler → 403; no-Origin and localhost-Origin controls → 200 | `src/server/routes/instance/httpapi/server.ts:126-136` (`originGuard`) | `test/security-autofix/httpapi-origin-guard.test.ts` | ✅ 1 pass / 0 fail |

Final full-directory run: **31 pass / 0 fail / 5 skip** (the 5 skips are the inert probe records described below), 80 expect() calls, ~17s.

## Proof the tests can fail (regression-guard requirement)

A temporary probe file asserted the OLD (pre-fix) expectations against the current code and every probe failed, each for an attributable reason:

1. **cors** — `expect(isAllowedRequestHost("evil.com:4096")).toBe(true)` → failed (received `false`)
2. **cli-network** — `expect(requiresPassword("COdo.local")).toBe(false)` → failed (received `true`)
3. **verification** — expected `discoverCommands` to keep `"curl https://attacker.example"` → failed (filtered to `[]`)
4. **worktree** — expected `svc.remove({ directory: <unregistered sibling of worktree> })` to succeed → failed with `WorktreeRemoveFailedError: ... is not a worktree of this project`, thrown precisely at the containment branch `src/worktree/index.ts:429`
5. **httpapi** — expected forged-Origin response status ≠ 403 → failed (received `403`)

Because production source may not be modified by this persona, the probe validated assertion sensitivity at each seam (fixed behavior fails old expectations) rather than a literal revert of the fixes. The probe file could not be deleted (session command allowlist permits only test runners), so it was converted to inert skipped records at `packages/codo/test/security-autofix/_old-behavior-probe.test.ts` documenting the evidence above — **safe to delete manually**.

## Behavior notes pinned by the tests

- An `Origin` whose host equals the request `Host` is same-origin by definition and passes `isAllowedRequestOrigin`; DNS-rebinding protection comes from the separate `isAllowedRequestHost` check inside `requestOriginAllowed` when the bind is loopback or unknown.
- Non-loopback binds (`hostname: "0.0.0.0"`) intentionally skip Host validation (authentication is mandatory there per `requiresPassword`); Origin validation still applies, and explicit `cors:` allowlist entries remain honored.
- Bracketed IPv6 `[::1]:4096` parses to loopback name `[::1]`; bare multi-colon IPv6 is not mistaken for `host:port`.
- `validateCommand` boundary pinned at exactly 500 characters allowed / 501 filtered.

## Coverage gaps left open / caveats

- `bun typecheck` could not be run: the session's command allowlist only permits test-runner commands. Mitigation: every new file was fully parsed/transpiled/executed by bun, and all typed patterns (`Effect.flip`, `TestInstance`, `Worktree.RemoveFailedError`, `it.instance(name, fn, { git: true }, timeout)`) mirror existing passing tests verbatim (`test/project/worktree*.test.ts`, `test/server/httpapi-file.test.ts`).
- One unreproduced runner artifact was recorded as finding `fin_03affc1e0001SkznEoz66oF6NP` (QA-FLAKE, low): a phantom unnamed "hook timed out" during the first combined run while two assertions genuinely failed; never recurred across five later runs.
- Registered-worktree removal (`git worktree remove --force` path of `remove()`) retains its existing coverage in `test/project/worktree-remove.test.ts` / `test/project/worktree.test.ts`; this dispatch did not extend it.
- No mutation testing was run (no mutation tool configured in this package); detection strength was established via the old-behavior probes instead.

## Findings summary

- Failing security fixes discovered: **0**
- Critical/high findings: **0 / 0**
- Low findings: 1 (`fin_03affc1e0001SkznEoz66oF6NP`, runner artifact, low confidence)

---

# Rescan results — 2026-08-26 (sec-appsec via sec-test:code-audit)

Adjudication of ten previously-recorded security findings against the current working-tree diff (`git diff` over the target files; every fix re-read at its live location, not trusted from the diff alone).

**Verdict: 10 of 10 closed at their recorded locations · 0 still open · 2 new residual findings filed (1 high, 1 medium).**

## Verdict table

| # | Original finding (old store ID) | Rescan store row | Expected fix | Verdict |
|---|--------------------------------|------------------|--------------|---------|
| 1 | Origin/Host validation missing globally (`fin_03ab1e7200019kfEu5HcLrdEFq`) | `fin_03b112349001wCnfRyajYZyC60` **fixed** | global originGuard + cors.ts helpers | ✅ Closed |
| 2 | non-loopback bind without mandatory auth (`fin_03ab1e7270011m7JlravVk64vp`) | `fin_03b11234a001UJLYdmIjPFqTwZ` **fixed** | requiresPassword fail-closed in web.ts + serve.ts | ✅ Closed (residual found → new #A) |
| 3 | worktree remove arbitrary recursive delete (`fin_03ab1e7320013zuz1DClTvQ9p6`) | `fin_03b11234b001o33e6w7e6vkEd8` **fixed** | containment check before cleanDirectory | ✅ Closed |
| 4 | workflow verify weak blocklist (`fin_03ab1d613001DNsuIHJDeYBE5H`) | `fin_03b11234b0020MwS1jqZ0NL07G` **fixed** | KNOWN_COMMAND_PREFIXES enforced + operators blocked | ✅ Closed (hardening note) |
| 5 | slash-command !`cmd` substitution w/o permission ask (`fin_03ab1d61f001xNP454tp3Ywm3O`) | `fin_03b11234c001CjTKKTSpCTt769` **fixed** | permission.ask("bash") per command; denial aborts | ✅ Closed |
| 6 | vite 7.1.4 vulnerable (`fin_02f72e727001HYarHraGSO7gPh`) | `fin_03b11234d001JNdFlnuOx8LULd` **fixed** | 7.3.5 resolved in catalog + lock | ✅ Closed at recorded location (residual found → new #B) |
| 7 | unpinned curl\|bash installer ×6 (`fin_02f47f19a001oIxxZhRd2PmqJw`) | `fin_03b11234e0011Sxi8ihgk7TRZK` **fixed** | `bun i -g opencode-ai@1.18.23` everywhere | ✅ Closed |
| 8 | NPM_CONFIG_PROVENANCE false (`fin_02f47f1a9001akFkOpkqO86wcJ`) | `fin_03b11234e002wSeTW9uFanohKw` **fixed** | env removed; --provenance ×4 scripts | ✅ Closed |
| 9 | dispatch input into bash (`fin_02f47f1aa001JTYG76eLsPr3EL`) | `fin_03b11234f001m9bLRPqLCU8bxJ` **fixed** | MAX_CLOSE via env | ✅ Closed |
| 10 | triage agent no tool denies (`fin_02f47f1a20016S7hL35RDxU7eL`) | `fin_03b112350001zxLdDA90CZSQ81` **fixed** | OPENCODE_PERMISSION deny block | ✅ Closed |

## Per-finding evidence notes

1. **originGuard** — global middleware at `httpapi/server.ts:126-136` returns 403 via `requestOriginAllowed(origin, host, CorsConfig)`; wired into `createRoutes` provide list (:297), so it wraps *all* merged route layers including ui/doc fallbacks. New cors.ts exports verified: `isLoopbackHostname`, `isAllowedRequestHost` (DNS-rebind Host gate, bracketed/bare IPv6 handling), `requestOriginAllowed`. `CorsConfig` provided at :303. Regression test pins forged-Origin → 403.
2. **requiresPassword fail-closed** — helper added at `cli/network.ts:43-45` (anything outside exact loopback set ⇒ password required, fail-closed for unknown hostnames); both `serve.ts:15-20` and `web.ts:40-45` refuse with exitCode=1 *before* `Server.listen`; mdns→`0.0.0.0` covered. **Residual:** `cli/cmd/acp.ts:24-25` performs the identical resolve+listen with no gate (and `cli/tui/worker.ts:47-49` listens on RPC-supplied hostname unchecked) → filed as new finding A below.
3. **worktree containment** — unregistered-path branch at `worktree/index.ts:423-432` rejects before any rm when `directory` escapes `canonical(ctx.worktree)` (sep-anchored prefix, sibling-path safe). Both sides run `canonical()` (:311-316: resolve + realPath + normalize + lowercase-on-win32), so symlink-component paths resolve outside the prefix and are rejected. Probe + regression test confirm old behavior fails.
4. **verification allowlist** — `validateCommand` (`workflow/verification.ts:360-368`) enforces `KNOWN_COMMAND_PREFIXES` (:48-53, checked :363), blocks `[<>|;&]` (:365) and `%var%` (:366). `taskVerify` splits on `/\r?\n/` *before* validation (:92-97), so newline chaining can't smuggle commands past the filter. **Hardening note:** allowlisted interpreters (`node -e`, `python -c`, `tsx …`) still admit arbitrary code from repo-committed verify lines without a permission ask — acceptable follow-up, not a closure blocker.
5. **prompt.ts permission ask** — `session/prompt.ts:1661-1699`: each `` !`…` `` command now goes through `permission.ask({permission:"bash", patterns:[cmd], always:[cmd], ruleset})`; denial breaks the loop, publishes an error event, and replaces the template with `[command substitution not permitted: …]` — nothing further executes (fail-closed). Imports/services verified in scope. **Caveat:** this is the only one of the five autofix areas *without* a regression test under `test/security-autofix/` — adjudicated by manual read only.
6. **vite** — catalog `package.json:84` = 7.3.5; root lock entry `bun.lock:1046/:5289` resolves `vite@7.3.5`; zero `7.1.4` remains anywhere in the lock. **Residual:** three transitive `vite@7.1.10` copies persist (`@solidjs/start/vite` :5939 — hard dependency, not peer; `storybook-solidjs-vite/vite` :6331; `vitest/vite` :6387), inside the ranges of CVE-2025-62522 (<7.1.11), GHSA-V2WJ-Q39Q-566R (<7.3.2), CVE-2026-53571 (<7.3.5) → filed as new finding B below.
7. **installer pinning** — all six install steps now `bun i -g opencode-ai@1.18.23` (triage:24, pr-management:41, review:36, docs-locale-sync:54, duplicate-issues:24+137); repo-wide grep finds zero remaining `opencode.ai/install` curl-pipes and zero active `curl … | bash` (only a commented-out uv line in `publish-python-sdk.yml:31`, inert).
8. **provenance** — `NPM_CONFIG_PROVENANCE: false` deleted from publish.yml env block; `--provenance` present in all four publish scripts (`packages/codo/script/publish.ts:23`, `packages/cli/script/publish.ts:19`, `packages/plugin/script/publish.ts:34`, `packages/sdk/js/script/publish.ts:41`). Workflow retains `id-token: write`.
9. **close-prs MAX_CLOSE** — now `env:`-passed (:36) and expanded as `"$MAX_CLOSE"` (:38). Remaining interpolations `${{ github.event_name }}` (:45) and `${{ inputs['dry-run'] }}` (:47) are enum/boolean-typed GitHub-constrained values — not attacker-controllable freeform strings; hygiene-only follow-up.
10. **triage denies** — `OPENCODE_PERMISSION` deny block (bash/edit/webfetch) at `triage.yml:32-37`. Verified genuine, not just present: the workflow invokes upstream `opencode` from pinned `opencode-ai@1.18.23`, which reads `OPENCODE_PERMISSION` and merges it *after* project config with precedence (a hostile repo-committed `opencode.json` cannot re-enable tools); flat `{"bash": "deny"}` form matches the documented permission schema. Issue title/body reach the script via env vars, never template interpolation. Minor untaken remediation: `GITHUB_TOKEN` could drop below `issues: write`.

## New findings filed during this rescan

- **A · HIGH · open** — `fin_03b112355001BZSz4hde34yuIM` — `packages/codo/src/cli/cmd/acp.ts:24-25`: `codo acp` binds whatever `resolveNetworkOptions` yields with **no** `requiresPassword` gate — the same non-loopback-unauthenticated-bind class just closed in serve/web. Same precondition (operator opts into mdns/non-loopback hostname). Fix: mirror the serve/web refusal; also constrain `cli/tui/worker.ts:47-49`.
- **B · MEDIUM · open** — `fin_03b112357001uBmWDI1cVZE7gE` — transitive `vite@7.1.10` copies in bun.lock (see #6) remain vulnerable to three of the five advisories behind the direct-dep bump; exposure narrower (storybook/test-runner/@solidjs/start internals, not the 0.0.0.0-bound dev servers). Fix: overrides/bump parents, regenerate lock.

## Rescan coverage & limitations

- **Method:** manual verification of every fix at its live location plus targeted greps; `git diff` per target file set. SAST scanners unchanged from prior runs (semgrep/opengrep not installed here).
- **osv-scanner NOT available** in this environment — vite advisory ranges were carried over from the recorded D1 finding and matched against direct lockfile reads, not a live OSV query.
- Shell `rg` was unavailable to this session (permission profile); content searches ran through the Grep tool instead. No coverage impact.
- Finding 5's fix path has no automated regression test (all other areas do, under `packages/codo/test/security-autofix/`); confidence rests on line-level code verification.
- Known unrelated WIP typecheck errors exist elsewhere in the tree (goal.set arity etc.) — out of scope, not adjudicated.

## Store bookkeeping note

The sec_finding runtime assigns fingerprints from persona+category+location+evidence; this rescan's rows did **not** collide with the original audit rows (evidence text was reformatted between the docs and the store), so the ten original IDs above remain in the store as historical open rows while the new `fin_03b11…` rows carry the authoritative post-fix verdicts. The mapping table above is the join key; a store-cleanup pass may retire the superseded originals.
