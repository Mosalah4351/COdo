import { Component, For, createSignal } from "solid-js"

export type WorkflowType = "gsd" | "speckit" | "gstack" | "vibe"

const workflows = [
  { id: "gsd" as WorkflowType, name: "GSD", description: "Get Shit Done - Spec-driven with milestones" },
  { id: "speckit" as WorkflowType, name: "Spec Kit", description: "GitHub's spec-driven toolkit" },
  { id: "gstack" as WorkflowType, name: "GStack", description: "Garry Tan's 23-tool workflow" },
  { id: "vibe" as WorkflowType, name: "Vibe Mode", description: "No workflow, just code" },
]

export function WorkflowSelector(props: { onSelect: (workflow: WorkflowType) => void }) {
  const [selected, setSelected] = createSignal(0)

  return (
    <div>
      <h2>Select development workflow:</h2>
      <For each={workflows}>
        {(workflow, index) => (
          <div
            class={selected() === index() ? "selected" : ""}
            onClick={() => {
              setSelected(index())
              props.onSelect(workflow.id)
            }}
          >
            <strong>{workflow.name}</strong>
            <p>{workflow.description}</p>
          </div>
        )}
      </For>
    </div>
  )
}
