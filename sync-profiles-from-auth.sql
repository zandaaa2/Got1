-- Sync profile names and avatars from auth.users metadata
-- This script updates profiles that are missing full_name or avatar_url
-- by pulling from auth.users user_metadata

-- First, see how many profiles need syncing
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as missing_names,
  COUNT(CASE WHEN avatar_url IS NULL OR avatar_url = '' THEN 1 END) as missing_avatars
FROM profiles;

-- Update profiles with missing names from auth.users metadata
-- Note: This requires a database function or admin access to auth.users
-- For now, this is a template - you may need to run this via Supabase Admin API

-- Option 1: Create a function to sync (requires admin privileges)
/*
CREATE OR REPLACE FUNCTION sync_profiles_from_auth()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  auth_name TEXT;
  auth_avatar TEXT;
BEGIN
  FOR user_record IN 
    SELECT p.id, p.user_id, p.full_name, p.avatar_url
    FROM profiles p
    WHERE (p.full_name IS NULL OR p.full_name = '')
       OR (p.avatar_url IS NULL OR p.avatar_url = '')
  LOOP
    -- Get auth metadata (this would need to be done via API or admin function)
    -- For now, this is a placeholder showing the logic
    
    -- Update if we have auth data
    IF auth_name IS NOT NULL AND (user_record.full_name IS NULL OR user_record.full_name = '') THEN
      UPDATE profiles 
      SET full_name = auth_name, updated_at = NOW()
      WHERE id = user_record.id;
    END IF;
    
    IF auth_avatar IS NOT NULL AND (user_record.avatar_url IS NULL OR user_record.avatar_url = '') THEN
      UPDATE profiles 
      SET avatar_url = auth_avatar, updated_at = NOW()
      WHERE id = user_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Then run:
-- SELECT sync_profiles_from_auth();
*/

-- Option 2: Manual update for specific users (if you know their user_ids)
-- Replace USER_ID_HERE with actual user IDs
/*
UPDATE profiles 
SET 
  full_name = COALESCE(NULLIF(full_name, ''), username),
  updated_at = NOW()
WHERE user_id IN (
  -- Add user_ids here
  'USER_ID_HERE'
)
AND (full_name IS NULL OR full_name = '');
*/

