import { createMemo, Match, onCleanup, onMount, Show, Switch } from "solid-js"
import { useTheme } from "../../context/theme"
import { RtlText } from "../../component/rtl-text"
import { useSync } from "../../context/sync"
import { useDirectory } from "../../context/directory"
import { useConnected } from "../../component/use-connected"
import { createStore } from "solid-js/store"
import { useRoute } from "../../context/route"
import {
  neverAskMode,
  skipPermissions,
  toggleNeverAsk,
  toggleSkipPermissions,
} from "../../util/permission-modes"

export function Footer() {
  const { theme } = useTheme()
  const sync = useSync()
  const route = useRoute()
  const mcp = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)
  const mcpError = createMemo(() => Object.values(sync.data.mcp).some((x) => x.status === "failed"))
  const lsp = createMemo(() => Object.keys(sync.data.lsp))
  const permissions = createMemo(() => {
    if (route.data.type !== "session") return []
    return sync.data.permission[route.data.sessionID] ?? []
  })
  const directory = useDirectory()
  const connected = useConnected()

  const [store, setStore] = createStore({
    welcome: false,
  })

  onMount(() => {
    // Track all timeouts to ensure proper cleanup
    const timeouts: ReturnType<typeof setTimeout>[] = []

    function tick() {
      if (connected()) return
      if (!store.welcome) {
        setStore("welcome", true)
        timeouts.push(setTimeout(() => tick(), 5000))
        return
      }

      if (store.welcome) {
        setStore("welcome", false)
        timeouts.push(setTimeout(() => tick(), 10_000))
        return
      }
    }
    timeouts.push(setTimeout(() => tick(), 10_000))

    onCleanup(() => {
      timeouts.forEach(clearTimeout)
    })
  })

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0}>
      <RtlText fg={theme.textMuted}>{directory()}</RtlText>
      <box gap={2} flexDirection="row" flexShrink={0}>
        <Switch>
          <Match when={store.welcome}>
            <RtlText fg={theme.text}>
              Get started <span style={{ fg: theme.textMuted }}>/connect</span>
            </RtlText>
          </Match>
          <Match when={connected()}>
            <Show when={permissions().length > 0}>
              <RtlText fg={theme.warning}>
                <span style={{ fg: theme.warning }}>△</span> {permissions().length} Permission
                {permissions().length > 1 ? "s" : ""}
              </RtlText>
            </Show>
            <RtlText fg={theme.text}>
              <span style={{ fg: lsp().length > 0 ? theme.success : theme.textMuted }}>•</span> {lsp().length} LSP
            </RtlText>
            <Show when={mcp()}>
              <RtlText fg={theme.text}>
                <Switch>
                  <Match when={mcpError()}>
                    <span style={{ fg: theme.error }}>⊙ </span>
                  </Match>
                  <Match when={true}>
                    <span style={{ fg: theme.success }}>⊙ </span>
                  </Match>
                </Switch>
                {mcp()} MCP
              </RtlText>
            </Show>
            <RtlText
              fg={skipPermissions() ? theme.success : theme.textMuted}
              onMouseUp={() => toggleSkipPermissions()}
            >
              {skipPermissions() ? "Skip-permissions: on" : "Skip-permissions: off"}
            </RtlText>
            <RtlText
              fg={neverAskMode() ? theme.success : theme.textMuted}
              onMouseUp={() => toggleNeverAsk()}
            >
              {neverAskMode() ? "Never-ask: on" : "Never-ask: off"}
            </RtlText>
            <RtlText fg={theme.textMuted}>/status</RtlText>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
