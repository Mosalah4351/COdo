---
name: compose:merge
hidden: true
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

## Workflow Routing

If the active workflow is **GSD**, invoke **`gsd:ship`** (creates PR with auto-generated body) and optionally **`gsd:pr-branch`** (filters .planning commits from history) via the skill tool instead of following the instructions below.

**DO NOT skip this routing** — GSD applies to ALL projects, even standalone tools. The reasoning "this is a standalone project, GSD doesn't apply" is WRONG. (Other workflows TBD.)

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the compose:merge skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Detect Environment

**Determine workspace state before presenting options:**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 4 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 4 options | Provenance-based |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 3 options (no merge) | No cleanup |

### Step 3: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

If the base branch is ambiguous, confirm through `compose:ask`.

### Step 4: Present Options

**Normal repo / named-branch worktree — use `compose:ask`:**
- header: `Complete Work`
- question: `Implementation complete. What would you like to do?`
- options:
  - label: `Merge locally`, description: `Merge back to <base-branch>`
  - label: `Create PR`, description: `Push branch and open a Pull Request`
  - label: `Keep as-is`, description: `Leave the branch — I'll handle it later`
  - label: `Discard`, description: `Delete branch and all commits`

If no user is available, merge locally and proceed.

**Detached HEAD — use `compose:ask`:**
- header: `Complete Work`
- question: `Implementation complete (detached HEAD, externally managed). What would you like to do?`
- options:
  - label: `Create PR`, description: `Push as new branch and open a PR`
  - label: `Keep as-is`, description: `Leave as-is — I'll handle it later`
  - label: `Discard`, description: `Delete this work permanently`

If no user is available, create a PR and proceed.

### Step 5: Execute Choice

#### Option 1: Merge Locally

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

git checkout <base-branch>
git pull
git merge <feature-branch>

<test command>
```

Then: Cleanup worktree (Step 6), then delete branch:

```bash
git branch -d <feature-branch>
```

#### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>

gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

**Do NOT clean up worktree** — user needs it alive to iterate on PR feedback.

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

#### Option 4: Discard

**Confirm through `compose:ask`:**
- header: `Confirm Discard`
- question: `This will permanently delete branch <name>, all commits, and worktree at <path>. Are you sure?`
- options:
  - label: `Cancel`, description: `Keep branch and worktree intact`
  - label: `Discard permanently`, description: `Cannot be undone`

If no user is available, do NOT discard — keep the branch as-is. (Destructive actions never auto-approve.)

### Step 6: Cleanup Workspace

**Only runs for Options 1 and 4.** Options 2 and 3 always preserve the worktree.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**If `GIT_DIR == GIT_COMMON`:** Normal repo, no worktree to clean up. Done.

**If worktree path is under `.worktrees/`, `worktrees/`, or `~/.config/compose/worktrees/`:** Compose created this worktree — we own cleanup.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

**Otherwise:** The host environment owns this workspace. Do NOT remove it.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| 4. Discard | - | - | - | yes (force) |

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Remove a worktree before confirming merge success
- Clean up worktrees you didn't create

**Always:**
- Verify tests before offering options
- Detect environment before presenting menu
- Present exactly 4 options (or 3 for detached HEAD)
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
