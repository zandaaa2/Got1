-- Update Anderson's account role from 'player' to 'user' (basic user)
-- This query will find any profile with "anderson" in the name that is currently a player

-- First, find Anderson's account(s) to confirm
SELECT id, user_id, full_name, role 
FROM profiles 
WHERE LOWER(full_name) LIKE '%anderson%' 
  AND role = 'player';

-- Then update Anderson's role to 'user' (basic user)
-- This will update all accounts with "anderson" in the name that are currently players
-- If you only want to update a specific Anderson, add more specific WHERE conditions
UPDATE profiles 
SET role = 'user', updated_at = NOW()
WHERE LOWER(full_name) LIKE '%anderson%' 
  AND role = 'player'
RETURNING id, full_name, role;


