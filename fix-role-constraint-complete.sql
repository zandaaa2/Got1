-- Fix profiles role constraint to include 'user' AND 'parent' roles
-- Run this in Supabase SQL Editor
-- This is required for the new onboarding flow where accounts start as 'user' until a role is selected
-- And for parent accounts functionality

-- Step 1: Drop the existing constraint (if it exists)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add the updated constraint that includes ALL roles: 'user', 'parent', 'player', 'scout'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'scout', 'parent', 'user'));

-- Step 3: Verify the constraint was updated correctly
SELECT 
  tc.constraint_name, 
  cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';





