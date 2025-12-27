-- Add pinned field to posts and blog_posts tables
-- Run this in Supabase SQL Editor
-- NOTE: If blog_posts table doesn't exist, run setup-blog-posts-complete.sql first

-- Add pinned column to posts table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'posts') THEN
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add pinned column to blog_posts table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes for pinned queries
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(pinned) WHERE pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_posts_pinned ON blog_posts(pinned) WHERE pinned = TRUE;

-- Add comments
COMMENT ON COLUMN posts.pinned IS 'If TRUE, this post will appear at the top of the user''s profile';
COMMENT ON COLUMN blog_posts.pinned IS 'If TRUE, this blog post will appear at the top of the scout''s profile';

