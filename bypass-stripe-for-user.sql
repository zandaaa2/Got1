-- Bypass Stripe setup and set custom price/turnaround for bah0037@auburn.edu
-- This allows the user to proceed without Stripe Connect setup
UPDATE profiles
SET 
  price_per_eval = 20,
  turnaround_time = '48 hours',
  stripe_account_id = 'bypass_manual_setup'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'bah0037@auburn.edu'
);

-- Verify the update
SELECT 
  p.user_id,
  au.email,
  p.price_per_eval,
  p.turnaround_time,
  p.stripe_account_id,
  p.role
FROM profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'bah0037@auburn.edu';

