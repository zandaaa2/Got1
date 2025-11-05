-- Add birthday field to profiles table for age verification (16+ requirement)
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add comment explaining the field
COMMENT ON COLUMN profiles.birthday IS 'User birthday for age verification. Platform requires users to be 16+ years old.';

-- Add a check constraint to ensure the birthday is in the past and reasonable (not more than 120 years ago)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS birthday_valid_check;

ALTER TABLE profiles
ADD CONSTRAINT birthday_valid_check 
CHECK (
  birthday IS NULL 
  OR (
    birthday <= CURRENT_DATE 
    AND birthday >= CURRENT_DATE - INTERVAL '120 years'
  )
);

-- Note: Age validation (16+) will be handled in the application code
-- This constraint just ensures the date is valid

