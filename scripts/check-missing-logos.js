#!/usr/bin/env node
/**
 * Check which D2 logos are missing or incorrect
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

// Read all logo files
const logoFiles = new Set(fs.readdirSync(LOGO_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  .map(f => f.toLowerCase()));

console.log(`✅ Found ${logoFiles.size} logo files\n`);

// Read college-data.ts
const content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

let match;
const missing = [];
const found = [];

while ((match = d2EntryRegex.exec(content)) !== null) {
  const teamName = match[1].replace(/\\'/g, "'");
  const logoPath = match[4];
  const logoFilename = path.basename(logoPath).toLowerCase();
  const fullLogoPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  // Check if file exists
  if (fs.existsSync(fullLogoPath)) {
    found.push({ name: teamName, logo: logoFilename });
  } else {
    // Check if a similar filename exists
    let similarExists = false;
    for (const file of logoFiles) {
      if (file === logoFilename || file.includes(logoFilename.replace(/\.(jpg|jpeg|png)$/i, '')) || logoFilename.replace(/\.(jpg|jpeg|png)$/i, '').includes(file.replace(/\.(jpg|jpeg|png)$/i, ''))) {
        similarExists = true;
        missing.push({ name: teamName, current: logoFilename, suggested: file });
        break;
      }
    }
    if (!similarExists) {
      missing.push({ name: teamName, current: logoFilename, suggested: null });
    }
  }
}

console.log(`📊 Results:\n`);
console.log(`   ✅ Logos found: ${found.length}`);
console.log(`   ❌ Logos missing: ${missing.length}\n`);

if (missing.length > 0) {
  console.log(`❌ Missing/Incorrect Logos:\n`);
  missing.forEach(({ name, current, suggested }) => {
    console.log(`   ${name}`);
    console.log(`   Current: ${current}`);
    if (suggested) {
      console.log(`   Suggested: ${suggested}`);
    } else {
      console.log(`   ⚠️  No similar file found`);
    }
    console.log('');
  });
}


