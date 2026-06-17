import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { createResource, createMemo } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useSDK } from "../context/sdk"
import { useKV } from "../context/kv"
import type { WorkflowType } from "../workflow/selector"

export type DialogSkillProps = {
  onSelect: (skill: string) => void
}

export function DialogSkill(props: DialogSkillProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const kv = useKV()
  dialog.setSize("large")

  const [skills] = createResource(async () => {
    const result = await sdk.client.app.skills()
    return result.data ?? []
  })

  const selectedWorkflow = kv.get<WorkflowType>("selected_workflow")

  const filteredSkills = createMemo(() => {
    const list = skills() ?? []
    if (!selectedWorkflow) return list
    
    return list.filter((skill) => {
      const name = skill.name.toLowerCase()
      const desc = (skill.description || "").toLowerCase()
      
      const hasGsd = name.includes("gsd") || desc.includes("(gsd)")
      const hasSpeckit = name.includes("speckit") || desc.includes("(speckit)")
      const hasGstack = name.includes("gstack") || desc.includes("(gstack)")
      const hasVibe = name.includes("vibe") || desc.includes("(vibe)")
      
      const hasAnyWorkflow = hasGsd || hasSpeckit || hasGstack || hasVibe
      
      if (selectedWorkflow === "vibe") {
        return !hasAnyWorkflow
      }
      
      if (!hasAnyWorkflow) return true
      
      if (selectedWorkflow === "gsd") return hasGsd
      if (selectedWorkflow === "speckit") return hasSpeckit
      if (selectedWorkflow === "gstack") return hasGstack
      
      return true
    })
  })

  const options = createMemo<DialogSelectOption<string>[]>(() => {
    const list = filteredSkills()
    const maxWidth = Math.max(0, ...list.map((s) => s.name.length))
    return list.map((skill) => ({
      title: skill.name.padEnd(maxWidth),
      description: skill.description?.replace(/\s+/g, " ").trim(),
      value: skill.name,
      category: "Skills",
      onSelect: () => {
        props.onSelect(skill.name)
        dialog.clear()
      },
    }))
  })

  return <DialogSelect title="Skills" placeholder="Search skills..." options={options()} />
}
