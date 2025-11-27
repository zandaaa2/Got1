-- Verify referral exists for a user
-- Replace 'bah0037@auburn.edu' with the actual email

-- Get user info
SELECT 
  au.id as auth_user_id,
  au.email,
  p.user_id as profile_user_id,
  p.id as profile_id,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE au.email = 'bah0037@auburn.edu';

-- Check referrals for that user (using auth.users.id)
SELECT 
  r.*,
  au_referred.email as referred_email,
  au_referrer.email as referrer_email
FROM referrals r
JOIN auth.users au_referred ON r.referred_id = au_referred.id
LEFT JOIN auth.users au_referrer ON r.referrer_id = au_referrer.id
WHERE r.referred_id = (SELECT id FROM auth.users WHERE email = 'bah0037@auburn.edu')
ORDER BY r.created_at DESC;

-- Check if there's a mismatch between profile.user_id and referrals.referred_id
SELECT 
  p.user_id as profile_user_id,
  r.referred_id as referral_referred_id,
  CASE 
    WHEN p.user_id = r.referred_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as match_status
FROM profiles p
LEFT JOIN referrals r ON r.referred_id = p.user_id
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'bah0037@auburn.edu');

