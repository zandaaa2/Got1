-- Add sport fields to profiles table
-- For players: sport (single sport emoji/text)
-- For scouts: sports (array of sports they evaluate for)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sport TEXT,
ADD COLUMN IF NOT EXISTS sports TEXT[] DEFAULT '{}';

-- Create index for sport filtering
CREATE INDEX IF NOT EXISTS idx_profiles_sport ON profiles(sport);
CREATE INDEX IF NOT EXISTS idx_profiles_sports ON profiles USING GIN(sports);

-- Add comment
COMMENT ON COLUMN profiles.sport IS 'Sport for players (e.g., 🏈, 🏀, ⚽)';
COMMENT ON COLUMN profiles.sports IS 'Array of sports for scouts (e.g., {🏈, 🏀})';

