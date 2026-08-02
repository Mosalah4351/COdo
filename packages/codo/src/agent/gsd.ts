import type { Agent } from "./agent"
import { Permission } from "@/permission"
import type { ConfigPermissionV1 } from "@codo-ai/core/v1/config/permission"
import { Global } from "@codo-ai/core/global"
import path from "path"
import { existsSync } from "fs"

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
  /**
   * Workflow files (relative to the installed GSD tree's `workflows/`) that
   * govern this subagent's operating procedure — the same role the
   * opencode `<execution_context>` @-references play. The subagent is ordered
   * to read them before acting; compose also references the same files when it
   * orchestrates, so both sides agree on the process.
   */
  workflows: string[]
}

const specs: GsdAgentSpec[] = [
  // === CORE ===
  {
    name: "gsd-planner",
    description: "Create detailed execution plan (PLAN.md) from spec — numbered tasks, verification criteria, file paths.",
    color: "#008000",
    prompt: PROMPT_PLANNER,
    permission: { ...writePerm, question: "allow", todowrite: "allow" },
    workflows: ["plan-phase.md", "../references/planner-source-audit.md", "../references/planner-antipatterns.md"],
  },
  {
    name: "gsd-executor",
    description: "Execute plans in parallel waves — implements code, runs tools, commits changes.",
    color: "#FFFF00",
    prompt: PROMPT_EXECUTOR,
    permission: { ...editPerm, question: "allow", todowrite: "allow" },
    workflows: ["execute-phase.md", "../references/executor-examples.md", "../references/checkpoints.md"],
  },
  {
    name: "gsd-verifier",
    description: "Validate built features through conversational UAT — checks implementation against acceptance criteria.",
    color: "#008000",
    prompt: PROMPT_VERIFIER,
    permission: { ...readPerm, question: "allow", webfetch: "allow" },
    workflows: ["verify-work.md", "../references/gates.md"],
  },
  {
    name: "gsd-phase-researcher",
    description: "Research how to implement a phase before planning — gathers context, explores codebase, identifies patterns.",
    color: "#00FFFF",
    prompt: PROMPT_PHASE_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["research-phase.md"],
  },
  {
    name: "gsd-plan-checker",
    description: "Verify phase plans for completeness, consistency, and correctness before execution.",
    color: "#008000",
    prompt: PROMPT_PLAN_CHECKER,
    permission: { ...readPerm, question: "allow" },
    workflows: ["plan-phase.md", "../references/gates.md"],
  },
  {
    name: "gsd-codebase-mapper",
    description: "Analyze codebase structure with parallel mapper agents — produces .planning/codebase/ documents.",
    color: "#00FFFF",
    prompt: PROMPT_CODEBASE_MAPPER,
    permission: { ...writePerm },
    workflows: ["map-codebase.md", "../references/scout-codebase.md"],
  },
  {
    name: "gsd-debugger",
    description: "Systematic debugging with persistent state across context resets — any bug, test failure, or unexpected behavior.",
    color: "#FFA500",
    prompt: PROMPT_DEBUGGER,
    permission: { ...editPerm, todowrite: "allow", question: "allow" },
    workflows: ["../references/debugger-philosophy.md", "../references/common-bug-patterns.md"],
  },

  // === RESEARCH ===
  {
    name: "gsd-project-researcher",
    description: "Deep project context research — analyzes codebase, docs, and architecture to gather comprehensive context.",
    color: "#00FFFF",
    prompt: PROMPT_PROJECT_RESEARCHER,
    permission: { ...writePerm, webfetch: "allow", question: "allow" },
    workflows: ["new-project.md", "explore.md"],
  },
  {
    name: "gsd-research-synthesizer",
    description: "Synthesize multiple research outputs into coherent analysis and actionable recommendations.",
    color: "#800080",
    prompt: PROMPT_RESEARCH_SYNTHESIZER,
    permission: { ...writePerm },
    workflows: ["research-phase.md"],
  },
  {
    name: "gsd-domain-researcher",
    description: "Domain-specific research — investigates libraries, frameworks, APIs, and best practices.",
    color: "#A78BFA",
    prompt: PROMPT_DOMAIN_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["../references/domain-probes.md", "research-phase.md"],
  },
  {
    name: "gsd-framework-selector",
    description: "Evaluate and recommend technology frameworks based on project requirements and constraints.",
    color: "#38BDF8",
    prompt: PROMPT_FRAMEWORK_SELECTOR,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["../references/ai-frameworks.md"],
  },
  {
    name: "gsd-ai-researcher",
    description: "Research AI/ML approaches — frameworks, model selection, evaluation strategies, and best practices.",
    color: "#34D399",
    prompt: PROMPT_AI_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["../references/ai-evals.md", "../references/ai-frameworks.md"],
  },
  {
    name: "gsd-advisor-researcher",
    description: "Gather context and explore options for technical decisions — lightweight research for planning.",
    color: "#00FFFF",
    prompt: PROMPT_ADVISOR_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["discuss-phase.md"],
  },

  // === QUALITY / SECURITY ===
  {
    name: "gsd-code-reviewer",
    description: "Review source files for bugs, security issues, and code quality problems.",
    color: "#F59E0B",
    prompt: PROMPT_CODE_REVIEWER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["code-review.md"],
  },
  {
    name: "gsd-security-auditor",
    description: "Retroactively verify threat mitigations for a completed phase — identifies security gaps.",
    color: "#EF4444",
    prompt: PROMPT_SECURITY_AUDITOR,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["secure-phase.md"],
  },
  {
    name: "gsd-integration-checker",
    description: "Verify integration points and cross-package compatibility across the project.",
    color: "#0000FF",
    prompt: PROMPT_INTEGRATION_CHECKER,
    permission: { ...readPerm },
    workflows: ["validate-phase.md"],
  },
  {
    name: "gsd-eval-auditor",
    description: "Audit evaluation coverage for AI phases — produces EVAL-REVIEW.md remediation plan.",
    color: "#EF4444",
    prompt: PROMPT_EVAL_AUDITOR,
    permission: { ...writePerm, webfetch: "allow" },
    workflows: ["eval-review.md"],
  },
  {
    name: "gsd-nyquist-auditor",
    description: "Retroactively audit and fill Nyquist validation gaps for a completed phase.",
    color: "#8B5CF6",
    prompt: PROMPT_NYQUIST_AUDITOR,
    permission: { ...editPerm },
    workflows: ["validate-phase.md", "../references/tdd.md"],
  },

  // === UI ===
  {
    name: "gsd-ui-auditor",
    description: "Six-pillar visual audit of implemented frontend code — design, accessibility, responsive, performance, etc.",
    color: "#F472B6",
    prompt: PROMPT_UI_AUDITOR,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["ui-review.md"],
  },
  {
    name: "gsd-ui-checker",
    description: "Verify UI implementation against design specifications and UX requirements.",
    color: "#22D3EE",
    prompt: PROMPT_UI_CHECKER,
    permission: { ...readPerm },
    workflows: ["ui-phase.md"],
  },
  {
    name: "gsd-ui-researcher",
    description: "Research UI patterns, component libraries, design systems, and UX best practices for implementation planning.",
    color: "#E879F9",
    prompt: PROMPT_UI_RESEARCHER,
    permission: { ...readPerm, webfetch: "allow" },
    workflows: ["ui-phase.md"],
  },

  // === PLANNING / ANALYSIS ===
  {
    name: "gsd-roadmapper",
    description: "Create and maintain project ROADMAP.md — phases, milestones, dependencies, and timeline.",
    color: "#800080",
    prompt: PROMPT_ROADMAPPER,
    permission: { ...writePerm, question: "allow" },
    workflows: ["new-project.md", "add-phase.md"],
  },
  {
    name: "gsd-assumptions-analyzer",
    description: "Surface and analyze hidden assumptions before planning — identifies risks and unknowns.",
    color: "#00FFFF",
    prompt: PROMPT_ASSUMPTIONS_ANALYZER,
    permission: { ...readPerm },
    workflows: ["list-phase-assumptions.md", "discuss-phase-assumptions.md"],
  },
  {
    name: "gsd-pattern-mapper",
    description: "Identify and document code patterns, architectural styles, and conventions across the codebase.",
    color: "#FF00FF",
    prompt: PROMPT_PATTERN_MAPPER,
    permission: { ...writePerm },
    workflows: ["map-codebase.md"],
  },
  {
    name: "gsd-eval-planner",
    description: "Plan evaluation strategy for AI features — test design, metrics, and acceptance criteria.",
    color: "#F59E0B",
    prompt: PROMPT_EVAL_PLANNER,
    permission: { ...writePerm },
    workflows: ["../references/ai-evals.md"],
  },

  // === DOCS ===
  {
    name: "gsd-doc-writer",
    description: "Generate or update project documentation — API docs, guides, READMEs, and reference docs.",
    color: "#800080",
    prompt: PROMPT_DOC_WRITER,
    permission: { ...writePerm, webfetch: "allow" },
    workflows: ["docs-update.md"],
  },
  {
    name: "gsd-doc-verifier",
    description: "Verify documentation accuracy and completeness against the actual codebase implementation.",
    color: "#FFA500",
    prompt: PROMPT_DOC_VERIFIER,
    permission: { ...readPerm },
    workflows: ["docs-update.md", "../references/doc-conflict-engine.md"],
  },
  {
    name: "gsd-doc-classifier",
    description: "Classify and organize documentation by type, audience, and purpose — maintains doc structure.",
    color: "#FFFF00",
    prompt: PROMPT_DOC_CLASSIFIER,
    permission: { ...writePerm },
    workflows: ["docs-update.md"],
  },
  {
    name: "gsd-doc-synthesizer",
    description: "Synthesize multiple documentation sources into coherent, well-structured reference material.",
    color: "#FFA500",
    prompt: PROMPT_DOC_SYNTHESIZER,
    permission: { ...writePerm },
    workflows: ["docs-update.md"],
  },
]

/**
 * Lines the project directory walks upward from — used to find the
 * project-local GSD install (`<project>/.codo/gsd`) even when the session
 * was started from a subdirectory of the project.
 */
function* ancestors(dir: string): Generator<string> {
  let current = path.resolve(dir)
  while (true) {
    yield current
    const parent = path.dirname(current)
    if (parent === current) return
    current = parent
  }
}

/** Installed GSD tree under the project, if present (walks up to the repo root). */
function findLocalInstall(projectDir: string): string | undefined {
  for (const dir of ancestors(projectDir)) {
    const candidate = path.join(dir, ".codo", "gsd")
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/** Installed GSD tree under the user config dir, if present. */
function findGlobalInstall(): string | undefined {
  const candidate = path.join(Global.Path.config, "gsd")
  return existsSync(candidate) ? candidate : undefined
}

// The agent layer rebuilds on config/plugin hot-reload, which would re-stat the
// tree every time. Install targets change only via /workflow gsd (a process-level
// action), so caching per directory is safe within a session.
const installRootCache = new Map<string, { local: string | undefined; global: string | undefined }>()

function resolveInstalls(projectDir: string | undefined) {
  const key = projectDir ?? ""
  const cached = installRootCache.get(key)
  if (cached) return cached
  const resolved = {
    local: projectDir ? findLocalInstall(projectDir) : undefined,
    global: findGlobalInstall(),
  }
  installRootCache.set(key, resolved)
  return resolved
}

/** Visible for tests: drop memoized install lookups. */
export function resetInstallCache() {
  installRootCache.clear()
}

/**
 * Where every relative path in the agent prompts (`references/…`,
 * `workflows/…`, `templates/…`, `bin/gsd-tools.cjs`) actually lives on this
 * machine. Project-local install wins over global; when neither exists the
 * project-local target is printed so the subagent sees a concrete path and
 * knows installation is missing instead of guessing.
 */
export function installRootHint(projectDir: string | undefined): {
  local: string | undefined
  global: string | undefined
  active: string
  installed: boolean
} {
  const { local, global } = resolveInstalls(projectDir)
  return {
    local,
    global,
    active: local ?? global ?? path.join(projectDir ?? ".", ".codo", "gsd"),
    installed: Boolean(local ?? global),
  }
}

/**
 * Rewrites the stale `.agents/gsd-core/<sub>/<path>` references baked into
 * the upstream prompts into our installed layout: `<active-root>/<sub>/<path>`.
 * The agents markdown files under `.agents/` were written for the Claude Code
 * layout; after `/workflow gsd` installs, the real files live in `.codo/gsd`
 * (project) or `<config>/gsd` (global).
 */
export function rewriteStalePaths(prompt: string, activeRoot: string): string {
  const root = activeRoot.replaceAll("\\", "/").replace(/\/+$/, "")
  return prompt.replaceAll(/\.agents\/gsd-core\/(references|templates|bin|workflows)\//g, `${root}/$1/`)
}

/**
 * The opencode `<execution_context>` equivalent: tells the subagent which
 * workflow files govern its role, where they live on disk, and demands they
 * are read before acting. This is what makes the subagent *follow the skill*
 * instead of free-styling on the task text alone.
 */
export function executionContext(spec: GsdAgentSpec, hint: ReturnType<typeof installRootHint>): string {
  const root = hint.active.replaceAll("\\", "/").replace(/\/+$/, "")
  const files = spec.workflows.map((wf) => {
    const resolved = wf.startsWith("../") ? `${root}/${wf.slice(3)}` : `${root}/workflows/${wf}`
    return `- ${resolved}`
  })
  const installStatus = hint.installed
    ? `This tree is installed${hint.local ? " (project-local)" : " (globally)"} — the files above exist. Read them.`
    : [
        `WARNING: the GSD tree is NOT installed (checked project-local and global scopes).`,
        `Tell the orchestrator that GSD content is missing and suggest running \`/workflow gsd\` to install it, then do your best from the role description below without the workflow files.`,
      ].join("\n")
  return [
    `<execution_context>`,
    `GSD is installed at: ${root}`,
    ...(hint.local && hint.global ? [`(project-local install shadows the global one at ${hint.global.replaceAll("\\", "/")})`] : []),
    `${installStatus}`,
    ``,
    `Before doing ANY work, your FIRST tool call must be the Read tool on every`,
    `workflow file listed below — they specify your exact inputs, gates, outputs,`,
    `and step-by-step process. Follow them literally. Do not start the task from`,
    `scratch; the workflow file IS your job description for this dispatch:`,
    ...files,
    ``,
    `All other relative paths mentioned in your instructions (references/,`,
    `templates/, bin/gsd-tools.cjs) resolve against the same root: ${root}`,
    `</execution_context>`,
  ].join("\n")
}

export function equippedPrompt(spec: GsdAgentSpec, projectDir: string | undefined): string {
  const hint = installRootHint(projectDir)
  return `${executionContext(spec, hint)}\n\n${rewriteStalePaths(spec.prompt, hint.active)}`
}

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
  /** Assembles the runtime prompt (execution context + path rewrites) for a project dir. */
  withPrompt: (projectDir: string | undefined) => equippedPrompt(s, projectDir),
})) satisfies (Agent.Info & { withPrompt: (projectDir: string | undefined) => string })[]

export * as GSD from "./gsd"
export * as GSDInstall from "@/skill/gsd-installer"
