-- Add intro_video_url and intro_video_poster_url columns to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
ADD COLUMN IF NOT EXISTS intro_video_poster_url TEXT;

-- Add comments
COMMENT ON COLUMN profiles.intro_video_url IS 'URL to the intro video for scouts (max 1 minute)';
COMMENT ON COLUMN profiles.intro_video_poster_url IS 'URL to the poster/thumbnail image extracted from the intro video';
