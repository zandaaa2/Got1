#!/usr/bin/env python3
"""
Script to process D2 college football teams and add them to college-data.ts
Reads logo files from public/d2 college football logos and matches them with Wikipedia team data
"""

import os
import re
import json
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
LOGO_DIR = BASE_DIR / "public" / "d2 college football logos"
COLLEGE_DATA_FILE = BASE_DIR / "lib" / "college-data.ts"

# Read all logo files
logo_files = []
if LOGO_DIR.exists():
    logo_files = [f for f in os.listdir(LOGO_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Found {len(logo_files)} logo files")
else:
    print(f"Logo directory not found: {LOGO_DIR}")

def create_slug(name):
    """Create a URL-friendly slug from a team name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip()

def normalize(name):
    """Normalize a string for matching"""
    normalized = name.lower()
    normalized = re.sub(r'[^a-z0-9\s]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()

def match_logo_to_team(logo_filename, team_name):
    """Try to match a logo filename with a team name"""
    base_name = os.path.splitext(logo_filename)[0].lower()
    team_normalized = normalize(team_name)
    slug = create_slug(team_name)
    base_normalized = normalize(base_name)
    
    # Check various matching patterns
    if team_normalized in base_normalized or base_normalized in team_normalized:
        return True
    if slug in base_name or base_name in slug:
        return True
    # Check word-by-word matching
    team_words = set(team_normalized.split())
    base_words = set(base_normalized.split())
    if len(team_words.intersection(base_words)) >= 2:
        return True
    return False

# D2 Teams data - this will be populated from Wikipedia
# For now, create entries based on logo filenames
# The user can manually review and update

d2_entries = []

for logo_file in logo_files:
    logo_path = f"/d2 college football logos/{logo_file}"
    base_name = os.path.splitext(logo_file)[0]
    
    # Create a display name from filename
    display_name = base_name.replace('-', ' ').replace('_', ' ')
    display_name = ' '.join(word.capitalize() for word in display_name.split())
    
    slug = create_slug(base_name)
    
    d2_entries.append({
        'name': display_name,
        'slug': slug,
        'conference': 'Unknown Conference',  # Will need manual review
        'division': 'D2',
        'logo': logo_path,
        'needs_review': True
    })

print(f"\nGenerated {len(d2_entries)} D2 entries from logo filenames")

# Read the current college-data.ts file
if COLLEGE_DATA_FILE.exists():
    with open(COLLEGE_DATA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the closing bracket
    last_bracket = content.rfind(']')
    if last_bracket == -1:
        print("Error: Could not find closing bracket in college-data.ts")
        exit(1)
    
    before = content[:last_bracket]
    after = content[last_bracket:]
    
    # Generate new entries string
    entries_str = ',\n'.join([
        f"""  {{
    name: '{entry["name"].replace("'", "\\'")}',
    slug: '{entry["slug"]}',
    conference: '{entry["conference"].replace("'", "\\'")}',
    division: 'D2',
    logo: '{entry["logo"]}',
  }}{' // TODO: Review and update conference' if entry['needs_review'] else ''}"""
        for entry in d2_entries
    ])
    
    # Insert new entries
    new_content = before + ',\n' + entries_str + '\n' + after
    
    # Write back
    with open(COLLEGE_DATA_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"\n✅ Added {len(d2_entries)} D2 entries to college-data.ts")
    print("\n⚠️  Note: Conference names need manual review and update")
    print("   Please review entries marked with TODO comments")
else:
    print(f"Error: college-data.ts not found at {COLLEGE_DATA_FILE}")


