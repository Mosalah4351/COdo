$content = Get-Content "D:\COdo\packages\tui\src\component\prompt\index.tsx" -Raw

# Replace the flexDirection="row" wrapper with RoundedBorder
$old = 'return (
    <>
      <box ref={(r: BoxRenderable) => (anchor = r)} visible={props.visible !== false} width="100%">
        <box width="100%" flexDirection="row" alignItems="stretch">
          <Show when={local.agent.current()}>
            <box
              width={2}
              flexShrink={0}
              flexGrow={0}
              backgroundColor={highlight()}
              borderColor={highlight()}
            />
          </Show>
          <box
            flexBasis={0}
            flexGrow={1}
            minWidth={0}
            border={["left"]}
            borderColor={borderHighlight()}
            customBorderChars={{
              ...SplitBorder.customBorderChars,
              bottomLeft: "��",
            }}
          >
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            flexShrink={0}
            backgroundColor={tint(theme.background, theme.secondary, 0.15)}
            flexGrow={1}
            width="100%"'

$new = 'return (
    <>
      <box ref={(r: BoxRenderable) => (anchor = r)} visible={props.visible !== false} width="100%">
        <box
          width="100%"
          border={RoundedBorder.border}
          borderColor={borderHighlight()}
          customBorderChars={RoundedBorder.customBorderChars}
        >
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            flexShrink={0}
            backgroundColor={tint(theme.background, theme.secondary, 0.15)}
            flexGrow={1}
            width="100%"'

$content = $content -replace [Regex]::Escape($old), $new

Set-Content "D:\COdo\packages\tui\src\component\prompt\index.tsx" -Value $content -Encoding UTF8
Write-Host "First replacement done"