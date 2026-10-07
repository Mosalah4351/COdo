import { TextAttributes } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createSignal } from "solid-js"
import { getScrollAcceleration } from "../util/scroll"
import { useClipboard } from "../context/clipboard"
import { InstallationVersion } from "@codo-ai/core/installation/version"
import { useExit } from "../context/exit"
import { RtlText } from "./rtl-text"

export function ErrorComponent(props: { error: Error; reset: () => void; mode?: "dark" | "light" }) {
  const term = useTerminalDimensions()
  const exit = useExit()
  const clipboard = useClipboard()

  useKeyboard((evt) => {
    if (evt.ctrl && evt.name === "c") {
      void exit()
    }
  })
  const [copied, setCopied] = createSignal(false)

  const issueURL = new URL("https://github.com/anomalyco/COdo/issues/new?template=bug-report.yml")

  // Choose safe fallback colors per mode since theme context may not be available
  const isLight = props.mode === "light"
  const colors = {
    bg: isLight ? "#ffffff" : "#0a0a0a",
    text: isLight ? "#1a1a1a" : "#eeeeee",
    muted: isLight ? "#8a8a8a" : "#808080",
    primary: isLight ? "#3b7dd8" : "#fab283",
  }

  if (props.error.message) {
    issueURL.searchParams.set("title", `opentui: fatal: ${props.error.message}`)
  }

  if (props.error.stack) {
    issueURL.searchParams.set(
      "description",
      "```\n" + props.error.stack.substring(0, 6000 - issueURL.toString().length) + "...\n```",
    )
  }

  issueURL.searchParams.set("COdo-version", InstallationVersion)

  const copyIssueURL = () => {
    void clipboard.write?.(issueURL.toString()).then(() => {
      setCopied(true)
    })
  }

  return (
    <box flexDirection="column" gap={1} backgroundColor={colors.bg}>
      <box flexDirection="row" gap={1} alignItems="center">
        <RtlText attributes={TextAttributes.BOLD} fg={colors.text}>
          Please report an issue.
        </RtlText>
        <box onMouseUp={copyIssueURL} backgroundColor={colors.primary} padding={1}>
          <RtlText attributes={TextAttributes.BOLD} fg={colors.bg}>
            Copy issue URL (exception info pre-filled)
          </RtlText>
        </box>
        {copied() && <RtlText fg={colors.muted}>Successfully copied</RtlText>}
      </box>
      <box flexDirection="row" gap={2} alignItems="center">
        <RtlText fg={colors.text}>A fatal error occurred!</RtlText>
        <box onMouseUp={props.reset} backgroundColor={colors.primary} padding={1}>
          <RtlText fg={colors.bg}>Reset TUI</RtlText>
        </box>
        <box onMouseUp={() => void exit()} backgroundColor={colors.primary} padding={1}>
          <RtlText fg={colors.bg}>Exit</RtlText>
        </box>
      </box>
      <scrollbox height={Math.floor(term().height * 0.7)} scrollAcceleration={getScrollAcceleration()}>
        <RtlText fg={colors.muted}>{props.error.stack}</RtlText>
      </scrollbox>
      <RtlText fg={colors.text}>{props.error.message}</RtlText>
    </box>
  )
}
