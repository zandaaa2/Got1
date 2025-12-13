-- Add parent-specific fields to profiles table
-- Run this in Supabase SQL Editor

-- Step 1: Add email and phone fields (for parents)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Add created_by_parent flag to track if parent created the player page
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_by_parent BOOLEAN DEFAULT false;

-- Step 3: Add index for created_by_parent for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_parent ON profiles(created_by_parent);

-- Add comments for documentation
COMMENT ON COLUMN profiles.email IS 'Email address (primarily for parent accounts)';
COMMENT ON COLUMN profiles.phone IS 'Phone number (primarily for parent accounts)';
COMMENT ON COLUMN profiles.created_by_parent IS 'True if this player profile was created by a parent account';







