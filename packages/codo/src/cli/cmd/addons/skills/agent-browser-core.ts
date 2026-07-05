// Bundled SKILL.md content for agent-browser core workflow
export const coreSkillContent = `---
name: agent-browser-core
description: Use when you need to control a web browser — navigate, click, fill forms, take screenshots, extract data, or test web applications
---

# Agent Browser — Core Workflow

agent-browser is a browser automation CLI. It uses a **snapshot-and-ref** pattern:

1. **Snapshot** the page to get an accessibility tree with element references
2. **Use refs** (@e1, @e2, ...) to interact with elements
3. **Re-snapshot** after every action that changes the page

## Basic Commands

- \`browser_open\` — Launch browser and navigate to a URL
- \`browser_snapshot\` — Get accessibility tree with interactive elements
- \`browser_click\` — Click an element by ref or CSS selector
- \`browser_fill\` — Clear and fill a form field
- \`browser_type\` — Type text into an element
- \`browser_press\` — Press a keyboard key
- \`browser_screenshot\` — Take a browser screenshot
- \`browser_read\` — Read page content as clean text
- \`browser_eval\` — Run JavaScript in the page context
- \`browser_wait\` — Wait for a condition (selector, text, load state)
- \`browser_get\` — Get page URL, title, or element attributes
- \`browser_close\` — Close the browser session
- \`browser_tab\` — Manage tabs (list, new, switch, close)

## Critical Rules

1. **Refs are per-snapshot.** Refs like @e1, @e2 are assigned fresh on every snapshot. They become stale the moment the page changes.
2. **Always snapshot before interaction.** Never guess refs from a previous snapshot if the page has changed.
3. **Use -i (interactive) for most tasks.** The interactive snapshot mode filters to clickable/focusable elements only.
4. **Fall back to CSS selectors** when refs are inconvenient (e.g., \`click { selector: "#submit-btn" }\`).
5. **Screenshot for visual verification.** After navigation or complex interactions, take a screenshot to confirm state.

## Typical Workflow

1. \`browser_open { url: "https://example.com" }\` — Open the page
2. \`browser_snapshot { interactive: true }\` — Get interactive elements
3. \`browser_click { ref: "@e3" }\` — Click a button/link
4. \`browser_snapshot { interactive: true }\` — Re-snapshot after navigation
5. \`browser_fill { ref: "@e5", value: "search query" }\` — Fill a form field
6. \`browser_press { key: "Enter" }\` — Submit form
7. \`browser_screenshot { full_page: true }\` — Capture the result
8. \`browser_read {}\` — Extract visible text content
`
