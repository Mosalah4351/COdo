const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the exact return statement block
const startMarker = '  return (\n    <>\n      <box ref={(r: BoxRenderable) => (anchor = r)} visible={props.visible !== false} width="100%">\n        <box width="100%" flexDirection="row" alignItems="stretch">';

// Find the start position
const startPos = content.indexOf(startMarker);
if (startPos === -1) {
    console.error('ERROR: Could not find start marker');
    process.exit(1);
}

console.log('Found start at position:', startPos);

// Find the end of the flexDirection="row" wrapper section
// We need to find the matching closing tags
// The structure is:
// <box width="100%" flexDirection="row" alignItems="stretch">
//   <Show>...</Show>
//   <box flexBasis={0} flexGrow={1} minWidth={0} border={["left"]} ...>
//     <box paddingLeft={2} ...>
//       <textarea ...>
//       <box flexDirection="row" ...>
//       </box>
//     </box>
//   </box>
// </box>

// Let me find the position after the inner content box starts
const innerBoxMarker = '          <box\n            paddingLeft={2}\n            paddingRight={2}\n            paddingTop={1}\n            flexShrink={0}\n            backgroundColor={tint(theme.background, theme.secondary, 0.15)}\n            flexGrow={1}\n            width="100%"';

const innerPos = content.indexOf(innerBoxMarker, startPos);
if (innerPos === -1) {
    console.error('ERROR: Could not find inner box marker');
    process.exit(1);
}

console.log('Found inner box at position:', innerPos);

// Now we need to replace from startMarker to just before the inner box
// The replacement should be:
const replacement = `  return (
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

// Replace from startPos to innerPos with replacement
const before = content.substring(0, startPos);
const after = content.substring(innerPos);
content = before + replacement + after;

console.log('First replacement done');

// Now fix the closing tags - remove the extra </box>
// Find the pattern:             </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">
const closeMarker = '            </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';

const closePos = content.indexOf(closeMarker);
if (closePos === -1) {
    console.error('ERROR: Could not find close marker');
    // Let's search for variations
    const alt1 = content.indexOf('            </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row"');
    const alt2 = content.indexOf('          </box>\n        </box>\n        <box width="100%" flexDirection="row"');
    console.log('alt1:', alt1, 'alt2:', alt2);
    process.exit(1);
}

console.log('Found close marker at position:', closePos);

const newCloseMarker = '            </box>\n          </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';

content = content.substring(0, closePos) + newCloseMarker + content.substring(closePos + closeMarker.length);

console.log('Second replacement done');

fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully');