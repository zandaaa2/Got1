-- Add positions and college_connections columns to profiles table for scout offers
-- These will eventually move to a scout_offers table when multiple offers are implemented
-- For now, they're stored as JSONB in the profiles table

-- Add positions column (JSONB array of position strings)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT NULL;

-- Add college_connections column (JSONB array of college slugs)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_connections JSONB DEFAULT NULL;

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_profiles_positions ON profiles USING GIN(positions);
CREATE INDEX IF NOT EXISTS idx_profiles_college_connections ON profiles USING GIN(college_connections);

-- Add comments for documentation
COMMENT ON COLUMN profiles.positions IS 'Array of football positions for scout offers (e.g., ["QB", "WR", "TE"])';
COMMENT ON COLUMN profiles.college_connections IS 'Array of college slugs for scout connections (e.g., ["auburn", "alabama"])';

