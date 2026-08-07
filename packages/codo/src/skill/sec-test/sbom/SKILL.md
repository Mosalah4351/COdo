---
name: sec-test:sbom
hidden: true
description: "Generate a Software Bill of Materials and validate it against supply-chain policy — Syft, CycloneDX, SPDX — run through sec-devsecops"
---

# SBOM

## Overview

Produce an authoritative inventory of every component the built artifact carries. Without this, downstream scans (Grype, Trivy) and provenance (SLSA) have nothing to hang on.

## Workflow

1. **Identify build outputs.** What gets shipped? Container images (`Dockerfile`/`.dockerignore`/`docker-compose.yml`), published packages (`package.json#publishConfig`, `setup.py`, `Cargo.toml`), binaries (`goreleaser.yml`, `electron-builder.yml`).
2. **Pick the format based on consumer:**
   - **CycloneDX** (default for COdo) — JSON, rich vulnerability metadata, integrates with Grype directly.
   - **SPDX 2.3+** — when license compliance matters or when a partner/regulator asks for it.
3. **Generate.** Prefer `syft`:
   - Container image (no docker needed): `syft <image-ref> -o cyclonedx-json=sbom.cdx.json`
   - Directory of files: `syft dir:. -o cyclonedx-json=sbom.cdx.json`
   - Include filename + layer info for containers: add `--scope all-layers`.
4. **Validate the output.** Check the SBOM covers the full dependency tree: no "unknown" entries for packages the project manifest clearly declares.
5. **Record the artifact** under `.planning/security/sbom/YYYY-MM-DD-<image-or-package>.cdx.json`. The file itself is evidence — do not commit it to source control unless there's an explicit process for it.
6. **Hand off to scanners.** Report which file Grype/Trivy should consume next: `grype sbom:.planning/security/sbom/2026-08-...cdx.json`. Don't scan in this skill.
7. Return `## SBOM COMPLETE` with the artifact path and the package count.

## Rules

- **No edits to source.** Read-only on the repo; files under `.planning/security/sbom/` are allowed.
- **SBOM is point-in-time.** The filename must carry the date so stale SBOMs can't masquerade as current.
- When the project has no container image but publishes an npm package, the SBOM should still cover `node_modules` reachable from `npm ci --omit=dev`.
