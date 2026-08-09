# Phase A+B execution log

Committed on branch `not-a-fork` (cut from `sec-test`'s HEAD 352c030).

## What landed

### 1. Source-side sweep (residual opencode strings)

**Files touched:**

- `packages/codo/src/config/paths.ts` — added a comment block on the `.opencode` fallback
  explaining it's read-only compat for legacy installs. No code change; compat stays.

- `packages/codo/src/plugin/openai/README.md` — flag name was `OPENCODE_EXPERIMENTAL_WEBSOCKETS`;
  now `CODO_EXPERIMENTAL_WEBSOCKETS=true`, with the old name called out as deprecated (kept
  for one release to avoid breaking users who have it set).

- License and attribution scaffolding:
  - `LICENSES/OPENCODE-LICENSE.txt` — verbatim copy of upstream's MIT license
  - `NOTICES.md` — explains what COdo inherited from OpenCode and which parts are original

### 2. User-facing docs (the "not a fork" outward evidence)

- `README.md` — completely rewritten. Reads as a COdo product page, not an OpenCode descendant.
  Installer instructions, the six personas, the security model, contribution guide, license
  attribution. The README *is* the product claim.

- `docs/not-a-fork/VISIBLE-DIFFERENCES.md` — the technical/beautiful answer to "ok how is
  this different from opencode though." Nine sections covering agent model, findings
  persistence, scope gating, compose workflow, addon model, and where we DON'T differ.

### 3. Internal ledger (this folder)

- `NOT-FORK-CODO/README.md` — what's landed, what's pending, and what the branch represents.

## What intentionally did not change

- `.opencode` fallback in `packages/codo/src/config/paths.ts` — required so users who still have
  `~/.opencode` configs aren't locked out. Read-only. COdo never writes to it.
- Plugin package names `opencode-gitlab-auth` / `opencode-poe-auth` referenced in
  `packages/codo/src/plugin/index.ts` — those are third-party npm packages. Different publisher.
- The literal `process.env.GSD_RUNTIME = "opencode"` in `packages/codo/src/skill/gsd-local.ts` —
  required because the GSD workflow binary reads this marker to know whether to emit OpenCode-
  flavored directives. Removing it breaks GSD.

## How to verify

```bash
# No "opencode" outside intentional compat shims and named MIT references
grep -rin "opencode" packages/codo/src docs README.md install \
  --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null \
  | grep -viE "(NOTICES\.md|LICENSES/|COdo was|MIGRATION|VISIBLE-DIFFERENCES|sec-test/01-IDEA|GSD_RUNTIME=|gsd-|@codo-ai)" \
  | wc -l   # → ≤3, each intentional

# Branch builds:
cd packages/codo && bun run build

# Persona registry exposes 6 agents + 24 sec-test skills:
./dist/codo-windows-x64/bin/codo-*.exe agent list | grep -c "^sec-"
./dist/codo-windows-x64/bin/codo-*.exe agent list | grep -c "sec-test"
```
