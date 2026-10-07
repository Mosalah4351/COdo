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
3. **Generate straight into the artifact directory.** Prefer `syft`, and always write the output where it belongs — `syft -o <path>` writes through the bash grant, so it is NOT confined by the `edit` permission. Pointing `-o` at the repo root would drop an untracked file outside `.planning/security/`. Set the final path up front:
   - Pick it first: `.planning/security/sbom/YYYY-MM-DD-<image-or-package>.cdx.json`
   - Container image (no docker needed): `syft <image-ref> -o cyclonedx-json=.planning/security/sbom/YYYY-MM-DD-<slug>.cdx.json`
   - Directory of files: `syft dir:. -o cyclonedx-json=.planning/security/sbom/YYYY-MM-DD-<slug>.cdx.json`
   - Include filename + layer info for containers: add `--scope all-layers`.
   - `mkdir -p` is not on the allow-list; if the directory does not exist, create the file through `write` first, then let `syft` overwrite it.
4. **Validate the output.** Check the SBOM covers the full dependency tree: no "unknown" entries for packages the project manifest clearly declares.
5. **Confirm the artifact landed** at `.planning/security/sbom/YYYY-MM-DD-<image-or-package>.cdx.json`. The file itself is evidence — do not commit it to source control unless there's an explicit process for it.
6. **Hand off to scanners.** Report which file Grype/Trivy should consume next: `grype sbom:.planning/security/sbom/2026-08-...cdx.json`. Don't scan in this skill.
7. Return `## SEC-RESULT skill=sec-test:sbom status=complete doc=<artifact-path>` plus the package count. If `syft` is not installed, return `status=partial reason=scanner-missing` and say which artifacts went uninventoried.

## Rules

- **No edits to source.** Read-only on the repo; files under `.planning/security/sbom/` are allowed.
- **Never write scanner output outside `.planning/security/`.** The `-o` flag bypasses the edit-permission confinement; the discipline has to come from you.
- **SBOM is point-in-time.** The filename must carry the date so stale SBOMs can't masquerade as current.
- When the project has no container image but publishes an npm package, the SBOM should still cover the production dependency set. `npm ci --omit=dev` is not on the allow-list — read the lockfile and let `syft dir:.` do the walk instead of installing anything.
