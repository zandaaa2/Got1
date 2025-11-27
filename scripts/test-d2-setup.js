// Quick test script to verify setup
const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA = path.join(process.cwd(), 'lib', 'college-data.ts');

console.log('=== D2 Setup Test ===');
console.log(`Logo directory exists: ${fs.existsSync(LOGO_DIR)}`);
console.log(`College data file exists: ${fs.existsSync(COLLEGE_DATA)}`);

if (fs.existsSync(LOGO_DIR)) {
  try {
    const files = fs.readdirSync(LOGO_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`Logo files found: ${imageFiles.length}`);
    if (imageFiles.length > 0) {
      console.log(`First 5 files:`);
      imageFiles.slice(0, 5).forEach(f => console.log(`  - ${f}`));
    }
  } catch (e) {
    console.error(`Error reading directory: ${e.message}`);
  }
}

if (fs.existsSync(COLLEGE_DATA)) {
  const content = fs.readFileSync(COLLEGE_DATA, 'utf8');
  const d2Count = (content.match(/division:\s*['"]D2['"]/g) || []).length;
  console.log(`Current D2 teams in file: ${d2Count}`);
}

console.log('==================');


