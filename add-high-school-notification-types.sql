-- Add High School notification types
-- Run this migration in Supabase SQL Editor

-- Drop existing constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Re-add constraint with all high school notification types
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  -- Existing types
  'evaluation_requested',
  'evaluation_confirmed',
  'evaluation_denied',
  'evaluation_completed',
  'evaluation_cancelled',
  'payment_received',
  'payment_failed',
  'payment_refunded',
  'user_signed_up',
  'user_signed_in',
  'user_converted_to_player',
  'user_converted_to_basic',
  'stripe_account_issue',
  'scout_ready_to_earn',
  'scout_application_received',
  'scout_status_revoked',
  
  -- High school types
  'school_payment_requested',
  'school_payment_accepted',
  'school_payment_denied',
  'school_eval_cancelled',
  'roster_invite_sent',
  'player_joined_school',
  'admin_invited',
  'admin_accepted',
  'admin_denied',
  'referral_bonus_paid',
  'school_deleted',
  'coach_invited',
  'join_school',
  'release_from_school',
  'school_roster_request',
  'school_roster_accepted',
  'school_roster_denied'
));

