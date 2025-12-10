-- Check if there's a DEFAULT value on the role column
-- Run this in Supabase SQL Editor

-- Check column defaults
SELECT 
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- Check for any triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Check the actual constraint
SELECT 
  tc.constraint_name, 
  cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';





