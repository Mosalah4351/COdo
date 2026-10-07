import { TextAttributes } from "@opentui/core"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useBindings } from "../keymap"
import { RtlText } from "./rtl-text"

export function DialogWorkspaceUnavailable(props: { onRestore?: () => boolean | void | Promise<boolean | void> }) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "restore" as "cancel" | "restore",
  })

  const options = ["cancel", "restore"] as const

  async function confirm() {
    if (store.active === "cancel") {
      dialog.clear()
      return
    }
    const result = await props.onRestore?.()
    if (result === false) return
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "Confirm workspace option", group: "Dialog", cmd: () => void confirm() },
      { key: "left", desc: "Cancel workspace restore", group: "Dialog", cmd: () => setStore("active", "cancel") },
      { key: "right", desc: "Restore workspace", group: "Dialog", cmd: () => setStore("active", "restore") },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <RtlText attributes={TextAttributes.BOLD} fg={theme.text}>
          Workspace Unavailable
        </RtlText>
        <RtlText fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </RtlText>
      </box>
      <RtlText fg={theme.textMuted} wrapMode="word">
        This session is attached to a workspace that is no longer available.
      </RtlText>
      <RtlText fg={theme.textMuted} wrapMode="word">
        Would you like to restore this session into a new workspace?
      </RtlText>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1} gap={1}>
        <For each={options}>
          {(item) => (
            <box
              paddingLeft={2}
              paddingRight={2}
              backgroundColor={item === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                setStore("active", item)
                void confirm()
              }}
            >
              <RtlText fg={item === store.active ? theme.selectedListItemText : theme.textMuted}>{item}</RtlText>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
