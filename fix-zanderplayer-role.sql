-- Fix zanderplayer account role to 'player'
-- Run this in Supabase SQL Editor
-- IMPORTANT: You may need to disable RLS temporarily or use service role key

-- Step 1: Check the current role and user_id
SELECT id, user_id, username, full_name, role, updated_at
FROM profiles 
WHERE username = 'zanderplayer' OR full_name ILIKE '%zander%';

-- Step 2: Update the role to 'player' 
-- If RLS is blocking, you may need to temporarily disable it or use service role
UPDATE profiles 
SET role = 'player', updated_at = NOW()
WHERE username = 'zanderplayer';

-- Step 3: Verify the update worked
SELECT id, user_id, username, full_name, role, updated_at
FROM profiles 
WHERE username = 'zanderplayer';

-- Step 4: If the update still doesn't persist, check for triggers that might be resetting it
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND (action_statement ILIKE '%role%' OR action_statement ILIKE '%UPDATE%');

-- Step 5: Check for triggers on auth.users that might affect profiles
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND (action_statement ILIKE '%profiles%' OR action_statement ILIKE '%role%');

-- Step 6: If there's a trigger resetting the role, you may need to:
-- 1. Check the trigger definition: SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'trigger_name';
-- 2. Temporarily disable it: ALTER TABLE profiles DISABLE TRIGGER trigger_name;
-- 3. Update the role again
-- 4. Re-enable the trigger: ALTER TABLE profiles ENABLE TRIGGER trigger_name;










