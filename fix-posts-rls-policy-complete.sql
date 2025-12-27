-- Complete fix for posts RLS policy to ensure authenticated users can view posts
-- Run this in your Supabase SQL Editor
-- This fixes the issue where posts exist in the database but don't show on /profile

-- Step 1: Ensure RLS is enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing SELECT policy (if it exists)
DROP POLICY IF EXISTS "Users can view non-deleted posts" ON posts;

-- Step 3: Recreate SELECT policy with explicit role specification
-- This is critical - without "TO authenticated, anon", the policy may not work correctly
CREATE POLICY "Users can view non-deleted posts" ON posts
  FOR SELECT 
  TO authenticated, anon
  USING (deleted_at IS NULL);

-- Step 4: Verify the policy was created correctly
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- Step 5: Test the policy (optional - replace with your user_id)
-- This should return posts if RLS is working correctly
-- SELECT * FROM posts WHERE user_id = 'f7343629-81f1-4807-98cb-a54b0cad77f6' AND deleted_at IS NULL;

