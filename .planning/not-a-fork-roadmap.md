# Sec-Test Roadmap: Making COdo Not-a-Fork

## Goal

Take COdo from "a fork of OpenCode with rebranding" to "an independent AI agent project that happens to share architectural DNA with its upstream but has its own product, users, and release story." Definition of done: a person who doesn't know OpenCode exists can install, use, and contribute to COdo without ever wondering "what was this forked from?"

---

## Current state (verified against the branch)

### Already done on this branch
- Project renamed everywhere(end-user-visible): packages/codo/, install script, ghcr.io/Mosalah4351/COdo, brew tap, AUR templates.
- Six sec-test personas + 23 skills registered (commits c042b9a…a81ebbc).
- security_finding SQLite table via drizzle (161abcf/cb71b88).
- Scope-gate module with hardened URL matching (7207277).
- Subagent chrome tinting in TUI (52a2703).
- Broader fixes (env mutation, publish URLs) on branch (428d79b, 8f6958e).
- Three docs committed: 01-IDEA.md, 02-USER-GUIDE.md, 03-IMPLEMENTATION.md (3064a38).

### What the review surfaced as "still fork-shaped"
- Persona permissions still reference packages/ paths internally, not packages/codo/.
- Compose router still teaches GSD subagents, not sec-test (fixed in 7207277 — confirmed correct on branch HEAD).
- Binary smoke test passes, but the packaged `.exe` still identifies itself as `codo-0.0.0-sec-test-…` — version scheme is internal-only (no public semver tag).

---

## Phase plan for "not a fork"

### Phase A — Name, license, attribution (1-2 days)

1. **Audit + commit full re-name sweep.**
   - Grep for `opencode` (case-insensitive, word boundary) across `packages/`, `docs/`, `.github/`, `install`, `flake.nix`, `README.md`, `LICENSE`. Remove or replace every outlet not in a NOTICE/attribution role.
   - Specific watch points:
     - `packages/codo/package.json` (name is `codo`, version 1.19.0, private: true — decide publishing model)
     - `packages/codo/script/publish.ts` (URLs updated in 8f6958e)
     - `install` script (already on Mosalah4351/COdo)
     - Root LICENSE — currently MIT, "Copyright (c) 2025 COdo" — confirm that's accurate and complete

2. **Add `NOTICES` file** crediting upstream honestly: "Engineering lineage includes contributions from OpenCode (BSD-3-Clause); see NOTICE.md for full attribution." This is what makes the not-a-fork claim legal-hygiene-clean.

3. **Update README.md** with a short "why we're not a fork" section that names the differentiation, not the upstream:
   - sec-test (no equivalent upstream)
   - GSD workflow routing (compose + 33 GSD subagents + workflow.json driver; upstream has nothing like it)
   - Addon marketplace (independent of upstream's plugin model)
   - Local-first defaults (no required cloud account)

### Phase B — Independent product surface (3-5 days)

1. **Make sec-test the default-first workflow.**
   - When a fresh COdo install runs, sec-test should be the *first* tab visible, not the second. This requires editing the session-start logic so `@sec-test` is promoted as the recommended entry point.
   - The "default agent" chain in agent.ts should make sec-test the default for new installs (not `build`).
   - Compose remains available but isn't the headline.

2. **Publish as an npm package** under `@codo-ai/cli` (or similar). Currently `private: true`, shipped only as a binary. Decide: gate it on a `dist-tag` like `beta` initially.

3. **Ship a public semver tag.** Right now all builds are `0.0.0-sec-test-<timestamp>`. Cut a `1.0.0-sec-test.0` or `1.0.0-beta.0`, tag it, and produce release notes that explicitly name what's COdo-only.

### Phase C — Identity-deepening refactors (1-2 weeks, optional but recommended)

1. **Vendor or rewrite the package paths.** `packages/codo/...` is the home, but internal imports still reference `@codo-ai/core`, `@codo-ai/llm`, etc. That's fine — the point isn't to rename every import, it's to make sure **no runtime code calls anything that reads `~/.opencode` or `~/.config/opencode`** unless it's an intentional migration shim.

2. **Pull out any dead upstream code.** If `.codo/gsd/` references, marketplace integrations, or plugin loaders still initialize OpenCode-specific behavior, drop what's not used. The goal isn't purity; it's that a new contributor can read the tree without learning OpenCode conventions that don't apply.

3. **Decouple the prompt library.** Prompts live in `packages/codo/src/agent/prompt/`. Make sure the directory has no `opencode-*.txt` legacy content — replace with `codo-*.txt` prompts that describe COdo's actual behavior (sec-test, compose, etc.). Prompt content is product identity in agent systems.

### Phase D — Community + discoverability (weeks-to-months, ongoing)

1. **GitHub issues:** enable the issue tracker on the repo with a roadmap label `not-a-fork`. Reference the breaking-change blog post.

2. **A "what changed" migration doc** for any existing OpenCode user who lands here. Table format: opencode command → codo command → notes on difference. Put it at `docs/MIGRATION.md`.

3. **A "contribution story."** Right now contributors would have to read opencode's contribution model. COdo needs its own `CONTRIBUTING.md` describing how to add a persona, a skill, or a security finding shape — *not* "see opencode's guide."

4. **Publish the sec-test architecture docs (01/02/03)** to a docs site or GitHub Pages. The three files exist on the branch; make them linkable from a public URL so they become findable by search engines.

---

## What stays the same (call this out explicitly)

- COdo stays **source-available** (MIT license) — not pretending to be proprietary.
- The codebase remains **API-compatible with upstream's session model** (SessionV2) for the near term — that's a feature, not a bug, since it makes migration cheap.
- We **attribute** OpenCode where lineage exists. "Not a fork" means "we're not a downstream," not "we invented everything."

---

## Success metrics to check before merging Phase A

After Phase A lands, these should be true:

```bash
# No opencode string anywhere user-facing:
grep -ril "opencode" packages/codo/ docs/ install github/ README.md .github/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=out/ \
  | grep -vE "NOTICE|MIGRATION|CHANGELOG" \
  | wc -l   # → 0

# Public semver tag exists:
git tag -l "v1.0.0*"
git describe --tags

# Binary self-identifies as codo (not sec-test):
./dist/codo-windows-x64/bin/codo.exe --version   # → 1.0.0
```

---

## Immediate next 5 commits (ready to land on sec-test)

1. `chore(codo): sweep remaining opencode strings, add NOTICES file`
2. `docs(codo): not-a-fork statement in README + MIGRATION.md`
3. `feat(codo): default new installs to sec-test workflow`
4. `chore(codo): prepare publish.ts for npm dist-tag @codo-ai/cli@beta`
5. `chore(codo): tag v1.0.0-sec-test.0 + release notes`

After those five, run the grep + tag + smoke-test checklist above. If all three pass ebook COdo is standing on its own name.

---

## Phase E — Visual identity (UI/UX)

COdo is currently mechanically distinct (different banner, different themes, different agent model) but *visually identical* to a casual observer. Someone opening the TUI sees: left-status bar with model name, center composer, tabbed session list, hover/click assistant cards in dim green + purple. That's OpenCode's signature layout. The colors are different but the grammar is not.

### What's currently making it look like a fork

| Surface | Current state | Why it reads "OpenCode" |
|---|---|---|
| ASCII banner | Custom COdo art (good) | Actually fine — this is your identity |
| Status bar (bottom-left) | Same tabbed layout, same color logic, same "subagents / tab agents" affordance | OpenCode's signature arrangement |
| Composer (center) | Same shape — bordered box, model name + provider in bottom-right | Direct imitation of OpenCode's layout |
| Session list (Tab) | Same hierarchy: primary_item → slug → secondary_items | OpenCode |
| Message rendering | Same role-colored borders (primary/secondary) with left rule | OpenCode convention |
| Theme panel | cobalt2 / gruvbox / etc. — all OpenCode defaults | Whole bundle is inherited |
| Icons | Same set from `@codo-ai/ui`, which is repackaged OpenCode UI | Literally the same icons |
| Web app | Same layout / side-nav | Upstream's pages |

### Changes, in rough priority order

#### 1. The session list and tab bar (highest ROI)

This is the surface a user sees most. OpenCode's: tabs as pills at the top, current tab highlighted, sub-tabs in a rail below. COdo's could be:

- **Persona-grouped list** — instead of `[Chat] [Chat] [Chat]`, group by agent (`compose`, `sec-test`, `build`, `plan`). Each persona gets a colored chip. Your per-persona accent color work becomes load-bearing instead of decorative.
- **Left sidebar with phases** — GSD-style: DISCUSS / PLAN / EXECUTE / VERIFY / COMPLETE pinned columns or sections. OpenCode doesn't have anything like it.
- **Rename "chat" to "workflow"** — the noun itself signals a different product.

#### 2. The composer (user input)

Currently a rounded rectangle with a single line. Two changes that would feel distinct:

- **Multi-surface hint chips above the input.** Instead of OpenCode's `tab` for agents, `ctrl+p` for commands: `[plan] [audit] [pentest] [report]` as clickable/tappable chips that summon the right persona. Uses your persona color from earlier today.
- **Persona indicator as a colored strip down the left side of the composer.** Right now it just shows the model+provider bottom-right of the input. Add a left-edge color bar that matches the currently-active persona — instantly visible even when scrolled.

#### 3. The message stream

OpenCode renders tool calls as bordered cards with hover states. COdo could:

- **Subagent dispatches as tree rows** — when `@sec-appsec` runs, render it as an indented tree under the parent's message, not as a card equivalent. Currently blends in.
- **Persona cards instead of tool cards.** A sec-test finding should render *as a finding* (severity color, location, remediation), not as a generic tool result. The whole sec-test flow works much better visually if findings are visually distinct from "the debug tool ran".

#### 4. Icons + theme

- **Own icons.** The current icon set is `@codo-ai/ui` which is repackaged. If you can't hire an icon designer, at minimum swap the tool-call icons to something text-based (Unicode symbols: ⚡ 🛡 🔍 📋 📊) which instantly differentiates from OpenCode's line-art iconography. Pick 10 and stick with them.
- **Fewer, opinionated themes.** OpenCode ships 12+ themes. COdo should ship three: COdo Dark, COdo Light, and one accessibility-focused theme. Cobalt2 etc. carry the upstream identity.

#### 5. The web app (most important for SEO/market)

If anyone Googles COdo and finds the web UI, the layout needs to be different from app.opencode.ai. Same left-rail + center composer + right-drawer layout is a dead giveaway.

- **Rename the routes:** `/session/:id/` becomes `/workflow/:id/` — even if the underlying code is the same, the URL and breadcrumb text differentiate.
- **Left rail shows personas, not just history.** Instead of "Recent sessions", show "Recent workflows" with persona grouping. A user should recognize "this product has personas" from the first screenshot.

### What NOT to change

Don't rewrite the underlying opentui/solid renderer, the keyboard navigation model, or the command palette logic. Those are invisible to the eye and very hard to differentiate. The effort-to-differentiation ratio is bad.

### Smallest sufficient set

If you want minimum viable "doesn't look like a fork":

1. Persona-colored composer left-edge strip (one CSS rule against the persona's `color` field)
2. Session list grouping by agent name with colored chips
3. Persona cards for subagent dispatches instead of generic tool cards
4. Three COdo-native themes, drop the upstream ones (or rename them out from under Cobalt2 etc.)
5. Web: rename `/session/` to `/workflow/` and the left rail to "Workflows / Agents"

That's roughly a focused week of frontend work, mostly in `packages/tui` + `packages/app`. It's enough that a screenshot of COdo no longer looks like "OpenCode with a green/violet palette."

The sec-test + compose agent system is already a real differentiator — the UI just doesn't say so yet. Making the UI reflect the persona model is the highest-leverage design statement available.
