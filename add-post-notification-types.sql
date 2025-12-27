-- Add notification types for post likes and comments
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add the new constraint with post notification types
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
    'post_liked',
    'post_commented',
    'blog_post_liked',
    'blog_post_commented'
  ));

