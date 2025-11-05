-- Add work_history and additional_info columns to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS work_history TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN profiles.work_history IS 'Work history from scout application.';
COMMENT ON COLUMN profiles.additional_info IS 'Additional information from scout application.';

