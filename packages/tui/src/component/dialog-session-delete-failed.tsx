import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useBindings } from "../keymap"
import { RtlText } from "./rtl-text"

export function DialogSessionDeleteFailed(props: {
  session: string
  workspace: string
  onDelete?: () => boolean | void | Promise<boolean | void>
  onRestore?: () => boolean | void | Promise<boolean | void>
  onDone?: () => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "delete" as "delete" | "restore",
  })

  const options = [
    {
      id: "delete" as const,
      title: "Delete workspace",
      description: "Delete the workspace and all sessions attached to it.",
      run: props.onDelete,
    },
    {
      id: "restore" as const,
      title: "Restore to new workspace",
      description: "Try to restore this session into a new workspace.",
      run: props.onRestore,
    },
  ]

  async function confirm() {
    const result = await options.find((item) => item.id === store.active)?.run?.()
    if (result === false) return
    props.onDone?.()
    if (!props.onDone) dialog.clear()
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "Confirm recovery option", group: "Dialog", cmd: () => void confirm() },
      { key: "left", desc: "Delete broken session", group: "Dialog", cmd: () => setStore("active", "delete") },
      { key: "up", desc: "Delete broken session", group: "Dialog", cmd: () => setStore("active", "delete") },
      { key: "right", desc: "Restore broken session", group: "Dialog", cmd: () => setStore("active", "restore") },
      { key: "down", desc: "Restore broken session", group: "Dialog", cmd: () => setStore("active", "restore") },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <RtlText attributes={TextAttributes.BOLD} fg={theme.text}>
          Failed to Delete Session
        </RtlText>
        <RtlText fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </RtlText>
      </box>
      <RtlText fg={theme.textMuted} wrapMode="word">
        {`The session "${props.session}" could not be deleted because the workspace "${props.workspace}" is not available.`}
      </RtlText>
      <RtlText fg={theme.textMuted} wrapMode="word">
        Choose how you want to recover this broken workspace session.
      </RtlText>
      <box flexDirection="column" paddingBottom={1} gap={1}>
        <For each={options}>
          {(item) => (
            <box
              flexDirection="column"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
              backgroundColor={item.id === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                setStore("active", item.id)
                void confirm()
              }}
            >
              <RtlText
                attributes={TextAttributes.BOLD}
                fg={item.id === store.active ? theme.selectedListItemText : theme.text}
              >
                {item.title}
              </RtlText>
              <RtlText fg={item.id === store.active ? theme.selectedListItemText : theme.textMuted} wrapMode="word">
                {item.description}
              </RtlText>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
