-- Check for duplicate referrals for a specific user
-- Replace 'bah0037@auburn.edu' with the actual email

-- First, get the user_id
SELECT 
  au.id as user_id,
  au.email,
  p.user_id as profile_user_id,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.email = 'bah0037@auburn.edu';

-- Then check all referrals for that user_id
-- (Replace USER_ID_HERE with the user_id from above)
SELECT 
  r.*,
  au_referred.email as referred_email,
  au_referrer.email as referrer_email,
  p_referred.full_name as referred_name,
  p_referrer.full_name as referrer_name
FROM referrals r
JOIN auth.users au_referred ON r.referred_id = au_referred.id
LEFT JOIN auth.users au_referrer ON r.referrer_id = au_referrer.id
LEFT JOIN profiles p_referred ON p_referred.user_id = au_referred.id
LEFT JOIN profiles p_referrer ON p_referrer.user_id = au_referrer.id
WHERE r.referred_id = (SELECT id FROM auth.users WHERE email = 'bah0037@auburn.edu')
ORDER BY r.created_at DESC;

-- Check for any duplicate referrals (same referred_id with different referrer_id)
SELECT 
  referred_id,
  COUNT(*) as referral_count,
  STRING_AGG(referrer_id::text, ', ') as referrer_ids,
  STRING_AGG(id::text, ', ') as referral_ids
FROM referrals
GROUP BY referred_id
HAVING COUNT(*) > 1;

