import type { Agent } from "./agent"
import { Permission } from "@/permission"
import type { ConfigPermissionV1 } from "@codo-ai/core/v1/config/permission"
import { toolchainLine } from "@/scrape/tool-presence"

import PROMPT_SCRAPE_TOPIC from "./prompt/scrape-topic.txt"

/**
 * Checkpoints and their cache/auth siblings live under `.codo/scrape/`. The
 * trailing segment is a single star on purpose (see sec.ts): one star already
 * crosses path separators, and a globstar form would silently deny top-level
 * writes.
 */
const SCRAPE_WORKSPACE = ".codo/scrape/*"

/**
 * Skills a topic subagent may load. The orchestrator owns `scrape:brief`
 * (planning) and `scrape:deliver` (QA + workbook); subagents execute topics.
 */
const TOPIC_SKILLS = [
  "scrape:politeness",
  "scrape:static-fetch",
  "scrape:browser-render",
  "scrape:api-discovery",
  "scrape:auth-session",
  "scrape:checkpoints",
]

export interface ScrapeTopicSpec {
  name: string
  description: string
  color: string
  prompt: string
  permission: ConfigPermissionV1.Info
  /** Skill the persona MUST load before doing anything else. */
  firstSkill: string
  skills: string[]
}

const spec: ScrapeTopicSpec = {
  name: "scrape-topic",
  description:
    "Web-extraction topic worker. Executes one assigned scrape topic: climbs the escalation ladder (static fetch -> browser render -> Patchright -> API discovery -> auth session), checkpoints every row immediately.",
  color: "#4d9e6a",
  prompt: PROMPT_SCRAPE_TOPIC,
  firstSkill: "scrape:politeness",
  skills: TOPIC_SKILLS,
  permission: {
    read: "allow",
    grep: "allow",
    glob: "allow",
    list: "allow",
    todowrite: "allow",
    webfetch: "allow",
    bash: "allow",
    // Topic workers write checkpoints + cached responses; nothing else.
    edit: {
      "*": "deny",
      [SCRAPE_WORKSPACE]: "allow",
    },
    task: "deny",
    skill: {
      "*": "deny",
      ...Object.fromEntries(TOPIC_SKILLS.map((s) => [s, "allow" as const])),
    },
  },
}

/**
 * `execution_context` for the scrape-topic persona — same mechanism as the
 * security personas (sec.ts). The orchestrator's dispatch carries the topic,
 * schema contract, seeds, and checkpoint path; this preamble carries the
 * standing rules so the dispatch stays small.
 */
export function scrapeTopicExecutionContext(projectDir: string | undefined): string {
  const dir = projectDir?.replaceAll("\\", "/").replace(/\/+$/, "")
  const workspace = `${dir ?? "."}/.codo/scrape/<run-id>/`
  const toolchain = toolchainLine(spec.name)
  return [
    `<execution_context>`,
    `You are ${spec.name}, a COdo scraping persona dispatched by the scrape`,
    `orchestrator to execute ONE topic of a larger extraction run.`,
    ...(dir ? [`Working directory: ${dir}`] : []),
    ``,
    `**Before doing ANY work**, your FIRST tool call must be the skill tool on`,
    `\`${spec.firstSkill}\` — its delay tiers, concurrency caps, backoff schedule,`,
    `honeypot rule, and cache rules bind every rung you attempt.`,
    ``,
    `Skills available to you (you have permission for these and no others):`,
    ...spec.skills.map((s) => `- ${s}`),
    ...(toolchain ? [``, toolchain] : []),
    ``,
    `**Where your output goes:**`,
    `- Checkpoint root: ${workspace}`,
    `- Your dispatch names your checkpoint file under that root. Append rows`,
    `  immediately on collection — never batch at the end.`,
    `- Raw responses cache under <run-id>/cache/<sha256(url)> on first success.`,
    ``,
    `**Reporting contract:** end your final message with a single machine-readable`,
    `\`## SCRAPE-RESULT\` line as specified by your dispatch. The orchestrator parses it.`,
    `</execution_context>`,
  ].join("\n")
}

export function equippedScrapeTopicPrompt(projectDir: string | undefined): string {
  return `${scrapeTopicExecutionContext(projectDir)}\n\n${spec.prompt}`
}

export const SCRAPE_AGENTS = [
  {
    name: spec.name,
    description: spec.description,
    color: spec.color,
    options: {},
    permission: Permission.fromConfig(spec.permission) as ReturnType<typeof Permission.fromConfig>,
    mode: "subagent" as const,
    native: true as const,
    prompt: spec.prompt,
    /** Assembles the runtime prompt (execution context + persona role) for a project dir. */
    withPrompt: (projectDir: string | undefined) => equippedScrapeTopicPrompt(projectDir),
  },
] satisfies (Agent.Info & { withPrompt: (projectDir: string | undefined) => string })[]

/** Spec list for tests and docs generation. */
export const SCRAPE_TOPIC_SPECS = [spec]
