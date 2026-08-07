---
name: sec-test:pipeline-harden
hidden: true
description: "Audit and harden CI/CD pipelines per NIST SSDF (SP 800-218), SLSA v1.1, and Sigstore — run through the sec-devsecops persona"
---

# Pipeline Harden

## Overview

Inspect CI/CD definitions (GitHub Actions, GitLab CI, CircleCI, Azure DevOps, Makefile/build scripts) against NIST SSDF practice groups, SLSA Build Track levels, and Sigstore signing. Output: a findings file plus a "moves to level N" roadmap.

## Workflow

1. **Find the pipeline definitions.** `.github/workflows/*.yml`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Makefile`, `justfile`, `flake.nix`, `package.json#scripts`, build scripts under `script/` / `scripts/` / `infra/`.
2. **NIST SSDF practice-group walk.** For each group, note pass/fail with evidence:
   - **Prepare the Organization (PO)** — security requirements in build docs? Toolchain policy?
   - **Protect the Software (PS)** — source control protected (branch protection, required reviews), secrets stored outside repo?
   - **Produce Well-Secured Software (PW)** — compiler warnings/errors enabled? Static analysis in CI? Reproducible builds attempted?
   - **Respond to Vulnerabilities (RV)** — SECURITY.md present? Triage SLA? Disclosure contact?
3. **SLSA Build Track assessment.** Current state vs L1 (documented build), L2 (hosted build service), L3 (hardened builds, provenance non-forgeable). Identify the smallest set of changes to move up one level.
4. **Sigstore / supply-chain identity.** Is the built artifact signed with ephemeral keys (keyless via OIDC from CI)? Are SBOMs generated and attached (`syft`, CycloneDX)? Is the provenance recorded with the release?
5. **Common misconfig checks:** unpinned action SHAs (`uses: actions/checkout@v3` instead of `@<sha>`), `pull_request_target` with write tokens, self-hosted runners without isolation, secrets in env dumps, missing OIDC (long-lived AWS keys in CI), over-permissive GITHUB_TOKEN defaults.
6. **Write the report** to `.planning/security/findings/YYYY-MM-DD-pipeline-harden.md` using the finding schema (persona: sec-devsecops, category references like `NIST-SSDF-PW.4` or `SLSA-L2`).
7. Return `## PIPELINE HARDEN COMPLETE` and the level roadmap.

## Rules

- **Read-only.** CI configs are sensitive; modify permission comes from a separate, user-approved step.
- **Pin every recommendation.** "Bump X to Y" without a current-state citation is noise.
- If signing exists but is not verified anywhere fingerprint-pinning, call that out — unverified signatures are theater.
