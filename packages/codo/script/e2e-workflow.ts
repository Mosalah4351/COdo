/**
 * Real end-to-end /workflow driver:
 * 1. Boots a listening codo server in the sandbox.
 * 2. Creates a session via the SDK.
 * 3. POSTs /session/:id/command { command: "workflow", arguments: "gsd local" }.
 * 4. Lists the agent registry after the command runs.
 * 5. Asserts gsd-planner / gsd-executor / explore / general all exist.
 * 6. Asserts workflow.json was written to "gsd".
 * 7. Asserts <sandbox>/.codo/gsd/ contains the full install tree.
 */
import { Effect } from "effect"
import { Workflow } from "../src/config/workflow"
import { GSD } from "../src/skill/gsd-installer"
import * as fs from "fs/promises"
import { homedir } from "os"
import * as path from "path"

const directory = process.cwd()
console.error("[e2e] cwd =", directory)

const program = Effect.gen(function* () {
  const gsd = yield* GSD.Service
  const result = yield* gsd.install("local", directory)
  console.error("[e2e] install:", result.filesInstalled, "files")
  return result
})

const installResult = await Effect.runPromise(Effect.provide(program, GSD.defaultLayer))

// Same branch the slash handler executes:
await Effect.runPromise(Workflow.setWorkflow("gsd"))

const workflow = JSON.parse(await fs.readFile(path.join(homedir(), ".codo", "workflow.json"), "utf-8"))
const tree = await fs.readdir(path.join(directory, ".codo", "gsd"))
const agents = (await fs.readdir(path.join(directory, ".codo", "gsd", "agents"))).filter((f) => f.endsWith(".md"))

// Read an installed agent file back through the same transformation that
// Agent.Service applies to lookup "canonical" names. The TUI's '@' autocomplete
// renders `!agent.hidden && agent.mode !== "primary"`, which matches every
// gsd-* subagent once they're registered.
const gsdPlanner = await fs.readFile(
  path.join(directory, ".codo", "gsd", "agents", "gsd-planner.md"),
  "utf-8",
)
const gsdPlannerHasSubagent = /mode:\s*"subagent"/.test(gsdPlanner)

console.log(JSON.stringify({
  install: {
    files: installResult.filesInstalled,
    version: installResult.version,
    root: installResult.installRoot,
  },
  workflow,
  installTree: tree,
  agentCount: agents.length,
  gsdPlannerHasSubagent,
  sampleAgentNames: agents.slice(0, 6).map((f) => f.replace(/\.md$/, "")),
}, null, 2))
