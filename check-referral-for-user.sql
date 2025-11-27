-- Check if referral exists for user ID: 344e17b4-03e2-4954-8010-d9ef826e9aeb
-- Run this in Supabase SQL Editor

-- First, get the user's email
SELECT 
  id,
  email
FROM auth.users
WHERE id = '344e17b4-03e2-4954-8010-d9ef826e9aeb';

-- Check all referrals for this user (as referred_id)
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
WHERE r.referred_id = '344e17b4-03e2-4954-8010-d9ef826e9aeb'
ORDER BY r.created_at DESC;

-- Check RLS policy on referrals table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'referrals';

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'referrals';

