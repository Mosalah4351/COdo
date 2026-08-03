import { describe, expect, it, afterEach } from "bun:test"
import { Effect, Layer } from "effect"
import fs from "fs"
import os from "os"
import path from "path"
import { GSD } from "@/agent/gsd"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Agent } from "../../src/agent/agent"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config/config"
import { InstanceState } from "@/effect/instance-state"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { Global } from "@codo-ai/core/global"
import { Plugin } from "../../src/plugin"
import { Provider } from "../../src/provider/provider"
import { Skill } from "../../src/skill"
import { LocationServiceMap } from "@codo-ai/core/location-layer"

const created: string[] = []

function fakeInstall(): { project: string; root: string } {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "gsd-proj-"))
  const root = path.join(project, ".codo", "gsd")
  fs.mkdirSync(path.join(root, "workflows"), { recursive: true })
  fs.mkdirSync(path.join(root, "references"), { recursive: true })
  created.push(project)
  return { project, root }
}

afterEach(() => {
  GSD.resetInstallCache()
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe("GSD_AGENTS registry", () => {
  it("registers 33 subagents, all native subagent mode", () => {
    expect(GSD.GSD_AGENTS.length).toBe(33)
    for (const agent of GSD.GSD_AGENTS) {
      expect(agent.mode).toBe("subagent")
      expect(agent.native).toBe(true)
      expect(agent.workflow).toBe("gsd")
    }
  })

  it("exposes a withPrompt projector for every agent", () => {
    for (const agent of GSD.GSD_AGENTS) {
      expect(typeof agent.withPrompt).toBe("function")
    }
  })
})

describe("execution context injection", () => {
  it("prepends an execution_context block listing role-matched workflow files", () => {
    const planner = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!
    const prompt = planner.withPrompt(undefined)
    expect(prompt.startsWith("<execution_context>")).toBe(true)
    expect(prompt).toContain("workflows/plan-phase.md")
    expect(prompt).toContain("references/planner-source-audit.md")
    // Original role content still present after the preamble
    expect(prompt).toContain("<role>")
    expect(prompt).toContain("You are gsd-planner")
  })

  it("all 29 workflow references point at files that ship in the installer", () => {
    // The tarball layout: gsd-core/workflows/*.md and gsd-core/references/*.md
    // install to <root>/workflows/ and <root>/references/. Anything the runtime
    // prompt tells a subagent to Read must exist in the release the installer
    // downloads, otherwise we ship dangling Read instructions.
    for (const agent of GSD.GSD_AGENTS) {
      const prompt = agent.withPrompt(undefined)
      const ctx = prompt.slice(0, prompt.indexOf("</execution_context>"))
      const listed = [...ctx.matchAll(/- \S+\/(workflows|references)\/([^\s/]+\.md)/g)].map((m) => `${m[1]}/${m[2]}`)
      expect(listed.length).toBeGreaterThan(0)
      for (const rel of listed) {
        expect(rel).not.toContain("..")
        expect(rel.startsWith("workflows/") || rel.startsWith("references/")).toBe(true)
      }
    }
  })

  it("names a distinct workflow per role instead of one shared file", () => {
    const executor = GSD.GSD_AGENTS.find((a) => a.name === "gsd-executor")!.withPrompt(undefined)
    const debugger_ = GSD.GSD_AGENTS.find((a) => a.name === "gsd-debugger")!.withPrompt(undefined)
    const docWriter = GSD.GSD_AGENTS.find((a) => a.name === "gsd-doc-writer")!.withPrompt(undefined)
    expect(executor).toContain("workflows/execute-phase.md")
    expect(debugger_).toContain("references/debugger-philosophy.md")
    expect(docWriter).toContain("workflows/docs-update.md")
  })

  it("orders the subagent to Read the workflow files before doing anything", () => {
    const prompt = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!.withPrompt(undefined)
    const ctx = prompt.slice(0, prompt.indexOf("</execution_context>"))
    expect(ctx).toContain("FIRST tool call must be the Read tool")
  })

  it("warns when the GSD tree is not installed instead of fabricating paths", () => {
    // Reset cache so this test sees a cold lookup, and pass a directory whose
    // ancestor walk never lands on an installed tree.
    GSD.resetInstallCache()
    const nowhere = path.join(os.tmpdir(), "gsd-definitely-not-installed-" + Date.now())
    fs.mkdirSync(nowhere, { recursive: true })
    const prompt = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!.withPrompt(nowhere)
    // The placement block must always name the fallback install target; when
    // nothing is installed, the WARNING block cites /workflow gsd.
    expect(prompt).toContain(".codo")
    expect(prompt).toMatch(/NOT installed|installed.*\(project-local\)|installed.*\(globally\)/)
  })

  it("resolves a project-local install and reports it as the active root", () => {
    const { project, root } = fakeInstall()
    const prompt = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!.withPrompt(project)
    const unixRoot = root.replaceAll("\\", "/")
    expect(prompt).toContain(`GSD is installed at: ${unixRoot}`)
    expect(prompt).toContain("(project-local)")
    expect(prompt).not.toContain("NOT installed")
  })

  it("discovers the install from a subdirectory of the project", () => {
    const { project, root } = fakeInstall()
    const nested = path.join(project, "packages", "deep", "src")
    fs.mkdirSync(nested, { recursive: true })
    const prompt = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!.withPrompt(nested)
    expect(prompt).toContain(`GSD is installed at: ${root.replaceAll("\\", "/")}`)
  })

  it("falls back to .agents/gsd-core when no .codo/gsd exists in the project", () => {
    // Regression guard: a user with the rokicool/gsd-opencode layout
    // (project/.agents/gsd-core/) must still resolve, not silently fall
    // through to global.
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "gsd-agents-shape-"))
    created.push(project)
    const agentsRoot = path.join(project, ".agents", "gsd-core")
    fs.mkdirSync(agentsRoot, { recursive: true })
    GSD.resetInstallCache()
    const prompt = GSD.GSD_AGENTS.find((a) => a.name === "gsd-planner")!.withPrompt(project)
    expect(prompt).toContain(`GSD is installed at: ${agentsRoot.replaceAll("\\", "/")}`)
    expect(prompt).not.toContain("NOT installed")
  })
})

describe("stale path rewriting", () => {
  it("rewrites .agents/gsd-core/* references to the active install root", () => {
    const { project, root } = fakeInstall()
    const rewritten = GSD.rewriteStalePaths(
      "Read `.agents/gsd-core/references/mandatory-initial-read.md` and run `node .agents/gsd-core/bin/gsd-tools.cjs query state.get`",
      root,
    )
    const unixRoot = root.replaceAll("\\", "/")
    expect(rewritten).toContain(`${unixRoot}/references/mandatory-initial-read.md`)
    expect(rewritten).toContain(`${unixRoot}/bin/gsd-tools.cjs`)
    expect(rewritten).not.toContain(".agents/gsd-core")
    void project
  })

  it("halves the stale reference: bin and templates paths are rewritten too", () => {
    const { root } = fakeInstall()
    const rewritten = GSD.rewriteStalePaths(
      "consult `.agents/gsd-core/templates/UI-SPEC.md` then `.agents/gsd-core/workflows/do.md`",
      root,
    )
    const unixRoot = root.replaceAll("\\", "/")
    expect(rewritten).toContain(`${unixRoot}/templates/UI-SPEC.md`)
    expect(rewritten).toContain(`${unixRoot}/workflows/do.md`)
  })

  it("leaves prompts without stale references untouched", () => {
    const clean = "no legacy paths here"
    expect(GSD.rewriteStalePaths(clean, "/anywhere")).toBe(clean)
  })

  it("production prompts contain zero unresolved .agents/gsd-core references after rewrite", () => {
    for (const agent of GSD.GSD_AGENTS) {
      const prompt = agent.withPrompt(undefined)
      expect(prompt).not.toContain(".agents/gsd-core/")
    }
  })
})

// Boots the real Agent layer (same wiring as agent.test.ts) and asserts the
// system prompt the model will actually receive for gsd-planner starts with
// the execution context — i.e. request.ts line `input.agent.prompt` carries
// the injected preamble, not only the static role text.
const itLayer = testEffect(
  Agent.layer.pipe(
    Layer.provide(Plugin.defaultLayer),
    Layer.provide(Provider.defaultLayer),
    Layer.provide(Auth.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(Skill.defaultLayer),
    Layer.provide(LocationServiceMap.layer),
    Layer.provide(RuntimeFlags.layer({})),
  ),
)

afterEach(async () => {
  await disposeAllInstances()
})

itLayer.instance("gsd-planner prompt delivered by the Agent layer starts with execution_context", () =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const planner = agents.find((a) => a.name === "gsd-planner")
    expect(planner).toBeDefined()
    expect(planner!.prompt?.startsWith("<execution_context>")).toBe(true)
    expect(planner!.prompt).toContain("workflows/plan-phase.md")
    expect(planner!.prompt).toContain("FIRST tool call must be the Read tool")
    expect(planner!.prompt).toContain("You are gsd-planner")
  }),
)

itLayer.instance("gsd executor and verifier get distinct governing workflows via the layer", () =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const executor = agents.find((a) => a.name === "gsd-executor")
    const verifier = agents.find((a) => a.name === "gsd-verifier")
    expect(executor!.prompt).toContain("workflows/execute-phase.md")
    expect(executor!.prompt).not.toContain("workflows/verify-work.md is")
    expect(verifier!.prompt).toContain("workflows/verify-work.md")
  }),
)

itLayer.instance("every gsd agent gets project context, cwd, and a deliverable path", () =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const gsdAgents = agents.filter((a) => a.name.startsWith("gsd-"))
    expect(gsdAgents.length).toBe(33)
    for (const agent of gsdAgents) {
      const prompt = agent.prompt ?? ""
      expect(prompt.startsWith("<execution_context>")).toBe(true)
      expect(prompt).toContain(`You are ${agent.name}`)
      expect(prompt).toContain("Working directory:")
      // Every subagent must know where .planning/ lives so it doesn't write to cwd
      expect(prompt).toContain(".planning")
      // Every subagent with a known primary deliverable has it called out
      const hasPrimary = [
        "gsd-project-researcher", "gsd-roadmapper", "gsd-planner", "gsd-executor",
        "gsd-verifier", "gsd-code-reviewer", "gsd-code-fixer", "gsd-debugger",
        "gsd-debug-session-manager", "gsd-codebase-mapper", "gsd-intel-updater",
      ]
      if (hasPrimary.includes(agent.name)) {
        expect(prompt).toContain("Your primary deliverable:")
      }
    }
  }),
)

itLayer.instance("gsd-project-researcher is told to write to .planning/research/", () =>
  Effect.gen(function* () {
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const researcher = agents.find((a) => a.name === "gsd-project-researcher")
    expect(researcher!.prompt).toContain(".planning/research/")
  }),
)

void TestInstance

itLayer.instance("gsd install roots are whitelisted for external_directory reads", () =>
  Effect.gen(function* () {
    const { Permission } = yield* Effect.promise(() => import("../../src/permission"))
    const agents = yield* Agent.Service.use((svc) => svc.list())
    const planner = agents.find((a) => a.name === "gsd-planner")!
    const ctx = yield* InstanceState.context
    // The registry must whitelist the project-local GSD tree rooted at the
    // instance's own ctx.directory — that's the same root withPrompt() resolves.
    const localPattern = path.join(ctx.directory, ".codo", "gsd", "workflows", "plan-phase.md")
    expect(Permission.evaluate("read", localPattern, planner.permission).action).toBe("allow")
    // The GLOBAL install root must also be reachable — subagents run in either scope.
    const globalPattern = path.join(Global.Path.config, "gsd", "workflows", "plan-phase.md")
    expect(Permission.evaluate("read", globalPattern, planner.permission).action).toBe("allow")
  }),
)
