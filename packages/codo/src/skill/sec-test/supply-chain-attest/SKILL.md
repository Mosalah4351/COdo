---
name: sec-test:supply-chain-attest
hidden: true
description: "Verify build provenance and artifact signing — SLSA attestations, Sigstore signatures, in-toto metadata"
---

# Supply Chain Attestation

## Overview

Two questions: (1) was this artifact built by the pipeline we think built it, and (2) can we verify it wasn't modified in transit. This skill checks, never signs — signing is a workflow concern, not a security audit concern.

## Workflow

1. **Locate the artifacts.** Container images published to a registry, binaries attached to GitHub releases, npm packages, anything with a public download.
2. **Check Sigstore signatures** (if `cosign` is present):
   - `cosign verify <image>` — should print verified claims. Unverified/but-tagged artifacts are a finding.
   - Look for `cosign.sig`/`bundle.sig` next to the artifact. Missing bundle = unverifiable = finding.
3. **Check SLSA provenance** (when SLSA >= L1 is claimed):
   - `cosign verify-attestation <image>` — expect an in-toto Statement with the build pipeline recorded.
   - The `buildType` and `builder` must match the project's actual CI runner (e.g. `https://github.com/slsa-framework/slsa-github-generator/...`), not a personal laptop.
4. **Check in-toto / SBOM attestation binding:**
   - The SBOM (from `sec-test:sbom`) should itself be signed or included in the provenance. Unsigned SBOM = assertion, not proof.
5. **Policy gates (pass/fail):**
   - If the project claims SLSA L2+, no verification = finding.
   - If the project claims no SLSA but signs artifacts anyway, that's fine — log it.
   - If external dependencies are fetched unsigned and there's no checksum pinning, that IS a finding (supply chain hygiene, not cryptographic).
6. **Write findings** to `.planning/security/findings/YYYY-MM-DD-supply-chain-attest.md` (persona: sec-devsecops, category: `A08-software-data-integrity-failures` or `SLSA-Lx`).
7. Return `## PIPELINE HARDEN COMPLETE` (at this layer the supply-chain verdict rolls into the pipeline report).

## Rules

- **This skill verifies; it never signs or publishes.** No `cosign sign`, no `gh attestation` writes.
- A missing attestation for a private/internal artifact isn't necessarily a finding — but a missing one for a publicly distributed one IS.
- No verification of success without evidence — "cosign exited 0" with no output capture is not evidence.
