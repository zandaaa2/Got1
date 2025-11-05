-- Add missing columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add suspended_until column (for scout suspension feature)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Add birthday column (for age verification)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Create index for filtering suspended scouts
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON profiles(suspended_until) 
WHERE suspended_until IS NOT NULL;

-- Add comments explaining the fields
COMMENT ON COLUMN profiles.suspended_until IS 'Timestamp when suspension expires. NULL means not suspended.';
COMMENT ON COLUMN profiles.suspended_reason IS 'Reason for suspension (optional).';
COMMENT ON COLUMN profiles.birthday IS 'User birthday for age verification. Platform requires users to be 16+ years old.';

-- Add birthday constraint (if not already exists)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS birthday_valid_check;

ALTER TABLE profiles
ADD CONSTRAINT birthday_valid_check 
CHECK (
  birthday IS NULL 
  OR (
    birthday <= CURRENT_DATE 
    AND birthday >= CURRENT_DATE - INTERVAL '120 years'
  )
);

