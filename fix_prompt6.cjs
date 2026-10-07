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

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find the flexDirection="row" wrapper start
    if (flexRowStart === -1 && line.includes('flexDirection="row" alignItems="stretch">')) {
        flexRowStart = i;
        console.log('flexRowStart at line', i + 1, ':', line.trim());
    }
    
    // Find the inner content box start (paddingLeft={2} on one line, paddingRight={2} on next)
    if (innerBoxStart === -1 && flexRowStart !== -1 && i > flexRowStart) {
        if (line.includes('paddingLeft={2}') && i + 1 < lines.length && lines[i + 1].includes('paddingRight={2}')) {
            innerBoxStart = i;
            console.log('innerBoxStart at line', i + 1, ':', line.trim());
        }
    }
    
    // Find the progress bar row start
    if (progressBarStart === -1 && line.includes('width="100%" flexDirection="row" justifyContent="space-between"')) {
        progressBarStart = i;
        console.log('progressBarStart at line', i + 1, ':', line.trim());
    }
}

console.log('flexRowStart:', flexRowStart);
console.log('innerBoxStart:', innerBoxStart);
console.log('progressBarStart:', progressBarStart);

if (flexRowStart === -1 || innerBoxStart === -1 || progressBarStart === -1) {
    console.error('ERROR: Could not find all markers');
    process.exit(1);
}

// The lines to replace: from flexRowStart to innerBoxStart - 1 (inclusive)
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
        console.log('Removed extra </box> at index', newProgressBarStart - 1);
    }
}

fs.writeFileSync(filePath, result.join('\n'), 'utf8');
console.log('File written successfully');