import { Context, Effect, Layer } from "effect"
import { homedir } from "os"
import { join } from "path"
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs"

export interface Interface {
  readonly workflow: "gsd" | "default"
}

const defaultInterface: Interface = {
  get workflow() {
    return loadWorkflowSync()
  },
}

export class Service extends Context.Service<Service, Interface>()("@codo/Workflow") {
  /**
   * Live accessor that never requires the layer to be registered. Reads
   * `~/.codo/workflow.json` lazily. Tests often construct partial graphs that
   * omit Workflow; in that case the runtime context falls back to the live
   * disk read.
   */
  static live(): Interface {
    return defaultInterface
  }

  get workflow(): "gsd" | "default" {
    return loadWorkflowSync()
  }
}

export const loadWorkflowSync = (): "gsd" | "default" => {
  const workflowPath = join(homedir(), ".codo", "workflow.json")
  if (!existsSync(workflowPath)) return "default" as const
  try {
    const raw = readFileSync(workflowPath, "utf-8")
    const parsed = JSON.parse(raw)
    return parsed.workflow === "gsd" ? ("gsd" as const) : ("default" as const)
  } catch {
    return "default" as const
  }
}

export const defaultLayer = Layer.effect(Service, Effect.sync(() => Service.of({ workflow: loadWorkflowSync() })))

export const setWorkflow = (wf: "gsd" | "default") => Effect.sync(() => {
  const dir = join(homedir(), ".codo")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "workflow.json"), JSON.stringify({ workflow: wf }, null, 2), "utf-8")
})

export * as Workflow from "./workflow"
