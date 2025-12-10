-- Add profile_claimed field to profiles table
-- TRUE if scout has claimed their profile, FALSE/null if unclaimed

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_claimed BOOLEAN DEFAULT FALSE;

-- Create index for claimed status
CREATE INDEX IF NOT EXISTS idx_profiles_claimed ON profiles(profile_claimed) WHERE profile_claimed = FALSE;

-- Add comment
COMMENT ON COLUMN profiles.profile_claimed IS 'TRUE if scout has claimed their profile and set up their account, FALSE if unclaimed placeholder profile';

-- Create waitlist table
CREATE TABLE IF NOT EXISTS scout_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scout_profile_id, user_id)
);

-- Create index for waitlist lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_scout ON scout_waitlist(scout_profile_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON scout_waitlist(user_id);

-- Enable RLS on waitlist table
ALTER TABLE scout_waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (join waitlist)
CREATE POLICY "Anyone can join waitlist" ON scout_waitlist
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries" ON scout_waitlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all waitlist entries (for managing)
CREATE POLICY "Admins can view all waitlist entries" ON scout_waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


