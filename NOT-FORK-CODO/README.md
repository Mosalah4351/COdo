# NOT-FORK-CODO

This folder is the working record for the "COdo is not a fork of OpenCode" goal.

## Status

Phase A+B are committed on the `not-a-fork` branch. The branch contains:

- The original security/persona system (sec-test + 6 personas + 24 skills + scope-gate + finding table)
- The opencode→COdo namespace + license attribution sweep (NOTICES.md, LICENSES/OPENCODE-LICENSE.txt)
- The user-facing docs set (README.md, docs/not-a-fork/VISIBLE-DIFFERENCES.md)
- The legacy compat comment for `.opencode` config dirs (read-only fallback, not actively created)

## What's intentionally left

- `.opencode` as a read-only fallback in `packages/codo/src/config/paths.ts` — prevents lockout
  for users with legacy configs. Not a fork dependency; it's a compat shim.
- Third-party plugin names (`opencode-gitlab-auth`, `opencode-poe-auth`) referenced in
  `packages/codo/src/plugin/index.ts` — those are PUBLIC npm packages with independent identities;
  we install them as dependencies, not vendor them.
- The `process.env.GSD_RUNTIME = "opencode"` marker — this is the upstream GSD workflow's
  expected value (GSD reads it to identify which runtime is hosting), not a COdo fork marker.

## What's next

1. **Default workflow change** — sec-test should be the *first* tab visible when a new install
   runs, not the second. That's the behavioral claim of not-a-fork.
2. **Visual identity** — user-facing surfaces (composer, status bar, tabs, themes, icons)
   that currently still render OpenCode-shaped chrome.
3. **Release** — `v1.0.0` tag on the repo, with the release notes naming what's COdo-native.
   We're already at codo-0.0.0-sec-test-<ts> internally; the next release with the not-a-fork
   branch merged is the first claims-ready version.

## Supporting docs

- `.planning/not-a-fork-roadmap.md` — full roadmap (phases A-E)
- `docs/sec-test/` — 3-part: idea, user guide, technical reference for the security layer
- `docs/not-a-fork/VISIBLE-DIFFERENCES.md` — the user-facing answer to "why not just install OpenCode?"

This folder is referenced as a build artifact; it lives at the repo root because it's part of
the COdo distribution (treats it as input to release notes).
