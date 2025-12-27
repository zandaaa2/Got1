# Testing Posts API

Since RLS policies are correct (Step 1 passed), let's debug why posts aren't showing:

## Step 1: Check Browser Console

1. Go to `/profile` page
2. Open browser console (F12)
3. Click on the "Posts" tab
4. Look for these console logs:
   - `🔄 Loading posts for user: [your-user-id]`
   - `📡 API Response status: [status]`
   - `✅ Posts loaded: [number] posts` OR `❌ Error loading posts`

## Step 2: Check Network Tab

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Click on "Posts" tab on profile page
4. Look for a request to `/api/posts/user/[your-user-id]`
5. Click on it and check:
   - **Status**: Should be 200 (OK)
   - **Response**: Should show `{"posts": [...]}` with your 3 posts

## Step 3: If API Returns Empty Array

If the API returns `{"posts": []}` even though you have 3 posts in the database:

1. Check the server logs (terminal where Next.js is running)
2. Look for: `📝 Fetching posts for user: [your-user-id]`
3. Look for: `✅ Posts fetched: 0 posts` (this means RLS is blocking)
4. Look for: `⚠️ No posts returned - checking if RLS policy is blocking`

## Step 4: Verify RLS Policy

Run this in Supabase SQL Editor to double-check:

```sql
-- Check current posts RLS policy
SELECT 
  policyname, 
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- Should show:
-- "Users can view non-deleted posts" | SELECT | {authenticated,anon} | (deleted_at IS NULL)
```

If the `roles` column doesn't show `{authenticated,anon}`, run `fix-posts-rls-policy-complete.sql`.

## Step 5: Test Direct Query

Run this in Supabase SQL Editor (replace with your user_id):

```sql
-- Test if you can see your own posts
SELECT 
  id,
  user_id,
  LEFT(content, 50) as content_preview,
  created_at,
  deleted_at
FROM posts 
WHERE user_id = 'f7343629-81f1-4807-98cb-a54b0cad77f6'
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

If this returns your 3 posts, the issue is with the API route or RLS policy.
If this returns 0 rows, there's a different issue.

