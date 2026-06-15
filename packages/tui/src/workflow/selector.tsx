import { DialogSelect } from "../ui/dialog-select"

export type WorkflowType = "gsd" | "speckit" | "gstack" | "vibe"

const workflows = [
  { id: "gsd" as WorkflowType, name: "GSD", description: "Get Shit Done - Spec-driven with milestones" },
  { id: "speckit" as WorkflowType, name: "Spec Kit", description: "GitHub's spec-driven toolkit" },
  { id: "gstack" as WorkflowType, name: "GStack", description: "Garry Tan's 23-tool workflow" },
  { id: "vibe" as WorkflowType, name: "Vibe Mode", description: "No workflow, just code" },
]

export function WorkflowSelector(props: { onSelect: (workflow: WorkflowType) => void }) {
  const options = workflows.map((workflow) => ({
    title: workflow.name,
    description: workflow.description,
    value: workflow.id,
  }))

  return (
    <DialogSelect
      title="Select development workflow"
      options={options}
      onSelect={(option) => props.onSelect(option.value)}
    />
  )
}
