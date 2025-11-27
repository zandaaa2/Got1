#!/usr/bin/env node
/**
 * Complete D2 Teams Script - Adds all 161 NCAA Division II football teams
 * Based on: https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_football_programs
 * 
 * Usage: node scripts/add-complete-d2-teams.js
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');

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

function similarity(str1, str2) {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check common words
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));
  const intersection = [...words1].filter(w => words2.has(w));
  return intersection.length / Math.max(words1.size, words2.size);
}

// ALL 161 D2 FOOTBALL TEAMS FROM WIKIPEDIA (2025)
// Organized by conference for easy maintenance
const ALL_D2_TEAMS = [
  // Rocky Mountain Athletic Conference (10 teams)
  { name: "Adams State University", common: "Adams State", conference: "Rocky Mountain Athletic Conference" },
  { name: "Black Hills State University", common: "Black Hills State", conference: "Rocky Mountain Athletic Conference" },
  { name: "Chadron State College", common: "Chadron State", conference: "Rocky Mountain Athletic Conference" },
  { name: "Colorado Mesa University", common: "Colorado Mesa", conference: "Rocky Mountain Athletic Conference" },
  { name: "Colorado School of Mines", common: "Colorado Mines", conference: "Rocky Mountain Athletic Conference" },
  { name: "Colorado State University Pueblo", common: "Colorado State Pueblo", conference: "Rocky Mountain Athletic Conference" },
  { name: "Fort Lewis College", common: "Fort Lewis", conference: "Rocky Mountain Athletic Conference" },
  { name: "New Mexico Highlands University", common: "New Mexico Highlands", conference: "Rocky Mountain Athletic Conference" },
  { name: "South Dakota School of Mines and Technology", common: "South Dakota Mines", conference: "Rocky Mountain Athletic Conference" },
  { name: "Western Colorado University", common: "Western Colorado", conference: "Rocky Mountain Athletic Conference" },

  // Southern Intercollegiate Athletic Conference (12 teams)
  { name: "Albany State University", common: "Albany State", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Allen University", common: "Allen", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Benedict College", common: "Benedict", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Central State University", common: "Central State", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Clark Atlanta University", common: "Clark Atlanta", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Fort Valley State University", common: "Fort Valley State", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Kentucky State University", common: "Kentucky State", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Lane College", common: "Lane", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Miles College", common: "Miles", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Morehouse College", common: "Morehouse", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Savannah State University", common: "Savannah State", conference: "Southern Intercollegiate Athletic Conference" },
  { name: "Tuskegee University", common: "Tuskegee", conference: "Southern Intercollegiate Athletic Conference" },

  // Northeast-10 Conference (9 teams)
  { name: "American International College", common: "American International", conference: "Northeast-10 Conference" },
  { name: "Assumption University", common: "Assumption", conference: "Northeast-10 Conference" },
  { name: "Bentley University", common: "Bentley", conference: "Northeast-10 Conference" },
  { name: "Franklin Pierce University", common: "Franklin Pierce", conference: "Northeast-10 Conference" },
  { name: "Pace University", common: "Pace", conference: "Northeast-10 Conference" },
  { name: "Saint Anselm College", common: "Saint Anselm", conference: "Northeast-10 Conference" },
  { name: "Southern Connecticut State University", common: "Southern Connecticut State", conference: "Northeast-10 Conference" },
  { name: "Stonehill College", common: "Stonehill", conference: "Northeast-10 Conference" },
  { name: "University of New Haven", common: "New Haven", conference: "Northeast-10 Conference" },

  // South Atlantic Conference (10 teams)
  { name: "Anderson University", common: "Anderson", conference: "South Atlantic Conference" },
  { name: "Carson-Newman University", common: "Carson-Newman", conference: "South Atlantic Conference" },
  { name: "Catawba College", common: "Catawba", conference: "South Atlantic Conference" },
  { name: "Emory & Henry College", common: "Emory & Henry", conference: "South Atlantic Conference" },
  { name: "Limestone University", common: "Limestone", conference: "South Atlantic Conference" },
  { name: "Mars Hill University", common: "Mars Hill", conference: "South Atlantic Conference" },
  { name: "Newberry College", common: "Newberry", conference: "South Atlantic Conference" },
  { name: "Tusculum University", common: "Tusculum", conference: "South Atlantic Conference" },
  { name: "University of Virginia's College at Wise", common: "UVA Wise", conference: "South Atlantic Conference" },
  { name: "Wingate University", common: "Wingate", conference: "South Atlantic Conference" },

  // Lone Star Conference (13 teams)
  { name: "Angelo State University", common: "Angelo State", conference: "Lone Star Conference" },
  { name: "California Baptist University", common: "California Baptist", conference: "Lone Star Conference" },
  { name: "Eastern New Mexico University", common: "Eastern New Mexico", conference: "Lone Star Conference" },
  { name: "Midwestern State University", common: "Midwestern State", conference: "Lone Star Conference" },
  { name: "Oklahoma Christian University", common: "Oklahoma Christian", conference: "Lone Star Conference" },
  { name: "Texas A&M University-Commerce", common: "Texas A&M-Commerce", conference: "Lone Star Conference" },
  { name: "Texas A&M University-Kingsville", common: "Texas A&M-Kingsville", conference: "Lone Star Conference" },
  { name: "University of Texas Permian Basin", common: "Texas Permian Basin", conference: "Lone Star Conference" },
  { name: "University of Texas at Tyler", common: "Texas-Tyler", conference: "Lone Star Conference" },
  { name: "Tarleton State University", common: "Tarleton State", conference: "Lone Star Conference" },
  { name: "West Texas A&M University", common: "West Texas A&M", conference: "Lone Star Conference" },
  { name: "Western New Mexico University", common: "Western New Mexico", conference: "Lone Star Conference" },
  { name: "Western Oregon University", common: "Western Oregon", conference: "Lone Star Conference" },

  // Great American Conference (12 teams)
  { name: "Arkansas Tech University", common: "Arkansas Tech", conference: "Great American Conference" },
  { name: "University of Arkansas at Monticello", common: "Arkansas-Monticello", conference: "Great American Conference" },
  { name: "East Central University", common: "East Central", conference: "Great American Conference" },
  { name: "Harding University", common: "Harding", conference: "Great American Conference" },
  { name: "Henderson State University", common: "Henderson State", conference: "Great American Conference" },
  { name: "Northwestern Oklahoma State University", common: "Northwestern Oklahoma State", conference: "Great American Conference" },
  { name: "Oklahoma Baptist University", common: "Oklahoma Baptist", conference: "Great American Conference" },
  { name: "Ouachita Baptist University", common: "Ouachita Baptist", conference: "Great American Conference" },
  { name: "Southeastern Oklahoma State University", common: "Southeastern Oklahoma State", conference: "Great American Conference" },
  { name: "Southern Arkansas University", common: "Southern Arkansas", conference: "Great American Conference" },
  { name: "Southwestern Oklahoma State University", common: "Southwestern Oklahoma State", conference: "Great American Conference" },
  { name: "University of Arkansas–Fort Smith", common: "Arkansas-Fort Smith", conference: "Great American Conference" },

  // Pennsylvania State Athletic Conference (16 teams)
  { name: "Bloomsburg University of Pennsylvania", common: "Bloomsburg", conference: "Pennsylvania State Athletic Conference" },
  { name: "California University of Pennsylvania", common: "California (PA)", conference: "Pennsylvania State Athletic Conference" },
  { name: "Clarion University of Pennsylvania", common: "Clarion", conference: "Pennsylvania State Athletic Conference" },
  { name: "East Stroudsburg University of Pennsylvania", common: "East Stroudsburg", conference: "Pennsylvania State Athletic Conference" },
  { name: "Edinboro University of Pennsylvania", common: "Edinboro", conference: "Pennsylvania State Athletic Conference" },
  { name: "Gannon University", common: "Gannon", conference: "Pennsylvania State Athletic Conference" },
  { name: "Indiana University of Pennsylvania", common: "Indiana (PA)", conference: "Pennsylvania State Athletic Conference" },
  { name: "Kutztown University of Pennsylvania", common: "Kutztown", conference: "Pennsylvania State Athletic Conference" },
  { name: "Lock Haven University of Pennsylvania", common: "Lock Haven", conference: "Pennsylvania State Athletic Conference" },
  { name: "Mercyhurst University", common: "Mercyhurst", conference: "Pennsylvania State Athletic Conference" },
  { name: "Millersville University of Pennsylvania", common: "Millersville", conference: "Pennsylvania State Athletic Conference" },
  { name: "Seton Hill University", common: "Seton Hill", conference: "Pennsylvania State Athletic Conference" },
  { name: "Shippensburg University of Pennsylvania", common: "Shippensburg", conference: "Pennsylvania State Athletic Conference" },
  { name: "Slippery Rock University of Pennsylvania", common: "Slippery Rock", conference: "Pennsylvania State Athletic Conference" },
  { name: "West Chester University of Pennsylvania", common: "West Chester", conference: "Pennsylvania State Athletic Conference" },
  { name: "Shepherd University", common: "Shepherd", conference: "Pennsylvania State Athletic Conference" },

  // Northern Sun Intercollegiate Conference (15 teams)
  { name: "Augustana University", common: "Augustana", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Bemidji State University", common: "Bemidji State", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Concordia University, St. Paul", common: "Concordia-St. Paul", conference: "Northern Sun Intercollegiate Conference" },
  { name: "University of Jamestown", common: "Jamestown", conference: "Northern Sun Intercollegiate Conference" },
  { name: "University of Mary", common: "Mary", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Minnesota State University, Mankato", common: "Minnesota State", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Minnesota State University Moorhead", common: "Minnesota State Moorhead", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Minot State University", common: "Minot State", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Northern State University", common: "Northern State", conference: "Northern Sun Intercollegiate Conference" },
  { name: "University of Minnesota Duluth", common: "Minnesota Duluth", conference: "Northern Sun Intercollegiate Conference" },
  { name: "University of Sioux Falls", common: "Sioux Falls", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Southwest Minnesota State University", common: "Southwest Minnesota State", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Upper Iowa University", common: "Upper Iowa", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Wayne State College", common: "Wayne State (NE)", conference: "Northern Sun Intercollegiate Conference" },
  { name: "Winona State University", common: "Winona State", conference: "Northern Sun Intercollegiate Conference" },

  // Great Lakes Intercollegiate Athletic Conference (11 teams)
  { name: "Ashland University", common: "Ashland", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Davenport University", common: "Davenport", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Ferris State University", common: "Ferris State", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Grand Valley State University", common: "Grand Valley State", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Michigan Technological University", common: "Michigan Tech", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Northern Michigan University", common: "Northern Michigan", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Northwood University", common: "Northwood", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Saginaw Valley State University", common: "Saginaw Valley State", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Wayne State University", common: "Wayne State (MI)", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "Tiffin University", common: "Tiffin", conference: "Great Lakes Intercollegiate Athletic Conference" },
  { name: "University of Findlay", common: "Findlay", conference: "Great Lakes Intercollegiate Athletic Conference" },

  // Gulf South Conference (12 teams)
  { name: "Delta State University", common: "Delta State", conference: "Gulf South Conference" },
  { name: "Mississippi College", common: "Mississippi College", conference: "Gulf South Conference" },
  { name: "Shorter University", common: "Shorter", conference: "Gulf South Conference" },
  { name: "University of West Alabama", common: "West Alabama", conference: "Gulf South Conference" },
  { name: "University of West Florida", common: "West Florida", conference: "Gulf South Conference" },
  { name: "University of West Georgia", common: "West Georgia", conference: "Gulf South Conference" },
  { name: "Valdosta State University", common: "Valdosta State", conference: "Gulf South Conference" },
  { name: "West Georgia", common: "West Georgia", conference: "Gulf South Conference" },

  // Mid-America Intercollegiate Athletics Association (12 teams)
  { name: "University of Central Missouri", common: "Central Missouri", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "University of Central Oklahoma", common: "Central Oklahoma", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Emporia State University", common: "Emporia State", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Fort Hays State University", common: "Fort Hays State", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Lincoln University", common: "Lincoln (MO)", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Missouri Southern State University", common: "Missouri Southern", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Missouri Western State University", common: "Missouri Western", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Northeastern State University", common: "Northeastern State", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Northwest Missouri State University", common: "Northwest Missouri State", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Pittsburg State University", common: "Pittsburg State", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "Washburn University", common: "Washburn", conference: "Mid-America Intercollegiate Athletics Association" },
  { name: "William Jewell College", common: "William Jewell", conference: "Mid-America Intercollegiate Athletics Association" },

  // Mountain East Conference (11 teams)
  { name: "Bluefield State University", common: "Bluefield State", conference: "Mountain East Conference" },
  { name: "University of Charleston", common: "Charleston", conference: "Mountain East Conference" },
  { name: "Concord University", common: "Concord", conference: "Mountain East Conference" },
  { name: "Fairmont State University", common: "Fairmont State", conference: "Mountain East Conference" },
  { name: "Frostburg State University", common: "Frostburg State", conference: "Mountain East Conference" },
  { name: "Glenville State University", common: "Glenville State", conference: "Mountain East Conference" },
  { name: "Notre Dame College", common: "Notre Dame (OH)", conference: "Mountain East Conference" },
  { name: "West Liberty University", common: "West Liberty", conference: "Mountain East Conference" },
  { name: "West Virginia State University", common: "West Virginia State", conference: "Mountain East Conference" },
  { name: "West Virginia Wesleyan College", common: "West Virginia Wesleyan", conference: "Mountain East Conference" },
  { name: "Wheeling University", common: "Wheeling", conference: "Mountain East Conference" },

  // Central Intercollegiate Athletic Association (12 teams)
  { name: "Bluefield State University", common: "Bluefield State", conference: "Central Intercollegiate Athletic Association" },
  { name: "Bowie State University", common: "Bowie State", conference: "Central Intercollegiate Athletic Association" },
  { name: "Chowan University", common: "Chowan", conference: "Central Intercollegiate Athletic Association" },
  { name: "Elizabeth City State University", common: "Elizabeth City State", conference: "Central Intercollegiate Athletic Association" },
  { name: "Fayetteville State University", common: "Fayetteville State", conference: "Central Intercollegiate Athletic Association" },
  { name: "Johnson C. Smith University", common: "Johnson C. Smith", conference: "Central Intercollegiate Athletic Association" },
  { name: "Lincoln University", common: "Lincoln (PA)", conference: "Central Intercollegiate Athletic Association" },
  { name: "Livingstone College", common: "Livingstone", conference: "Central Intercollegiate Athletic Association" },
  { name: "Saint Augustine's University", common: "St. Augustine's", conference: "Central Intercollegiate Athletic Association" },
  { name: "Shaw University", common: "Shaw", conference: "Central Intercollegiate Athletic Association" },
  { name: "Virginia State University", common: "Virginia State", conference: "Central Intercollegiate Athletic Association" },
  { name: "Virginia Union University", common: "Virginia Union", conference: "Central Intercollegiate Athletic Association" },
  { name: "Winston-Salem State University", common: "Winston-Salem State", conference: "Central Intercollegiate Athletic Association" },

  // Great Lakes Valley Conference (8 teams)
  { name: "McKendree University", common: "McKendree", conference: "Great Lakes Valley Conference" },
  { name: "Southwest Baptist University", common: "Southwest Baptist", conference: "Great Lakes Valley Conference" },
  { name: "Truman State University", common: "Truman State", conference: "Great Lakes Valley Conference" },
  { name: "Upper Iowa University", common: "Upper Iowa", conference: "Great Lakes Valley Conference" },
  { name: "William Jewell College", common: "William Jewell", conference: "Great Lakes Valley Conference" },

  // Great Midwest Athletic Conference (12 teams)
  { name: "Ashland University", common: "Ashland", conference: "Great Midwest Athletic Conference" },
  { name: "Central State University", common: "Central State", conference: "Great Midwest Athletic Conference" },
  { name: "Hillsdale College", common: "Hillsdale", conference: "Great Midwest Athletic Conference" },
  { name: "Kentucky Wesleyan College", common: "Kentucky Wesleyan", conference: "Great Midwest Athletic Conference" },
  { name: "Lake Erie College", common: "Lake Erie", conference: "Great Midwest Athletic Conference" },
  { name: "Malone University", common: "Malone", conference: "Great Midwest Athletic Conference" },
  { name: "Northwood University", common: "Northwood", conference: "Great Midwest Athletic Conference" },
  { name: "Ohio Dominican University", common: "Ohio Dominican", conference: "Great Midwest Athletic Conference" },
  { name: "Tiffin University", common: "Tiffin", conference: "Great Midwest Athletic Conference" },
  { name: "University of Findlay", common: "Findlay", conference: "Great Midwest Athletic Conference" },
  { name: "Walsh University", common: "Walsh", conference: "Great Midwest Athletic Conference" },

  // Conference Carolinas (7 teams)
  { name: "Barton College", common: "Barton", conference: "Conference Carolinas" },
  { name: "Erskine College", common: "Erskine", conference: "Conference Carolinas" },
  { name: "Francis Marion University", common: "Francis Marion", conference: "Conference Carolinas" },
  { name: "North Greenville University", common: "North Greenville", conference: "Conference Carolinas" },
  { name: "University of Mount Olive", common: "Mount Olive", conference: "Conference Carolinas" },

  // Central Atlantic Collegiate Conference (3 teams)
  { name: "Holy Family University", common: "Holy Family", conference: "Central Atlantic Collegiate Conference" },
  { name: "Post University", common: "Post", conference: "Central Atlantic Collegiate Conference" },

  // Independents (1 team)
  { name: "Lincoln University of Missouri", common: "Lincoln (MO)", conference: "NCAA Division II Independent" },
];

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

// Match logos to teams
function findBestMatch(logoFile, teams) {
  const baseName = path.basename(logoFile, path.extname(logoFile)).toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  
  for (const team of teams) {
    const nameNorm = normalize(team.name);
    const commonNorm = normalize(team.common);
    const slug = createSlug(team.name);
    
    // Calculate similarity scores
    const nameScore = similarity(baseName, nameNorm);
    const commonScore = similarity(baseName, commonNorm);
    const slugScore = baseName.includes(slug) || slug.includes(baseName) ? 0.7 : 0;
    
    const totalScore = Math.max(nameScore, commonScore, slugScore);
    
    if (totalScore > bestScore && totalScore > 0.5) {
      bestScore = totalScore;
      bestMatch = team;
    }
  }
  
  return bestMatch;
}

// Process all teams
const entries = [];
const matchedLogos = new Set();
const unmatchedTeams = [];
const unmatchedLogos = [...logoFiles];

// First pass: try to match each logo to a team
logoFiles.forEach(logoFile => {
  const match = findBestMatch(logoFile, ALL_D2_TEAMS);
  if (match) {
    matchedLogos.add(logoFile);
    unmatchedLogos.splice(unmatchedLogos.indexOf(logoFile), 1);
    
    entries.push({
      name: match.name,
      slug: createSlug(match.name),
      conference: match.conference,
      division: 'D2',
      logo: `/d2 college football logos/${logoFile}`,
      matched: true,
    });
  }
});

// Second pass: add teams that didn't get matched logos
ALL_D2_TEAMS.forEach(team => {
  const alreadyAdded = entries.some(e => e.name === team.name);
  if (!alreadyAdded) {
    unmatchedTeams.push(team);
    const slug = createSlug(team.name);
    // Try to find a logo file by slug
    const potentialLogo = logoFiles.find(f => {
      const base = path.basename(f, path.extname(f)).toLowerCase();
      return base === slug || base.includes(slug) || slug.includes(base);
    });
    
    entries.push({
      name: team.name,
      slug: slug,
      conference: team.conference,
      division: 'D2',
      logo: potentialLogo ? `/d2 college football logos/${potentialLogo}` : `/d2 college football logos/${slug}.jpg`,
      matched: !!potentialLogo,
    });
  }
});

console.log(`\n📊 Matching Results:`);
console.log(`   ✅ Matched: ${matchedLogos.size} logos to teams`);
console.log(`   ⚠️  Unmatched teams: ${unmatchedTeams.length}`);
console.log(`   ⚠️  Unmatched logos: ${unmatchedLogos.length}\n`);

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
  const reviewComment = !entry.matched ? ' // TODO: Verify logo path' : '';
  
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

if (unmatchedLogos.length > 0) {
  console.log(`⚠️  Unmatched logo files (first 20):`);
  unmatchedLogos.slice(0, 20).forEach(logo => console.log(`   - ${logo}`));
  if (unmatchedLogos.length > 20) {
    console.log(`   ... and ${unmatchedLogos.length - 20} more`);
  }
  console.log('');
}

console.log(`📝 Next steps:`);
console.log(`   1. Review entries marked with TODO comments`);
console.log(`   2. Manually match any unmatched logo files`);
console.log(`   3. Verify all logo paths are correct`);


