-- Set DEFAULT role to 'user' for NEW accounts only
-- Run this in Supabase SQL Editor
-- This ensures new accounts default to 'user' instead of 'player'
-- Existing accounts are NOT changed - only new accounts will use this default

-- Step 1: Ensure the constraint allows 'user', 'parent', 'player', 'scout'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'scout', 'parent', 'user'));

-- Step 2: Set the DEFAULT value to 'user' (CRITICAL - this ensures new profiles default to 'user')
-- This only affects NEW profiles created without an explicit role value
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 3: Verify the default was set correctly
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Expected result: 
-- column_default should be: 'user'::text
-- This means any INSERT without an explicit role will default to 'user'

-- Step 4: Verify the constraint
SELECT 
  tc.constraint_name, 
  cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';

-- Expected: Should show role IN ('player', 'scout', 'parent', 'user')

