-- Fix RLS policy for posts table to ensure authenticated users can view posts
-- Run this in your Supabase SQL Editor

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view non-deleted posts" ON posts;

-- Recreate SELECT policy with explicit role specification
-- This allows both authenticated and anonymous users to view non-deleted posts
CREATE POLICY "Users can view non-deleted posts" ON posts
  FOR SELECT 
  TO authenticated, anon
  USING (deleted_at IS NULL);

-- Verify the policy was created
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

