import type { TuiPlugin, TuiPluginApi } from "@codo-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, For, Show, createSignal } from "solid-js"
import { RtlText } from "../../component/rtl-text"

const id = "internal:sidebar-lsp"

function View(props: { api: TuiPluginApi }) {
  const [open, setOpen] = createSignal(true)
  const theme = () => props.api.theme.current
  const list = createMemo(() => props.api.state.lsp())
  const off = createMemo(() => !props.api.state.config.lsp)

  return (
    <box>
      <box flexDirection="row" gap={1} onMouseDown={() => list().length > 2 && setOpen((x) => !x)}>
        <Show when={list().length > 2}>
          <RtlText fg={theme().text}>{open() ? "▼" : "▶"}</RtlText>
        </Show>
        <RtlText fg={theme().text}>
          <b>LSP</b>
        </RtlText>
      </box>
      <Show when={list().length <= 2 || open()}>
        <Show when={list().length === 0}>
          <RtlText fg={theme().textMuted}>{off() ? "LSPs are disabled" : "LSPs will activate as files are read"}</RtlText>
        </Show>
        <For each={list()}>
          {(item) => (
            <box flexDirection="row" gap={1}>
              <RtlText
                flexShrink={0}
                style={{
                  fg: item.status === "connected" ? theme().success : theme().error,
                }}
              >
                •
              </RtlText>
              <RtlText fg={theme().textMuted}>
                {item.id} {item.root}
              </RtlText>
            </box>
          )}
        </For>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 300,
    slots: {
      sidebar_content() {
        return <View api={api} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = {
  id,
  tui,
}

export default plugin
