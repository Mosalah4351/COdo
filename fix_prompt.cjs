const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// First replacement: Replace the flexDirection="row" wrapper with RoundedBorder
const old1 = `return (
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
            width="100%"`;

const new1 = `return (
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
            width="100%"`;

if (!content.includes(old1)) {
    console.error('ERROR: Could not find old1 pattern');
    process.exit(1);
}

content = content.replace(old1, new1);
console.log('First replacement done');

// Second replacement: Remove the extra closing </box> for the flexDirection="row" wrapper
const old2 = `            </box>
          </box>
        </box>
        <box width="100%" flexDirection="row" justifyContent="space-between">`;

const new2 = `            </box>
          </box>
        <box width="100%" flexDirection="row" justifyContent="space-between">`;

if (!content.includes(old2)) {
    console.error('ERROR: Could not find old2 pattern');
    process.exit(1);
}

content = content.replace(old2, new2);
console.log('Second replacement done');

fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully');