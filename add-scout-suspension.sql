-- Add suspension fields to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Create index for filtering suspended scouts
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON profiles(suspended_until) 
WHERE suspended_until IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN profiles.suspended_until IS 'Timestamp when suspension expires. NULL means not suspended.';
COMMENT ON COLUMN profiles.suspended_reason IS 'Reason for suspension (optional).';

