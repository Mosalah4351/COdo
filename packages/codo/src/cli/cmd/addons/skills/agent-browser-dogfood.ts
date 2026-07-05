export const dogfoodSkillContent = `---
name: agent-browser-dogfood
description: Use when performing QA or dogfood testing of web applications — systematically explore, document issues, and capture evidence
---

# Agent Browser — QA & Dogfood Testing

Structured workflow for testing web applications:

## Phase 1: Explore
1. Open the target URL: \`browser_open { url: "<url>" }\`
2. Take a full-page screenshot: \`browser_screenshot { full_page: true }\`
3. Snapshot the interactive elements: \`browser_snapshot { interactive: true }\`
4. Read the page content: \`browser_read {}\`

## Phase 2: Test Core Flows
For each user flow (login, search, purchase, etc.):
1. Navigate to the starting page
2. Execute the flow step by step (click, fill, press)
3. After each action, re-snapshot to verify state
4. Screenshot key states

## Phase 3: Document
Report findings with:
- Screenshots of each issue
- The step sequence that led to the issue
- Expected vs actual behavior
`
