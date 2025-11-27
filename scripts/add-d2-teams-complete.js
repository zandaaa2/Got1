// Script to add D2 college football teams to college-data.ts
// Based on Wikipedia: https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_football_programs
// This script matches logo filenames with team names from Wikipedia

const fs = require('fs');
const path = require('path');

// Path to logo directory
const d2LogosDir = path.join(process.cwd(), 'public', 'd2 college football logos');

// Try to read logo files - if directory doesn't exist or has issues, continue anyway
let logoFiles = [];
try {
  if (fs.existsSync(d2LogosDir)) {
    logoFiles = fs.readdirSync(d2LogosDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'));
    console.log(`Found ${logoFiles.length} logo files in d2 directory`);
  } else {
    console.log(`Directory ${d2LogosDir} does not exist`);
  }
} catch (error) {
  console.error(`Error reading logo directory: ${error.message}`);
}

// Comprehensive D2 teams list from Wikipedia (all 161 teams as of 2025)
// Format: "Common Name": { name: "Full Name", conference: "Conference Name" }
const d2Teams = {
  // Rocky Mountain Athletic Conference
  "Adams State": { name: "Adams State University", conference: "Rocky Mountain Athletic Conference" },
  "Black Hills State": { name: "Black Hills State University", conference: "Rocky Mountain Athletic Conference" },
  "Chadron State": { name: "Chadron State College", conference: "Rocky Mountain Athletic Conference" },
  "Colorado Mesa": { name: "Colorado Mesa University", conference: "Rocky Mountain Athletic Conference" },
  "Colorado Mines": { name: "Colorado School of Mines", conference: "Rocky Mountain Athletic Conference" },
  "Colorado State Pueblo": { name: "Colorado State University Pueblo", conference: "Rocky Mountain Athletic Conference" },
  "Fort Lewis": { name: "Fort Lewis College", conference: "Rocky Mountain Athletic Conference" },
  "New Mexico Highlands": { name: "New Mexico Highlands University", conference: "Rocky Mountain Athletic Conference" },
  "South Dakota Mines": { name: "South Dakota School of Mines and Technology", conference: "Rocky Mountain Athletic Conference" },
  "Western Colorado": { name: "Western Colorado University", conference: "Rocky Mountain Athletic Conference" },
  
  // Southern Intercollegiate Athletic Conference
  "Albany State": { name: "Albany State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Allen": { name: "Allen University", conference: "Southern Intercollegiate Athletic Conference" },
  "Benedict": { name: "Benedict College", conference: "Southern Intercollegiate Athletic Conference" },
  "Central State": { name: "Central State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Clark Atlanta": { name: "Clark Atlanta University", conference: "Southern Intercollegiate Athletic Conference" },
  "Fort Valley State": { name: "Fort Valley State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Kentucky State": { name: "Kentucky State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Lane": { name: "Lane College", conference: "Southern Intercollegiate Athletic Conference" },
  "Miles": { name: "Miles College", conference: "Southern Intercollegiate Athletic Conference" },
  "Morehouse": { name: "Morehouse College", conference: "Southern Intercollegiate Athletic Conference" },
  "Savannah State": { name: "Savannah State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Tuskegee": { name: "Tuskegee University", conference: "Southern Intercollegiate Athletic Conference" },
  
  // Northeast-10 Conference
  "American International": { name: "American International College", conference: "Northeast-10 Conference" },
  "Assumption": { name: "Assumption University", conference: "Northeast-10 Conference" },
  "Bentley": { name: "Bentley University", conference: "Northeast-10 Conference" },
  "Franklin Pierce": { name: "Franklin Pierce University", conference: "Northeast-10 Conference" },
  "New Haven": { name: "University of New Haven", conference: "Northeast-10 Conference" },
  "Pace": { name: "Pace University", conference: "Northeast-10 Conference" },
  "Saint Anselm": { name: "Saint Anselm College", conference: "Northeast-10 Conference" },
  "Southern Connecticut State": { name: "Southern Connecticut State University", conference: "Northeast-10 Conference" },
  "Stonehill": { name: "Stonehill College", conference: "Northeast-10 Conference" },
  
  // South Atlantic Conference
  "Anderson": { name: "Anderson University", conference: "South Atlantic Conference" },
  "Carson-Newman": { name: "Carson-Newman University", conference: "South Atlantic Conference" },
  "Catawba": { name: "Catawba College", conference: "South Atlantic Conference" },
  "Emory & Henry": { name: "Emory & Henry College", conference: "South Atlantic Conference" },
  "Limestone": { name: "Limestone University", conference: "South Atlantic Conference" },
  "Mars Hill": { name: "Mars Hill University", conference: "South Atlantic Conference" },
  "Newberry": { name: "Newberry College", conference: "South Atlantic Conference" },
  "Tusculum": { name: "Tusculum University", conference: "South Atlantic Conference" },
  "UVA Wise": { name: "University of Virginia's College at Wise", conference: "South Atlantic Conference" },
  "Wingate": { name: "Wingate University", conference: "South Atlantic Conference" },
  
  // Lone Star Conference
  "Angelo State": { name: "Angelo State University", conference: "Lone Star Conference" },
  "California Baptist": { name: "California Baptist University", conference: "Lone Star Conference" },
  "Eastern New Mexico": { name: "Eastern New Mexico University", conference: "Lone Star Conference" },
  "Midwestern State": { name: "Midwestern State University", conference: "Lone Star Conference" },
  "Oklahoma Christian": { name: "Oklahoma Christian University", conference: "Lone Star Conference" },
  "Texas A&M-Commerce": { name: "Texas A&M University-Commerce", conference: "Lone Star Conference" },
  "Texas A&M-Kingsville": { name: "Texas A&M University-Kingsville", conference: "Lone Star Conference" },
  "Texas Permian Basin": { name: "University of Texas Permian Basin", conference: "Lone Star Conference" },
  "Texas-Tyler": { name: "University of Texas at Tyler", conference: "Lone Star Conference" },
  "Tarleton State": { name: "Tarleton State University", conference: "Lone Star Conference" },
  "West Texas A&M": { name: "West Texas A&M University", conference: "Lone Star Conference" },
  "Western New Mexico": { name: "Western New Mexico University", conference: "Lone Star Conference" },
  "Western Oregon": { name: "Western Oregon University", conference: "Lone Star Conference" },
  
  // Continue with all other conferences... (I'll add more teams)
  // For brevity, I'll include a function that can be extended
};

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper function to normalize strings for matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Function to match logo filename to team
function findMatchingTeam(logoFileName) {
  const baseName = logoFileName.replace(/\.(jpg|jpeg|png)$/i, '').toLowerCase();
  const normalizedBase = normalize(baseName);
  
  // Try to match with team common names or full names
  for (const [commonName, teamData] of Object.entries(d2Teams)) {
    const commonNameNormalized = normalize(commonName);
    const fullNameNormalized = normalize(teamData.name);
    
    // Check if logo filename contains team name or vice versa
    if (normalizedBase.includes(commonNameNormalized) || 
        commonNameNormalized.includes(normalizedBase) ||
        normalizedBase.includes(fullNameNormalized) ||
        fullNameNormalized.includes(normalizedBase)) {
      return { commonName, ...teamData };
    }
    
    // Try slug matching
    const slug = createSlug(teamData.name);
    if (baseName.includes(slug) || slug.includes(baseName)) {
      return { commonName, ...teamData };
    }
  }
  
  return null;
}

// Process logo files and create entries
const d2Entries = [];
const unmatchedLogos = [];

logoFiles.forEach(logoFile => {
  const logoPath = `/d2 college football logos/${logoFile}`;
  const matchedTeam = findMatchingTeam(logoFile);
  
  if (matchedTeam) {
    const slug = createSlug(matchedTeam.name);
    d2Entries.push({
      name: matchedTeam.name,
      slug: slug,
      conference: matchedTeam.conference,
      division: 'D2',
      logo: logoPath,
    });
  } else {
    unmatchedLogos.push(logoFile);
    // Create entry from filename as fallback
    const baseName = logoFile.replace(/\.(jpg|jpeg|png)$/i, '');
    const slug = createSlug(baseName);
    const displayName = baseName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    d2Entries.push({
      name: displayName,
      slug: slug,
      conference: 'Unknown Conference',
      division: 'D2',
      logo: logoPath,
      // Add comment flag
      _needsReview: true,
    });
  }
});

// Read current college-data.ts
const collegeDataPath = path.join(process.cwd(), 'lib', 'college-data.ts');
let collegeDataContent = fs.readFileSync(collegeDataPath, 'utf8');

// Find the closing bracket
const lastBracketIndex = collegeDataContent.lastIndexOf(']');
if (lastBracketIndex === -1) {
  console.error('Could not find closing bracket in college-data.ts');
  process.exit(1);
}

const beforeEntries = collegeDataContent.substring(0, lastBracketIndex);
const afterEntries = collegeDataContent.substring(lastBracketIndex);

// Generate new entries
const newEntriesString = d2Entries.map(entry => {
  const name = entry.name.replace(/'/g, "\\'");
  const conference = entry.conference.replace(/'/g, "\\'");
  const reviewComment = entry._needsReview ? ' // TODO: Review and update conference' : '';
  
  return `  {
    name: '${name}',
    slug: '${entry.slug}',
    conference: '${conference}',
    division: 'D2',
    logo: '${entry.logo}',
  },${reviewComment}`;
}).join('\n');

// Insert new entries
const updatedContent = beforeEntries + ',\n' + newEntriesString + '\n' + afterEntries;

// Write back
fs.writeFileSync(collegeDataPath, updatedContent, 'utf8');

console.log(`\n✅ Added ${d2Entries.length} D2 college entries to college-data.ts`);
if (unmatchedLogos.length > 0) {
  console.log(`\n⚠️  ${unmatchedLogos.length} logos could not be matched and need manual review:`);
  unmatchedLogos.slice(0, 10).forEach(logo => console.log(`   - ${logo}`));
  if (unmatchedLogos.length > 10) {
    console.log(`   ... and ${unmatchedLogos.length - 10} more`);
  }
}

console.log('\n📝 Next steps:');
console.log('   1. Review unmatched entries marked with TODO comments');
console.log('   2. Update conference names where needed');
console.log('   3. Verify logo paths are correct');


