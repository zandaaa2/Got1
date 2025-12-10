-- Add scout_category field to profiles table
-- Categories: 'pro' (NFL), 'd1-college' (Power 4 conferences), 'smaller-college' (D2/D3/etc)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS scout_category TEXT CHECK (scout_category IN ('pro', 'd1-college', 'smaller-college'));

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_profiles_scout_category ON profiles(scout_category) WHERE scout_category IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.scout_category IS 'Category for scouts: pro (NFL), d1-college (Power 4), smaller-college (D2/D3/etc)';


