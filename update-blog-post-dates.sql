-- Update blog post dates
-- Most recent blog: December 27, 2025
-- Each subsequent blog: 2 days earlier

-- Step 1: Update blog posts to have dates starting from Dec 27, 2025, going backwards 2 days each
DO $$
DECLARE
  post_record RECORD;
  day_offset INTEGER := 0;
  base_date TIMESTAMPTZ := '2025-12-27 10:00:00'::TIMESTAMPTZ;
BEGIN
  -- Order by published_at DESC (newest first), or created_at if published_at is null
  FOR post_record IN 
    SELECT id 
    FROM blog_posts 
    ORDER BY 
      COALESCE(published_at, created_at) DESC NULLS LAST,
      created_at DESC NULLS LAST
  LOOP
    UPDATE blog_posts
    SET published_at = base_date - (day_offset || ' days')::INTERVAL
    WHERE id = post_record.id;
    
    day_offset := day_offset + 2; -- 2 days apart
  END LOOP;
END $$;

-- Verify the dates
SELECT 
  slug,
  title,
  published_at,
  created_at
FROM blog_posts
ORDER BY published_at DESC;

