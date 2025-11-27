#!/usr/bin/env node
/**
 * Fix D2 logos by checking if files exist and matching to correct filenames
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
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  .map(f => ({
    filename: f,
    normalized: normalize(f.replace(/\.(jpg|jpeg|png)$/i, '').replace(/^sch-/, '').replace(/-\d+_sm$/, '').replace(/_sm$/, '').replace(/-\d+$/, ''))
  }));

console.log(`✅ Found ${logoFiles.length} logo files\n`);

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries and check their logos
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

let match;
let fixed = 0;
let notFound = 0;
const usedLogos = new Set();

while ((match = d2EntryRegex.exec(content)) !== null) {
  const teamName = match[1].replace(/\\'/g, "'");
  const logoPath = match[4];
  const fullLogoPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  // Check if file exists
  if (fs.existsSync(fullLogoPath)) {
    continue; // Logo exists, skip
  }
  
  // File doesn't exist, find a match
  const teamNameNorm = normalize(teamName);
  let bestMatch = null;
  let bestScore = 0;
  
  logoFiles.forEach(logo => {
    if (usedLogos.has(logo.filename)) return;
    
    let score = 0;
    
    // Exact normalized match
    if (logo.normalized === teamNameNorm) {
      score = 100;
    }
    // Contains match
    else if (logo.normalized.includes(teamNameNorm) || teamNameNorm.includes(logo.normalized)) {
      // Word-by-word matching
      const logoWords = logo.normalized.split(/\s+/).filter(w => w.length > 2);
      const teamWords = teamNameNorm.split(/\s+/).filter(w => w.length > 2);
      const matchingWords = logoWords.filter(w => teamWords.some(tw => tw.includes(w) || w.includes(tw)));
      
      if (matchingWords.length >= 2) {
        score = 80;
      } else if (matchingWords.length === 1) {
        score = 60;
      } else {
        score = 40;
      }
    }
    
    if (score > bestScore && score >= 60) {
      bestScore = score;
      bestMatch = logo;
    }
  });
  
  if (bestMatch) {
    const newLogoPath = `/d2 college football logos/${bestMatch.filename}`;
    const escapedOldPath = logoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(logo:\\s*')${escapedOldPath}(')`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, `$1${newLogoPath}$2`);
      usedLogos.add(bestMatch.filename);
      console.log(`✅ Fixed: ${teamName} -> ${bestMatch.filename} (score: ${bestScore})`);
      fixed++;
    }
  } else {
    console.log(`⚠️  No match found for: ${teamName} (current: ${logoPath})`);
    notFound++;
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
console.log(`   - Fixed: ${fixed}`);
console.log(`   - Not found: ${notFound}`);


