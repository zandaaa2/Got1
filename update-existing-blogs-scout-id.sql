-- Update existing blog posts to have scout_id based on author_email
-- This will associate existing blogs created externally with the correct scout
-- Run this in Supabase SQL Editor

-- Update blog posts where author_email matches zander@got1.app
-- Replace 'USER_ID_HERE' with the actual user_id for zander@got1.app from auth.users
UPDATE blog_posts 
SET scout_id = (
  SELECT id FROM auth.users 
  WHERE email = 'zander@got1.app' 
  LIMIT 1
)
WHERE author_email = 'zander@got1.app'
  AND (scout_id IS NULL OR scout_id != (
    SELECT id FROM auth.users 
    WHERE email = 'zander@got1.app' 
    LIMIT 1
  ));

-- You can also update other existing blogs by email if needed
-- Just replace the email and run the query again

