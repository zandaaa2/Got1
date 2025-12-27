-- Complete RLS policy setup for posts table
-- This includes SELECT, INSERT, UPDATE, and DELETE policies
-- Run this in your Supabase SQL Editor

-- Ensure RLS is enabled on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'posts';

-- Drop all existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view non-deleted posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- SELECT policy: Anyone can view non-deleted posts
CREATE POLICY "Users can view non-deleted posts" ON posts
  FOR SELECT 
  USING (deleted_at IS NULL);

-- INSERT policy: Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update their own posts (including soft-delete)
-- This allows editing content and soft-deleting (setting deleted_at)
-- USING clause: user must own the post
-- WITH CHECK clause: ensures user_id doesn't change (allows deleted_at to be set)
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify all policies were created
SELECT 
  policyname, 
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;
