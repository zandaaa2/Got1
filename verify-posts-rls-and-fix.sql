-- Verify and fix RLS policy for posts table
-- Run this in your Supabase SQL Editor

-- Step 1: Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'posts';

-- Step 2: Check existing policies
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- Step 3: Ensure RLS is enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view non-deleted posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view non-deleted posts" ON posts;
DROP POLICY IF EXISTS "Public can view posts" ON posts;

-- Step 5: Create a policy that allows both authenticated and anonymous users to view posts
CREATE POLICY "Anyone can view non-deleted posts" ON posts
  FOR SELECT 
  TO authenticated, anon
  USING (deleted_at IS NULL);

-- Step 6: Verify the policy was created
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- Step 7: Test query (should work for both authenticated and anonymous users)
-- This should return posts if RLS is working correctly
SELECT COUNT(*) as visible_posts 
FROM posts 
WHERE deleted_at IS NULL;

