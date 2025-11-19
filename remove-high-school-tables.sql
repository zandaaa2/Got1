-- Remove High School Feature - Database Cleanup
-- Run this in Supabase SQL Editor to remove all high school tables and related data

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_high_school_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Drop high school related tables (in order due to foreign keys)
DROP TABLE IF EXISTS high_school_evaluations CASCADE;
DROP TABLE IF EXISTS high_school_players CASCADE;
DROP TABLE IF EXISTS high_school_admin_invites CASCADE;
DROP TABLE IF EXISTS high_school_admins CASCADE;
DROP TABLE IF EXISTS high_schools CASCADE;
DROP TABLE IF EXISTS school_referrals CASCADE;

-- Remove high_school_id column from profiles table
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS high_school_id;

-- Update notifications type constraint to remove high school notification types
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

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
  'scout_application_approved',
  'scout_application_denied',
  'scout_status_revoked'
));

-- Note: This script will permanently delete all high school data
-- Make sure you've backed up or archived the data before running this

