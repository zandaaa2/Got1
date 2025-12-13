-- Add social_link column to scout_applications table
-- Run this in your Supabase SQL Editor

ALTER TABLE scout_applications 
ADD COLUMN IF NOT EXISTS social_link TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN scout_applications.social_link IS 'Social media link from scout application (e.g., Twitter/X, Instagram).';
