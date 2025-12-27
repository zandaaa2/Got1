-- Find and fix Wesley's evaluation parent purchase
-- Since parent_children relationship doesn't exist, we'll find the parent from Stripe payment

-- Step 1: Find the parent account that made the purchase
-- Check recent parent accounts that might have purchased this
-- The Stripe customer email was: player+1766553259633-3l1axl@got1.app
-- But we need to find the actual parent user_id

-- Option A: Check auth.users for the customer email from Stripe
-- You'll need to check Stripe dashboard for the customer email associated with payment_intent_id: pi_3ShkXkQdb0iB9qY43mlcx0qA
-- Then run: SELECT id, email FROM auth.users WHERE email = 'CUSTOMER_EMAIL_FROM_STRIPE';

-- Option B: Check all parent accounts created around the time of purchase
-- The payment was made recently, so check recent parent accounts
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  p.role,
  u.created_at
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE p.role = 'parent'
ORDER BY u.created_at DESC
LIMIT 20;

-- Step 2: Once you have the parent user_id, update the evaluation
-- Replace 'PARENT_USER_ID_HERE' with the actual parent user_id from Step 1
UPDATE evaluations
SET 
  purchased_by = 'PARENT_USER_ID_HERE'::UUID,  -- Replace with actual parent user_id
  purchased_by_type = 'parent'
WHERE payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA'
  AND (purchased_by IS NULL OR purchased_by_type != 'parent')
RETURNING 
  id,
  purchased_by,
  purchased_by_type,
  scout_id,
  player_id;

-- Step 3: Verify the update
SELECT 
  e.id,
  e.purchased_by,
  e.purchased_by_type,
  purchaser_profile.full_name as purchaser_name,
  purchaser_profile.role as purchaser_role,
  CASE 
    WHEN e.purchased_by_type = 'parent' AND purchaser_profile.role = 'parent' THEN '✅ Correctly set as parent purchase'
    WHEN e.purchased_by IS NULL THEN '❌ purchased_by is still NULL'
    WHEN e.purchased_by_type = 'player' THEN '⚠️ Still marked as player purchase'
    ELSE '❌ Issue with purchased_by_type'
  END as status
FROM evaluations e
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

