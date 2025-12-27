-- Fix blog posts with future dates
-- Update all blog posts to have dates from today backwards (chronological order)
-- Pinned posts will still appear first, but within each group (pinned/unpinned), 
-- they'll be ordered by published_at chronologically (newest first)

-- First, update any blog posts with future dates to be from today backwards
-- We'll space them out over the past few months, maintaining their relative order

-- Step 1: Update blog posts with future published_at dates
-- Space them out from today backwards, one day apart
DO $$
DECLARE
  post_record RECORD;
  day_offset INTEGER := 0;
BEGIN
  FOR post_record IN 
    SELECT id FROM blog_posts 
    WHERE published_at > NOW() 
    ORDER BY published_at DESC
  LOOP
    UPDATE blog_posts
    SET published_at = NOW() - (day_offset || ' days')::INTERVAL
    WHERE id = post_record.id;
    
    day_offset := day_offset + 1;
  END LOOP;
END $$;

-- Step 2: Also update any blog posts that have published_at in the future (fallback)
UPDATE blog_posts
SET published_at = NOW() - INTERVAL '1 day'
WHERE published_at > NOW();

-- Step 3: For blog posts that don't have a published_at but have created_at in the future
UPDATE blog_posts
SET published_at = created_at - INTERVAL '1 day'
WHERE published_at IS NULL AND created_at > NOW();

-- Step 4: For blog posts with no published_at, set it to created_at or now
UPDATE blog_posts
SET published_at = COALESCE(created_at, NOW())
WHERE published_at IS NULL;

