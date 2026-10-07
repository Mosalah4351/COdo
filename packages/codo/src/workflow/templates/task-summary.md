# {{taskId}}: {{taskTitle}} — Task Summary

**Slice:** {{sliceId}}
**Written:** {{date}}
**Status:** completed | failed

## What Shipped

{{oneLiner}}

## Verification Evidence

| Command | Verdict | Output |
|---------|---------|--------|
| `{{command}}` | {{verdict}} | {{output}} |

## Files Touched

### Modified

{{#each modifiedFiles}}
- `{{this}}`
{{/each}}

### Created

{{#each createdFiles}}
- `{{this}}`
{{/each}}

## Blockers Discovered

- {{blockerOr none}}

## Follow-Up Work

- {{followUpOr none}}