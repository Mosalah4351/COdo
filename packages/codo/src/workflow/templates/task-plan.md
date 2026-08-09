# {{taskId}}: {{taskTitle}}

**Slice:** {{sliceId}}: {{sliceTitle}}

**Step Summary:**

{{oneSentencPerStep}}

**Must-Haves:**

{{mustHaves}}

**Steps:**

<!-- Write steps as executable changes, not aspirations.
     Each step should be an atomic increment that leaves the codebase in a valid state. -->

1. {{stepDescription}}
2. {{stepDescription}}

**Verify:**

- {{verificationCommand}}
- {{verificationCommand}}

**Done When:**

- {{doneCondition}}
- {{doneCondition}}

## File Plan

### Inputs (Do Not Modify)

- `{{inputFile}}`

### Outputs

- `{{outputFile}}`

## Task Verification

<!-- Write a single executable verification command that checks every deliverable.
     Avoid multiple commands unless absolutely necessary.

     Good:
       `grep -q "AuthMiddleware" packages/core/src/handler.ts`

     Bad:
       `grep -q "AuthMiddleware" handler.ts && grep -q "export" types.ts && echo OK` -->

{{verificationCommand}}