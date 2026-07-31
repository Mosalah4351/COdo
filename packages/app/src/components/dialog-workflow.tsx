import { Component, createSignal, onMount, Show } from "solid-js"
import { Dialog } from "@codo-ai/ui/dialog"
import { List } from "@codo-ai/ui/list"
import { useDialog } from "@codo-ai/ui/context/dialog"
import { Persist, persisted } from "@/utils/persist"
import { showToast } from "@/utils/toast"
import { createStore } from "solid-js/store"
import { useSDK } from "@/context/sdk"
import { useSync } from "@/context/sync"

type WorkflowType = "gsd" | "speckit" | "gstack" | "vibe" | null
type GsdScope = "local" | "global" | null

const workflows = [
  { id: "gsd" as WorkflowType, name: "GSD", description: "Get Shit Done - Spec-driven with milestones" },
  { id: "speckit" as WorkflowType, name: "Spec Kit", description: "GitHub's spec-driven toolkit" },
  { id: "gstack" as WorkflowType, name: "GStack", description: "Garry Tan's 23-tool workflow" },
  { id: "vibe" as WorkflowType, name: "Vibe Mode", description: "No workflow, just code" },
]

const gsdScopes = [
  { id: "global" as GsdScope, name: "Global", description: "Install to ~/.config/codo/gsd — shared across all projects" },
  { id: "local" as GsdScope, name: "Local", description: "Install to <project>/.codo/gsd — pinned to this repo only" },
]

export const DialogWorkflow: Component = () => {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const [store, setStore] = persisted(Persist.global("selected_workflow"), createStore<{ workflow: WorkflowType }>({ workflow: null }))
  const [busy, setBusy] = createSignal(false)
  const [stage, setStage] = createSignal<"pick-workflow" | "pick-gsd-scope">("pick-workflow")
  const [pendingWorkflow, setPendingWorkflow] = createSignal<WorkflowType>(null)

  const currentWorkflow = () => store.workflow
  const currentSessionID = () => sync.data.session?.id

  const invokeWorkflowCommand = async (cmd: string) => {
    const sessionID = currentSessionID()
    if (!sessionID) {
      showToast({
        title: "Workflow saved locally",
        description: "Open a session and run /workflow " + cmd + " to apply it globally.",
        variant: "warning",
      })
      return
    }
    setBusy(true)
    try {
      await sdk.client.session.command({ sessionID, command: "workflow", arguments: cmd })
    } catch (err) {
      showToast({ title: "Failed to run /workflow", description: String(err), variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  const handleSelectWorkflow = (wf: WorkflowType) => {
    if (wf === "vibe" || wf === null) {
      setStore("workflow", wf)
      void invokeWorkflowCommand("default")
      showToast({ title: "Workflow: none", variant: "success" })
      dialog.clear()
      return
    }
    if (wf === "gsd") {
      setPendingWorkflow(wf)
      setStage("pick-gsd-scope")
      return
    }
    showToast({ title: "Workflow not yet supported", description: `${wf} support is coming in a future release.`, variant: "warning" })
    dialog.clear()
  }

  const handleSelectScope = async (scope: GsdScope) => {
    if (!scope) return
    const wf = pendingWorkflow()
    if (!wf) return
    setStore("workflow", wf)
    await invokeWorkflowCommand(`gsd ${scope}`)
    showToast({ title: `GSD installed (${scope})`, description: "Use @ to summon any of the 33 gsd-* subagents.", variant: "success" })
    dialog.clear()
  }

  return (
    <Dialog title="Select development workflow" onClose={() => dialog.clear()}>
      <Show
        when={stage() === "pick-workflow"}
        fallback={
          <List
            class="px-3"
            search={{ placeholder: "Choose scope…", autofocus: true }}
            items={gsdScopes}
            filterKeys={["name", "description"]}
            onSelect={(x) => x && handleSelectScope(x.id)}
          >
            {(item) => (
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium">{item.name}</div>
                  <div class="text-sm text-neutral-400">{item.description}</div>
                </div>
              </div>
            )}
          </List>
        }
      >
        <List
          class="px-3"
          search={{ placeholder: "Search workflows...", autofocus: true }}
          items={workflows}
          filterKeys={["name", "description"]}
          sortBy={(a, b) => a.name.localeCompare(b.name)}
          onSelect={(x) => {
            if (x) handleSelectWorkflow(x.id)
          }}
        >
          {(item) => (
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">{item.name}</div>
                <div class="text-sm text-neutral-400">{item.description}</div>
              </div>
              {currentWorkflow() === item.id && <span class="text-green-500">✓</span>}
            </div>
          )}
        </List>
      </Show>
    </Dialog>
  )
}

