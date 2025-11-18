-- Add graduation month/year and jersey number to high_school_players
ALTER TABLE high_school_players
  ADD COLUMN IF NOT EXISTS graduation_month TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS jersey_number TEXT;

COMMENT ON COLUMN high_school_players.graduation_month IS 'Graduation month (e.g., May)';
COMMENT ON COLUMN high_school_players.graduation_year IS 'Graduation year (e.g., 2026)';
COMMENT ON COLUMN high_school_players.jersey_number IS 'Player jersey number (string to allow letters)';


