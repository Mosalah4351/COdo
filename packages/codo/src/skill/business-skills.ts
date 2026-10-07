import ArxivContent from "./business/arxiv/SKILL.md" with { type: "text" }
import BusinessContent from "./business/business/SKILL.md" with { type: "text" }
import DataAnalyticsContent from "./business/data-analytics/SKILL.md" with { type: "text" }
import DeepResearchContent from "./business/deep-research/SKILL.md" with { type: "text" }
import DesignBlueprintContent from "./business/design-blueprint/SKILL.md" with { type: "text" }
import DocxOfficialContent from "./business/docx-official/SKILL.md" with { type: "text" }
import FrontendDesignContent from "./business/frontend-design/SKILL.md" with { type: "text" }
import HtmlToVideoPipelineContent from "./business/html-to-video-pipeline/SKILL.md" with { type: "text" }
import LearnEverythingContent from "./business/learn-everything/SKILL.md" with { type: "text" }
import ModernPythonToolchainContent from "./business/modern-python-toolchain/SKILL.md" with { type: "text" }
import PdfOfficialContent from "./business/pdf-official/SKILL.md" with { type: "text" }
import PptxOfficialContent from "./business/pptx-official/SKILL.md" with { type: "text" }
import ProductDesignContent from "./business/product-design/SKILL.md" with { type: "text" }
import ResearchPaperWritingContent from "./business/research-paper-writing/SKILL.md" with { type: "text" }
import SalesContent from "./business/sales/SKILL.md" with { type: "text" }
import SkillCreatorContent from "./business/skill-creator/SKILL.md" with { type: "text" }
import SuperResearchContent from "./business/super-research/SKILL.md" with { type: "text" }
import XlsxOfficialContent from "./business/xlsx-official/SKILL.md" with { type: "text" }

export interface BusinessSkill {
  dir: string
  name: string
  description: string
  content: string
}

export const businessSkills: BusinessSkill[] = [
  {
    dir: "business",
    name: "business",
    description: "Umbrella for the business skill set. Load this first when the user invokes /business or asks for business deliverables - spreadsheets, Word docs, PowerPoint decks, PDFs, deep research, literature surveys, academic paper writing, sales outreach prep, or HTML-to-video rendering. It routes to the right business:* sub-skill.",
    content: BusinessContent,
  },
  {
    dir: "arxiv",
    name: "business:arxiv",
    description: "Use this skill whenever the user wants to find, read, cite, track, download, or analyze academic papers on arXiv. That includes: searching papers by topic, author, category, or arXiv ID; fetching abstracts or full metadata; generating BibTeX citations; downloading PDFs; listing the latest submissions in a field (e.g. cs.AI daily digest); checking a paper's citation impact; finding who cites a paper, what it references, or related-paper recommendations. Trigger on mentions of 'arXiv', an arXiv ID (e.g. 2601.02780 or hep-th/0601001), an arxiv.org URL, 'paper search', 'literature review', 'find papers about X', 'cite this paper', or 'what's new in cs.LG'.",
    content: ArxivContent,
  },
  {
    dir: "data-analytics",
    name: "business:data-analytics",
    description: "Use this skill for quantitative product or business analysis: data quality checks, metric diagnostics, KPI design and reporting, dashboards, analytical reports, charts, notebooks, market sizing, semantic layers, and evidence-backed recommendations. Also use it whenever Data Analytics is explicitly invoked.",
    content: DataAnalyticsContent,
  },
  {
    dir: "deep-research",
    name: "business:deep-research",
    description: "Deep research on any topic using parallel sub-agents and built-in tools only (WebSearch/WebFetch + free APIs, no keys). Use when the user asks for a thorough multi-source investigation with a cited report — \"深度调研X\"、\"deep research\"、\"帮我全面研究一下\"、\"多方求证\"、\"写一份调研报告\". NOT for simple lookups (single WebSearch suffices) and NOT for academic literature surveys (use auto-research skill instead).",
    content: DeepResearchContent,
  },
  {
    dir: "design-blueprint",
    name: "business:design-blueprint",
    description: "Produces a structured design specification (DESIGN.md + structural layout + Decision Trace) before any visual artifact is built - the \"blueprint\" phase that keeps AI-generated design from feeling templated. Use this skill whenever the user asks to design, plan, mock up, or restructure any visual output - PPT / slides / decks, landing pages, dashboards, posters, charts, infographics, marketing pages, UI components, prototypes, illustrations - even when they only say \"make a slide about X\" or \"help me put together a page for Y\". Also trigger on requests to critique or improve an existing design when the user wants a principled, spec-driven pass rather than just cosmetic tweaks. Do NOT trigger when the user has already handed you a completed DESIGN.md and only wants code implementation (defer to frontend-design or implement directly).",
    content: DesignBlueprintContent,
  },
  {
    dir: "docx-official",
    name: "business:docx-official",
    description: "Use this skill whenever a Microsoft Word (.docx) file is being produced, opened, transformed, or read. That includes: drafting reports, letters, contracts, RFPs, technical documents, or any long-form written deliverable; extracting text or structure from an existing Word file; filling a Word template with values; converting Word to PDF or plain text; splitting or merging documents; inspecting styles, headings, sections, tables, images, comments, or tracked changes. Trigger on mentions of 'Word doc', 'DOCX', 'Office document', a filename ending in .docx, or requests like 'turn this into a Word report'.",
    content: DocxOfficialContent,
  },
  {
    dir: "frontend-design",
    name: "business:frontend-design",
    description: "Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Use whenever the task produces or modifies anything a user will see rendered - websites, landing pages, web apps, dashboards, React/HTML/Vue components, artifacts with visual output, style overhauls, or \"make this look better\" requests - even if the user never says the word \"design\". Covers aesthetic direction, typography, environment constraints (fonts, Tailwind, assets), and when to converge on convention instead of chasing distinctiveness.",
    content: FrontendDesignContent,
  },
  {
    dir: "html-to-video-pipeline",
    name: "business:html-to-video-pipeline",
    description: "Reliable HTML-to-MP4 rendering via headless browser recording (Playwright/Puppeteer) + ffmpeg — the ordering, gotchas, and verification steps you MUST get right or the output silently rots. Trigger whenever the user is building or debugging any pipeline that turns an HTML/CSS/JS page (single-file, multi-composition, GSAP-driven, or `@keyframes`-driven) into a video file, including headless recording, screen capture of a web page, deterministic frame-by-frame capture, multi-scene concatenation, or engine-mixed video output. Also trigger when the symptom sounds like: font swap flashing in the opening frames (FOUT), the first few seconds of the video are frozen/dead, animations play during page load and get truncated, concatenated segments produce a video whose duration is wildly wrong (e.g., 8s becomes 35s), `file://` loaded HTML fails to fetch its sub-scenes, the exported video is soft/blurry compared to the browser, or playback stutters/looks choppy despite passing a high `-r` fps to ffmpeg. Use even for one-off scripts — the failure modes here are subtle enough that starting from scratch usually reintroduces them.",
    content: HtmlToVideoPipelineContent,
  },
  {
    dir: "learn-everything",
    name: "business:learn-everything",
    description: "Turn an uploaded PDF, paper, book chapter, document, URL, or user-provided topic into a structured, interactive learning course. Use when the user wants to learn, study, understand, master, review, or practice a subject chapter by chapter; asks for a tutorial or curriculum from source material; wants exercises, quizzes, answer grading, hints, spaced review, or a final assessment; or says \"teach me this\", \"learn this PDF\", \"?????\", \"???\", or similar; or returns to continue a previous course (\"continue my course\", \"?????\") or supplies a saved course-state file or state block. Adapt explanations and practice to the learner's level, preserve page or section references for documents, and teach incrementally rather than dumping all content at once.",
    content: LearnEverythingContent,
  },
  {
    dir: "modern-python-toolchain",
    name: "business:modern-python-toolchain",
    description: "Modern Python project setup with uv, ruff, and pyright. Use when initializing a new Python project, configuring the Python environment, setting up linting/formatting, or when a project needs uv (the fast Python package manager). Trigger on: 'set up Python', 'new Python project', 'configure uv', 'install uv', 'ruff', 'pyright', 'Python linting', 'Python formatting', or when a task requires Python and no pyproject.toml exists yet.",
    content: ModernPythonToolchainContent,
  },
  {
    dir: "pdf-official",
    name: "business:pdf-official",
    description: "Use this skill whenever a PDF file is being produced, opened, transformed, filled, or read. That includes: extracting text or tables from an existing PDF; combining, carving, rotating, cropping, or watermarking pages; composing a fresh PDF (report, invoice, certificate); filling AcroForm fields or overlaying text onto a non-fillable scanned form; encrypting or unlocking a PDF; running OCR over a scanned document; rendering pages to PNG/JPEG for visual analysis. Trigger on mentions of 'PDF', a filename ending in .pdf, requests like 'turn this into a PDF report', or references to AcroForm / form fields.",
    content: PdfOfficialContent,
  },
  {
    dir: "pptx-official",
    name: "business:pptx-official",
    description: "Use this skill whenever a Microsoft PowerPoint (.pptx) file is being produced, opened, transformed, or read. That includes: authoring slide decks, pitch decks, executive readouts, training material, or any presentation deliverable; extracting text or structure from an existing .pptx; filling a .pptx template with values; converting a deck to PDF or images; splitting or merging decks; inspecting slides, layouts, masters, tables, images, charts, speaker notes, or comments. Trigger on words like 'deck', 'slides', 'presentation', 'pitch deck', 'keynote' (when a .pptx is expected as output), or any filename ending in .pptx. Do NOT trigger when the primary deliverable is a Word document, spreadsheet, PDF report, HTML site, or Google Slides API call, even if presentation-shaped content appears along the way.",
    content: PptxOfficialContent,
  },
  {
    dir: "product-design",
    name: "business:product-design",
    description: "Use this skill when Product Design is explicitly invoked or the main task is product design exploration, UX research, flow auditing or critique, visual ideation, cloning a live product surface, implementing a selected visual target, design QA, saved design context, or sharing a prototype.",
    content: ProductDesignContent,
  },
  {
    dir: "research-paper-writing",
    name: "business:research-paper-writing",
    description: "Write, rewrite, and polish academic papers (ML/CV/NLP style). Use when the user drafts or revises Abstract, Introduction, Related Work, Method, Experiments, or Conclusion; asks \"does this flow / 这段通顺吗 / polish this paragraph\"; turns bullet points or a Chinese draft into publication-quality English; runs a pre-submission self-review or reviewer-style critique; fixes paper figures/tables/LaTeX formatting; or compiles/converts the paper to PDF (LaTeX build, 编译PDF, 转成PDF). Trigger on mentions of paper, draft, camera-ready, rebuttal-facing revision, CVPR/ICCV/NeurIPS/ICLR/ACL-style venues, or .tex files being edited for a paper.",
    content: ResearchPaperWritingContent,
  },
  {
    dir: "sales",
    name: "business:sales",
    description: "Use this skill whenever Sales is explicitly invoked or the task involves customer meeting preparation, call follow-up, account prioritization, account signals, deal strategy, business cases, competitive briefs, forecasts, customer evidence, rep coaching, company research, CRM context, or company and contact enrichment.",
    content: SalesContent,
  },
  {
    dir: "skill-creator",
    name: "business:skill-creator",
    description: "Interactive guide for creating, reviewing, and improving agent skills (SKILL.md folders). Use when the user wants to build a new skill ('create a skill', 'make a skill for X', 'write a SKILL.md', 'turn this workflow into a skill'), review or improve an existing skill, fix a skill that never triggers or triggers too often, or validate a skill folder before sharing it. Do NOT use for general prompt writing, MCP server development, or editing arbitrary markdown files.",
    content: SkillCreatorContent,
  },
  {
    dir: "super-research",
    name: "business:super-research",
    description: "Autonomous research skill for open-ended, high-volume research work — an agent left running for a while (minutes to overnight) that produces honest, comparable, auditable evidence instead of a single one-shot answer. Covers eight modes selected by the request: (1) experiment loop — iteratively edit code, run, measure a metric, keep or revert (baseline → hypothesize → run → keep/revert loop; use for \"optimize X\", \"tune hyperparameters\", \"run experiments overnight\", \"autonomously improve this model\", \"hill-climb a metric\", \"自动实验\"); (2) topic survey / 主题调研 — collect and synthesize sources on a question (use for \"survey the literature on X\", \"research topic Y\", \"调研 Z\", \"literature review\", \"deep research\", \"what's the state of the art in\", \"gather evidence about\"); (3) quantitative analysis / 量化分析 — reproducible, hypothesis-first data analysis with schema audit, effect sizes, and caveats (use for \"analyze this dataset\", \"量化分析\", \"test whether X correlates with Y\", \"compute the effect of\", \"investigate this data\"); (4) benchmark comparison / 对比评测 — pick among N candidates under a fair, fixed matrix (use for \"compare X vs Y\", \"which library/model/prompt is best for us\", \"benchmark these options\", \"选型\", \"对比评测\"); (5) root-cause investigation / 根因排查 — hypothesis-driven, two-way-reversal debugging of regressions, flakes, and perf drops (use for \"why is X broken\", \"root cause this\", \"debug the regression\", \"why is it flaky\", \"排查\", \"定位\", \"复盘\"); (6) ablation study / 消融实验 — leave-one-out attribution of a system's components against a measured noise floor (use for \"ablate X\", \"which parts of Y matter\", \"attribution study\", \"消融实验\", \"is component Z pulling its weight\"); (7) paper reproduction / 复现论文 — implement a paper's method as a working repo with logged ambiguities (use for \"复现这篇论文\", \"paper to code\", \"implement this method\", \"reproduce the main table of X\"); (8) paper writing + citation audit / 写论文 & 引用校验 — draft or polish an academic paper and verify every citation against real API records (use for \"write a paper on X\", \"polish this draft\", \"查引用\", \"citation check\", \"校验引用\", \"detect fabricated references\"). Ships with a zero-external-dependency toolbox (built-in tools + free scholarly APIs — arXiv, Semantic Scholar, OpenAlex, Crossref — no API keys). Trigger this skill whenever the user wants research work with volume + discipline — even without the words \"research\" or \"experiment\" — and pick the mode from the request.",
    content: SuperResearchContent,
  },
  {
    dir: "xlsx-official",
    name: "business:xlsx-official",
    description: "Spreadsheet toolkit. Reach for it whenever the artifact on either side of the conversation is a workbook file — .xlsx, .xlsm, .xltx, .csv, .tsv — and the user wants that artifact produced, changed, cleaned, or read. Typical triggers: 'build me a model', 'update this sheet', 'add a column', 'compute the totals as formulas', 'sanity-check this xlsx', 'export sheet 2 to CSV', 'render the workbook as PDF', 'the spreadsheet in ~/Downloads is a mess, fix it'. Applies equally to financial models, ops reports, data cleanups, and template fills. Skip it when the workbook is only source material and the real output is a Word doc, an HTML page, a Python script that runs standalone, a Google Sheets integration, or an ingestion pipeline into a database — in those cases the spreadsheet is a means, not the deliverable.",
    content: XlsxOfficialContent,
  },
]

export const BUSINESS_SKILL_NAMES = new Set(businessSkills.map((s) => s.name))
