-- Add transfer_id column to referrals table to track Stripe transfer IDs
-- IMPORTANT: This migration assumes the referrals table already exists from add-referral-program-tables.sql
-- If you get an error that the table doesn't exist, run add-referral-program-tables.sql first!

-- Only proceed if the referrals table exists
DO $$
BEGIN
  -- Check if referrals table exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals'
  ) THEN
    -- Add transfer_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'referrals' 
      AND column_name = 'transfer_id'
    ) THEN
      ALTER TABLE referrals
        ADD COLUMN transfer_id TEXT;
      
      -- Add index for efficient lookups
      CREATE INDEX IF NOT EXISTS idx_referrals_transfer_id ON referrals(transfer_id);
      
      -- Add comment for documentation
      COMMENT ON COLUMN referrals.transfer_id IS 'Stripe transfer ID when payment is processed automatically';
      
      RAISE NOTICE 'Successfully added transfer_id column to referrals table';
    ELSE
      RAISE NOTICE 'transfer_id column already exists in referrals table';
    END IF;
  ELSE
    RAISE EXCEPTION 'referrals table does not exist. Please run add-referral-program-tables.sql first!';
  END IF;
END $$;

