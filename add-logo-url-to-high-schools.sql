-- Add logo_url column to high_schools table
-- Run this migration in Supabase SQL Editor

ALTER TABLE high_schools 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- If profile_image_url exists and logo_url doesn't, copy data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'high_schools' AND column_name = 'profile_image_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'high_schools' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE high_schools ADD COLUMN logo_url TEXT;
    UPDATE high_schools SET logo_url = profile_image_url WHERE profile_image_url IS NOT NULL;
  END IF;
END $$;


