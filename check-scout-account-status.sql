-- Check account status for specific scouts who can't update pricing
-- Run this in your Supabase SQL Editor to diagnose the issue

-- Check Coach Blackburn (3a978c43-9d35-42a4-900e-1f8776d10360)
SELECT 
  'Coach Blackburn' as scout_name,
  p.user_id,
  p.id as profile_id,
  p.role,
  p.price_per_eval,
  p.stripe_account_id,
  p.offer_title,
  p.free_eval_enabled,
  CASE 
    WHEN p.stripe_account_id IS NULL THEN 'No Stripe account'
    WHEN p.stripe_account_id IS NOT NULL THEN 'Has Stripe account'
    ELSE 'Unknown'
  END as stripe_status
FROM profiles p
WHERE p.user_id = '3a978c43-9d35-42a4-900e-1f8776d10360';

-- Check Antrine Wicks (a5e9ec30-ef88-491d-9d54-d7b344035c15)
SELECT 
  'Antrine Wicks' as scout_name,
  p.user_id,
  p.id as profile_id,
  p.role,
  p.price_per_eval,
  p.stripe_account_id,
  p.offer_title,
  p.free_eval_enabled,
  CASE 
    WHEN p.stripe_account_id IS NULL THEN 'No Stripe account'
    WHEN p.stripe_account_id IS NOT NULL THEN 'Has Stripe account'
    ELSE 'Unknown'
  END as stripe_status
FROM profiles p
WHERE p.user_id = 'a5e9ec30-ef88-491d-9d54-d7b344035c15';

-- Check RLS policies on profiles table
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'UPDATE';

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

