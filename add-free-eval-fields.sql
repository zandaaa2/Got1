-- Add free eval offer fields to profiles table
-- This allows scouts to offer free evaluations with a description

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS free_eval_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_eval_description TEXT;

-- Add comments
COMMENT ON COLUMN profiles.free_eval_enabled IS 'Whether scout has enabled their free eval offer';
COMMENT ON COLUMN profiles.free_eval_description IS 'Description of the free eval offer (minimum 250 characters)';










