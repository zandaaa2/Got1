-- Create player_offers table for tracking college offers
CREATE TABLE IF NOT EXISTS player_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('scholarship', 'preferred_walk_on')),
  school TEXT NOT NULL,
  school_slug TEXT, -- For linking to college pages
  start_date DATE,
  coach_name TEXT,
  coach_email TEXT,
  coach_phone TEXT,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'committed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, school, offer_type) -- Prevent duplicate offers for same school/type
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_player_offers_profile_id ON player_offers(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_offers_status ON player_offers(status);
CREATE INDEX IF NOT EXISTS idx_player_offers_school_slug ON player_offers(school_slug);

-- Add trigger to update updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_player_offers_updated_at ON player_offers;
CREATE TRIGGER update_player_offers_updated_at BEFORE UPDATE ON player_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE player_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first to allow re-running)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view all player offers" ON player_offers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'player_offers' 
    AND policyname = 'Users can view all player offers'
  ) THEN
    CREATE POLICY "Users can view all player offers" ON player_offers
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Players can create their own offers" ON player_offers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'player_offers' 
    AND policyname = 'Players can create their own offers'
  ) THEN
    CREATE POLICY "Players can create their own offers" ON player_offers
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = player_offers.profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'player'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Players can update their own offers" ON player_offers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'player_offers' 
    AND policyname = 'Players can update their own offers'
  ) THEN
    CREATE POLICY "Players can update their own offers" ON player_offers
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = player_offers.profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'player'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Players can delete their own offers" ON player_offers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'player_offers' 
    AND policyname = 'Players can delete their own offers'
  ) THEN
    CREATE POLICY "Players can delete their own offers" ON player_offers
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = player_offers.profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'player'
        )
      );
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE player_offers IS 'College offers received by players';
COMMENT ON COLUMN player_offers.offer_type IS 'Type of offer: scholarship or preferred_walk_on';
COMMENT ON COLUMN player_offers.status IS 'Offer status: offered or committed (only one can be committed per player)';

