import { useTheme } from "../context/theme"
import { RtlText } from "./rtl-text"

export function PluginRouteMissing(props: { id: string; onHome: () => void }) {
  const { theme } = useTheme()

  return (
    <box width="100%" height="100%" alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
      <RtlText fg={theme.warning}>Unknown plugin route: {props.id}</RtlText>
      <box onMouseUp={props.onHome} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1}>
        <RtlText fg={theme.text}>go home</RtlText>
      </box>
    </box>
  )
}
