-- Add view_count column to profiles table for tracking profile views
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for efficient queries on view counts
CREATE INDEX IF NOT EXISTS idx_profiles_view_count ON profiles(view_count);

-- Add comment for documentation
COMMENT ON COLUMN profiles.view_count IS 'Total number of times this profile has been viewed on the browse page';

-- Create function to atomically increment view_count (optional - for better concurrency)
CREATE OR REPLACE FUNCTION increment_profile_view_count(profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

