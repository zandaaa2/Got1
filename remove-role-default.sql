-- Remove any DEFAULT value from the role column
-- Run this in Supabase SQL Editor
-- This ensures profiles are NOT created with a default role

-- Step 1: Check if there's a default value
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Step 2: Remove any default value (if it exists)
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT;

-- Step 3: Verify the default was removed
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Note: After running this, profiles MUST have a role explicitly set during insert
-- The application code should always provide a role value





