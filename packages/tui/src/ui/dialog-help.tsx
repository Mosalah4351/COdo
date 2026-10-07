import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { RtlText } from "../component/rtl-text"
import { useDialog } from "./dialog"
import { useBindings, useCommandShortcut } from "../keymap"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const commandShortcut = useCommandShortcut("command.palette.show")

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "Close help", group: "Dialog", cmd: () => dialog.clear() },
      { key: "escape", desc: "Close help", group: "Dialog", cmd: () => dialog.clear() },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <RtlText attributes={TextAttributes.BOLD} fg={theme.text}>
          Help
        </RtlText>
        <RtlText fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc/enter
        </RtlText>
      </box>
      <box paddingBottom={1}>
        <RtlText fg={theme.textMuted}>
          Press {commandShortcut()} to see all available actions and commands in any context.
        </RtlText>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box paddingLeft={3} paddingRight={3} backgroundColor={theme.primary} onMouseUp={() => dialog.clear()}>
          <RtlText fg={theme.selectedListItemText}>ok</RtlText>
        </box>
      </box>
    </box>
  )
}
