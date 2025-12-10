-- Add offer_title field to profiles table
-- This allows scouts to customize the name of their evaluation offer (defaults to "Standard Evaluation")

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS offer_title TEXT DEFAULT 'Standard Evaluation';

-- Add comment
COMMENT ON COLUMN profiles.offer_title IS 'Custom name for the scout''s evaluation offer (e.g., "Standard Evaluation", "Premium Evaluation", etc.)';

