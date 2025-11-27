#!/usr/bin/env node
/**
 * Simple script to check which logo files exist vs what's in the data
 * Run this to see which logos are missing
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

// Get all actual files
const actualFiles = new Set(
  fs.readdirSync(LOGO_DIR)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => f.toLowerCase())
);

console.log(`Found ${actualFiles.size} logo files\n`);

// Read and parse D2 entries
const content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');
const d2Regex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',[^}]*logo:\s*'([^']+)',[^}]*division:\s*'D2'/g;

const missing = [];
let total = 0;

let match;
while ((match = d2Regex.exec(content)) !== null) {
  total++;
  const name = match[1].replace(/\\'/g, "'");
  const logoPath = match[2];
  const filename = path.basename(logoPath).toLowerCase();
  const fullPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  if (!fs.existsSync(fullPath) && !actualFiles.has(filename)) {
    // Try to find similar
    let found = null;
    for (const file of actualFiles) {
      const fileBase = file.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '');
      const logoBase = filename.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '');
      if (fileBase === logoBase || file.includes(logoBase) || logoBase.includes(fileBase)) {
        found = file;
        break;
      }
    }
    missing.push({ name, current: filename, suggested: found });
  }
}

console.log(`Checked ${total} D2 entries\n`);
console.log(`Missing/Incorrect: ${missing.length}\n`);

if (missing.length > 0) {
  missing.forEach(({ name, current, suggested }) => {
    console.log(`${name}`);
    console.log(`  Current: ${current}`);
    if (suggested) {
      console.log(`  → Use: ${suggested}`);
    } else {
      console.log(`  ⚠️  No match found`);
    }
    console.log('');
  });
} else {
  console.log('✅ All logos found!');
}


