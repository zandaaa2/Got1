-- Migration: Update evaluations table for new payment flow
-- This adds new statuses and payment tracking fields

-- Step 1: Drop the old constraint first (so we can update data)
ALTER TABLE evaluations 
  DROP CONSTRAINT IF EXISTS evaluations_status_check;

-- Step 2: Migrate existing data (now safe to update since constraint is dropped)
-- Convert 'pending' status to 'requested' (waiting for scout confirmation)
UPDATE evaluations 
SET status = 'requested' 
WHERE status = 'pending';

-- Step 3: Add the new constraint with updated status values
ALTER TABLE evaluations
  ADD CONSTRAINT evaluations_status_check 
  CHECK (status IN ('requested', 'confirmed', 'denied', 'cancelled', 'in_progress', 'completed'));

-- Add payment tracking fields
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT, -- For scout's Stripe Connect account
  ADD COLUMN IF NOT EXISTS transfer_id TEXT, -- Stripe transfer ID when payout happens
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10, 2), -- 10% platform fee
  ADD COLUMN IF NOT EXISTS scout_payout NUMERIC(10, 2), -- 90% to scout
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS denied_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Add profiles field for Stripe Connect account ID
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT; -- Stripe Connect account ID for scouts

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_payment_status ON evaluations(payment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id);

-- Update default status to 'requested' for new evaluations
ALTER TABLE evaluations
  ALTER COLUMN status SET DEFAULT 'requested';

