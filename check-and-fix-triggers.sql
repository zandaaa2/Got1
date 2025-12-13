-- Check for database triggers that might auto-create profiles
-- Run this in Supabase SQL Editor

-- 1. Check for ANY triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 2. Check for functions that might create profiles
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%INSERT INTO profiles%'
   OR routine_definition ILIKE '%profiles%INSERT%';

-- 3. Check for triggers on auth.users that might create profiles
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND (action_statement ILIKE '%profiles%' OR action_statement ILIKE '%INSERT%');

-- 4. Verify the default is set correctly
SELECT 
  column_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Expected: column_default should be 'user'::text

-- If you find a trigger that's creating profiles with role='player', you can disable it:
-- DROP TRIGGER IF EXISTS trigger_name ON profiles;







