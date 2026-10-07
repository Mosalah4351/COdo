import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Sec } from "@/agent/sec"
import { Agent } from "@/agent/agent"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { Permission } from "@/permission"
import { Provider } from "@/provider/provider"
import { Plugin } from "@/plugin"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { Skill } from "@/skill"
import { LocationServiceMap } from "@codo-ai/core/location-layer"
import { Global } from "@codo-ai/core/global"
import { secTestSkills, SEC_TEST_SKILL_NAMES, isSecTestSkill } from "@/skill/sec-test-skills"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const PERSONAS = ["sec-architect", "sec-appsec", "sec-devsecops", "sec-pentest", "sec-secops", "sec-qa"] as const

/**
 * These tests run against the REAL Agent layer, so they assert the permissions
 * that actually ship — defaults merged with the persona rules merged with user
 * config — rather than the source text of agent.ts.
 *
 * The previous version of this file grepped agent.ts for substrings, which
 * meant `expect(block).toContain("deny")` passed for any block containing the
 * word "deny" anywhere. It could not detect that every persona had zero skills
 * available, that sec-secops could not write its own deliverable, or that the
 * pentest scope gate was never enforced.
 */
const itLayer = testEffect(
  Layer.mergeAll(
    Agent.layer.pipe(
      Layer.provide(Plugin.defaultLayer),
      Layer.provide(Provider.defaultLayer),
      Layer.provide(Auth.defaultLayer),
      Layer.provide(Config.defaultLayer),
      Layer.provide(Skill.defaultLayer),
      Layer.provide(LocationServiceMap.layer),
      Layer.provide(RuntimeFlags.layer({})),
    ),
    // Merged, not just provided: the test body itself yields Skill.Service to
    // assert what each persona can actually load.
    Skill.defaultLayer.pipe(Layer.provide(Config.defaultLayer), Layer.provide(RuntimeFlags.layer({}))),
  ),
)

afterEach(async () => {
  await disposeAllInstances()
})

const persona = (name: string) =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const found = agents.find((a) => a.name === name)
    expect(found).toBeDefined()
    return found!
  })

const can = (agent: Agent.Info, permission: string, pattern: string) =>
  Permission.evaluate(permission, pattern, agent.permission).action

describe("sec persona specs", () => {
  itLayer.instance("registers all six personas as native subagents", () =>
    Effect.gen(function* () {
      for (const name of PERSONAS) {
        const p = yield* persona(name)
        expect(p.mode).toBe("subagent")
        expect(p.native).toBe(true)
      }
    }),
  )

  itLayer.instance("bakes an execution_context preamble naming the first skill and deliverable", () =>
    Effect.gen(function* () {
      for (const spec of Sec.SEC_AGENT_SPECS) {
        const p = yield* persona(spec.name)
        expect(p.prompt?.startsWith("<execution_context>")).toBe(true)
        expect(p.prompt).toContain(spec.firstSkill)
        expect(p.prompt).toContain(spec.deliverable)
        // The original role text survives after the preamble.
        expect(p.prompt).toContain("<role>")
        expect(p.prompt).toContain(`You are ${spec.name}`)
      }
    }),
  )
})

// P0-1: every persona previously had `"*": "deny"` with no `skill` re-grant, so
// Skill.available() returned an empty list and the entire 29-skill methodology
// was unreachable by the agents meant to execute it.
describe("skill availability (P0-1)", () => {
  itLayer.instance("each persona sees exactly the skills its spec grants", () =>
    Effect.gen(function* () {
      for (const spec of Sec.SEC_AGENT_SPECS) {
        const p = yield* persona(spec.name)
        const available = yield* Skill.Service.use((svc) => svc.available(p))
        const names = available.map((s) => s.name).filter(isSecTestSkill).toSorted()
        expect(names).toEqual([...spec.skills].toSorted())
      }
    }),
  )

  itLayer.instance("every persona can load its mandatory first skill", () =>
    Effect.gen(function* () {
      for (const spec of Sec.SEC_AGENT_SPECS) {
        const p = yield* persona(spec.name)
        expect(can(p, "skill", spec.firstSkill)).not.toBe("deny")
      }
    }),
  )

  itLayer.instance("personas cannot load another persona's skills", () =>
    Effect.gen(function* () {
      const appsec = yield* persona("sec-appsec")
      expect(can(appsec, "skill", "sec-test:pentest")).toBe("deny")
      expect(can(appsec, "skill", "sec-test:agent-surface-audit")).toBe("deny")

      const qa = yield* persona("sec-qa")
      expect(can(qa, "skill", "sec-test:pentest")).toBe("deny")
      expect(can(qa, "skill", "sec-test:test-plan")).toBe("allow")
    }),
  )

  itLayer.instance("every granted skill name actually exists in the registry", () =>
    Effect.gen(function* () {
      for (const spec of Sec.SEC_AGENT_SPECS) {
        for (const name of spec.skills) {
          expect(SEC_TEST_SKILL_NAMES.has(name)).toBe(true)
        }
      }
    }),
  )
})

// P0-3: the allow pattern was `.planning/security/**/*`, which compiles to a
// regex requiring an intermediate directory. Top-level writes were denied,
// including posture.md — sec-secops' only named deliverable.
describe("security artifact writes (P0-3)", () => {
  itLayer.instance("all personas can write top-level files under .planning/security", () =>
    Effect.gen(function* () {
      for (const name of PERSONAS) {
        const p = yield* persona(name)
        expect(can(p, "edit", ".planning/security/posture.md")).toBe("allow")
      }
    }),
  )

  itLayer.instance("all personas can write nested findings", () =>
    Effect.gen(function* () {
      for (const name of PERSONAS) {
        const p = yield* persona(name)
        expect(can(p, "edit", ".planning/security/findings/2026-08-13-injection.md")).toBe("allow")
        expect(can(p, "edit", ".planning/security/reports/weekly/2026-w33.md")).toBe("allow")
      }
    }),
  )

  itLayer.instance("audit personas still cannot write production source", () =>
    Effect.gen(function* () {
      for (const name of ["sec-architect", "sec-appsec", "sec-devsecops", "sec-pentest", "sec-secops"]) {
        const p = yield* persona(name)
        expect(can(p, "edit", "src/index.ts")).toBe("deny")
        expect(can(p, "edit", "package.json")).toBe("deny")
        expect(can(p, "edit", ".github/workflows/ci.yml")).toBe("deny")
      }
    }),
  )
})

// D1: the scope gate is enforced inside sec_probe. If raw network bash were
// reachable the gate would be advisory again, which is the defect this replaces.
describe("pentest network containment (D1/P0-2)", () => {
  itLayer.instance("sec-pentest has no raw network command", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-pentest")
      for (const command of [
        "curl http://target.example.com",
        "nmap -sV target.example.com",
        "nikto -h target.example.com",
        "nuclei -u http://target.example.com",
        "zap-baseline.py -t http://target.example.com",
        "sqlmap -u http://target.example.com",
        "wget http://target.example.com",
        "python -c 'import requests'",
      ]) {
        expect(can(p, "bash", command)).toBe("deny")
      }
    }),
  )

  itLayer.instance("sec-pentest reaches the network only through sec_probe", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-pentest")
      expect(can(p, "sec_probe", "http://target.example.com")).toBe("allow")
      expect(can(p, "webfetch", "http://target.example.com")).toBe("deny")
      expect(can(p, "websearch", "*")).toBe("deny")
    }),
  )

  itLayer.instance("no other persona may use sec_probe", () =>
    Effect.gen(function* () {
      for (const name of PERSONAS.filter((n) => n !== "sec-pentest")) {
        const p = yield* persona(name)
        expect(can(p, "sec_probe", "http://target.example.com")).toBe("deny")
      }
    }),
  )
})

// P0-5: `defaults` denies `question`, and the personas re-denied it via `"*"`,
// yet sec-architect's prompt instructed the model to use the question tool.
describe("question tool availability (P0-5)", () => {
  itLayer.instance("personas whose prompts ask questions can actually ask", () =>
    Effect.gen(function* () {
      for (const name of ["sec-architect", "sec-secops", "sec-qa"]) {
        const p = yield* persona(name)
        expect(can(p, "question", "*")).toBe("allow")
      }
    }),
  )

  itLayer.instance("non-interactive audit personas stay silent", () =>
    Effect.gen(function* () {
      for (const name of ["sec-appsec", "sec-devsecops", "sec-pentest"]) {
        const p = yield* persona(name)
        expect(can(p, "question", "*")).toBe("deny")
      }
    }),
  )
})

// P1-1: sec-appsec was told to cross-reference OSV advisories with no webfetch,
// no websearch, and no osv-scanner grant.
describe("dependency-audit capability (P1-1)", () => {
  itLayer.instance("appsec and devsecops can reach advisory data", () =>
    Effect.gen(function* () {
      for (const name of ["sec-appsec", "sec-devsecops"]) {
        const p = yield* persona(name)
        expect(can(p, "webfetch", "https://osv.dev/query")).toBe("allow")
        expect(can(p, "websearch", "*")).toBe("allow")
        expect(can(p, "bash", "osv-scanner --lockfile=bun.lock")).toBe("allow")
      }
    }),
  )

  itLayer.instance("both owners of dependency-audit can load it", () =>
    Effect.gen(function* () {
      for (const name of ["sec-appsec", "sec-devsecops"]) {
        const p = yield* persona(name)
        expect(can(p, "skill", "sec-test:dependency-audit")).toBe("allow")
      }
    }),
  )
})

// P1-2: agent-surface-audit enumerates ~/.agents/skills and the config dir, but
// external_directory allowed only Global.Path.data.
describe("secops audit surface reach (P1-2)", () => {
  itLayer.instance("sec-secops can read the trees it is asked to audit", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-secops")
      for (const dir of [Global.Path.data, Global.Path.config]) {
        expect(can(p, "external_directory", `${dir}/skill/some-skill/SKILL.md`)).toBe("allow")
      }
    }),
  )
})

// D5/D6: sec-qa is the only persona allowed outside .planning, and the only one
// that executes arbitrary project code.
describe("sec-qa containment (D5/D6)", () => {
  itLayer.instance("writes test-shaped paths, at any depth", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-qa")
      for (const file of [
        "index.test.ts",
        "src/permission/index.test.ts",
        "test/agent/foo.ts",
        "packages/codo/test/agent/foo.ts",
        "tests/e2e/login.spec.ts",
        "src/__tests__/util.ts",
        "internal/testdata/payload.json",
      ]) {
        expect(can(p, "edit", file)).toBe("allow")
      }
    }),
  )

  itLayer.instance("never writes production source", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-qa")
      for (const file of ["src/index.ts", "src/permission/index.ts", "package.json", "src/tool/edit.ts"]) {
        expect(can(p, "edit", file)).toBe("deny")
      }
    }),
  )

  itLayer.instance("runner config is gated behind a prompt, not allowed outright", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-qa")
      for (const file of ["vitest.config.ts", "jest.config.js", "playwright.config.ts", "bunfig.toml"]) {
        expect(can(p, "edit", file)).toBe("ask")
      }
    }),
  )

  itLayer.instance("runs test suites but nothing else", () =>
    Effect.gen(function* () {
      const p = yield* persona("sec-qa")
      for (const command of ["bun test packages/codo", "pytest -q", "go test ./...", "stryker run"]) {
        expect(can(p, "bash", command)).toBe("allow")
      }
      for (const command of ["curl http://x", "rm -rf /", "npm publish", "docker run alpine"]) {
        expect(can(p, "bash", command)).toBe("deny")
      }
    }),
  )
})

describe("findings persistence (P0-4)", () => {
  itLayer.instance("every persona can record findings", () =>
    Effect.gen(function* () {
      for (const name of PERSONAS) {
        const p = yield* persona(name)
        expect(can(p, "sec_finding", "*")).toBe("allow")
      }
    }),
  )
})

describe("sec-test skills", () => {
  itLayer.instance("registers thirty bundled skills", () =>
    Effect.gen(function* () {
      expect(secTestSkills).toHaveLength(30)
      expect(SEC_TEST_SKILL_NAMES.size).toBe(30)
    }),
  )

  itLayer.instance("uses the sec-test: prefix and matches its own frontmatter", () =>
    Effect.gen(function* () {
      for (const s of secTestSkills) {
        expect(s.name.startsWith("sec-test:")).toBe(true)
        expect(s.content).toContain(`name: ${s.name}`)
      }
    }),
  )

  itLayer.instance("isSecTestSkill consults the registry, not just the prefix", () =>
    Effect.gen(function* () {
      expect(isSecTestSkill("sec-test:code-audit")).toBe(true)
      expect(isSecTestSkill("sec-test:test-plan")).toBe(true)
      expect(isSecTestSkill("compose:plan")).toBe(false)
      expect(isSecTestSkill("self-extend")).toBe(false)
      // The point of the registry check: an unregistered name carrying the
      // prefix must NOT pass, or permission grants match ghosts.
      expect(isSecTestSkill("sec-test:not-a-real-skill")).toBe(false)
    }),
  )

  itLayer.instance("every skill is reachable by exactly the personas that own it", () =>
    Effect.gen(function* () {
      const granted = new Set(Sec.SEC_AGENT_SPECS.flatMap((s) => s.skills))
      // Orchestrator-only skills are dispatched by sec-test itself, not a persona.
      const orchestratorOnly = new Set(["sec-test:brief", "sec-test:scope", "sec-test:auto-fix"])
      for (const skill of secTestSkills) {
        if (orchestratorOnly.has(skill.name)) continue
        expect(granted.has(skill.name)).toBe(true)
      }
    }),
  )
})
