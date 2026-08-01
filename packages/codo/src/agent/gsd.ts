import type { Agent } from "./agent"
import { Permission } from "@/permission"
import type { ConfigPermissionV1 } from "@codo-ai/core/v1/config/permission"

import PROMPT_PLANNER from "./prompt/gsd-planner.txt"
import PROMPT_EXECUTOR from "./prompt/gsd-executor.txt"
import PROMPT_VERIFIER from "./prompt/gsd-verifier.txt"
import PROMPT_PHASE_RESEARCHER from "./prompt/gsd-phase-researcher.txt"
import PROMPT_PLAN_CHECKER from "./prompt/gsd-plan-checker.txt"
import PROMPT_CODEBASE_MAPPER from "./prompt/gsd-codebase-mapper.txt"
import PROMPT_DEBUGGER from "./prompt/gsd-debugger.txt"
import PROMPT_PROJECT_RESEARCHER from "./prompt/gsd-project-researcher.txt"
import PROMPT_RESEARCH_SYNTHESIZER from "./prompt/gsd-research-synthesizer.txt"
import PROMPT_DOMAIN_RESEARCHER from "./prompt/gsd-domain-researcher.txt"
import PROMPT_FRAMEWORK_SELECTOR from "./prompt/gsd-framework-selector.txt"
import PROMPT_AI_RESEARCHER from "./prompt/gsd-ai-researcher.txt"
import PROMPT_ADVISOR_RESEARCHER from "./prompt/gsd-advisor-researcher.txt"
import PROMPT_CODE_REVIEWER from "./prompt/gsd-code-reviewer.txt"
import PROMPT_SECURITY_AUDITOR from "./prompt/gsd-security-auditor.txt"
import PROMPT_INTEGRATION_CHECKER from "./prompt/gsd-integration-checker.txt"
import PROMPT_EVAL_AUDITOR from "./prompt/gsd-eval-auditor.txt"
import PROMPT_NYQUIST_AUDITOR from "./prompt/gsd-nyquist-auditor.txt"
import PROMPT_UI_AUDITOR from "./prompt/gsd-ui-auditor.txt"
import PROMPT_UI_CHECKER from "./prompt/gsd-ui-checker.txt"
import PROMPT_UI_RESEARCHER from "./prompt/gsd-ui-researcher.txt"
import PROMPT_ROADMAPPER from "./prompt/gsd-roadmapper.txt"
import PROMPT_ASSUMPTIONS_ANALYZER from "./prompt/gsd-assumptions-analyzer.txt"
import PROMPT_PATTERN_MAPPER from "./prompt/gsd-pattern-mapper.txt"
import PROMPT_EVAL_PLANNER from "./prompt/gsd-eval-planner.txt"
import PROMPT_DOC_WRITER from "./prompt/gsd-doc-writer.txt"
import PROMPT_DOC_VERIFIER from "./prompt/gsd-doc-verifier.txt"
import PROMPT_DOC_CLASSIFIER from "./prompt/gsd-doc-classifier.txt"
import PROMPT_DOC_SYNTHESIZER from "./prompt/gsd-doc-synthesizer.txt"

const taskDeny: ConfigPermissionV1.Info = { task: { "*": "deny" } }

const readPerm: ConfigPermissionV1.Info = {
  ...taskDeny,
  "*": "deny",
  read: "allow",
  bash: "allow",
  glob: "allow",
  grep: "allow",
}
const writePerm: ConfigPermissionV1.Info = { ...readPerm, write: "allow" }
const editPerm: ConfigPermissionV1.Info = { ...writePerm, edit: "allow" }
const readWeb: ConfigPermissionV1.Info = { ...readPerm, webfetch: "allow" }

interface GsdAgentSpec {
  name: string
  description: string
  color: string
  prompt: string
  permission: ConfigPermissionV1.Info
}

const specs: GsdAgentSpec[] = [
  // === CORE ===
  {
    name: "gsd-planner",
    description: "Create detailed execution plan (PLAN.md) from spec — numbered tasks, verification criteria, file paths.",
    color: "#008000",
    prompt: PROMPT_PLANNER,
    permission: { ...writePerm, question: "allow", todowrite: "allow" },
  },
  {
    name: "gsd-executor",
    description: "Execute plans in parallel waves — implements code, runs tools, commits changes.",
    color: "#FFFF00",
    prompt: PROMPT_EXECUTOR,
    permission: { ...editPerm, question: "allow", todowrite: "allow" },
  },
  {
    name: "gsd-verifier",
    description: "Validate built features through conversational UAT — checks implementation against acceptance criteria.",
    color: "#008000",
    prompt: PROMPT_VERIFIER,
    permission: { ...readPerm, question: "allow", webfetch: "allow" },
  },
  {
    name: "gsd-phase-researcher",
    description: "Research how to implement a phase before planning — gathers context, explores codebase, identifies patterns.",
    color: "#00FFFF",
    prompt: PROMPT_PHASE_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-plan-checker",
    description: "Verify phase plans for completeness, consistency, and correctness before execution.",
    color: "#008000",
    prompt: PROMPT_PLAN_CHECKER,
    permission: { ...readPerm, question: "allow" },
  },
  {
    name: "gsd-codebase-mapper",
    description: "Analyze codebase structure with parallel mapper agents — produces .planning/codebase/ documents.",
    color: "#00FFFF",
    prompt: PROMPT_CODEBASE_MAPPER,
    permission: { ...writePerm },
  },
  {
    name: "gsd-debugger",
    description: "Systematic debugging with persistent state across context resets — any bug, test failure, or unexpected behavior.",
    color: "#FFA500",
    prompt: PROMPT_DEBUGGER,
    permission: { ...editPerm, todowrite: "allow", question: "allow" },
  },

  // === RESEARCH ===
  {
    name: "gsd-project-researcher",
    description: "Deep project context research — analyzes codebase, docs, and architecture to gather comprehensive context.",
    color: "#00FFFF",
    prompt: PROMPT_PROJECT_RESEARCHER,
    permission: { ...writePerm, webfetch: "allow", question: "allow" },
  },
  {
    name: "gsd-research-synthesizer",
    description: "Synthesize multiple research outputs into coherent analysis and actionable recommendations.",
    color: "#800080",
    prompt: PROMPT_RESEARCH_SYNTHESIZER,
    permission: { ...writePerm },
  },
  {
    name: "gsd-domain-researcher",
    description: "Domain-specific research — investigates libraries, frameworks, APIs, and best practices.",
    color: "#A78BFA",
    prompt: PROMPT_DOMAIN_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-framework-selector",
    description: "Evaluate and recommend technology frameworks based on project requirements and constraints.",
    color: "#38BDF8",
    prompt: PROMPT_FRAMEWORK_SELECTOR,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-ai-researcher",
    description: "Research AI/ML approaches — frameworks, model selection, evaluation strategies, and best practices.",
    color: "#34D399",
    prompt: PROMPT_AI_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-advisor-researcher",
    description: "Gather context and explore options for technical decisions — lightweight research for planning.",
    color: "#00FFFF",
    prompt: PROMPT_ADVISOR_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
  },

  // === QUALITY / SECURITY ===
  {
    name: "gsd-code-reviewer",
    description: "Review source files for bugs, security issues, and code quality problems.",
    color: "#F59E0B",
    prompt: PROMPT_CODE_REVIEWER,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-security-auditor",
    description: "Retroactively verify threat mitigations for a completed phase — identifies security gaps.",
    color: "#EF4444",
    prompt: PROMPT_SECURITY_AUDITOR,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-integration-checker",
    description: "Verify integration points and cross-package compatibility across the project.",
    color: "#0000FF",
    prompt: PROMPT_INTEGRATION_CHECKER,
    permission: { ...readPerm },
  },
  {
    name: "gsd-eval-auditor",
    description: "Audit evaluation coverage for AI phases — produces EVAL-REVIEW.md remediation plan.",
    color: "#EF4444",
    prompt: PROMPT_EVAL_AUDITOR,
    permission: { ...writePerm, webfetch: "allow" },
  },
  {
    name: "gsd-nyquist-auditor",
    description: "Retroactively audit and fill Nyquist validation gaps for a completed phase.",
    color: "#8B5CF6",
    prompt: PROMPT_NYQUIST_AUDITOR,
    permission: { ...editPerm },
  },

  // === UI ===
  {
    name: "gsd-ui-auditor",
    description: "Six-pillar visual audit of implemented frontend code — design, accessibility, responsive, performance, etc.",
    color: "#F472B6",
    prompt: PROMPT_UI_AUDITOR,
    permission: { ...readPerm, webfetch: "allow" },
  },
  {
    name: "gsd-ui-checker",
    description: "Verify UI implementation against design specifications and UX requirements.",
    color: "#22D3EE",
    prompt: PROMPT_UI_CHECKER,
    permission: { ...readPerm },
  },
  {
    name: "gsd-ui-researcher",
    description: "Research UI patterns, component libraries, design systems, and UX best practices for implementation planning.",
    color: "#E879F9",
    prompt: PROMPT_UI_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
  },

  // === PLANNING / ANALYSIS ===
  {
    name: "gsd-roadmapper",
    description: "Create and maintain project ROADMAP.md — phases, milestones, dependencies, and timeline.",
    color: "#800080",
    prompt: PROMPT_ROADMAPPER,
    permission: { ...writePerm, question: "allow" },
  },
  {
    name: "gsd-assumptions-analyzer",
    description: "Surface and analyze hidden assumptions before planning — identifies risks and unknowns.",
    color: "#00FFFF",
    prompt: PROMPT_ASSUMPTIONS_ANALYZER,
    permission: { ...readPerm },
  },
  {
    name: "gsd-pattern-mapper",
    description: "Identify and document code patterns, architectural styles, and conventions across the codebase.",
    color: "#FF00FF",
    prompt: PROMPT_PATTERN_MAPPER,
    permission: { ...writePerm },
  },
  {
    name: "gsd-eval-planner",
    description: "Plan evaluation strategy for AI features — test design, metrics, and acceptance criteria.",
    color: "#F59E0B",
    prompt: PROMPT_EVAL_PLANNER,
    permission: { ...writePerm },
  },

  // === DOCS ===
  {
    name: "gsd-doc-writer",
    description: "Generate or update project documentation — API docs, guides, READMEs, and reference docs.",
    color: "#800080",
    prompt: PROMPT_DOC_WRITER,
    permission: { ...writePerm, webfetch: "allow" },
  },
  {
    name: "gsd-doc-verifier",
    description: "Verify documentation accuracy and completeness against the actual codebase implementation.",
    color: "#FFA500",
    prompt: PROMPT_DOC_VERIFIER,
    permission: { ...readPerm },
  },
  {
    name: "gsd-doc-classifier",
    description: "Classify and organize documentation by type, audience, and purpose — maintains doc structure.",
    color: "#FFFF00",
    prompt: PROMPT_DOC_CLASSIFIER,
    permission: { ...writePerm },
  },
  {
    name: "gsd-doc-synthesizer",
    description: "Synthesize multiple documentation sources into coherent, well-structured reference material.",
    color: "#FFA500",
    prompt: PROMPT_DOC_SYNTHESIZER,
    permission: { ...writePerm },
  },
]

export const GSD_AGENTS = specs.map((s) => ({
  name: s.name,
  description: s.description,
  color: s.color,
  options: {},
  permission: Permission.fromConfig(s.permission) as ReturnType<typeof Permission.fromConfig>,
  mode: "subagent" as const,
  native: true as const,
  workflow: "gsd" as const,
  prompt: s.prompt,
})) satisfies Agent.Info[]

export * as GSD from "./gsd"
