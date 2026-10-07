---
date: 2026-08-23
persona: sec-appsec
task: focused scans — committed secrets (tree + history) and dependency audit
scope: D:\COdo tracked files, full git history (all refs), root + all workspace manifests/bun.lock files
out_of_scope: CI workflows & Dockerfiles (covered by pipeline-harden.md), line-by-line code audit (separate task)
status: PARTIAL — dedicated scanners unavailable; see Coverage
---

# Secrets & Dependency Audit — 2026-08-23

## Coverage (read this first)

| Scanner | Status | Substitute used |
|---|---|---|
| gitleaks | **NOT INSTALLED** | Manual pattern greps over working tree + `git log -S` pickaxe sweeps over all refs |
| trufflehog | **NOT INSTALLED** | — (no live verification possible; nothing below claims `confidence: high` from a verifier) |
| osv-scanner | **NOT INSTALLED** | Manual resolved-version extraction from bun.lock + per-package advisory lookups (GitHub advisories / OSV / NVD via web research) |
| semgrep | n/a this run | Not applicable to secrets/deps task |

Consequences of degraded tooling, stated honestly:
- History scanning was **format-driven** (`AKIA`, `BEGIN PRIVATE KEY`, `ghp_`, `xoxb-`, `glpat-`, `sk-ant-`, targeted string pickaxes), not entropy-based across every historical blob. A secret in history using none of the swept formats could have been missed.
- The transitive dependency tree was sampled by watchlist (known-advisory-prone packages), not enumerated exhaustively as osv-scanner would.
- No credential was tested against a live service (per skill rules), so liveness of the candidate keys below is unverified.

Manifests audited (all read): root `package.json`; 24 × `packages/*/package.json`; 6 × `packages/console/*/package.json`; 3 × `packages/stats/*/package.json`; `packages/sdk/js/package.json`; `sdks/vscode/package.json`. Lockfiles: root `bun.lock` (7,911 lines, watchlisted resolutions extracted), `sdks/vscode/bun.lock`, `github/bun.lock`. No Go/Rust/Python/PHP manifests exist in the tree. CI workflows and Dockerfiles were **not** audited (covered by `pipeline-harden.md`).

## Part 1 — Committed secrets

### `.gitleaksignore` re-verification (per dispatch instruction)

All four ignored fingerprints point at `packages/http-recorder/test/record-replay.test.ts`. Each was manually inspected:

| Entry | Line | Content | Verdict |
|---|---|---|---|
| generic-api-key:69 | 69 | `key=secret-google-key&api_key=secret-openai-key` | Fake literals → benign |
| gcp-api-key:71 | 71 | Expected redacted URL `%5BREDACTED%5D…X-Amz-Signature=` | Redaction assertion → benign |
| generic-api-key:92 | 92 | `authorization: "Bearer secret-token"` | Fake literal → benign |
| generic-api-key:146 | 146 | `sk-123456789012345678901234` (sequential digits) | Obvious fixture → benign |

**However**, line 138 of the same test file contains `AIzaSyDHibiBRvJZLsFnPYPoiTwxY4ztQ55yqCE` — a *format-valid* Google API key shape used as a "secret-looking" detection fixture. Unlike its siblings it has **no `.gitleaksignore` entry**, so (a) any future gitleaks run emits it unignored, and (b) if the value was ever copied from a real console rather than synthesized, it is a leaked credential. Liveness cannot be verified here and must never be tested by hand → finding **S1**.

### Other tree hits (verified benign)

- `AKIAIOSFODNN7EXAMPLE` + `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` — canonical AWS docs example pair, in `packages/llm/test/provider/bedrock-converse.test.ts:391-392` and three codo test fixtures. False positive.
- `packages/slack/.env.example` — pure placeholders (`xoxb-your-bot-token`). Not a finding.
- `_authToken` matches — all in localized `enterprise.mdx` docs using `${NPM_AUTH_TOKEN}` env interpolation. False positive.
- `infra/secret.ts`, `sst-env.d.ts` — SST secret *declarations*/types only; no values emitted. Correct pattern.
- No `.npmrc`, no private-key blocks, no credential-bearing connection strings anywhere tracked.

### History sweep (all refs)

`git log --all -S` pickaxe sweeps returned only the initial-snapshot commit `0d408f9` (same benign fixtures present today) and sec-test docs/test commits (`c042b9a`, `500de32`, `f9456e8`) whose hits are documentation strings about secret formats. Filename add-scan (`*.env|*.pem|*.key|*credential*|*secret*`) surfaced only code files named for credential *handling* (e.g. `packages/core/src/credential.ts`). No historical private keys, GitHub PATs, Slack tokens, or GitLab PATs under swept formats.

### Secrets findings

#### S1 — Format-valid Google API key committed without ignore entry — MEDIUM
- ID: fin_02f72e718001SU6OHdSM8hHgr9
- Location: `packages/http-recorder/test/record-replay.test.ts:138`
- Category: CWE-798 · Confidence: medium · Status: open
- Evidence: `body: JSON.stringify({ nested: "AIzaSyDHibiBRvJZLsFnPYPoiTwxY4ztQ55yqCE" })`
- Remediation: replace with an obviously-fake marker and/or add its fingerprint to `.gitleaksignore` like its siblings; if provenance is uncertain at all, rotate the Google API key first.

#### S2 — Stripe test-mode publishable key hardcoded in npm script — LOW
- ID: fin_02f72e71f001xOXpeq3UJnhgp6
- Location: `packages/console/app/package.json:9`
- Category: CWE-798 / A02 · Confidence: high (committed verbatim) · Status: open
- Evidence: `"dev:remote": "VITE_AUTH_URL=… VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RtuLNE7fOCwHSD4mewwzFejyytjdGoSDK7CAvhbffwaZnPbNb2rwJICw6LTOXCmWO320fSNXvb5NzI08RZVkAxd00syfqrW7t bun sst shell --stage=dev bun dev"`
- Impact limited (`pk_test_` publishable keys are client-visible by design, no charge authority), but a real-format credential lives permanently in git along with the account identifier.
- Remediation: move to `.env.local`/SST secret; rotate the test key if the repo was ever public.

#### S3 — Terminal session log committed to VCS — LOW
- ID: fin_02f72e7210012Gl8YhHszsf7s2
- Location: `tui.log` (tracked since commit `94b138e`)
- Category: CWE-532 / A09 · Confidence: high that tracked; content sensitivity unproven · Status: open
- Evidence: 2-line ANSI terminal-capture dump beginning `$ bun run --cwd packages/codo --conditions=browser src/index.ts`.
- Runtime logs can embed paths/tokens/screen content; also an accidental artifact class.
- Remediation: `git rm --cached tui.log`; add `*.log` to `.gitignore`.

#### FP — Verified false positives (recorded so future re-scans don't churn)
- IDs: fin_02f72e723001nJRD5eRf6ZN5i9 (.gitleaksignore fixtures), fin_02f72e726001lf4BZ2UnPD2Me8 (AWS examples)
- `.gitleaksignore` entries (record-replay.test.ts lines 69/71/92/146): confirmed fixtures; ignores justified.
- AWS example pair (`AKIAIOSFODNN7EXAMPLE` / `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`) in bedrock/codo tests: canonical AWS documentation examples.

## Part 2 — Dependency audit

Resolved versions taken from lockfiles (source of truth), cross-checked against public advisories. Positive controls observed: integrity hash on every resolution, `exact = true` installs, 3-day `minimumReleaseAge` cool-down (`bunfig.toml:4`), `trustedDependencies` gating install scripts, vendor patches in `patches/` reviewed as benign module-resolution fixes (incl. `@ff-labs/fff-bun@0.9.3.patch`). Root `postinstall` (`fix-node-pty.ts`) reviewed: chmod-only on node-pty prebuilds — benign.

No advisories found affecting the pinned versions of: ws 8.21.0, hono 4.10.7, axios 1.18.0 (note: the March-2026 axios compromise hit 1.14.1/0.30.4 only), form-data 4.0.6, brace-expansion 5.0.6/2.0.2, ejs 3.1.10, nanoid 3.3.13, minimist 1.2.8, node-fetch 2.7.0, esbuild 0.25.12/0.25.8, rollup 4.62.0, dompurify 3.3.1, katex 0.16.27, happy-dom 20.10.6, jsonwebtoken 9.0.3, jose 6.0.11, mysql2 3.14.4, postgres 3.4.7, undici 8.5.0/5.29.0 (watchlist search was noisy — recorded as not-confirmed rather than clean). `elliptic` is not present in any lockfile.

### Dependency findings

#### D1 — vite 7.1.4 vulnerable to multiple `server.fs.deny` bypasses — HIGH
- ID: fin_02f72e727001HYarHraGSO7gPh
- Location: `bun.lock:5289` (`vite@7.1.4`); declared via catalog `package.json:84`
- Category: A06-vulnerable-outdated-components · Confidence: high · Status: open
- Advisories affecting 7.1.4:
  - CVE-2025-58751 / GHSA-g4jq-h2w9-997c — public-dir symlink bypass; fixed 7.1.5
  - CVE-2025-58752 / GHSA-jqfw-vq24-v9c3 — `server.fs` ignored for HTML files (+ preview server); fixed 7.1.5
  - CVE-2025-62522 / GHSA-93m4-6634-74q7 — trailing-backslash bypass on Windows; fixed 7.1.11
  - CVE-2026-53571 / GHSA-fx2h-pf6j-xcff — NTFS ADS (`/.env::$DATA?raw`) + 8.3 short-name bypass; **High 8.2 CVSS v4**; fixed 7.3.5
  - GHSA-V2WJ-Q39Q-566R — query-parameter bypass; fixed 7.3.2
- Reachability is real, not theoretical: `packages/console/app/package.json:8` and `packages/console/support/package.json:8` bind the Vite dev server to `--host 0.0.0.0`, and this repo is developed on Windows (three of five bypasses are Windows-specific). Dev servers on shared networks can leak `.env`/cert contents.
- Remediation: bump vite within major 7 to **≥7.3.5** (covers all five); drop `--host 0.0.0.0` during development.

#### D2 — electron 42.3.3: known heap overflow + stale Chromium backports — MEDIUM
- ID: fin_02f72e729001bKwqRAHMZujBLH
- Location: `bun.lock:3405` (`electron@42.3.3`); declared `packages/desktop/package.json:51`
- Category: A06-vulnerable-outdated-components · Confidence: high · Status: open
- Evidence: CVE-2026-54257 — heap buffer overflow via incorrect Buffer byte-length calculation, affecting exactly **42.3.1–42.3.3** (SentinelOne vuln DB, June 2026). The 42.x line has since received months of backported upstream Chromium/V8 security fixes (current 42.9.3, Aug 2026) that 42.3.3 predates — the standard renderer N-day surface for a desktop app rendering assistant output.
- Remediation: bump electron to latest 42.x patch (≥42.9.3) within the same major; put electron on a regular bump cadence.

#### D3 — astro 5.7.13 multiple security fixes behind — MEDIUM
- ID: fin_02f72e72d001hjdXPOYaU2O6yH
- Location: `bun.lock:2961` (`astro@5.7.13`); declared `packages/web/package.json:24`
- Category: A06-vulnerable-outdated-components · Confidence: high on ranges · Status: open
- Advisories affecting ≤5.7.13:
  - GHSA-x3h8-62x9-952g — arbitrary local file read via dev-server `/_image`; fixed **5.14.3**
  - CVE-2025-64765 / GHSA-ggxq-hp9w-j794 — middleware pathname-normalization bypass (auth-check evasion); fixed **5.15.8**
  - CVE-2025-64764 — reflected XSS via server islands; fixed **5.15.8**
- Mostly dev/static-site exposure (docs site on Cloudflare adapter) hence medium, but middleware path checks inherit the bypass until bumped.
- Remediation: bump astro within major 5 to ≥5.15.8 (latest 5.x preferred).

#### D4 — `@solidjs/start` installed from pkg.pr.new third-party PR registry — MEDIUM
- ID: fin_02f72e730001Bde3jr6Q45JN2d
- Location: `package.json:87` catalog: `"@solidjs/start": "https://pkg.pr.new/@solidjs/start@dfb2020"`; resolution at `bun.lock:1011`
- Category: A03-software-supply-chain-failures · Confidence: high · Status: open
- Evidence: framework-level dependency served by a community PR-build mirror rather than npm; no npm provenance attestation exists for it, and the sole integrity anchor is the lockfile hash. Inherited by app, enterprise, console app/support, stats app.
- Remediation: move to a published npm release of @solidjs/start; if a specific PR fix is required, vendor the fork in-repo or pin a git dep to a full commit SHA you control.

#### D5 — `opencode-poe-auth@0.0.1`: obscure auth package with wildcard sub-dependency — LOW
- ID: fin_02f72e734001PtLyBKMzcklheT
- Location: `bun.lock:4445`; declared `packages/codo/package.json:134`
- Category: A03-software-supply-chain-failures · Confidence: medium · Status: open
- Evidence: `"opencode-poe-auth": ["opencode-poe-auth@0.0.1", "", { "dependencies": { "open": "^10.0.0", "poe-oauth": "*" } …` — version-0.0.1 package handling OAuth on an auth path, depending on `poe-oauth:"*"` (unpinned wildcard).
- Obscurity is a signal, not proof; flagged for review per supply-chain red-flag checklist.
- Remediation: audit the package's provenance/maintainer; replace or vendor; never accept wildcard deps inside auth-handling code.

#### D6 — `ghostty-web` manifest-pinned to mutable branch ref — LOW
- ID: fin_02f72e736001VjmlYUw59ffAiu
- Location: `packages/app/package.json:70`: `"ghostty-web": "github:anomalyco/ghostty-web#main"`
- Category: A03-software-supply-chain-failures · Confidence: high (evidence) · Status: open
- Mitigating: the lockfile resolved/pinned commit `83c0a07` with integrity hash (`bun.lock:3675`), so current installs are reproducible. Residual risk: any `bun update` re-resolves `#main` to whatever the branch head is at that moment.
- Remediation: pin the manifest specifier itself to the full SHA (`#83c0a07…`).

#### D7 — `minimumReleaseAgeExcludes` exempts 26 packages from install cool-down — LOW
- ID: fin_02f72e73a001OqzrVBpf5f7RXp
- Location: `bunfig.toml:5`
- Category: A03-software-supply-chain-failures · Confidence: high · Status: open
- Evidence: exclusions include low-visibility native/auth packages (`@ff-labs/fff-bin-*` × 8, `opencode-gitlab-auth`, `gitlab-ai-provider`) plus the electron-builder toolchain — a freshly published compromised version of any excluded package would be installed immediately, defeating the cool-down control.
- Remediation: prune the exclusion list to what genuinely blocks releases; re-review quarterly.

## Severity histogram (open findings)

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | — |
| High | 1 | D1 |
| Medium | 4 | S1, D2, D3, D4 |
| Low | 5 | S2, S3, D5, D6, D7 |
| False-positive | 2 | FP aggregates |

## Open questions

- Liveness of the two committed key-format strings (S1, S2) — requires owner-side verification in the respective consoles (Google AI Studio / Stripe dashboard); never tested here.
- Whether `astro`'s Host-header SSRF advisory (CVE-2026-25545, Feb 2026) affects 5.x — affected-range statement not confirmed from a primary source during this run.
