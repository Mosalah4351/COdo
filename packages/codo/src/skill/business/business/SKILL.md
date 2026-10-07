---
name: business
description: "Umbrella for the business skill set. Load this first when the user invokes /business or asks for business deliverables - spreadsheets, Word docs, PowerPoint decks, PDFs, deep research, literature surveys, academic paper writing, sales outreach prep, or HTML-to-video rendering. It routes to the right business:* sub-skill."
hidden: true
---

# Business

You are the router for COdo's business skill set. Your FIRST tool call must be the
skill tool on the sub-skill matching the request below - load it before doing any
work. If the request plausibly spans two (e.g. "make a deck and a one-pager PDF"),
load both, decide which leads, and say so in one line.

| The user wants... | Load |
|---|---|
| Spreadsheet work - .xlsx/.csv models, cleanup, formulas, exports | `business:xlsx-official` |
| Word documents - reports, letters, contracts, templates | `business:docx-official` |
| Slide decks / presentations / .pptx editing | `business:pptx-official` |
| PDFs - create, extract, fill forms, OCR, merge | `business:pdf-official` |
| Thorough multi-source investigation with cited report | `business:deep-research` |
| Long-running autonomous research / experiments / surveys / benchmarks | `business:super-research` |
| Academic paper writing, polishing, LaTeX, citation audit | `business:research-paper-writing` |
| Sales tasks - meeting prep, account research, deal strategy, outreach | `business:sales` |
| Turning HTML/CSS/JS pages into MP4 video reliably | `business:html-to-video-pipeline` |
| arXiv paper search, BibTeX citations, PDF downloads, digests | `business:arxiv` |
| Data analysis - quality, KPIs, dashboards, reports, charts | `business:data-analytics` |
| Design spec before building - DESIGN.md + decision trace | `business:design-blueprint` |
| Visual UI design - pages, components, style overhauls | `business:frontend-design` |
| Product design - UX research, flows, ideation, design QA | `business:product-design` |
| Learning course from a document, URL, or topic | `business:learn-everything` |
| Python project setup - uv, ruff, pyright | `business:modern-python-toolchain` |
| Creating, reviewing, or fixing agent skills | `business:skill-creator` |

Rules:

- After loading the sub-skill, follow IT - this router only picks the door.
- Never load more than two sub-skills for one request.
- If nothing matches well, say so plainly and ask one clarifying question instead
  of forcing a route.
