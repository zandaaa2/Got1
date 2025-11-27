-- Debug query to check if referral exists for a user
-- Replace 'bah0037@auburn.edu' with the actual email you're checking

-- Check if referral exists
SELECT 
  r.id as referral_id,
  r.referrer_id,
  r.referred_id,
  r.referrer_role,
  r.referred_role,
  r.payment_status,
  r.created_at as referral_created_at,
  au_referred.email as referred_email,
  au_referrer.email as referrer_email,
  p_referred.user_id as profile_user_id,
  p_referred.role as profile_role
FROM referrals r
JOIN auth.users au_referred ON r.referred_id = au_referred.id
LEFT JOIN auth.users au_referrer ON r.referrer_id = au_referrer.id
LEFT JOIN profiles p_referred ON p_referred.user_id = au_referred.id
WHERE au_referred.email = 'bah0037@auburn.edu'  -- Replace with actual email
   OR r.referred_id = (SELECT id FROM auth.users WHERE email = 'bah0037@auburn.edu');

-- Also check all referrals for this user_id (in case email doesn't match)
-- First, get the user_id from email
SELECT 
  au.id as user_id,
  au.email,
  p.user_id as profile_user_id,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.email = 'bah0037@auburn.edu';

-- Then check referrals using that user_id
-- (Replace USER_ID_HERE with the user_id from above query)
-- SELECT * FROM referrals WHERE referred_id = 'USER_ID_HERE';

