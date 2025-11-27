-- Diagnostic script to check profile data vs what should be synced
-- Run this in Supabase SQL Editor to see what data exists

-- Check the 5 specific players mentioned
SELECT 
  p.id,
  p.user_id,
  p.full_name as profile_full_name,
  p.username as profile_username,
  p.avatar_url as profile_avatar_url,
  p.role,
  u.email,
  -- Note: We can't directly query user_metadata from SQL
  -- This will show what's in the profiles table
  CASE 
    WHEN p.full_name IS NULL OR p.full_name = '' THEN 'MISSING'
    ELSE 'EXISTS'
  END as name_status,
  CASE 
    WHEN p.avatar_url IS NULL OR p.avatar_url = '' THEN 'MISSING'
    ELSE 'EXISTS'
  END as avatar_status
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email IN (
  'gshazel28@gmail.com',
  'gabedennis70@gmail.com',
  'izikduran08@gmail.com',
  'jayjohnsonjr7@yahoo.com',
  'kingstonbeyer3@gmail.com',
  'tylertarpley@example.com' -- Add actual email if different
)
AND p.role = 'player'
ORDER BY u.email;

-- Count how many players are missing names
SELECT 
  COUNT(*) as total_players,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as missing_names,
  COUNT(CASE WHEN avatar_url IS NULL OR avatar_url = '' THEN 1 END) as missing_avatars
FROM profiles
WHERE role = 'player';

-- Show all players with missing names (first 20)
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'player'
  AND (p.full_name IS NULL OR p.full_name = '')
ORDER BY p.created_at DESC
LIMIT 20;

-- Check if full_name values are actually usernames (not real names)
-- This will show players where full_name matches username
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.full_name,
  CASE 
    WHEN p.full_name = p.username THEN 'SAME AS USERNAME'
    WHEN p.full_name ILIKE p.username THEN 'SIMILAR TO USERNAME'
    ELSE 'DIFFERENT'
  END as name_status,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'player'
ORDER BY p.created_at DESC;

