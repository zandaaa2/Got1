// Script to add D2 college football teams to college-data.ts
// Based on Wikipedia: https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_football_programs

const fs = require('fs');
const path = require('path');

// Read the D2 logo files from public/d2 college football logos
const d2LogosDir = path.join(process.cwd(), 'public', 'd2 college football logos');
const logoFiles = fs.readdirSync(d2LogosDir).filter(file => file.endsWith('.jpg'));

console.log(`Found ${logoFiles.length} logo files`);

// D2 teams data extracted from Wikipedia
// Format: { "Common Name": { name: "Full Name", conference: "Conference Name" } }
const d2Teams = {
  "Adams State": { name: "Adams State University", conference: "Rocky Mountain Athletic Conference" },
  "Albany State": { name: "Albany State University", conference: "Southern Intercollegiate Athletic Conference" },
  "Allen": { name: "Allen University", conference: "Southern Intercollegiate Athletic Conference" },
  "American International": { name: "American International College", conference: "Northeast-10 Conference" },
  "Anderson": { name: "Anderson University", conference: "South Atlantic Conference" },
  "Angelo State": { name: "Angelo State University", conference: "Lone Star Conference" },
  "Arkansas Tech": { name: "Arkansas Tech University", conference: "Great American Conference" },
  "Arkansas-Monticello": { name: "University of Arkansas at Monticello", conference: "Great American Conference" },
  "Ashland": { name: "Ashland University", conference: "Great Midwest Athletic Conference" },
  "Assumption": { name: "Assumption University", conference: "Northeast-10 Conference" },
  "Augustana": { name: "Augustana University", conference: "Northern Sun Intercollegiate Conference" },
  "Barton": { name: "Barton College", conference: "Conference Carolinas" },
  "Benedict": { name: "Benedict College", conference: "Southern Intercollegiate Athletic Conference" },
  "Bentley": { name: "Bentley University", conference: "Northeast-10 Conference" },
  "Black Hills State": { name: "Black Hills State University", conference: "Rocky Mountain Athletic Conference" },
  "Bloomsburg": { name: "Bloomsburg University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Bluefield State": { name: "Bluefield State University", conference: "Mountain East Conference" },
  "California (PA)": { name: "California University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "California Baptist": { name: "California Baptist University", conference: "Lone Star Conference" },
  "Carson-Newman": { name: "Carson-Newman University", conference: "South Atlantic Conference" },
  "Central Missouri": { name: "University of Central Missouri", conference: "Mid-America Intercollegiate Athletics Association" },
  "Central Oklahoma": { name: "University of Central Oklahoma", conference: "Mid-America Intercollegiate Athletics Association" },
  "Central State": { name: "Central State University", conference: "Great Midwest Athletic Conference" },
  "Chadron State": { name: "Chadron State College", conference: "Rocky Mountain Athletic Conference" },
  "Charleston": { name: "University of Charleston", conference: "Mountain East Conference" },
  "Chowan": { name: "Chowan University", conference: "Central Intercollegiate Athletic Association" },
  "Clarion": { name: "Clarion University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Colorado Mesa": { name: "Colorado Mesa University", conference: "Rocky Mountain Athletic Conference" },
  "Colorado Mines": { name: "Colorado School of Mines", conference: "Rocky Mountain Athletic Conference" },
  "Colorado State Pueblo": { name: "Colorado State University Pueblo", conference: "Rocky Mountain Athletic Conference" },
  "Concord": { name: "Concord University", conference: "Mountain East Conference" },
  "Davenport": { name: "Davenport University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Delta State": { name: "Delta State University", conference: "Gulf South Conference" },
  "East Central": { name: "East Central University", conference: "Great American Conference" },
  "East Stroudsburg": { name: "East Stroudsburg University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Edinboro": { name: "Edinboro University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Emporia State": { name: "Emporia State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Erskine": { name: "Erskine College", conference: "Conference Carolinas" },
  "Fairmont State": { name: "Fairmont State University", conference: "Mountain East Conference" },
  "Fayetteville State": { name: "Fayetteville State University", conference: "Central Intercollegiate Athletic Association" },
  "Ferris State": { name: "Ferris State University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Findlay": { name: "University of Findlay", conference: "Great Midwest Athletic Conference" },
  "Fort Hays State": { name: "Fort Hays State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Fort Lewis": { name: "Fort Lewis College", conference: "Rocky Mountain Athletic Conference" },
  "Francis Marion": { name: "Francis Marion University", conference: "Conference Carolinas" },
  "Frostburg State": { name: "Frostburg State University", conference: "Mountain East Conference" },
  "Gannon": { name: "Gannon University", conference: "Pennsylvania State Athletic Conference" },
  "Glenville State": { name: "Glenville State University", conference: "Mountain East Conference" },
  "Grand Valley State": { name: "Grand Valley State University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Harding": { name: "Harding University", conference: "Great American Conference" },
  "Henderson State": { name: "Henderson State University", conference: "Great American Conference" },
  "Hillsdale": { name: "Hillsdale College", conference: "Great Midwest Athletic Conference" },
  "Holy Family": { name: "Holy Family University", conference: "Central Atlantic Collegiate Conference" },
  "Indiana (PA)": { name: "Indiana University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Kentucky Wesleyan": { name: "Kentucky Wesleyan College", conference: "Great Midwest Athletic Conference" },
  "Kutztown": { name: "Kutztown University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Lake Erie": { name: "Lake Erie College", conference: "Great Midwest Athletic Conference" },
  "Limestone": { name: "Limestone University", conference: "South Atlantic Conference" },
  "Lincoln (MO)": { name: "Lincoln University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Lincoln (PA)": { name: "Lincoln University", conference: "Central Intercollegiate Athletic Association" },
  "Lock Haven": { name: "Lock Haven University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Malone": { name: "Malone University", conference: "Great Midwest Athletic Conference" },
  "Mars Hill": { name: "Mars Hill University", conference: "South Atlantic Conference" },
  "McKendree": { name: "McKendree University", conference: "Great Lakes Valley Conference" },
  "Mercyhurst": { name: "Mercyhurst University", conference: "Pennsylvania State Athletic Conference" },
  "Michigan Tech": { name: "Michigan Technological University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Millersville": { name: "Millersville University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Minnesota Duluth": { name: "University of Minnesota Duluth", conference: "Northern Sun Intercollegiate Conference" },
  "Minnesota State": { name: "Minnesota State University, Mankato", conference: "Northern Sun Intercollegiate Conference" },
  "Minnesota State Moorhead": { name: "Minnesota State University Moorhead", conference: "Northern Sun Intercollegiate Conference" },
  "Missouri Southern": { name: "Missouri Southern State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Missouri Western": { name: "Missouri Western State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Morehouse": { name: "Morehouse College", conference: "Southern Intercollegiate Athletic Conference" },
  "Newberry": { name: "Newberry College", conference: "South Atlantic Conference" },
  "North Greenville": { name: "North Greenville University", conference: "Conference Carolinas" },
  "Northeastern State": { name: "Northeastern State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Northern Michigan": { name: "Northern Michigan University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Northern State": { name: "Northern State University", conference: "Northern Sun Intercollegiate Conference" },
  "Northwest Missouri State": { name: "Northwest Missouri State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Northwood": { name: "Northwood University", conference: "Great Midwest Athletic Conference" },
  "Notre Dame (OH)": { name: "Notre Dame College", conference: "Mountain East Conference" },
  "Ohio Dominican": { name: "Ohio Dominican University", conference: "Great Midwest Athletic Conference" },
  "Oklahoma Baptist": { name: "Oklahoma Baptist University", conference: "Great American Conference" },
  "Ouachita Baptist": { name: "Ouachita Baptist University", conference: "Great American Conference" },
  "Pace": { name: "Pace University", conference: "Northeast-10 Conference" },
  "Pittsburg State": { name: "Pittsburg State University", conference: "Mid-America Intercollegiate Athletics Association" },
  "Post": { name: "Post University", conference: "Central Atlantic Collegiate Conference" },
  "Saginaw Valley State": { name: "Saginaw Valley State University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Saint Anselm": { name: "Saint Anselm College", conference: "Northeast-10 Conference" },
  "Shippensburg": { name: "Shippensburg University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Shorter": { name: "Shorter University", conference: "Gulf South Conference" },
  "Slippery Rock": { name: "Slippery Rock University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "Southern Arkansas": { name: "Southern Arkansas University", conference: "Great American Conference" },
  "Southern Connecticut State": { name: "Southern Connecticut State University", conference: "Northeast-10 Conference" },
  "Southwest Baptist": { name: "Southwest Baptist University", conference: "Great Lakes Valley Conference" },
  "St. Augustine's": { name: "Saint Augustine's University", conference: "Central Intercollegiate Athletic Association" },
  "Stonehill": { name: "Stonehill College", conference: "Northeast-10 Conference" },
  "Tarleton State": { name: "Tarleton State University", conference: "Lone Star Conference" },
  "Texas A&M-Commerce": { name: "Texas A&M University-Commerce", conference: "Lone Star Conference" },
  "Texas A&M-Kingsville": { name: "Texas A&M University-Kingsville", conference: "Lone Star Conference" },
  "Tiffin": { name: "Tiffin University", conference: "Great Midwest Athletic Conference" },
  "Tusculum": { name: "Tusculum University", conference: "South Atlantic Conference" },
  "Tuskegee": { name: "Tuskegee University", conference: "Southern Intercollegiate Athletic Conference" },
  "Upper Iowa": { name: "Upper Iowa University", conference: "Great Lakes Valley Conference" },
  "Valdosta State": { name: "Valdosta State University", conference: "Gulf South Conference" },
  "Virginia State": { name: "Virginia State University", conference: "Central Intercollegiate Athletic Association" },
  "Virginia Union": { name: "Virginia Union University", conference: "Central Intercollegiate Athletic Association" },
  "Walsh": { name: "Walsh University", conference: "Great Midwest Athletic Conference" },
  "Wayne State (MI)": { name: "Wayne State University", conference: "Great Lakes Intercollegiate Athletic Conference" },
  "Wayne State (NE)": { name: "Wayne State College", conference: "Northern Sun Intercollegiate Conference" },
  "West Chester": { name: "West Chester University of Pennsylvania", conference: "Pennsylvania State Athletic Conference" },
  "West Florida": { name: "University of West Florida", conference: "Gulf South Conference" },
  "West Georgia": { name: "University of West Georgia", conference: "Gulf South Conference" },
  "West Liberty": { name: "West Liberty University", conference: "Mountain East Conference" },
  "West Texas A&M": { name: "West Texas A&M University", conference: "Lone Star Conference" },
  "West Virginia State": { name: "West Virginia State University", conference: "Mountain East Conference" },
  "West Virginia Wesleyan": { name: "West Virginia Wesleyan College", conference: "Mountain East Conference" },
  "Western Colorado": { name: "Western Colorado University", conference: "Rocky Mountain Athletic Conference" },
  "Western New Mexico": { name: "Western New Mexico University", conference: "Lone Star Conference" },
  "Western Oregon": { name: "Western Oregon University", conference: "Lone Star Conference" },
  "Wheeling": { name: "Wheeling University", conference: "Mountain East Conference" },
  "Wingate": { name: "Wingate University", conference: "South Atlantic Conference" },
  "Winona State": { name: "Winona State University", conference: "Northern Sun Intercollegiate Conference" },
  "Winston-Salem State": { name: "Winston-Salem State University", conference: "Central Intercollegiate Athletic Association" },
};

// Function to create a slug from a team name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Function to match logo filename to team name
function matchLogoToTeam(logoFileName, teamName) {
  const baseName = logoFileName.replace('.jpg', '').toLowerCase();
  const teamNameLower = teamName.toLowerCase();
  const slug = createSlug(teamName);
  
  // Check various matching patterns
  if (baseName.includes(slug) || slug.includes(baseName)) return true;
  if (baseName.includes(teamNameLower.replace(/\s+/g, '-'))) return true;
  if (baseName.includes(teamNameLower.replace(/\s+/g, ''))) return true;
  
  return false;
}

// Generate college entries for D2 teams
const d2Entries = [];

logoFiles.forEach(logoFile => {
  const logoPath = `/d2 college football logos/${logoFile}`;
  
  // Try to match the logo file with a team
  // First, try to extract team name from filename
  const baseName = logoFile.replace('.jpg', '');
  
  // Search for matching team in our D2 teams data
  let matchedTeam = null;
  for (const [commonName, teamData] of Object.entries(d2Teams)) {
    if (matchLogoToTeam(logoFile, commonName) || matchLogoToTeam(logoFile, teamData.name)) {
      matchedTeam = { commonName, ...teamData };
      break;
    }
  }
  
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
    // If no match found, create entry from filename (will need manual review)
    const slug = createSlug(baseName);
    console.warn(`No match found for logo: ${logoFile}. Creating entry from filename.`);
    d2Entries.push({
      name: baseName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      slug: slug,
      conference: 'Unknown',
      division: 'D2',
      logo: logoPath,
    });
  }
});

// Read current college-data.ts file
const collegeDataPath = path.join(process.cwd(), 'lib', 'college-data.ts');
const collegeDataContent = fs.readFileSync(collegeDataPath, 'utf8');

// Find the closing bracket of the collegeEntries array
const lastBracketIndex = collegeDataContent.lastIndexOf(']');
const beforeEntries = collegeDataContent.substring(0, lastBracketIndex);
const afterEntries = collegeDataContent.substring(lastBracketIndex);

// Generate the new entries as a string
const newEntriesString = d2Entries.map(entry => {
  return `  {
    name: '${entry.name.replace(/'/g, "\\'")}',
    slug: '${entry.slug}',
    conference: '${entry.conference.replace(/'/g, "\\'")}',
    division: 'D2',
    logo: '${entry.logo}',
  },`;
}).join('\n');

// Insert new entries before the closing bracket
const updatedContent = beforeEntries + ',\n' + newEntriesString + '\n' + afterEntries;

// Write back to file
fs.writeFileSync(collegeDataPath, updatedContent, 'utf8');

console.log(`Added ${d2Entries.length} D2 college entries to college-data.ts`);


