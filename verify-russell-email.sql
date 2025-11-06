-- Verify the email address for Russell Westbrook's account
-- This will show the actual email in auth.users vs what we're sending to

SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  p.full_name,
  p.role,
  p.user_id as profile_user_id
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.full_name ILIKE '%russell%' 
   OR p.full_name ILIKE '%westbrook%'
   OR au.email ILIKE '%russell%'
   OR au.email ILIKE '%westbrook%'
   OR au.email = 'bah0037@auburn.edu';

-- Also check all users with that email
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  p.full_name,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.email = 'bah0037@auburn.edu';

