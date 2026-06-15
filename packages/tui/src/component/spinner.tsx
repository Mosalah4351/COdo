import { Show, createSignal, onCleanup, onMount } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import type { JSX } from "@opentui/solid"
import type { RGBA } from "@opentui/core"

const THINKING_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const LOADING_FRAMES = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]
const PULSE_FRAMES = ["░", "▒", "▓", "█", "▓", "▒", "░"]

export function Spinner(props: { children?: JSX.Element; color?: RGBA; variant?: "thinking" | "loading" | "pulse" }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.primary
  const [frame, setFrame] = createSignal(0)
  
  const frames = () => {
    switch (props.variant) {
      case "loading": return LOADING_FRAMES
      case "pulse": return PULSE_FRAMES
      default: return THINKING_FRAMES
    }
  }
  
  onMount(() => {
    if (!kv.get("animations_enabled", true)) return
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames().length)
    }, props.variant === "pulse" ? 100 : 80)
    onCleanup(() => clearInterval(interval))
  })
  
  return (
    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={color()}>⋯ {props.children}</text>}>
      <box flexDirection="row" gap={1}>
        <text fg={color()}>{frames()[frame()]}</text>
        <Show when={props.children}>
          <text fg={color()}>{props.children}</text>
        </Show>
      </box>
    </Show>
  )
}
