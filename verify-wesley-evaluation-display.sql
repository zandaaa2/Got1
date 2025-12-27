-- Verify Wesley's evaluation will show in the correct tabs
-- This checks if the evaluation is set up correctly for display

-- Check 1: Verify the evaluation exists and has correct data
SELECT 
  e.id,
  e.scout_id,
  e.player_id,
  e.status,
  e.price,
  e.payment_status,
  e.payment_intent_id,
  e.purchased_by,
  e.purchased_by_type,
  e.created_at,
  -- Scout info
  scout_profile.user_id as scout_user_id,
  scout_profile.full_name as scout_name,
  -- Player info
  player_profile.user_id as player_user_id,
  player_profile.full_name as player_name,
  -- Purchaser info
  purchaser_profile.user_id as purchaser_user_id,
  purchaser_profile.full_name as purchaser_name,
  purchaser_profile.role as purchaser_role
FROM evaluations e
LEFT JOIN profiles scout_profile ON scout_profile.user_id = e.scout_id
LEFT JOIN profiles player_profile ON player_profile.user_id = e.player_id
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

-- Check 2: Simulate Joe Marto's query (scout's in_progress tab)
-- This is what MyEvalsContent.tsx does for scouts
SELECT 
  e.id,
  e.status,
  e.scout_id,
  e.player_id,
  e.created_at,
  scout_profile.full_name as scout_name,
  player_profile.full_name as player_name
FROM evaluations e
LEFT JOIN profiles scout_profile ON scout_profile.user_id = e.scout_id
LEFT JOIN profiles player_profile ON player_profile.user_id = e.player_id
WHERE e.scout_id = '68b20b0f-db5f-4d0c-bd6a-5e08ad1dd1a0'  -- Joe Marto's user_id
  AND e.status IN ('requested', 'confirmed', 'in_progress')  -- in_progress tab filter
ORDER BY e.created_at DESC;

-- Check 3: Simulate Parent's query (parent's in_progress tab)
-- This is what MyEvalsContent.tsx does for parents
-- First, get the parent's user_id
SELECT 
  pc.parent_id as parent_user_id,
  parent_profile.full_name as parent_name
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley's user_id
LIMIT 1;

-- Then use that parent_user_id in the query below (replace PARENT_USER_ID)
-- SELECT 
--   e.id,
--   e.status,
--   e.scout_id,
--   e.player_id,
--   e.purchased_by,
--   e.created_at,
--   scout_profile.full_name as scout_name,
--   player_profile.full_name as player_name
-- FROM evaluations e
-- LEFT JOIN profiles scout_profile ON scout_profile.user_id = e.scout_id
-- LEFT JOIN profiles player_profile ON player_profile.user_id = e.player_id
-- WHERE e.purchased_by = 'PARENT_USER_ID'  -- Replace with parent_user_id from Check 3
--   AND e.status IN ('requested', 'confirmed', 'in_progress')  -- in_progress tab filter
-- ORDER BY e.created_at DESC;

-- Check 4: Verify all required fields are set correctly
SELECT 
  CASE 
    WHEN e.scout_id = '68b20b0f-db5f-4d0c-bd6a-5e08ad1dd1a0' THEN '✅ Correct scout_id'
    ELSE '❌ Wrong scout_id'
  END as scout_check,
  CASE 
    WHEN e.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08' THEN '✅ Correct player_id'
    ELSE '❌ Wrong player_id'
  END as player_check,
  CASE 
    WHEN e.status IN ('requested', 'confirmed', 'in_progress') THEN '✅ Will show in in_progress tab'
    ELSE '❌ Will NOT show in in_progress tab'
  END as status_check,
  CASE 
    WHEN e.purchased_by IS NOT NULL THEN '✅ purchased_by is set'
    ELSE '❌ purchased_by is NULL'
  END as purchased_by_check,
  CASE 
    WHEN e.purchased_by_type = 'parent' THEN '✅ Correctly marked as parent purchase'
    WHEN e.purchased_by_type = 'player' THEN '⚠️ Marked as player purchase (may be wrong)'
    ELSE '❌ purchased_by_type not set'
  END as purchased_by_type_check,
  CASE 
    WHEN e.payment_status = 'paid' THEN '✅ Payment status is paid'
    ELSE '❌ Payment status is not paid'
  END as payment_status_check,
  CASE 
    WHEN e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA' THEN '✅ Payment intent ID matches'
    ELSE '❌ Payment intent ID mismatch'
  END as payment_intent_check
FROM evaluations e
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

