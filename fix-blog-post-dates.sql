-- Fix blog posts with future dates
-- This updates any blog posts that have published_at dates in the future
-- to use dates in December 2024 instead

UPDATE blog_posts
SET published_at = '2024-12-15T10:00:00Z'
WHERE slug = 'recruiting-trends-2026' 
  AND published_at > NOW();

UPDATE blog_posts
SET published_at = '2024-12-10T10:00:00Z'
WHERE slug = 'how-scouts-evaluate-qbs' 
  AND published_at > NOW();

UPDATE blog_posts
SET published_at = '2024-12-05T10:00:00Z'
WHERE slug = 'success-stories' 
  AND published_at > NOW();

-- Update any other blog posts with future dates to use the current date
UPDATE blog_posts
SET published_at = NOW()
WHERE published_at > NOW()
  AND slug NOT IN ('recruiting-trends-2026', 'how-scouts-evaluate-qbs', 'success-stories');

