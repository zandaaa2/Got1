#!/usr/bin/env node
/**
 * Find which D2 logo files are missing
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

// Get all actual logo files (case-insensitive check)
const actualFiles = fs.readdirSync(LOGO_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  .map(f => f.toLowerCase());

const fileSet = new Set(actualFiles);
console.log(`Found ${actualFiles.length} logo files in directory\n`);

// Read college-data.ts
const content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

const missing = [];
let total = 0;

while ((match = d2EntryRegex.exec(content)) !== null) {
  total++;
  const teamName = match[1].replace(/\\'/g, "'");
  const logoPath = match[4];
  const logoFilename = path.basename(logoPath);
  const fullPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  if (!fs.existsSync(fullPath)) {
    // Check if a similar file exists (case-insensitive)
    const logoLower = logoFilename.toLowerCase();
    const similarFile = actualFiles.find(f => 
      f === logoLower || 
      f.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '') === logoLower.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '')
    );
    
    missing.push({
      name: teamName,
      current: logoFilename,
      exists: fs.existsSync(fullPath),
      similar: similarFile || null
    });
  }
}

console.log(`Total D2 entries: ${total}`);
console.log(`Missing logos: ${missing.length}\n`);

if (missing.length > 0) {
  console.log('Missing/Incorrect Logos:\n');
  missing.forEach(({ name, current, similar }) => {
    console.log(`${name}`);
    console.log(`  Current: ${current}`);
    if (similar) {
      console.log(`  → Should be: ${similar}`);
    } else {
      console.log(`  ⚠️  No similar file found`);
    }
    console.log('');
  });
} else {
  console.log('✅ All logos found!');
}


