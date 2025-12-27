-- Fix Wesley's evaluation: Wesley is the PARENT, Alijah Cook is the PLAYER
-- The evaluation currently has player_id = Wesley's user_id, but it should be Alijah's

-- Step 1: Find Alijah Cook's user_id
SELECT 
  p.user_id,
  p.full_name,
  p.role,
  p.username
FROM profiles p
WHERE p.full_name ILIKE '%Alijah%Cook%'
   OR p.username ILIKE '%alijah%'
   OR p.username ILIKE '%cook%'
ORDER BY p.created_at DESC;

-- Step 2: Also check parent_children to find the relationship
SELECT 
  pc.parent_id,
  pc.player_id,
  parent_profile.full_name as parent_name,
  parent_profile.role as parent_role,
  player_profile.full_name as player_name,
  player_profile.role as player_role,
  player_profile.user_id as player_user_id
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
JOIN profiles player_profile ON player_profile.user_id = pc.player_id
WHERE pc.parent_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley West's user_id
   OR parent_profile.full_name ILIKE '%Wesley%West%';

-- Step 3: Update the evaluation with correct player_id and purchased_by
-- Automatically finds Alijah's user_id from parent_children relationship
UPDATE evaluations
SET 
  player_id = (
    SELECT pc.player_id 
    FROM parent_children pc 
    WHERE pc.parent_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley West (parent)
    LIMIT 1
  ),
  purchased_by = '44a49a82-9633-4b6e-be81-a2940d2c5f08'::UUID,  -- Wesley West (parent)
  purchased_by_type = 'parent'
WHERE payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA'
  AND EXISTS (
    SELECT 1 FROM parent_children pc 
    WHERE pc.parent_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'
  )
RETURNING 
  id,
  scout_id,
  player_id,
  purchased_by,
  purchased_by_type,
  status,
  payment_status;

-- Step 4: Verify the update
SELECT 
  e.id,
  e.scout_id,
  scout_profile.full_name as scout_name,
  e.player_id,
  player_profile.full_name as player_name,
  e.purchased_by,
  purchaser_profile.full_name as purchaser_name,
  purchaser_profile.role as purchaser_role,
  e.purchased_by_type,
  CASE 
    WHEN e.purchased_by_type = 'parent' 
         AND purchaser_profile.role = 'parent' 
         AND e.player_id != e.purchased_by THEN '✅ Correctly set as parent purchase for correct player'
    WHEN e.player_id = e.purchased_by THEN '❌ player_id is same as purchased_by (wrong)'
    WHEN e.purchased_by_type = 'player' THEN '⚠️ Still marked as player purchase'
    WHEN e.purchased_by IS NULL THEN '❌ purchased_by is NULL'
    ELSE '❌ Issue with evaluation setup'
  END as status
FROM evaluations e
LEFT JOIN profiles scout_profile ON scout_profile.user_id = e.scout_id
LEFT JOIN profiles player_profile ON player_profile.user_id = e.player_id
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

