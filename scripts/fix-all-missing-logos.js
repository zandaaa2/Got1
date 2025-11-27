#!/usr/bin/env node
/**
 * Comprehensive script to find and fix all missing D2 logos
 * Outputs results to a file for review
 */

const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(process.cwd(), 'public', 'd2 college football logos');
const COLLEGE_DATA_FILE = path.join(process.cwd(), 'lib', 'college-data.ts');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'missing-logos-report.txt');

// Get all actual logo files
const actualFiles = fs.readdirSync(LOGO_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f));

const fileMap = new Map();
actualFiles.forEach(file => {
  const lower = file.toLowerCase();
  const base = lower.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/_sm\.(jpg|jpeg|png)$/i, '').replace(/-\d+\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '');
  fileMap.set(lower, file);
  fileMap.set(base, file);
});

// Read college-data.ts
let content = fs.readFileSync(COLLEGE_DATA_FILE, 'utf8');

// Find all D2 entries
const d2EntryRegex = /\{\s*name:\s*'([^']+(?:\\'[^']*)*)',\s*slug:\s*'([^']+)',\s*conference:\s*'([^']+(?:\\'[^']*)*)',\s*division:\s*'D2',\s*logo:\s*'([^']+)',?\s*\}/g;

const missing = [];
const fixed = [];
let total = 0;

while ((match = d2EntryRegex.exec(content)) !== null) {
  total++;
  const teamName = match[1].replace(/\\'/g, "'");
  const slug = match[2];
  const logoPath = match[4];
  const logoFilename = path.basename(logoPath);
  const fullPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  
  if (!fs.existsSync(fullPath)) {
    // Try to find a match
    const logoLower = logoFilename.toLowerCase();
    let matchedFile = null;
    
    // Try exact match
    if (fileMap.has(logoLower)) {
      matchedFile = fileMap.get(logoLower);
    } else {
      // Try base name match
      const base = logoLower.replace(/^sch-/, '').replace(/-\d+_sm\.(jpg|jpeg|png)$/i, '').replace(/_sm\.(jpg|jpeg|png)$/i, '').replace(/-\d+\.(jpg|jpeg|png)$/i, '').replace(/\.(jpg|jpeg|png)$/i, '');
      if (fileMap.has(base)) {
        matchedFile = fileMap.get(base);
      } else {
        // Try slug-based matching
        const slugBase = slug.replace(/-/g, ' ');
        for (const [key, value] of fileMap.entries()) {
          if (key.includes(slugBase) || slugBase.includes(key)) {
            matchedFile = value;
            break;
          }
        }
      }
    }
    
    if (matchedFile) {
      const newPath = `/d2 college football logos/${matchedFile}`;
      const escaped = logoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(logo:\\s*')${escaped}(')`, 'g');
      content = content.replace(regex, `$1${newPath}$2`);
      fixed.push({ name: teamName, old: logoFilename, new: matchedFile });
    } else {
      missing.push({ name: teamName, current: logoFilename });
    }
  }
}

// Write updated content
if (fixed.length > 0) {
  fs.writeFileSync(COLLEGE_DATA_FILE, content, 'utf8');
}

// Write report
const report = [
  `D2 Logo Fix Report`,
  `==================`,
  ``,
  `Total D2 entries: ${total}`,
  `Fixed: ${fixed.length}`,
  `Still missing: ${missing.length}`,
  ``,
  `FIXED LOGOS:`,
  `============`,
  ...fixed.map(f => `${f.name}\n  ${f.old} → ${f.new}`),
  ``,
  `MISSING LOGOS:`,
  `==============`,
  ...missing.map(m => `${m.name}\n  Current: ${m.current}`)
].join('\n');

fs.writeFileSync(OUTPUT_FILE, report, 'utf8');

console.log(`✅ Processed ${total} D2 entries`);
console.log(`✅ Fixed ${fixed.length} logos`);
console.log(`⚠️  ${missing.length} logos still missing`);
console.log(`\n📄 Full report saved to: ${OUTPUT_FILE}`);

if (fixed.length > 0) {
  console.log(`\n✅ Updated college-data.ts with ${fixed.length} fixes`);
}


