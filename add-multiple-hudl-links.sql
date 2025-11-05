-- Add support for multiple Hudl links with sports
-- Store as JSONB array: [{"link": "...", "sport": "..."}, ...]

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hudl_links JSONB DEFAULT '[]'::jsonb;

-- Create index for querying Hudl links
CREATE INDEX IF NOT EXISTS idx_profiles_hudl_links ON profiles USING GIN(hudl_links);

-- Migrate existing hudl_link and sport to hudl_links array
UPDATE profiles 
SET hudl_links = CASE 
  WHEN hudl_link IS NOT NULL AND sport IS NOT NULL THEN 
    jsonb_build_array(jsonb_build_object('link', hudl_link, 'sport', sport))
  WHEN hudl_link IS NOT NULL THEN 
    jsonb_build_array(jsonb_build_object('link', hudl_link, 'sport', NULL))
  ELSE '[]'::jsonb
END
WHERE role = 'player';

-- Add comment
COMMENT ON COLUMN profiles.hudl_links IS 'Array of Hudl links with sports: [{"link": "url", "sport": "sport_value"}]';

