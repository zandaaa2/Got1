-- Diagnostic script to check posts table and RLS policies
-- Run this in your Supabase SQL Editor to diagnose why posts aren't showing

-- 1. Check if RLS is enabled on posts table
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'posts';

-- 2. Check existing RLS policies on posts table
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- 3. Count total posts (bypassing RLS - run as admin/service role)
-- Note: This will only work if you're using the service role key
SELECT COUNT(*) as total_posts FROM posts;

-- 4. Count non-deleted posts
SELECT COUNT(*) as non_deleted_posts FROM posts WHERE deleted_at IS NULL;

-- 5. Check if there are any posts for a specific user (replace with your user_id)
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id from auth.users
-- SELECT 
--   id,
--   user_id,
--   content,
--   created_at,
--   deleted_at
-- FROM posts 
-- WHERE user_id = 'YOUR_USER_ID_HERE'
-- ORDER BY created_at DESC;

-- 6. Check posts with their user info
SELECT 
  p.id,
  p.user_id,
  LEFT(p.content, 50) as content_preview,
  p.created_at,
  p.deleted_at,
  pr.full_name,
  pr.username
FROM posts p
LEFT JOIN profiles pr ON pr.user_id = p.user_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

