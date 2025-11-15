-- Add new notification types to the schema
-- Run this migration to add the 6 new notification types:
-- - user_signed_up
-- - user_signed_in
-- - user_converted_to_player
-- - user_converted_to_basic
-- - stripe_account_issue
-- - scout_ready_to_earn

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
    'payment_received',
    'payment_failed',
    'refund_started',
    'user_signed_up',
    'user_signed_in',
    'user_converted_to_player',
    'user_converted_to_basic',
    'stripe_account_issue',
    'scout_ready_to_earn'
  ));

