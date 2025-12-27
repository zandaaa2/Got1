-- Fix Wesley's evaluation to have correct purchased_by_type
-- This updates the evaluation to mark it as a parent purchase

-- Step 1: Check if parent_children relationship exists
SELECT 
  pc.parent_id as parent_user_id,
  parent_profile.full_name as parent_name,
  pc.player_id as player_user_id,
  player_profile.full_name as player_name
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
JOIN profiles player_profile ON player_profile.user_id = pc.player_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08';  -- Wesley's user_id

-- Step 2: Update the evaluation with correct purchased_by and purchased_by_type
-- Replace 'PARENT_USER_ID_HERE' with the parent_user_id from Step 1
-- If Step 1 returns no rows, we need to find the parent another way
UPDATE evaluations
SET 
  purchased_by = (
    SELECT pc.parent_id 
    FROM parent_children pc 
    WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08' 
    LIMIT 1
  ),
  purchased_by_type = CASE 
    WHEN EXISTS (
      SELECT 1 FROM parent_children 
      WHERE player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'
    ) THEN 'parent'
    ELSE 'player'
  END
WHERE payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA'
  AND (
    -- Only update if purchased_by_type is wrong or purchased_by is the player
    purchased_by_type != 'parent' 
    OR purchased_by = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- If it's set to Wesley's user_id, it's wrong
  )
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
    WHEN e.purchased_by_type = 'player' THEN '⚠️ Still marked as player purchase'
    ELSE '❌ Issue with purchased_by_type'
  END as status
FROM evaluations e
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

