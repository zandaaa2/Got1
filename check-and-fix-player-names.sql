-- Check and fix player names for ALL players with missing names
-- This script checks what data exists and provides a way to update missing names

-- First, let's see what we have for the specific 5 players
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.username,
  p.role,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  u.email,
  u.created_at as user_created_at
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email IN (
  'gshazel28@gmail.com',
  'gabedennis70@gmail.com',
  'izikduran08@gmail.com',
  'jayjohnsonjr7@yahoo.com',
  'kingstonbeyer3@gmail.com'
)
AND p.role = 'player'
ORDER BY u.email;

-- Also check ALL players with missing names
SELECT 
  COUNT(*) as players_with_missing_names,
  COUNT(CASE WHEN username IS NOT NULL AND username != '' THEN 1 END) as have_username
FROM profiles p
WHERE p.role = 'player'
  AND (p.full_name IS NULL OR p.full_name = '');

-- If full_name is NULL or empty, you can manually update them
-- Replace 'Player Name Here' with the actual name for each player
-- Run these UPDATE statements one at a time for each player:

/*
-- Example updates (replace with actual names):
UPDATE profiles 
SET 
  full_name = 'Player Name Here',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gshazel28@gmail.com')
  AND role = 'player';

UPDATE profiles 
SET 
  full_name = 'Player Name Here',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gabedennis70@gmail.com')
  AND role = 'player';

UPDATE profiles 
SET 
  full_name = 'Player Name Here',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'izikduran08@gmail.com')
  AND role = 'player';

UPDATE profiles 
SET 
  full_name = 'Player Name Here',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jayjohnsonjr7@yahoo.com')
  AND role = 'player';

UPDATE profiles 
SET 
  full_name = 'Player Name Here',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kingstonbeyer3@gmail.com')
  AND role = 'player';
*/

-- Option C: Fix ALL players with missing names (use username as fallback)
-- This will fix the 5 specific players AND any other players with the same issue
-- Uncomment this to use username as full_name for ALL players with missing names:
/*
UPDATE profiles p
SET 
  full_name = COALESCE(NULLIF(p.full_name, ''), p.username),
  updated_at = NOW()
WHERE p.role = 'player'
  AND (p.full_name IS NULL OR p.full_name = '')
  AND p.username IS NOT NULL
  AND p.username != '';
*/

-- Option D: Fix only the 5 specific players (if you prefer to be more selective)
/*
UPDATE profiles p
SET 
  full_name = COALESCE(NULLIF(p.full_name, ''), p.username),
  updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email IN (
    'gshazel28@gmail.com',
    'gabedennis70@gmail.com',
    'izikduran08@gmail.com',
    'jayjohnsonjr7@yahoo.com',
    'kingstonbeyer3@gmail.com'
  )
  AND p.role = 'player'
  AND (p.full_name IS NULL OR p.full_name = '')
  AND p.username IS NOT NULL
  AND p.username != '';
*/

