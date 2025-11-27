#!/usr/bin/env node
/**
 * Comprehensive script to verify and fix all D2 logos
 * Checks if files exist and matches to correct filenames
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

// Normalize for matching
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\buniversity\b|\bcollege\b/g, '')
    .trim();
}

// Read all logo files
const logoFiles = fs.readdirSync(LOGO_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f));

console.log(`✅ Found ${logoFiles.length} logo files\n`);

// Create lookup maps
const exactMap = new Map(); // exact filename matches
const normalizedMap = new Map(); // normalized name matches

logoFiles.forEach(filename => {
  const base = filename.toLowerCase();
  const cleanBase = base.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/_sm\.(jpg|jpeg|png)$/i, '').replace(/-\d+\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '');
  const normalized = normalize(cleanBase.replace(/-/g, ' '));
  
  exactMap.set(base, filename);
  exactMap.set(cleanBase, filename);
  normalizedMap.set(normalized, filename);
});

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

let match;
let fixed = 0;
let alreadyCorrect = 0;
let notFound = [];

while ((match = d2EntryRegex.exec(content)) !== null) {
  const teamName = match[1].replace(/\\'/g, "'");
  const slug = match[2];
  const currentLogo = match[4];
  const logoFilename = path.basename(currentLogo);
  const fullLogoPath = path.join(process.cwd(), 'public', currentLogo.replace(/^\//, ''));
  
  // Check if current logo exists
  if (fs.existsSync(fullLogoPath)) {
    alreadyCorrect++;
    continue;
  }
  
  // File doesn't exist, find a match
  const teamNameNorm = normalize(teamName);
  const slugNorm = normalize(slug.replace(/-/g, ' '));
  let matchedLogo = null;
  
  // Try multiple matching strategies
  // 1. Exact filename match (without path)
  if (exactMap.has(logoFilename.toLowerCase())) {
    matchedLogo = exactMap.get(logoFilename.toLowerCase());
  }
  // 2. Normalized team name match
  else if (normalizedMap.has(teamNameNorm)) {
    matchedLogo = normalizedMap.get(teamNameNorm);
  }
  // 3. Slug match
  else if (normalizedMap.has(slugNorm)) {
    matchedLogo = normalizedMap.get(slugNorm);
  }
  // 4. Partial matching
  else {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, value] of normalizedMap.entries()) {
      if (key.includes(teamNameNorm) || teamNameNorm.includes(key)) {
        const keyWords = key.split(/\s+/).filter(w => w.length > 2);
        const teamWords = teamNameNorm.split(/\s+/).filter(w => w.length > 2);
        const overlap = keyWords.filter(w => teamWords.some(tw => tw.includes(w) || w.includes(tw)));
        const score = overlap.length;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = value;
        }
      }
    }
    
    if (bestScore >= 2) {
      matchedLogo = bestMatch;
    }
  }
  
  if (matchedLogo) {
    const newLogoPath = `/d2 college football logos/${matchedLogo}`;
    const escapedOldPath = currentLogo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(logo:\\s*')${escapedOldPath}(')`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, `$1${newLogoPath}$2`);
      console.log(`✅ Fixed: ${teamName}`);
      console.log(`   Old: ${logoFilename}`);
      console.log(`   New: ${matchedLogo}\n`);
      fixed++;
    }
  } else {
    notFound.push({ name: teamName, current: logoFilename });
  }
}

// Write updated content
if (fixed > 0) {
  fs.writeFileSync(COLLEGE_DATA_FILE, content, 'utf8');
  console.log(`\n✅ Fixed ${fixed} logo paths`);
} else {
  console.log(`\n⚠️  No logos were fixed`);
}

console.log(`\n📊 Summary:`);
console.log(`   - Already correct: ${alreadyCorrect}`);
console.log(`   - Fixed: ${fixed}`);
console.log(`   - Not found: ${notFound.length}`);

if (notFound.length > 0) {
  console.log(`\n⚠️  Could not find logos for:`);
  notFound.forEach(({ name, current }) => {
    console.log(`   - ${name} (current: ${current})`);
  });
}


