import { useProject } from "../../context/project"
import { useSync } from "../../context/sync"
import { createMemo, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../config"
import { InstallationChannel, InstallationVersion } from "@codo-ai/core/installation/version"
import { usePluginRuntime } from "../../plugin/runtime"

import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { RtlText } from "../../component/rtl-text"
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
                <RtlText fg={theme.text}>
                  <b>{session()!.title}</b>
                </RtlText>
                <Show when={InstallationChannel !== "latest"}>
                  <RtlText fg={theme.textMuted}>{props.sessionID}</RtlText>
                </Show>
                <Show when={session()!.workspaceID}>
                  <RtlText fg={theme.textMuted}>
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
                  </RtlText>
                </Show>
                <Show when={session()!.share?.url}>
                  <RtlText fg={theme.textMuted}>{session()!.share!.url}</RtlText>
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
                  <RtlText fg={theme.text}>
                    <b>Goal</b>
                  </RtlText>
                </box>
                <Show when={goal()?.condition}>
                  {(condition) => (
                    <box flexDirection="row" gap={1}>
                      <RtlText flexShrink={0} fg={theme.primary}>
                        •
                      </RtlText>
                      <RtlText fg={theme.textMuted} wrapMode="word">
                        {condition()}
                      </RtlText>
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
                      <RtlText flexShrink={0} fg={status().dot}>
                        •
                      </RtlText>
                      <RtlText fg={theme.textMuted} wrapMode="word">
                        Judge: {status().label}
                      </RtlText>
                    </box>
                  )}
                </Show>
              </box>
            </Show>
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <pluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            <RtlText fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>•</span> <b>CO</b>
              <span style={{ fg: theme.text }}>
                <b>do</b>
              </span>{" "}
              <span>{InstallationVersion}</span>
            </RtlText>
          </pluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
