---
name: sec-test:container-scan
hidden: true
description: "Scan container images for OS and language-package vulnerabilities — Trivy or Grype against an SBOM or image ref"
---

# Container Scan

## Overview

Detect vulnerabilities inside container images — both the base image (Debian/Alpine CVEs) and the application-layer packages (npm/pip/go modules baked in). Read-only on the image: never modify, never push.

## Workflow

1. **Find the images.** `Dockerfile*`, `docker-compose.yml`, `Dockerfile` stages inside CI configs, anything `FROM`-pulled.
2. **Choose the scan engine:**
   - `trivy image <ref>` — fastest, rich reporting, supports SPDX/CycloneDX/JSON output. Good default.
   - `grype <ref>` — pairs with `syft`/`sbom:` input; surface matches the SBOM we just produced.
   - If only the SBOM exists (no docker access): `grype sbom:.planning/security/sbom/<file>.cdx.json` — doesn't need the image at all.
3. **Triage findings:**
   - **Fixable CVEs first.** `trivy image --ignore-unfixed` strips results that have no upstream fix — those are noise for triage purposes, note them separately.
   - **App-layer vs base-layer.** A critical CVE in a base-image package you can bump today is cheap; one that's part of a vendor-provided layer may require an upstream rebuild.
   - **EPSS/CVSS when the tool reports it.** Use those to rank; the report below orders by exploitability, not just severity.
4. **Zero false positives policy for app packages.** A "critical" log4shell hit on a JAR inside a frontend image is a false positive if the app is JavaScript — call it out but don't bump the base image reacting to it.
5. **Write findings** to `.planning/security/findings/YYYY-MM-DD-container-scan.md` (persona: sec-devsecops, category: `CVE-XXXX-YYYY` or `A06-vulnerable-components`).
6. Return `## CONTAINER SCAN COMPLETE` with the per-image severity histogram.

## Rules

- **Never push.** Scanning is read-only.
- **Image reference must be exact.** `myapp:latest` is not stable — use `myapp@sha256:...` or a tagged version when possible.
- If the project pulls a base image without pinning (`FROM node:18` instead of `FROM node:18-alpine3.20`), that itself is a finding — supply chain hygiene.
