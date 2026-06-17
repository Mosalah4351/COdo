import { useProject } from "../../context/project"
import { useSync } from "../../context/sync"
import { createMemo, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../config"
import { InstallationChannel, InstallationVersion } from "@codo-ai/core/installation/version"
import { usePluginRuntime } from "../../plugin/runtime"

import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { SplitBorder } from "../../ui/border"

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const pluginRuntime = usePluginRuntime()
  const project = useProject()
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const session = createMemo(() => sync.session.get(props.sessionID))
  const goal = createMemo(() => sync.goal.get(props.sessionID))
  const workspace = () => {
    const workspaceID = session()?.workspaceID
    if (!workspaceID) return
    return project.workspace.get(workspaceID)
  }
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))

  return (
    <Show when={session()}>
      <box
        backgroundColor={theme.backgroundPanel}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox
          flexGrow={1}
          scrollAcceleration={scrollAcceleration()}
          verticalScrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.background,
              foregroundColor: theme.borderActive,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingRight={1}>
            <pluginRuntime.Slot
              name="sidebar_title"
              mode="single_winner"
              session_id={props.sessionID}
              title={session()!.title}
              share_url={session()!.share?.url}
            >
              <box paddingRight={1}>
                <text fg={theme.text}>
                  <b>{session()!.title}</b>
                </text>
                <Show when={InstallationChannel !== "latest"}>
                  <text fg={theme.textMuted}>{props.sessionID}</text>
                </Show>
                <Show when={session()!.workspaceID}>
                  <text fg={theme.textMuted}>
                    <Show
                      when={workspace()}
                      fallback={<WorkspaceLabel type="unknown" name={session()!.workspaceID!} status="error" icon />}
                    >
                      {(item) => (
                        <WorkspaceLabel
                          type={item().type}
                          name={item().name}
                          status={project.workspace.status(item().id) ?? "error"}
                          icon
                        />
                      )}
                    </Show>
                  </text>
                </Show>
                <Show when={session()!.share?.url}>
                  <text fg={theme.textMuted}>{session()!.share!.url}</text>
                </Show>
              </box>
            </pluginRuntime.Slot>
            <pluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} />
            <Show when={goal()?.condition || (() => {
              const g = goal()
              return g?.lastMessageID && g.verdicts[g.lastMessageID]
            })()}>
              <box>
                <box flexDirection="row" gap={1}>
                  <text fg={theme.text}>
                    <b>Goal</b>
                  </text>
                </box>
                <Show when={goal()?.condition}>
                  {(condition) => (
                    <box flexDirection="row" gap={1}>
                      <text flexShrink={0} fg={theme.primary}>
                        •
                      </text>
                      <text fg={theme.textMuted} wrapMode="word">
                        {condition()}
                      </text>
                    </box>
                  )}
                </Show>
                <Show when={(() => {
                  const g = goal()
                  if (!g?.lastMessageID) return undefined
                  const v = g.verdicts[g.lastMessageID]
                  if (!v) return undefined
                  if (v.error) return { dot: theme.textMuted, label: "error (stopped)" }
                  if (v.ok) return { dot: theme.success, label: "met" }
                  if (v.impossible) return { dot: theme.error, label: "impossible" }
                  return { dot: theme.warning, label: `round ${v.attempt} · not met` }
                })()}>
                  {(status) => (
                    <box flexDirection="row" gap={1}>
                      <text flexShrink={0} fg={status().dot}>
                        •
                      </text>
                      <text fg={theme.textMuted} wrapMode="word">
                        Judge: {status().label}
                      </text>
                    </box>
                  )}
                </Show>
              </box>
            </Show>
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <pluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>•</span> <b>CO</b>
              <span style={{ fg: theme.text }}>
                <b>do</b>
              </span>{" "}
              <span>{InstallationVersion}</span>
            </text>
          </pluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
