#!/usr/bin/env node
/**
 * Add D2 teams from JSON file to college-data.ts
 * This script reads d2-teams-complete.json and matches logos
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');
const TEAMS_JSON = path.join(process.cwd(), 'scripts', 'd2-teams-complete.json');

// Helper functions
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^university-of-|^college-of-|^the-/g, '')
    .trim();
}

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\buniversity\b|\bcollege\b/g, '')
    .trim();
}

// Read teams JSON
let teams = [];
try {
  const teamsData = JSON.parse(fs.readFileSync(TEAMS_JSON, 'utf8'));
  teams = teamsData.teams;
  console.log(`✅ Loaded ${teams.length} D2 teams from JSON\n`);
} catch (error) {
  console.error(`❌ Error reading teams JSON: ${error.message}`);
  process.exit(1);
}

// Read logo files
let logoFiles = [];
try {
  if (fs.existsSync(LOGO_DIR)) {
    logoFiles = fs.readdirSync(LOGO_DIR)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`✅ Found ${logoFiles.length} logo files\n`);
  } else {
    console.log(`⚠️  Logo directory not found: ${LOGO_DIR}\n`);
  }
} catch (error) {
  console.error(`❌ Error reading logo directory: ${error.message}\n`);
}

// Match function
function findLogoForTeam(team) {
  const teamSlug = createSlug(team.name);
  const commonSlug = createSlug(team.common);
  const nameNorm = normalize(team.name);
  const commonNorm = normalize(team.common);
  
  // Try exact slug match
  for (const logo of logoFiles) {
    const base = path.basename(logo, path.extname(logo)).toLowerCase();
    if (base === teamSlug || base === commonSlug) {
      return logo;
    }
  }
  
  // Try partial match
  for (const logo of logoFiles) {
    const base = path.basename(logo, path.extname(logo)).toLowerCase();
    if (base.includes(teamSlug) || teamSlug.includes(base) ||
        base.includes(commonSlug) || commonSlug.includes(base)) {
      return logo;
    }
  }
  
  // Try word-based matching
  const nameWords = nameNorm.split(/\s+/).filter(w => w.length > 3);
  for (const logo of logoFiles) {
    const base = normalize(path.basename(logo, path.extname(logo)));
    const baseWords = base.split(/\s+/);
    if (nameWords.some(word => baseWords.some(bw => bw.includes(word) || word.includes(bw)))) {
      return logo;
    }
  }
  
  return null;
}

// Process teams
const entries = [];
const matchedLogos = new Set();
const unmatchedTeams = [];

teams.forEach(team => {
  const logoFile = findLogoForTeam(team);
  const slug = createSlug(team.name);
  
  if (logoFile) {
    matchedLogos.add(logoFile);
    entries.push({
      name: team.name,
      slug: slug,
      conference: team.conference,
      division: 'D2',
      logo: `/d2 college football logos/${logoFile}`,
      matched: true,
    });
  } else {
    unmatchedTeams.push(team);
    entries.push({
      name: team.name,
      slug: slug,
      conference: team.conference,
      division: 'D2',
      logo: `/d2 college football logos/${slug}.jpg`, // Placeholder
      matched: false,
    });
  }
});

console.log(`📊 Results:`);
console.log(`   ✅ Matched: ${matchedLogos.size} logos`);
console.log(`   ⚠️  Unmatched: ${unmatchedTeams.length} teams need logo matching\n`);

// Read and update college-data.ts
if (!fs.existsSync(COLLEGE_DATA_FILE)) {
  console.error(`❌ College data file not found: ${COLLEGE_DATA_FILE}`);
  process.exit(1);
}

let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');
const lastBracketIndex = content.lastIndexOf(']');

if (lastBracketIndex === -1) {
  console.error('❌ Could not find closing bracket in college-data.ts');
  process.exit(1);
}

const beforeEntries = content.substring(0, lastBracketIndex);
const afterEntries = content.substring(lastBracketIndex);

// Generate entries string
const entriesStr = entries.map(entry => {
  const name = entry.name.replace(/'/g, "\\'");
  const conference = entry.conference.replace(/'/g, "\\'");
  const reviewComment = !entry.matched ? ' // TODO: Match logo file' : '';
  
  return `  {
    name: '${name}',
    slug: '${entry.slug}',
    conference: '${conference}',
    division: 'D2',
    logo: '${entry.logo}',
  },${reviewComment}`;
}).join('\n');

const newContent = beforeEntries + ',\n' + entriesStr + '\n' + afterEntries;

// Write back
fs.writeFileSync(COLLEGE_DATA_FILE, newContent, 'utf8');

console.log(`✅ Added ${entries.length} D2 entries to college-data.ts\n`);

if (unmatchedTeams.length > 0) {
  console.log(`⚠️  Teams needing logo matching (first 10):`);
  unmatchedTeams.slice(0, 10).forEach(team => {
    console.log(`   - ${team.name}`);
  });
  if (unmatchedTeams.length > 10) {
    console.log(`   ... and ${unmatchedTeams.length - 10} more`);
  }
}

console.log(`\n📝 Next steps:`);
console.log(`   1. Review entries marked with TODO`);
console.log(`   2. Manually match logo files for unmatched teams`);
console.log(`   3. Verify all paths are correct`);


