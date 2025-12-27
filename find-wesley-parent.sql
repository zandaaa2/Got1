-- Find the parent who purchased Wesley's evaluation
-- Since parent_children relationship doesn't exist, we need to find the parent another way

-- Option 1: Check if there are any parent profiles that might be linked
-- Look for parent accounts that could be associated with Wesley
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.role,
  p.created_at
FROM profiles p
WHERE p.role = 'parent'
ORDER BY p.created_at DESC
LIMIT 10;

-- Option 2: Check Stripe payment customer email to find matching parent account
-- The customer email from Stripe was: player+1766553259633-3l1axl@got1.app
-- But we need to check auth.users to find the actual user

-- Option 3: Check if there are any evaluations with similar patterns
-- Look for other evaluations purchased by parents for this player
SELECT 
  e.id,
  e.purchased_by,
  e.purchased_by_type,
  purchaser_profile.full_name as purchaser_name,
  purchaser_profile.role as purchaser_role
FROM evaluations e
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley's user_id
  AND e.purchased_by_type = 'parent'
ORDER BY e.created_at DESC;

-- Option 4: Check all parent_children relationships to see if any are for Wesley's user_id
SELECT 
  pc.parent_id,
  pc.player_id,
  parent_profile.full_name as parent_name,
  player_profile.full_name as player_name
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
JOIN profiles player_profile ON player_profile.user_id = pc.player_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley's user_id
   OR player_profile.user_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08';

