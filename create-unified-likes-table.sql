-- Create unified likes table for evaluations, posts, and blog posts
-- Run this in Supabase SQL Editor

-- Unified Likes table (polymorphic)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  likeable_type TEXT NOT NULL CHECK (likeable_type IN ('evaluation', 'post', 'blog_post')),
  likeable_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(likeable_type, likeable_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_likes_likeable ON likes(likeable_type, likeable_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);

-- RLS Policies for likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like content" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Migrate existing blog_likes to unified likes table (if blog_likes table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blog_likes') THEN
    INSERT INTO likes (likeable_type, likeable_id, user_id, created_at)
    SELECT 'blog_post', blog_post_id, user_id, created_at
    FROM blog_likes
    ON CONFLICT (likeable_type, likeable_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Migrate existing post_likes to unified likes table (if post_likes table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_likes') THEN
    INSERT INTO likes (likeable_type, likeable_id, user_id, created_at)
    SELECT 'post', post_id, user_id, created_at
    FROM post_likes
    ON CONFLICT (likeable_type, likeable_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Optional: Drop old tables after migration (uncomment if you want to remove old tables)
-- DROP TABLE IF EXISTS blog_likes;
-- DROP TABLE IF EXISTS post_likes;

