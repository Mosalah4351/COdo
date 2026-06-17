---
name: compose:plan
hidden: true
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the compose:plan skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `compose:worktree` skill at execution time.

**Save plans to:** `docs/compose/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces.
- Each file should have one clear responsibility.
- Files that change together should live together.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Covers:** [S3, S7]
<!-- spec section anchors this task implements -->

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code)
- Steps that describe what to do without showing how (code blocks required for code steps)

## Remember
- Exact file paths always
- Complete code in every step
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it.

**1. Spec coverage:** Skim each `[Sn]` section in the spec. Can you point to a task whose **Covers:** lists it? Every spec section must be covered by at least one task.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks?

If you find issues, fix them inline.

## Execution Handoff

After saving the plan, determine execution approach:

1. **Check memory** for a saved `execution-style` preference. If found (`subagent` or `inline`), use it.

2. **If no saved preference,** ask through `compose:ask`:
   - header: `Execution`
   - question: `Plan saved. How would you like to execute it?`
   - options:
     - label: `Subagent, always`, description: `Fresh subagent per task — remember for future sessions`
     - label: `Subagent, this time`, description: `Fresh subagent per task — just this once`
     - label: `Inline, always`, description: `Execute in this session — remember for future sessions`
     - label: `Inline, this time`, description: `Execute in this session — just this once`

   If no user is available, default to Inline for ≤ 3 tasks or tightly coupled tasks, Subagent for > 3 independent tasks.

**If Subagent:** Use compose:subagent — fresh subagent per task + two-stage review.

**If Inline:** Use compose:execute — batch execution with checkpoints
