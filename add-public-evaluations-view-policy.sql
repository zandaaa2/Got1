-- Allow public viewing of completed evaluations for profile pages
-- Run this in your Supabase SQL Editor

-- Add policy to allow anyone (including non-authenticated users) to view completed evaluations
CREATE POLICY "Anyone can view completed evaluations" ON evaluations
  FOR SELECT
  TO anon, authenticated
  USING (status = 'completed');

-- This allows:
-- 1. Non-signed-in users to see completed evaluations on profile pages
-- 2. The evaluation count to display correctly
-- 3. The blurred placeholder evaluations to show the correct count

-- Security notes:
-- - Only COMPLETED evaluations are visible
-- - Requested, confirmed, in_progress evaluations remain private
-- - Users must be signed in to see evaluations they're involved in that aren't completed

