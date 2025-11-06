-- Find email for a user by their profile name
-- Replace 'Russell Westbrook' with the actual name in the profile

-- Get email for Russell Westbrook
SELECT 
  p.full_name,
  p.user_id,
  au.email,
  au.email_confirmed_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE p.full_name ILIKE '%Russell%Westbrook%' OR p.full_name ILIKE '%russell%westbrook%';

-- Alternative: Find by user_id if you know it
-- SELECT email FROM auth.users WHERE id = 'USER_ID_HERE';

