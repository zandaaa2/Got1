-- Diagnostic script to find why Wesley's evaluation isn't being created

-- Check 1: Does the parent_children relationship exist?
SELECT 
  pc.parent_id,
  pc.player_id,
  parent_profile.user_id as parent_user_id,
  parent_profile.full_name as parent_name,
  player_profile.user_id as player_user_id,
  player_profile.full_name as player_name
FROM parent_children pc
LEFT JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
LEFT JOIN profiles player_profile ON player_profile.user_id = pc.player_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08';  -- Wesley's user_id

-- Check 2: Does an evaluation with this payment_intent_id already exist?
SELECT 
  e.id,
  e.scout_id,
  e.player_id,
  e.status,
  e.payment_intent_id,
  e.purchased_by,
  e.purchased_by_type
FROM evaluations e
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

-- Check 3: Test the INSERT query structure (without actually inserting)
SELECT 
  '68b20b0f-db5f-4d0c-bd6a-5e08ad1dd1a0'::UUID as scout_id,
  '44a49a82-9633-4b6e-be81-a2940d2c5f08'::UUID as player_id,
  'requested' as status,
  40.00 as price,
  'paid' as payment_status,
  'pi_3ShkXkQdb0iB9qY43mlcx0qA' as payment_intent_id,
  ROUND(40.00 * 0.1 * 100) / 100 as platform_fee,
  ROUND(40.00 * 0.9 * 100) / 100 as scout_payout,
  pc.parent_id as purchased_by,
  'parent' as purchased_by_type,
  NOW() as created_at
FROM parent_children pc
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'
LIMIT 1;

