-- Check for triggers on auth.users that might auto-create profiles with wrong role
-- Run this in Supabase SQL Editor

-- 1. Check for triggers on auth.users that might create profiles
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND (action_statement ILIKE '%profiles%' OR action_statement ILIKE '%INSERT%');

-- 2. If you find a trigger, get its full definition:
-- SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'trigger_name';

-- 3. Check for functions that might create profiles
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%INSERT INTO profiles%'
   OR routine_definition ILIKE '%profiles%INSERT%';

-- 4. Check for triggers on profiles table itself
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- If you find a trigger creating profiles with role='player', you can:
-- 1. See its definition: SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'trigger_name';
-- 2. Drop it: DROP TRIGGER IF EXISTS trigger_name ON auth.users;
-- 3. Or modify it to use role='user' instead of 'player'





