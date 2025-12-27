-- Fix notification types constraint by checking existing types first
-- This script will add all existing types to the constraint

-- Step 1: Check what notification types currently exist
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Step 2: Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 3: Add the new constraint with ALL types (existing + new)
-- This includes all types that exist in the database plus new ones
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    -- Evaluation types
    'evaluation_requested',
    'evaluation_confirmed',
    'evaluation_denied',
    'evaluation_completed',
    'evaluation_cancelled',
    -- Scout application types
    'scout_application_approved',
    'scout_application_denied',
    'scout_application_received',
    -- Payment types
    'payment_received',
    'payment_failed',
    -- Stripe types
    'stripe_account_issue',
    -- Post types (new)
    'post_liked',
    'post_commented',
    -- Blog post types (new)
    'blog_post_liked',
    'blog_post_commented',
    -- Evaluation types (new)
    'evaluation_liked',
    'evaluation_commented',
    -- Auth types
    'user_signed_in',
    'user_signed_up',
    'user_converted_to_basic',
    -- Scout ready types
    'scout_ready_to_earn'
  ));

-- Step 4: Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_type_check';

