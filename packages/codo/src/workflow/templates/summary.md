# {{sliceId}}: {{sliceTitle}} — Slice Summary

**Milestone:** {{milestoneId}}
**Written:** {{date}}
**Status:** completed | failed

## What Shipped

{{oneLiner}}

## Tasks Completed

| ID | Title | Verify Command | Verdict | Output |
|----|-------|---------------|---------|--------|
{{#each tasks}}
| {{id}} | {{title}} | `{{verify}}` | {{verdict}} | {{output}} |
{{/each}}

## Verification Evidence

| Gate | Scope | Verdict | Key Evidence |
|------|-------|---------|--------------|
| {{gateId}} | {{scope}} | {{verdict}} | {{evidenceSummary}} |

## Requirements Touched

| ID | Status Change | Proof |
|----|---------------|-------|
| {{requirementId}} | {{from}} → {{to}} | {{proof}} |

## Decisions Revisited

| ID | Status | Outcome |
|----|--------|---------|
| {{decisionId}} | {{status}} | {{outcome}} |

## Lessons Learned

{{lesson}}

## Dependency Intelligence

<!-- For downstream slices: what did this slice discover that they should know? -->

- {{finding}}
- {{finding}}

## Files Touched

### Inputs (Read-Only)

{{#each readOnlyFiles}}
- `{{this}}`
{{/each}}

### Modified

{{#each modifiedFiles}}
- `{{this}}`
{{/each}}

### Created

{{#each createdFiles}}
- `{{this}}`
{{/each}}

## Remaining Work

- {{remainingWork}}

## Blockers Discovered

- {{blockerOr none}}