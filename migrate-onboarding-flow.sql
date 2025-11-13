-- Migration for new onboarding flow
-- Run this in your Supabase SQL Editor

-- 1. Add 'user' role to the role constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'player', 'scout'));

-- 2. Add graduation_month field for players
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS graduation_month INTEGER;

-- Add constraint for graduation_month (1-12)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS graduation_month_check;

ALTER TABLE profiles
ADD CONSTRAINT graduation_month_check
CHECK (graduation_month IS NULL OR (graduation_month >= 1 AND graduation_month <= 12));

-- 3. Ensure username is unique (should already exist but making sure)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles (username)
WHERE username IS NOT NULL;

-- 4. Add index for role filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. Update existing profiles that don't have a role to 'user' (if any)
-- Note: This is a safety measure, but existing profiles should already have 'player' or 'scout'
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;

-- 6. Add comments for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user (base), player, or scout';
COMMENT ON COLUMN profiles.graduation_month IS 'Graduation month (1-12) for players';
COMMENT ON COLUMN profiles.birthday IS 'User birthday - must be 16+ years old';
COMMENT ON COLUMN profiles.username IS 'Unique username for the user profile';

