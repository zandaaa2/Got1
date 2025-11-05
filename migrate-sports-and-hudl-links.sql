-- Combined migration for sports and multiple Hudl links
-- Run this in Supabase SQL Editor

-- Step 1: Add sport fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sport TEXT,
ADD COLUMN IF NOT EXISTS sports TEXT[] DEFAULT '{}';

-- Create indexes for sport filtering
CREATE INDEX IF NOT EXISTS idx_profiles_sport ON profiles(sport);
CREATE INDEX IF NOT EXISTS idx_profiles_sports ON profiles USING GIN(sports);

-- Step 2: Add multiple Hudl links support
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hudl_links JSONB DEFAULT '[]'::jsonb;

-- Create index for querying Hudl links
CREATE INDEX IF NOT EXISTS idx_profiles_hudl_links ON profiles USING GIN(hudl_links);

-- Step 3: Migrate existing hudl_link and sport to hudl_links array
UPDATE profiles 
SET hudl_links = CASE 
  WHEN hudl_link IS NOT NULL AND sport IS NOT NULL THEN 
    jsonb_build_array(jsonb_build_object('link', hudl_link, 'sport', sport))
  WHEN hudl_link IS NOT NULL THEN 
    jsonb_build_array(jsonb_build_object('link', hudl_link, 'sport', NULL))
  ELSE '[]'::jsonb
END
WHERE role = 'player';

-- Add comments
COMMENT ON COLUMN profiles.sport IS 'Sport for players (e.g., 🏈, 🏀, ⚽)';
COMMENT ON COLUMN profiles.sports IS 'Array of sports for scouts (e.g., {🏈, 🏀})';
COMMENT ON COLUMN profiles.hudl_links IS 'Array of Hudl links with sports: [{"link": "url", "sport": "sport_value"}]';

