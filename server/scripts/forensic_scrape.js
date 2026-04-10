const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain';

function scanDir(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile() && (file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.md'))) {
                const content = fs.readFileSync(fullPath, 'utf8');
                // Look for common patterns in our DB logs
                if (content.includes('"userId"') || content.includes('"leaveType"') || content.includes('"attendanceId"')) {
                    console.log(`\n--- FOUND POTENTIAL DATA IN: ${fullPath} ---`);
                    // Print a snapshot of the content to see if it's what we want
                    console.log(content.substring(0, 2000)); 
                }
            }
        }
    } catch (e) {
        // Silently skip locked folders
    }
}

console.log('Starting Forensic Scrape...');
scanDir(brainDir);
console.log('Scrape Complete.');
