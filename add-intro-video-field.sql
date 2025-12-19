-- Add intro_video_url column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Add comment
COMMENT ON COLUMN profiles.intro_video_url IS 'URL to the intro video for scouts (max 1 minute)';
