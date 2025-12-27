-- Update blog_posts table to support scout-authored blogs
-- Run this in Supabase SQL Editor

-- Add scout_id column to link blogs to scout profiles
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS scout_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for scout lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_scout_id ON blog_posts(scout_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Author can manage blog posts" ON blog_posts;

-- Anyone can view published blog posts
CREATE POLICY "Anyone can view blog posts" ON blog_posts
  FOR SELECT USING (true);

-- Scouts can insert their own blog posts
CREATE POLICY "Scouts can create blog posts" ON blog_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
    AND scout_id = auth.uid()
  );

-- Scouts can update their own blog posts
CREATE POLICY "Scouts can update their own blog posts" ON blog_posts
  FOR UPDATE USING (
    scout_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
  );

-- Scouts can delete their own blog posts
CREATE POLICY "Scouts can delete their own blog posts" ON blog_posts
  FOR DELETE USING (
    scout_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'scout'
    )
  );

-- Update existing blog posts to have scout_id (set to zander@got1.app's user_id)
-- You'll need to replace 'USER_ID_HERE' with the actual user_id for zander@got1.app
-- UPDATE blog_posts 
-- SET scout_id = (SELECT id FROM auth.users WHERE email = 'zander@got1.app' LIMIT 1)
-- WHERE scout_id IS NULL;

