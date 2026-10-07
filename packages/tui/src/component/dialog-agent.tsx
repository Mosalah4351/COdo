import { createMemo } from "solid-js"
import { useLocal } from "../context/local"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"

type Group = "Security team" | "Orchestration" | "Core" | "Other"

function groupFor(name: string): Group {
  if (name.startsWith("sec-")) return "Security team"
  if (name === "compose" || name.startsWith("gsd-")) return "Orchestration"
  if (name === "plan" || name === "build") return "Core"
  return "Other"
}

// Persona chips: security first, orchestration second, primitives last.
const GROUP_ORDER: readonly Group[] = ["Security team", "Orchestration", "Core", "Other"]

export function DialogAgent() {
  const local = useLocal()
  const dialog = useDialog()

  const options = createMemo((): DialogSelectOption<string>[] => {
    const items = local.agent.list()
    const byGroup = new Map<Group, typeof items>()
    for (const agent of items) {
      const group = groupFor(agent.name)
      const existing = byGroup.get(group) ?? []
      existing.push(agent)
      byGroup.set(group, existing)
    }
    const out: DialogSelectOption<string>[] = []
    for (const label of GROUP_ORDER) {
      const groupItems = byGroup.get(label)
      if (!groupItems?.length) continue
      for (const agent of groupItems) {
        out.push({
          value: agent.name,
          title: agent.name,
          description: agent.native ? "native" : agent.description,
          category: label,
        })
      }
    }
    return out
  })

  return (
    <DialogSelect
      title="Select agent"
      current={local.agent.current()?.name}
      options={options()}
      onSelect={(option) => {
        local.agent.set(option.value)
        dialog.clear()
      }}
    />
  )
}
