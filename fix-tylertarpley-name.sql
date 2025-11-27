-- Fix tylertarpley's name
-- First, check their current data (search by username or email)
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.username,
  p.role,
  p.avatar_url,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.username = 'tylertarpley'
  OR u.email ILIKE '%tylertarpley%'
ORDER BY p.created_at DESC
LIMIT 1;

-- Option 1: If you know their email, use this (replace with actual email):
/*
UPDATE profiles p
SET 
  full_name = COALESCE(NULLIF(p.full_name, ''), p.username, 'Tyler Tarpley'),
  updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email = 'tylertarpley@example.com'  -- Replace with actual email
  AND (p.full_name IS NULL OR p.full_name = '');
*/

-- Option 2: If you know their username, use this:
/*
UPDATE profiles p
SET 
  full_name = COALESCE(NULLIF(p.full_name, ''), p.username, 'Tyler Tarpley'),
  updated_at = NOW()
WHERE p.username = 'tylertarpley'
  AND (p.full_name IS NULL OR p.full_name = '');
*/

-- Option 3: If you want to set a specific name (replace 'Tyler Tarpley' with actual name):
/*
UPDATE profiles p
SET 
  full_name = 'Tyler Tarpley',  -- Replace with actual name if different
  updated_at = NOW()
WHERE p.username = 'tylertarpley';
*/

