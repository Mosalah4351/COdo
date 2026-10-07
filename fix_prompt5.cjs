const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Split into lines
const lines = content.split('\n');

// Find the key line numbers (0-indexed)
let flexRowStart = -1;
let innerBoxStart = -1;
let progressBarStart = -1;
let extraCloseBox = -1; // The extra </box> to remove

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find the flexDirection="row" wrapper start (line 1361 in original = index 1360)
    if (flexRowStart === -1 && line.includes('flexDirection="row" alignItems="stretch">')) {
        flexRowStart = i;
        console.log('flexRowStart at line', i + 1);
    }
    
    // Find the inner content box start (paddingLeft={2})
    if (innerBoxStart === -1 && flexRowStart !== -1 && line.includes('paddingLeft={2}') && line.includes('paddingRight={2}')) {
        innerBoxStart = i;
        console.log('innerBoxStart at line', i + 1);
    }
    
    // Find the progress bar row start
    if (progressBarStart === -1 && line.includes('width="100%" flexDirection="row" justifyContent="space-between"')) {
        progressBarStart = i;
        console.log('progressBarStart at line', i + 1);
    }
    
    // Find the extra </box> that closes the flexRow wrapper (should be right before progress bar)
    if (extraCloseBox === -1 && progressBarStart !== -1 && i === progressBarStart - 1 && line.trim() === '</box>') {
        extraCloseBox = i;
        console.log('extraCloseBox at line', i + 1);
    }
}

console.log('flexRowStart:', flexRowStart);
console.log('innerBoxStart:', innerBoxStart);
console.log('progressBarStart:', progressBarStart);
console.log('extraCloseBox:', extraCloseBox);

if (flexRowStart === -1 || innerBoxStart === -1 || progressBarStart === -1) {
    console.error('ERROR: Could not find all markers');
    process.exit(1);
}

// The lines to replace: from flexRowStart to innerBoxStart - 1 (inclusive)
// We'll replace those lines with the new RoundedBorder structure
const newLines = [
    '        <box',
    '          width="100%"',
    '          border={RoundedBorder.border}',
    '          borderColor={borderHighlight()}',
    '          customBorderChars={RoundedBorder.customBorderChars}',
    '        >',
    '          <box',
    '            paddingLeft={2}',
    '            paddingRight={2}',
    '            paddingTop={1}',
    '            flexShrink={0}',
    '            backgroundColor={tint(theme.background, theme.secondary, 0.15)}',
    '            flexGrow={1}',
    '            width="100%"'
];

// Replace lines[flexRowStart ... innerBoxStart-1] with newLines
const before = lines.slice(0, flexRowStart);
const after = lines.slice(innerBoxStart);
const result = [...before, ...newLines, ...after];

// Now find and remove the extra </box> before progress bar
// Need to re-find progressBarStart in the new array
let newProgressBarStart = -1;
for (let i = 0; i < result.length; i++) {
    if (result[i].includes('width="100%" flexDirection="row" justifyContent="space-between"')) {
        newProgressBarStart = i;
        break;
    }
}

console.log('newProgressBarStart:', newProgressBarStart);

// The extra </box> should be at newProgressBarStart - 1
if (newProgressBarStart > 0 && result[newProgressBarStart - 1].trim() === '</box>') {
    // Check if the one before that is also </box> (the border box close)
    if (result[newProgressBarStart - 2].trim() === '</box>') {
        // Remove the one at newProgressBarStart - 1 (the extra one)
        result.splice(newProgressBarStart - 1, 1);
        console.log('Removed extra </box>');
    }
}

fs.writeFileSync(filePath, result.join('\n'), 'utf8');
console.log('File written successfully');