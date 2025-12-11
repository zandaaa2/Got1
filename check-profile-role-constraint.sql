-- Check the current role constraint on the profiles table
-- This helps verify if the constraint allows 'player', 'parent', 'user', and 'scout' roles

-- Step 1: Check what roles are allowed by the constraint
SELECT 
  tc.constraint_name, 
  cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';

-- Step 2: Check the default value for role
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Step 3: Check if there are any triggers on the profiles table that might modify role
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;
