const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Find the return statement
const returnPos = content.indexOf('  return (');
if (returnPos === -1) {
    console.error('ERROR: Could not find "return ("');
    process.exit(1);
}

console.log('Found return at:', returnPos);

// Find the fragment start
const fragmentPos = content.indexOf('    <>', returnPos);
if (fragmentPos === -1) {
    console.error('ERROR: Could not find fragment');
    process.exit(1);
}

console.log('Found fragment at:', fragmentPos);

// Find the anchor box
const anchorPos = content.indexOf('      <box ref={(r: BoxRenderable) => (anchor = r)} visible={props.visible !== false} width="100%">', fragmentPos);
if (anchorPos === -1) {
    console.error('ERROR: Could not find anchor box');
    process.exit(1);
}

console.log('Found anchor box at:', anchorPos);

// Find the flexDirection row box
const flexRowPos = content.indexOf('        <box width="100%" flexDirection="row" alignItems="stretch">', anchorPos);
if (flexRowPos === -1) {
    console.error('ERROR: Could not find flexDirection row box');
    process.exit(1);
}

console.log('Found flexDirection row box at:', flexRowPos);

// Find the inner content box (the one with paddingLeft={2})
const innerBoxPos = content.indexOf('          <box\n            paddingLeft={2}\n            paddingRight={2}\n            paddingTop={1}\n            flexShrink={0}\n            backgroundColor={tint(theme.background, theme.secondary, 0.15)}\n            flexGrow={1}\n            width="100%"', flexRowPos);
if (innerBoxPos === -1) {
    console.error('ERROR: Could not find inner content box');
    process.exit(1);
}

console.log('Found inner content box at:', innerBoxPos);

// Now replace from flexRowPos to innerBoxPos with the new structure
const before = content.substring(0, flexRowPos);
const after = content.substring(innerBoxPos);

const newStructure = `        <box
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

content = before + newStructure + after;

console.log('First replacement done');

// Now fix the closing tags
// Find:             </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">
const closePattern1 = '            </box>\n          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';

let closePos = content.indexOf(closePattern1);

if (closePos === -1) {
    // Try with different whitespace
    const closePattern2 = '          </box>\n        </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';
    closePos = content.indexOf(closePattern2);
    if (closePos === -1) {
        console.error('ERROR: Could not find close pattern');
        // Search for any </box> followed by the progress bar
        const progressPos = content.indexOf('<box width="100%" flexDirection="row" justifyContent="space-between">');
        console.log('Progress bar at:', progressPos);
        if (progressPos !== -1) {
            // Look backwards for </box> tags
            const beforeProgress = content.substring(0, progressPos);
            const lastBoxClose = beforeProgress.lastIndexOf('</box>');
            console.log('Last </box> before progress at:', lastBoxClose);
            console.log('Context:', content.substring(lastBoxClose - 100, progressPos + 50));
        }
        process.exit(1);
    }
    // Use pattern2
    const newClosePattern2 = '          </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';
    content = content.substring(0, closePos) + newClosePattern2 + content.substring(closePos + closePattern2.length);
    console.log('Second replacement done (pattern2)');
} else {
    const newClosePattern1 = '            </box>\n          </box>\n        <box width="100%" flexDirection="row" justifyContent="space-between">';
    content = content.substring(0, closePos) + newClosePattern1 + content.substring(closePos + closePattern1.length);
    console.log('Second replacement done (pattern1)');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully');