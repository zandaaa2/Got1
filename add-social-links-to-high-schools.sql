-- Add HUDL and X (Twitter) social media links to high_schools table
ALTER TABLE high_schools
ADD COLUMN IF NOT EXISTS hudl_url TEXT,
ADD COLUMN IF NOT EXISTS x_url TEXT;


