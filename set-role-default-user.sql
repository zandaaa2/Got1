-- Set the DEFAULT value for the role column to 'user'
-- Run this in Supabase SQL Editor
-- This ensures that if a profile is created without an explicit role, it defaults to 'user'

-- Step 1: Check current default (if any)
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Step 2: Set the default value to 'user'
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 3: Verify the default was set
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Expected result: column_default should show: 'user'::text




