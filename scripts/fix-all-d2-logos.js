#!/usr/bin/env node
/**
 * Fix all D2 logos by matching team names to actual logo filenames
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

// Read all logo files and create lookup
const logoFiles = fs.readdirSync(LOGO_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f));

console.log(`✅ Found ${logoFiles.length} logo files\n`);

// Create a map of normalized names to filenames
const logoMap = new Map();
logoFiles.forEach(filename => {
  const base = filename.replace(/\.(jpg|jpeg|png)$/i, '').toLowerCase();
  // Remove sch- prefix and timestamp if present
  const cleanName = base.replace(/^sch-/, '').replace(/-\d+_sm$/, '').replace(/_sm$/, '').replace(/-\d+$/, '');
  const normalized = normalize(cleanName.replace(/-/g, ' '));
  logoMap.set(normalized, filename);
  
  // Also add the base name (for exact matches)
  logoMap.set(normalize(base.replace(/^sch-/, '').replace(/-\d+_sm$/, '').replace(/_sm$/, '').replace(/-\d+$/, '')), filename);
});

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

let match;
let fixed = 0;
let notFound = [];

while ((match = d2EntryRegex.exec(content)) !== null) {
  const teamName = match[1].replace(/\\'/g, "'");
  const slug = match[2];
  const currentLogo = match[4];
  const fullLogoPath = path.join(process.cwd(), 'public', currentLogo.replace(/^\//, ''));
  
  // Check if current logo exists
  if (fs.existsSync(fullLogoPath)) {
    continue; // Logo exists, skip
  }
  
  // Find matching logo
  const teamNameNorm = normalize(teamName);
  let matchedLogo = null;
  
  // Try exact normalized match
  if (logoMap.has(teamNameNorm)) {
    matchedLogo = logoMap.get(teamNameNorm);
  } else {
    // Try slug-based matching
    const slugNorm = normalize(slug.replace(/-/g, ' '));
    if (logoMap.has(slugNorm)) {
      matchedLogo = logoMap.get(slugNorm);
    } else {
      // Try partial matching
      for (const [key, value] of logoMap.entries()) {
        if (key.includes(teamNameNorm) || teamNameNorm.includes(key)) {
          // Check word overlap
          const keyWords = key.split(/\s+/).filter(w => w.length > 2);
          const teamWords = teamNameNorm.split(/\s+/).filter(w => w.length > 2);
          const overlap = keyWords.filter(w => teamWords.some(tw => tw.includes(w) || w.includes(tw)));
          if (overlap.length >= 2) {
            matchedLogo = value;
            break;
          }
        }
      }
    }
  }
  
  if (matchedLogo) {
    const newLogoPath = `/d2 college football logos/${matchedLogo}`;
    const escapedOldPath = currentLogo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(logo:\\s*')${escapedOldPath}(')`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, `$1${newLogoPath}$2`);
      console.log(`✅ Fixed: ${teamName} -> ${matchedLogo}`);
      fixed++;
    }
  } else {
    notFound.push(teamName);
  }
}

// Write updated content
if (fixed > 0) {
  fs.writeFileSync(COLLEGE_DATA_FILE, content, 'utf8');
  console.log(`\n✅ Fixed ${fixed} logo paths`);
} else {
  console.log(`\n⚠️  No logos were fixed`);
}

if (notFound.length > 0) {
  console.log(`\n⚠️  Could not find logos for ${notFound.length} teams:`);
  notFound.forEach(name => console.log(`   - ${name}`));
}

console.log(`\n📊 Summary:`);
console.log(`   - Fixed: ${fixed}`);
console.log(`   - Not found: ${notFound.length}`);


