#!/usr/bin/env node
/**
 * Match missing logos by parsing logo filenames and matching to teams
 * Handles both simple filenames and sch-{name}-{timestamp}_sm.jpg patterns
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

// Helper to create slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^university-of-|^college-of-|^the-/g, '')
    .trim();
}

// Normalize for matching
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\buniversity\b|\bcollege\b/g, '')
    .trim();
}

// Extract team name from logo filename
function extractTeamNameFromLogo(filename) {
  const base = path.basename(filename, path.extname(filename)).toLowerCase();
  
  // Pattern 1: sch-{team}-{timestamp}_sm.jpg
  if (base.startsWith('sch-')) {
    return base
      .replace(/^sch-/, '')
      .replace(/-\d+_sm$/, '')
      .replace(/_sm$/, '')
      .replace(/-\d+$/, '');
  }
  
  // Pattern 2: Simple name like "adams state.jpg"
  return base;
}

// Read logo files
let logoFiles = [];
if (fs.existsSync(LOGO_DIR)) {
  logoFiles = fs.readdirSync(LOGO_DIR)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => ({
      filename: f,
      teamPart: extractTeamNameFromLogo(f),
      normalized: normalize(extractTeamNameFromLogo(f).replace(/-/g, ' '))
    }));
  console.log(`✅ Found ${logoFiles.length} logo files\n`);
} else {
  console.error(`❌ Logo directory not found: ${LOGO_DIR}`);
  process.exit(1);
}

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Extract all college entries - improved regex to handle multi-line entries
const entriesMatch = content.match(/export const collegeEntries: CollegeEntry\[\] = \[([\s\S]*?)\]/);
if (!entriesMatch) {
  console.error('❌ Could not find collegeEntries array');
  process.exit(1);
}

const entriesString = entriesMatch[1];
const entries = [];

// Improved regex to handle entries that may span multiple lines
const entryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'([^']+)',\s*logo:\s*'([^']+)',?\s*\}/g;
let match;
while ((match = entryRegex.exec(entriesString)) !== null) {
  entries.push({
    name: match[1].replace(/\\'/g, "'"),
    slug: match[2],
    conference: match[3].replace(/\\'/g, "'"),
    division: match[4],
    logo: match[5],
    fullMatch: match[0],
    index: match.index
  });
}

console.log(`✅ Parsed ${entries.length} college entries\n`);

// Find entries with missing/incorrect logos (check D2 entries specifically)
const d2Entries = entries.filter(e => e.division === 'D2');
console.log(`📊 Found ${d2Entries.length} D2 entries\n`);

const missingLogos = d2Entries.filter(entry => {
  const logoPath = entry.logo;
  const fullPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  // Check if it's a placeholder, TODO, or file doesn't exist
  if (logoPath.includes('TODO') || logoPath.includes('placeholder')) {
    return true;
  }
  
  // Check if file actually exists
  if (!fs.existsSync(fullPath)) {
    return true;
  }
  
  return false;
});

console.log(`📊 Found ${missingLogos.length} D2 entries with missing/incorrect logos\n`);

// Match logos to teams
let matched = 0;
let updated = 0;
const usedLogos = new Set();

missingLogos.forEach(entry => {
  const teamSlug = entry.slug;
  const teamNameNorm = normalize(entry.name);
  
  // Try to find matching logo
  let bestMatch = null;
  let bestScore = 0;
  
  logoFiles.forEach(logo => {
    // Skip if already used
    if (usedLogos.has(logo.filename)) {
      return;
    }
    
    let score = 0;
    
    // Exact slug match
    if (logo.teamPart === teamSlug) {
      score = 100;
    }
    // Slug contains team slug or vice versa
    else if (logo.teamPart.includes(teamSlug) || teamSlug.includes(logo.teamPart)) {
      score = 85;
    }
    // Normalized name exact match
    else if (logo.normalized === teamNameNorm) {
      score = 90;
    }
    // Normalized name contains match
    else if (logo.normalized.includes(teamNameNorm) || teamNameNorm.includes(logo.normalized)) {
      // Check word-by-word matching for better accuracy
      const logoWords = logo.normalized.split(/\s+/).filter(w => w.length > 2);
      const teamWords = teamNameNorm.split(/\s+/).filter(w => w.length > 2);
      const matchingWords = logoWords.filter(w => teamWords.some(tw => tw.includes(w) || w.includes(tw)));
      
      if (matchingWords.length >= 2) {
        score = 75;
      } else if (matchingWords.length === 1) {
        score = 60;
      } else {
        score = 50;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = logo;
    }
  });
  
  if (bestMatch && bestScore >= 50) {
    matched++;
    const newLogoPath = `/d2 college football logos/${bestMatch.filename}`;
    
    // Update the entry in content - be more precise with replacement
    const escapedLogo = entry.logo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacement = `logo: '${newLogoPath}'`;
    
    // Find the exact location and replace
    const logoPattern = new RegExp(`logo:\\s*'${escapedLogo}'`, 'g');
    if (logoPattern.test(content)) {
      content = content.replace(logoPattern, replacement);
      usedLogos.add(bestMatch.filename);
      console.log(`✅ Matched: ${entry.name} -> ${bestMatch.filename} (score: ${bestScore})`);
      updated++;
    } else {
      console.log(`⚠️  Could not find logo pattern for: ${entry.name}`);
    }
  } else {
    console.log(`⚠️  No match found for: ${entry.name} (slug: ${teamSlug})`);
  }
});

// Write updated content
if (updated > 0) {
  fs.writeFileSync(COLLEGE_DATA_FILE, content, 'utf8');
  console.log(`\n✅ Updated ${updated} logo paths in ${COLLEGE_DATA_FILE}`);
} else {
  console.log(`\n⚠️  No logos were updated`);
}

console.log(`\n📊 Summary:`);
console.log(`   - D2 entries: ${d2Entries.length}`);
console.log(`   - Entries with missing logos: ${missingLogos.length}`);
console.log(`   - Successfully matched: ${matched}`);
console.log(`   - Updated in file: ${updated}`);
