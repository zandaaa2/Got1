-- Fix Wesley West's evaluation that was purchased by a parent
-- Payment Intent ID: pi_3ShkXkQdb0iB9qY43mlcx0qA
-- Amount: $40.00
-- Scout: Joe Marto (user_id: 68b20b0f-db5f-4d0c-bd6a-5e08ad1dd1a0)
-- Player: Wesley West (user_id: 44a49a82-9633-4b6e-be81-a2940d2c5f08)

-- Step 0: Ensure purchased_by columns exist (run this first if columns don't exist)
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS purchased_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS purchased_by_type TEXT CHECK (purchased_by_type IN ('player', 'parent'));

-- Step 1: Find the parent who purchased this for Wesley
SELECT 
  pc.parent_id,
  parent_profile.user_id as parent_user_id,
  parent_profile.full_name as parent_name
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08';  -- Wesley's user_id

-- Step 2a: First, let's get the parent_id (run this to see the parent)
SELECT 
  pc.parent_id as parent_user_id,
  parent_profile.full_name as parent_name
FROM parent_children pc
JOIN profiles parent_profile ON parent_profile.user_id = pc.parent_id
WHERE pc.player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'  -- Wesley's user_id
LIMIT 1;

-- Step 2b: Create the evaluation (automatically finds parent or uses player as fallback)
-- Only inserts if evaluation doesn't already exist
DO $$
DECLARE
  v_parent_id UUID;
  v_purchased_by_type TEXT;
BEGIN
  -- Check if evaluation already exists
  IF EXISTS (SELECT 1 FROM evaluations WHERE payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA') THEN
    RAISE NOTICE 'Evaluation already exists with payment_intent_id pi_3ShkXkQdb0iB9qY43mlcx0qA';
    RETURN;
  END IF;
  
  -- Get parent_id if exists
  SELECT parent_id INTO v_parent_id
  FROM parent_children
  WHERE player_id = '44a49a82-9633-4b6e-be81-a2940d2c5f08'
  LIMIT 1;
  
  -- Determine purchased_by_type
  IF v_parent_id IS NOT NULL THEN
    v_purchased_by_type := 'parent';
  ELSE
    v_parent_id := '44a49a82-9633-4b6e-be81-a2940d2c5f08'::UUID;  -- Use Wesley's user_id
    v_purchased_by_type := 'player';
  END IF;
  
  -- Insert the evaluation
  INSERT INTO evaluations (
    scout_id,
    player_id,
    status,
    price,
    payment_status,
    payment_intent_id,
    platform_fee,
    scout_payout,
    purchased_by,
    purchased_by_type,
    created_at
  ) VALUES (
    '68b20b0f-db5f-4d0c-bd6a-5e08ad1dd1a0'::UUID,  -- Joe Marto's user_id
    '44a49a82-9633-4b6e-be81-a2940d2c5f08'::UUID,  -- Wesley West's user_id
    'requested',
    40.00,
    'paid',
    'pi_3ShkXkQdb0iB9qY43mlcx0qA',  -- Payment intent ID from Stripe
    ROUND(40.00 * 0.1 * 100) / 100,  -- 10% platform fee = $4.00
    ROUND(40.00 * 0.9 * 100) / 100,  -- 90% scout payout = $36.00
    v_parent_id,
    v_purchased_by_type,
    NOW()
  );
  
  RAISE NOTICE 'Evaluation created successfully with purchased_by: % (type: %)', v_parent_id, v_purchased_by_type;
END $$;

-- Step 3: Verify the evaluation was created
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
  scout_profile.full_name as scout_name,
  player_profile.full_name as player_name,
  purchaser_profile.full_name as purchaser_name
FROM evaluations e
LEFT JOIN profiles scout_profile ON scout_profile.user_id = e.scout_id
LEFT JOIN profiles player_profile ON player_profile.user_id = e.player_id
LEFT JOIN profiles purchaser_profile ON purchaser_profile.user_id = e.purchased_by
WHERE e.payment_intent_id = 'pi_3ShkXkQdb0iB9qY43mlcx0qA';

