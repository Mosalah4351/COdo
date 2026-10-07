---
name: sec-test:dependency-audit
hidden: true
description: "Audit third-party dependencies for known vulnerabilities (OSV, advisory databases) and supply-chain red flags"
---

# Dependency Audit

## Overview

Correlate the dependency tree against public vulnerability databases (OSV aggregates GHSA/NVD/PyPA/RustSec/npm) and flag supply-chain risk signals. Read-only.

## Workflow

1. **Identify ecosystems.** Glob for manifests: `package.json`/`bun.lock`/`bun.lockb`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements*.txt`, `Pipfile.lock`, `poetry.lock`, `go.sum`, `Cargo.lock`, `Gemfile.lock`, `composer.lock`, `pom.xml`.
2. **Run the scanner when present:** `osv-scanner --lockfile=<file>` per lockfile, or `osv-scanner -r .` for a recursive pass. `osv-scanner` is available to both personas that hold this skill. `grype dir:.` and `trivy fs --scanners vuln .` are `sec-devsecops`-only — do not reach for them from a `sec-appsec` dispatch. `bun pm audit` / `npm audit` are not on either allow-list; if `osv-scanner` is missing, say so and return `status=partial reason=scanner-missing` rather than shelling out to something that will be denied.
3. **Triage each advisory:**
   - Is the vulnerable code path actually reachable? (Direct dependency calling the affected function vs. transitive-only.)
   - Is there a fixed version within the current major bump? Prefer "bump within semver" remediations; flag breaking-change upgrades explicitly.
   - CVSS + EPSS when available: high CVSS + high EPSS = top of list; high CVSS + ~0 EPSS and no public exploit = articulately-dated risk, say so.
4. **Supply-chain signals (manual):** single-maintainer packages with recent ownership transfer; install scripts (`postinstall`) in unexpected packages; typosquat-sounding names; packages with no repository link in registry metadata.
5. **Write the report** to `.planning/security/findings/YYYY-MM-DD-dependency-audit.md`. Category is `A06-vulnerable-outdated-components` for a known CVE in a pinned version, `A03-software-supply-chain-failures` for registry/provenance/ownership signals. `persona` is assigned by `sec_finding` from whichever persona is running — this skill is held by both `sec-appsec` (dependency surface of a diff) and `sec-devsecops` (release surface). Never set it yourself and never assume one in the prose.
6. Return `## SEC-RESULT skill=sec-test:dependency-audit status=complete findings=<n> critical=<n> high=<n> doc=<path>` plus the severity histogram.

## Rules

- **Never upgrade dependencies yourself.** Output a remediation table with target versions; applying bumps is a separate, user-approved step.
- Lockfiles are the source of truth; do not audit `node_modules` contents.
- A CVE in a transitive-only, unreachable path: report it with `confidence: low` and say why it's deprioritized — do not omit it silently.
