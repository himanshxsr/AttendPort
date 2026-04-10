const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain';
const targetSessions = [
    '81d71867-fdff-4c2b-b58b-192dfca31c45', // April 9 session
    'd27b2c3e-372e-4549-8e88-68a2f6991b9f'  // April 8 session
];

function findAttendanceData(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            findAttendanceData(fullPath);
        } else if (file.endsWith('.txt') || file.endsWith('.json') || file.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('"userId"') && content.includes('"totalHours"')) {
                console.log(`--- FOUND POTENTIAL DATA IN: ${fullPath} ---`);
                // Extract only the JSON blocks to keep output clean
                const matches = content.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
                if (matches) {
                    matches.forEach(m => {
                        console.log(m.substring(0, 1000)); // Print first 1000 chars of each match
                        console.log('\n--- END OF BLOCK ---\n');
                    });
                } else {
                    // Try matching individual objects
                     const objMatches = content.match(/\{[\s\S]*?"userId"[\s\S]*?"totalHours"[\s\S]*?\}/g);
                     if (objMatches) objMatches.forEach(m => console.log(m.substring(0, 500)));
                }
            }
        }
    }
}

console.log('Starting deep forensic search for attendance logs...');
targetSessions.forEach(session => {
    const sessionPath = path.join(brainDir, session);
    if (fs.existsSync(sessionPath)) {
        console.log(`Mining Session: ${session}`);
        findAttendanceData(sessionPath);
    }
});
