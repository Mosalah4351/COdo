const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Find the exact boundaries
// Start: line 1361: `        <box width="100%" flexDirection="row" alignItems="stretch">`
// End of that section: line 1381: `            }}` (end of customBorderChars for border box) + `          >` (line 1381)
// Actually, we need to replace from line 1361 to line 1381 (the opening of the inner content box)

const startPattern = '        <box width="100%" flexDirection="row" alignItems="stretch">\n          <Show when={local.agent.current()}>\n            <box\n              width={2}\n              flexShrink={0}\n              flexGrow={0}\n              backgroundColor={highlight()}\n              borderColor={highlight()}\n            />\n          </Show>\n          <box\n            flexBasis={0}\n            flexGrow={1}\n            minWidth={0}\n            border={["left"]}\n            borderColor={borderHighlight()}\n            customBorderChars={\n              ...SplitBorder.customBorderChars,\n              bottomLeft: "��",\n            }\n          >\n          <box\n            paddingLeft={2}\n            paddingRight={2}\n            paddingTop={1}\n            flexShrink={0}\n            backgroundColor={tint(theme.background, theme.secondary, 0.15)}\n            flexGrow={1}\n            width="100%"';

const startPos = content.indexOf(startPattern);
if (startPos === -1) {
    console.error('ERROR: Could not find start pattern');
    // Try to find partial
    const partial = content.indexOf('        <box width="100%" flexDirection="row" alignItems="stretch">');
    console.log('Partial found at:', partial);
    if (partial !== -1) {
        console.log('Context:', content.substring(partial, partial + 500));
    }
    process.exit(1);
}

console.log('Found start pattern at:', startPos);

const replacement1 = `        <box
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

content = content.substring(0, startPos) + replacement1 + content.substring(startPos + startPattern.length);
console.log('First replacement done');

// Now find the closing tags to fix
// Looking for:            </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">
const endPattern = '            </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';

const endPos = content.indexOf(endPattern);
if (endPos === -1) {
    console.error('ERROR: Could not find end pattern');
    // Try variations
    const alt1 = content.indexOf('          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">');
    const alt2 = content.indexOf('        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">');
    console.log('alt1:', alt1, 'alt2:', alt2);
    if (alt1 !== -1) {
        const replacement2 = '          </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';
        content = content.substring(0, alt1) + replacement2 + content.substring(alt1 + '          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">'.length);
        console.log('Second replacement done (alt1)');
    } else if (alt2 !== -1) {
        const replacement2 = '        <box width="100%" flexDirection="row" justifyContent="space-between">';
        content = content.substring(0, alt2) + replacement2 + content.substring(alt2 + '        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">'.length);
        console.log('Second replacement done (alt2)');
    } else {
        process.exit(1);
    }
} else {
    const replacement2 = '            </box>\n          </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';
    content = content.substring(0, endPos) + replacement2 + content.substring(endPos + endPattern.length);
    console.log('Second replacement done (main)');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully');