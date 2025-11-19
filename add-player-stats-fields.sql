-- Add player statistics and information fields to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gpa NUMERIC(3, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS forty_yard_dash NUMERIC(4, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bench_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS squat_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clean_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classification TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.gpa IS 'Player GPA (0.00 to 4.00)';
COMMENT ON COLUMN profiles.weight IS 'Player weight in pounds';
COMMENT ON COLUMN profiles.height IS 'Player height (e.g., 6 feet 2 inches or 74 inches)';
COMMENT ON COLUMN profiles.forty_yard_dash IS '40-yard dash time in seconds';
COMMENT ON COLUMN profiles.bench_max IS 'Bench press max in pounds';
COMMENT ON COLUMN profiles.squat_max IS 'Squat max in pounds';
COMMENT ON COLUMN profiles.clean_max IS 'Clean max in pounds';
COMMENT ON COLUMN profiles.state IS 'State where player is located (e.g., Florida, Texas)';
COMMENT ON COLUMN profiles.classification IS 'School classification (e.g., 1A, 2A, 3A, 4A, 5A, 6A, 7A)';

