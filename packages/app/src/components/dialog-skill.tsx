import { Component, createMemo, createResource } from "solid-js"
import { Dialog } from "@codo-ai/ui/dialog"
import { List } from "@codo-ai/ui/list"
import { useDialog } from "@codo-ai/ui/context/dialog"
import { useSDK } from "@/context/sdk"

type Skill = {
  name: string
  description?: string
  location: string
  content: string
}

export const DialogSkill: Component<{ onSelect: (skill: string) => void }> = (props) => {
  const dialog = useDialog()
  const sdk = useSDK()

  const [skills] = createResource(async (): Promise<Skill[]> => {
    const result = await sdk.client.app.skills()
    return (result.data ?? []) as Skill[]
  })

  // No workflow filter — show every skill from the server. The search box on
  // the List component does the filtering the user actually wants.
  const allSkills = createMemo(() => skills() ?? [])

  return (
    <Dialog title="Skills">
      <List
        class="px-3"
        search={{ placeholder: "Search skills...", autofocus: true }}
        items={allSkills()}
        key={(x) => x.name}
        filterKeys={["name", "description"]}
        sortBy={(a, b) => a.name.localeCompare(b.name)}
        onSelect={(x) => {
          if (!x) return
          props.onSelect(x.name)
          dialog.close()
        }}
        emptyMessage={skills.loading ? "Loading…" : "No skills available"}
      >
        {(item) => (
          <div>
            <div class="font-medium">{item.name}</div>
            {item.description && <div class="text-sm text-neutral-400">{item.description}</div>}
          </div>
        )}
      </List>
    </Dialog>
  )
}
