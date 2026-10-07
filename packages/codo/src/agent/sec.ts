import type { Agent } from "./agent"
import { Permission } from "@/permission"
import type { ConfigPermissionV1 } from "@codo-ai/core/v1/config/permission"
import { Global } from "@codo-ai/core/global"
import path from "path"
import { toolchainLine } from "@/security/tool-presence"

import PROMPT_SEC_ARCHITECT from "./prompt/sec-architect.txt"
import PROMPT_SEC_APPSEC from "./prompt/sec-appsec.txt"
import PROMPT_SEC_DEVSECOPS from "./prompt/sec-devsecops.txt"
import PROMPT_SEC_PENTEST from "./prompt/sec-pentest.txt"
import PROMPT_SEC_SECOPS from "./prompt/sec-secops.txt"
import PROMPT_SEC_QA from "./prompt/sec-qa.txt"

/**
 * Everything under `.planning/security/` is writable by every persona.
 *
 * IMPORTANT: the trailing segment is a single star, not a globstar followed
 * by a star. `Wildcard.match` expands each star to `.` + star and compiles
 * with the `s` flag, so one star already crosses path separators. The
 * previous globstar form compiled to a regex requiring an intermediate
 * directory between `security` and the filename, which silently denied
 * every top-level write — including `posture.md`, sec-secops' primary
 * deliverable.
 */
const SECURITY_ARTIFACTS = ".planning/security/*"

/**
 * Test-shaped paths sec-qa may write. Production source stays off-limits.
 *
 * Patterns are written with forward slashes on purpose: `Wildcard.match`
 * normalizes both the pattern and the candidate path, so a literal is
 * portable while `path.join` would bake platform-specific separators into
 * values that tests assert against.
 *
 * Each shape is listed twice — bare and globstar-prefixed — because a
 * globstar-prefixed pattern compiles with a literal separator and therefore
 * requires a parent directory. Without the bare form a root-level
 * `index.test.ts` would be denied; without the prefixed form a monorepo
 * `packages/codo/test/foo.ts` would be.
 */
const TEST_PATHS = [
  "*.test.*",
  "*.spec.*",
  "**/*.test.*",
  "**/*.spec.*",
  "test/*",
  "tests/*",
  "__tests__/*",
  "testdata/*",
  "**/test/*",
  "**/tests/*",
  "**/__tests__/*",
  "**/testdata/*",
]

/** Runner config is powerful enough to warrant a prompt, but not a hard deny. */
const TEST_CONFIG_PATHS = [
  "vitest.config.*",
  "jest.config.*",
  "playwright.config.*",
  "bunfig.toml",
  "pytest.ini",
  "Cargo.toml",
]

/**
 * Read-only baseline shared by the five audit personas.
 *
 * Rule order is load-bearing. `Permission.fromConfig` preserves object key
 * order and `Permission.evaluate` resolves with `findLast`, so every
 * narrowing sub-map MUST come after `"*": "deny"`. Reordering these keys
 * silently re-grants or re-denies tools; the behavioral tests in
 * `test/agent/sec-test-registry.test.ts` are the guard.
 */
const auditBase: ConfigPermissionV1.Info = {
  "*": "deny",
  read: "allow",
  grep: "allow",
  glob: "allow",
  list: "allow",
  todowrite: "allow",
  sec_finding: "allow",
  edit: {
    "*": "deny",
    [SECURITY_ARTIFACTS]: "allow",
  },
}

const readonlyExternal: ConfigPermissionV1.Info["external_directory"] = { "*": "ask" }

export interface SecAgentSpec {
  name: string
  description: string
  color: string
  prompt: string
  permission: ConfigPermissionV1.Info
  /** Phase of the lifecycle this persona owns, surfaced in the preamble. */
  phase: string
  /** Primary artifact the persona is expected to produce. */
  deliverable: string
  /**
   * Skills that govern this persona's procedure. These are granted through the
   * `skill` permission AND named in the execution-context preamble so the
   * persona loads its methodology instead of free-styling from the task text.
   */
  skills: string[]
  /** Skill the persona MUST load before doing anything else. */
  firstSkill: string
}

const specs: SecAgentSpec[] = [
  {
    name: "sec-architect",
    description:
      "Threat modeling and architecture persona (STRIDE/PASTA, ASVS). Read-only review — identifies threats at the design layer.",
    color: "#7aa2f7",
    prompt: PROMPT_SEC_ARCHITECT,
    phase: "design — before code exists",
    deliverable: ".planning/security/threat-models/<feature-slug>.md",
    firstSkill: "sec-test:threat-model",
    skills: ["sec-test:threat-model", "sec-test:context"],
    permission: {
      ...auditBase,
      question: "allow",
      webfetch: "allow",
      websearch: "allow",
      bash: {
        "*": "deny",
        "git log*": "allow",
        "git diff*": "allow",
      },
      skill: {
        "*": "deny",
        "sec-test:threat-model": "allow",
        "sec-test:context": "allow",
      },
      external_directory: readonlyExternal,
    },
  },
  {
    name: "sec-appsec",
    description:
      "Application security code auditor (OWASP Top 10:2025, CWE Top 25). Read-only detection of vulnerabilities in implementation.",
    color: "#e0af68",
    prompt: PROMPT_SEC_APPSEC,
    phase: "code — on any diff or PR",
    deliverable: ".planning/security/findings/YYYY-MM-DD-<slug>.md",
    firstSkill: "sec-test:code-audit",
    skills: [
      "sec-test:code-audit",
      "sec-test:secrets-scan",
      "sec-test:dependency-audit",
      "sec-test:fuzz",
      "sec-test:context",
    ],
    permission: {
      ...auditBase,
      // Advisory lookups (OSV/GHSA/NVD) are the whole job for dependency work.
      webfetch: "allow",
      websearch: "allow",
      bash: {
        "*": "deny",
        "semgrep*": "allow",
        "opengrep*": "allow",
        "gitleaks*": "allow",
        "trufflehog*": "allow",
        "osv-scanner*": "allow",
        "git log*": "allow",
        "git diff*": "allow",
        // Local coverage-guided fuzzing (non-network, deterministic).
        "go test -fuzz*": "allow",
        "cargo fuzz*": "allow",
        "jsfuzz*": "allow",
        "atheris*": "allow",
      },
      skill: {
        "*": "deny",
        "sec-test:code-audit": "allow",
        "sec-test:secrets-scan": "allow",
        "sec-test:dependency-audit": "allow",
        "sec-test:fuzz": "allow",
        "sec-test:context": "allow",
      },
      external_directory: readonlyExternal,
    },
  },
  {
    name: "sec-devsecops",
    description:
      "Build pipeline auditor (NIST SSDF, SLSA provenance, Sigstore). Reviews CI/CD config and supply-chain hygiene.",
    color: "#9ece6a",
    prompt: PROMPT_SEC_DEVSECOPS,
    phase: "build/ship — CI, publish, release",
    deliverable: ".planning/security/findings/YYYY-MM-DD-pipeline-<name>.md",
    firstSkill: "sec-test:pipeline-harden",
    skills: [
      "sec-test:pipeline-harden",
      "sec-test:sbom",
      "sec-test:container-scan",
      "sec-test:supply-chain-attest",
      "sec-test:dependency-audit",
      "sec-test:context",
    ],
    permission: {
      ...auditBase,
      webfetch: "allow",
      websearch: "allow",
      bash: {
        "*": "deny",
        "syft*": "allow",
        "grype*": "allow",
        "trivy*": "allow",
        "osv-scanner*": "allow",
        "cosign*": "allow",
        "git log*": "allow",
        "git diff*": "allow",
      },
      skill: {
        "*": "deny",
        "sec-test:pipeline-harden": "allow",
        "sec-test:sbom": "allow",
        "sec-test:container-scan": "allow",
        "sec-test:supply-chain-attest": "allow",
        "sec-test:dependency-audit": "allow",
        "sec-test:context": "allow",
      },
      external_directory: readonlyExternal,
    },
  },
  {
    name: "sec-pentest",
    description:
      "Scope-gated validation persona (PTES/WSTG). All network access goes through the sec_probe tool, which refuses any target outside a valid, unexpired .codo/security-scope.json.",
    color: "#f7768e",
    prompt: PROMPT_SEC_PENTEST,
    phase: "validate — on demand, gated",
    deliverable: ".planning/security/findings/YYYY-MM-DD-pentest-<target-slug>.md",
    firstSkill: "sec-test:scope-gate",
    skills: [
      "sec-test:pentest",
      "sec-test:scope-gate",
      "sec-test:api-security-test",
      "sec-test:auth-test",
      "sec-test:exploit-verify",
      "sec-test:fuzz",
      "sec-test:context",
    ],
    permission: {
      ...auditBase,
      // `sec_probe` is the ONLY network path. Raw scanners are denied outright
      // because nothing in the bash layer can enforce the scope gate — the
      // tool validates every target against evaluateGate() before it sends.
      sec_probe: "allow",
      bash: { "*": "deny" },
      skill: {
        "*": "deny",
        "sec-test:pentest": "allow",
        "sec-test:scope-gate": "allow",
        "sec-test:api-security-test": "allow",
        "sec-test:auth-test": "allow",
        "sec-test:exploit-verify": "allow",
        "sec-test:fuzz": "allow",
        "sec-test:context": "allow",
      },
      external_directory: { "*": "deny" },
    },
  },
  {
    name: "sec-secops",
    description:
      "Operations + meta persona. Audits the agent-surface itself (skills, plugins, MCP) against OWASP LLM/Agentic Top 10 and tracks posture over time.",
    color: "#bb9af7",
    prompt: PROMPT_SEC_SECOPS,
    phase: "operate — meta, ongoing",
    deliverable: ".planning/security/posture.md",
    firstSkill: "sec-test:agent-surface-audit",
    skills: [
      "sec-test:agent-surface-audit",
      "sec-test:logging-audit",
      "sec-test:incident-runbook",
      "sec-test:posture-report",
      "sec-test:response",
      "sec-test:learn",
      "sec-test:report",
      "sec-test:context",
    ],
    permission: {
      ...auditBase,
      question: "allow",
      skill: {
        "*": "deny",
        "sec-test:agent-surface-audit": "allow",
        "sec-test:logging-audit": "allow",
        "sec-test:incident-runbook": "allow",
        "sec-test:posture-report": "allow",
        "sec-test:response": "allow",
        "sec-test:learn": "allow",
        "sec-test:report": "allow",
        "sec-test:context": "allow",
      },
      // This persona's whole job is auditing COdo's own installed surface, so
      // it needs to READ the skill/plugin/MCP trees it is auditing. It cannot
      // write to any of them — `edit` stays confined to .planning/security.
      external_directory: {
        "*": "deny",
        [path.join(Global.Path.data, "*")]: "allow",
        [path.join(Global.Path.config, "*")]: "allow",
        [path.join(Global.Path.home, ".codo", "*")]: "allow",
        [path.join(Global.Path.home, ".agents", "*")]: "allow",
      },
    },
  },
  {
    name: "sec-qa",
    description:
      "Quality persona. Writes and runs tests — unit, integration, e2e, coverage, and mutation. Writes only test-shaped paths; never modifies production source.",
    color: "#2ac3de",
    prompt: PROMPT_SEC_QA,
    phase: "verify — test design, coverage, mutation",
    deliverable: "test files under the project's test paths + .planning/testing/<slug>.md",
    firstSkill: "sec-test:test-plan",
    skills: [
      "sec-test:test-plan",
      "sec-test:test-generate",
      "sec-test:coverage-audit",
      "sec-test:mutation-test",
      "sec-test:regression-guard",
      "sec-test:context",
    ],
    permission: {
      ...auditBase,
      question: "allow",
      // Only persona allowed to write outside .planning. Test-shaped paths
      // only; runner config is `ask` because it can change what the whole
      // suite executes. Production source stays denied.
      edit: {
        "*": "deny",
        ".planning/*": "allow",
        ...Object.fromEntries(TEST_PATHS.map((p) => [p, "allow" as const])),
        ...Object.fromEntries(TEST_CONFIG_PATHS.map((p) => [p, "ask" as const])),
      },
      // Running a suite executes arbitrary project code (including pretest
      // hooks and fixtures). This is a deliberate escalation over the five
      // read-only personas — see docs/sec-test/03-IMPLEMENTATION.md.
      bash: {
        "*": "deny",
        "bun test*": "allow",
        "npm test*": "allow",
        "npm run test*": "allow",
        "pnpm test*": "allow",
        "yarn test*": "allow",
        "pytest*": "allow",
        "go test*": "allow",
        "cargo test*": "allow",
        "vitest*": "allow",
        "jest*": "allow",
        "playwright*": "allow",
        "nyc*": "allow",
        "c8*": "allow",
        "stryker*": "allow",
        "mutmut*": "allow",
        "git log*": "allow",
        "git diff*": "allow",
      },
      skill: {
        "*": "deny",
        "sec-test:test-plan": "allow",
        "sec-test:test-generate": "allow",
        "sec-test:coverage-audit": "allow",
        "sec-test:mutation-test": "allow",
        "sec-test:regression-guard": "allow",
        "sec-test:context": "allow",
      },
      external_directory: readonlyExternal,
    },
  },
]

/**
 * COdo's `execution_context` for security personas — the same mechanism the
 * GSD subagents use (see `gsd.ts`). Without it a persona never learns the
 * project directory, where its artifacts land, or which skill encodes its
 * procedure, so it free-styles from the dispatch text alone.
 *
 * The orchestrator prompt promises this preamble exists; this is what makes
 * that promise true.
 */
export function secExecutionContext(spec: SecAgentSpec, projectDir: string | undefined): string {
  const dir = projectDir?.replaceAll("\\", "/").replace(/\/+$/, "")
  const planning = dir ? `${dir}/.planning/security` : ".planning/security"
  // Cheap one-liner telling scanner-wielding personas which of their tools are
  // actually installed. Backed by a lazily-primed, fire-and-forget snapshot —
  // undefined (line omitted) until the probes settle or for unmapped personas.
  const toolchain = toolchainLine(spec.name)
  return [
    `<execution_context>`,
    `You are ${spec.name}, a COdo security persona dispatched by the sec-test orchestrator.`,
    `Lifecycle phase you own: ${spec.phase}`,
    ...(dir ? [`Working directory: ${dir}`] : []),
    ``,
    `**Before doing ANY work**, your FIRST tool call must be the skill tool on`,
    `\`${spec.firstSkill}\` — it is your job description for this dispatch, and it`,
    `specifies your inputs, gates, output format, and step-by-step process.`,
    `Follow it literally rather than starting from scratch.`,
    ``,
    `Skills available to you (you have permission for these and no others):`,
    ...spec.skills.map((s) => `- ${s}`),
    ...(toolchain ? [``, toolchain] : []),
    ``,
    `**Where your output goes:**`,
    `- Security artifacts root: ${planning}/`,
    `- Your primary deliverable: ${spec.deliverable}`,
    `- Findings go under ${planning}/findings/ as YYYY-MM-DD-<slug>.md. Nothing else in that directory.`,
    `- Use the Write tool for new files and Edit for updates. Create parent directories as needed.`,
    `- Record every finding with the \`sec_finding\` tool as well as the markdown file. The tool assigns`,
    `  \`id\` and \`fingerprint\` and de-duplicates across runs; never invent either value yourself.`,
    ``,
    `**Reporting contract:** end your final message with a single machine-readable`,
    `\`## SEC-RESULT\` line as specified by your skill. The orchestrator parses it.`,
    `</execution_context>`,
  ].join("\n")
}

export function equippedSecPrompt(spec: SecAgentSpec, projectDir: string | undefined): string {
  return `${secExecutionContext(spec, projectDir)}\n\n${spec.prompt}`
}

export const SEC_AGENTS = specs.map((s) => ({
  name: s.name,
  description: s.description,
  color: s.color,
  options: {},
  permission: Permission.fromConfig(s.permission) as ReturnType<typeof Permission.fromConfig>,
  mode: "subagent" as const,
  native: true as const,
  prompt: s.prompt,
  /** Assembles the runtime prompt (execution context + persona role) for a project dir. */
  withPrompt: (projectDir: string | undefined) => equippedSecPrompt(s, projectDir),
})) satisfies (Agent.Info & { withPrompt: (projectDir: string | undefined) => string })[]

/** Spec list for tests and docs generation. */
export const SEC_AGENT_SPECS = specs

export * as Sec from "./sec"
