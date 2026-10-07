import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { RtlText } from "../component/rtl-text"
import { useDialog, type DialogContext } from "./dialog"
import { useBindings } from "../keymap"

export type DialogAlertProps = {
  title: string
  message: string
  onConfirm?: () => void
}

export function DialogAlert(props: DialogAlertProps) {
  const dialog = useDialog()
  const { theme } = useTheme()

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Confirm alert",
        group: "Dialog",
        cmd: () => {
          props.onConfirm?.()
          dialog.clear()
        },
      },
    ],
  }))
  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <RtlText attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </RtlText>
        <RtlText fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </RtlText>
      </box>
      <box paddingBottom={1}>
        <RtlText fg={theme.textMuted}>{props.message}</RtlText>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.primary}
          onMouseUp={() => {
            props.onConfirm?.()
            dialog.clear()
          }}
        >
          <RtlText fg={theme.selectedListItemText}>ok</RtlText>
        </box>
      </box>
    </box>
  )
}

DialogAlert.show = (dialog: DialogContext, title: string, message: string) => {
  return new Promise<void>((resolve) => {
    dialog.replace(
      () => <DialogAlert title={title} message={message} onConfirm={() => resolve()} />,
      () => resolve(),
    )
  })
}
