---
name: compose:report
hidden: true
description: "Use after implementation is verified and before merge — consolidates multiple spec iterations into a single final-state report, marks related specs, and records key lessons"
---

# Writing Final Reports

## Overview

Consolidate a feature's spec history into a single human-readable final report. The report presents the final implemented state as its primary content — what WAS BUILT, not what was tried. A brief Journey Log at the end captures notable failures and pivots for future designers.

**Core principle:** Final state first. The reader should understand the feature from this report alone, without reading any spec.

**Announce at start:** "I'm using the report skill to write the final report for this feature."

**Save reports to:** `docs/compose/reports/<feature-name>.md`
- No date in filename — the report is overwritten in place when the feature evolves
- Git history tracks revisions

## Update Semantics

Specs are **accumulative** (new file per iteration). Final reports are **overwrite** (same file updated in place):
- If a report already exists for this feature, read it first, then overwrite with updated content
- Append new Journey Log entries from this iteration (don't discard previous entries)

## When to Use

Standard step after implementation is complete and verified — write a final report summarizing what was delivered.

**Skip when:**
- User explicitly asks to skip the report
- Change is trivially small (single bug fix, typo, config tweak) and not worth documenting

## Checklist

1. **Identify all related specs and plans** — find every iteration of this feature's design
2. **Read the implemented code** — understand what actually shipped (code is truth, not specs)
3. **Draft main sections** — What Was Built, Architecture, Usage, Verification
4. **Draft Journey Log** — brief flat bullet list, max 5 items
5. **Assemble report** — combine sections, add frontmatter, save to reports/
6. **Self-review** — verify report against code (not specs), check for placeholders
7. **Mark specs and plans** — prepend NOTE header to each spec and plan file
8. **Commit and transition** — commit report + markers, invoke compose:merge

## Report Document Structure

Every report MUST use this structure:

```markdown
---
feature: <feature-name>
status: delivered
specs:
  - docs/compose/specs/<spec-1>.md
  - docs/compose/specs/<spec-2>.md
plans:
  - docs/compose/plans/<plan>.md
branch: <branch-name>
commits: <first-sha>..<last-sha>
---

# [Feature Name] — Final Report

## What Was Built

[1-3 paragraph executive summary. What does the feature do? What problem
does it solve? Written for first contact — no "v1 tried X" narrative.]

## Architecture

[Final architecture as implemented. Components, boundaries, data flow,
key interfaces. Self-contained — reader needs no spec file.]

### Design Decisions

[Important choices and rationale. Frame as "we chose X because Y" —
never "we tried A, then B, then settled on X".]

## Usage

[How to use/configure/interact. Commands, config options, API surface.
Concrete examples.]

## Verification

[How the feature was verified. Test summary, manual testing, edge cases.]

## Journey Log

> Brief notes on what informed the final design. Not required reading.

- [dead end] Tried X — failed because Y
- [pivot] Switched from A to B after discovering C
- [lesson] Transferable insight here

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `path/to/spec-1.md` | Initial design | See §3 for context on constraint X |
| `path/to/spec-2.md` | Revised after Y | Superseded by this report |
| `path/to/plan.md` | Implementation plan | Complete |
```

## Marking Specs and Plans

For each file listed in `specs` and `plans`, insert this NOTE block between the document title (H1) and the rest of the content:

```markdown
> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state: `docs/compose/reports/<feature-name>.md`
```

## Self-Review

1. **Report vs code:** Does the "What Was Built" section match what's actually in the codebase? Remove anything that wasn't shipped.
2. **Placeholder scan:** Any "TBD", "TODO", or incomplete sections? Fix them.
3. **Length check:** Is the report proportional to feature complexity? A simple bug fix shouldn't have a 5-page report.

## Transition

After committing the report and markers, invoke `compose:merge` to complete the development branch.
