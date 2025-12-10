-- Check if parent-child relationship exists
-- This query helps debug why "ran by parent" banner isn't showing

-- First, find the user IDs for both accounts
SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'bah0037@auburn.edu' OR p.full_name ILIKE '%Zander%'
ORDER BY u.email;

-- Then check parent_children relationships
SELECT 
  pc.id,
  pc.parent_id,
  pc.player_id,
  pc.created_at,
  parent_u.email as parent_email,
  parent_p.full_name as parent_name,
  parent_p.role as parent_role,
  player_u.email as player_email,
  player_p.full_name as player_name,
  player_p.role as player_role
FROM parent_children pc
LEFT JOIN auth.users parent_u ON parent_u.id = pc.parent_id
LEFT JOIN profiles parent_p ON parent_p.user_id = pc.parent_id
LEFT JOIN auth.users player_u ON player_u.id = pc.player_id
LEFT JOIN profiles player_p ON player_p.user_id = pc.player_id
WHERE parent_u.email = 'bah0037@auburn.edu' 
   OR player_p.full_name ILIKE '%Zander%'
ORDER BY pc.created_at DESC;

-- Check all parent_children relationships (if RLS allows)
SELECT COUNT(*) as total_relationships FROM parent_children;

-- Verify the relationship exists for a specific player
-- Replace 'PLAYER_USER_ID_HERE' with the actual player's user_id from auth.users
-- SELECT * FROM parent_children WHERE player_id = 'PLAYER_USER_ID_HERE';

