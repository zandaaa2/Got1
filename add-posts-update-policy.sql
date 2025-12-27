-- Add UPDATE policy for posts table to allow users to update their own posts
-- This is needed for editing posts and soft-deleting posts (setting deleted_at)
-- Run this in your Supabase SQL Editor

-- Ensure RLS is enabled on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'posts';

-- Drop existing UPDATE policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

-- Create UPDATE policy to allow users to update their own posts
-- This allows editing content and soft-deleting (setting deleted_at)
-- USING clause: checks if user can update the existing row (must be owner)
-- WITH CHECK clause: checks if the updated row values are allowed (user_id must remain the same)
-- Note: We allow updates to posts even if deleted_at is set, for flexibility
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created
SELECT 
  policyname, 
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;
