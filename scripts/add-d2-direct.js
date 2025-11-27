#!/usr/bin/env node
/**
 * Direct D2 teams addition - bypasses terminal issues
 * Reads JSON and logo files, adds to college-data.ts
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');
const TEAMS_JSON = path.join(process.cwd(), 'scripts', 'd2-teams-complete.json');

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

// Read teams
const teamsData = JSON.parse(fs.readFileSync(TEAMS_JSON, 'utf8'));
const teams = teamsData.teams;

// Read logo files
let logoFiles = [];
if (fs.existsSync(LOGO_DIR)) {
  logoFiles = fs.readdirSync(LOGO_DIR)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => f.toLowerCase());
}

// Match logo to team based on filename pattern: sch-{team-slug}-{timestamp}_sm.jpg
function findLogo(team) {
  const teamSlug = createSlug(team.name);
  const commonSlug = createSlug(team.common);
  
  // Logo files are like: sch-winston-salem-state-17533728611274_sm.jpg
  // Extract the team part (between 'sch-' and the timestamp)
  for (const logo of logoFiles) {
    const base = logo.replace(/\.(jpg|jpeg|png)$/i, '').replace(/_sm$/, '');
    // Remove timestamp (numbers at the end)
    const teamPart = base.replace(/^sch-/, '').replace(/-\d+$/, '');
    
    if (teamPart === teamSlug || teamPart === commonSlug ||
        teamPart.includes(teamSlug) || teamSlug.includes(teamPart) ||
        teamPart.includes(commonSlug) || commonSlug.includes(teamPart)) {
      return logo;
    }
  }
  return null;
}

// Generate entries
const entries = teams.map(team => {
  const slug = createSlug(team.name);
  const logoFile = findLogo(team);
  
  return {
    name: team.name,
    slug: slug,
    conference: team.conference,
    division: 'D2',
    logo: logoFile ? `/d2 college football logos/${logoFile}` : `/d2 college football logos/${slug}.jpg`,
    matched: !!logoFile,
  };
});

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');
const lastBracket = content.lastIndexOf(']');
const before = content.substring(0, lastBracket);
const after = content.substring(lastBracket);

// Generate entries string
const entriesStr = entries.map(entry => {
  const name = entry.name.replace(/'/g, "\\'");
  const conference = entry.conference.replace(/'/g, "\\'");
  const comment = !entry.matched ? ' // TODO: Verify logo path' : '';
  
  return `  {
    name: '${name}',
    slug: '${entry.slug}',
    conference: '${conference}',
    division: 'D2',
    logo: '${entry.logo}',
  },${comment}`;
}).join('\n');

// Write
fs.writeFileSync(COLLEGE_DATA_FILE, before + ',\n' + entriesStr + '\n' + after, 'utf8');

console.log(`✅ Added ${entries.length} D2 teams`);
console.log(`   Matched: ${entries.filter(e => e.matched).length} logos`);
console.log(`   Need review: ${entries.filter(e => !e.matched).length} teams`);


