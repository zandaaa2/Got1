-- Add scout-related notification types
-- Run this in Supabase SQL Editor

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'evaluation_requested',
    'evaluation_confirmed',
    'evaluation_denied',
    'evaluation_completed',
    'evaluation_cancelled',
    'scout_application_approved',
    'scout_application_denied',
    'scout_application_received',  -- NEW: When application is submitted
    'scout_status_revoked',        -- NEW: When scout status is revoked
    'payment_received',
    'payment_failed',
    'payment_refunded',
    'refund_started',
    'user_signed_up',
    'user_signed_in',
    'user_converted_to_player',
    'user_converted_to_basic',
    'stripe_account_issue',
    'scout_ready_to_earn'
  ));

