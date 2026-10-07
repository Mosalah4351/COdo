const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'tui', 'src', 'component', 'prompt', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Split into lines
const lines = content.split('\n');

// Line numbers (0-indexed):
// flexRowStart: line 1360 (line 1361 in 1-indexed)
// innerBoxOpeningStart: line 1381 (line 1382 in 1-indexed) - the "<box" line
// innerBoxOpeningEnd: line 1389 (line 1390 in 1-indexed) - the ">" line
// progressBarStart: line 1505 (line 1506 in 1-indexed)
// extraCloseBox: line 1504 (line 1505 in 1-indexed) - the extra "</box>" before progress bar

const flexRowStart = 1360;
const innerBoxOpeningStart = 1381;
const innerBoxOpeningEnd = 1389;
const progressBarStart = 1505;
const extraCloseBox = 1504;

console.log('flexRowStart:', flexRowStart, lines[flexRowStart]);
console.log('innerBoxOpeningStart:', innerBoxOpeningStart, lines[innerBoxOpeningStart]);
console.log('innerBoxOpeningEnd:', innerBoxOpeningEnd, lines[innerBoxOpeningEnd]);
console.log('progressBarStart:', progressBarStart, lines[progressBarStart]);
console.log('extraCloseBox:', extraCloseBox, lines[extraCloseBox]);

// Verify the markers
if (!lines[flexRowStart].includes('flexDirection="row" alignItems="stretch">')) {
    console.error('ERROR: flexRowStart marker mismatch');
    process.exit(1);
}
if (!lines[innerBoxOpeningStart].includes('<box')) {
    console.error('ERROR: innerBoxOpeningStart marker mismatch');
    process.exit(1);
}
if (!lines[innerBoxOpeningEnd].trim() === '>') {
    console.error('ERROR: innerBoxOpeningEnd marker mismatch, got:', lines[innerBoxOpeningEnd]);
    process.exit(1);
}
if (!lines[progressBarStart].includes('justifyContent="space-between"')) {
    console.error('ERROR: progressBarStart marker mismatch');
    process.exit(1);
}
if (!lines[extraCloseBox].trim() === '</box>') {
    console.error('ERROR: extraCloseBox marker mismatch, got:', lines[extraCloseBox]);
    process.exit(1);
}

console.log('All markers verified!');

// New structure to replace lines [flexRowStart ... innerBoxOpeningEnd]
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
    '            width="100%"',
    '          >'
];

// Replace lines[flexRowStart ... innerBoxOpeningEnd] with newLines
const before = lines.slice(0, flexRowStart);
const after = lines.slice(innerBoxOpeningEnd + 1); // Start after the inner box opening ">"
const result = [...before, ...newLines, ...after];

console.log('First replacement done, new length:', result.length);

// Now remove the extra </box> at extraCloseBox
// But indices have shifted due to the replacement
// Original extraCloseBox was 1504, we removed (innerBoxOpeningEnd - flexRowStart + 1) = 30 lines and added 14 lines
// So shift = 14 - 30 = -16
// New extraCloseBox index = 1504 - 16 = 1488

const linesRemoved = innerBoxOpeningEnd - flexRowStart + 1;
const linesAdded = newLines.length;
const shift = linesAdded - linesRemoved;
console.log('Lines removed:', linesRemoved, 'Lines added:', linesAdded, 'Shift:', shift);

const newExtraCloseBox = extraCloseBox + shift;
console.log('newExtraCloseBox index:', newExtraCloseBox, 'line:', result[newExtraCloseBox]);

if (result[newExtraCloseBox].trim() === '</box>') {
    // Verify the previous line is also </box> (border box close)
    if (result[newExtraCloseBox - 1].trim() === '</box>') {
        result.splice(newExtraCloseBox, 1);
        console.log('Removed extra </box> at index', newExtraCloseBox);
    } else {
        console.error('ERROR: Previous line is not </box>', result[newExtraCloseBox - 1]);
        process.exit(1);
    }
} else {
    console.error('ERROR: Expected </box> at newExtraCloseBox, got:', result[newExtraCloseBox]);
    process.exit(1);
}

fs.writeFileSync(filePath, result.join('\n'), 'utf8');
console.log('File written successfully');