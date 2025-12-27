-- Add college_offers column to profiles table
-- This is a text field for players to list their college offers during onboarding
-- Structured offers are tracked in the player_offers table, but this field
-- allows for a simple text input during signup

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS college_offers TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.college_offers IS 'Text field for players to list college offers (simple text input during onboarding)';

