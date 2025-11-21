-- Create referral_program_applications table for users to apply to be referrers
CREATE TABLE IF NOT EXISTS referral_program_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id) -- One application per user
);

-- Create referrals table to track successful referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_role TEXT NOT NULL CHECK (referrer_role IN ('player', 'scout')),
  referred_role TEXT NOT NULL CHECK (referred_role IN ('player', 'scout', 'user')),
  amount_earned NUMERIC(10, 2) NOT NULL, -- $5 for scout, $2 for player
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id) -- Prevent duplicate referrals
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_referral_applications_user_id ON referral_program_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_applications_status ON referral_program_applications(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Add trigger to update updated_at on referrals
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE referral_program_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_program_applications
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own referral applications" ON referral_program_applications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referral_program_applications' 
    AND policyname = 'Users can view their own referral applications'
  ) THEN
    CREATE POLICY "Users can view their own referral applications" ON referral_program_applications
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create their own referral applications" ON referral_program_applications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referral_program_applications' 
    AND policyname = 'Users can create their own referral applications'
  ) THEN
    CREATE POLICY "Users can create their own referral applications" ON referral_program_applications
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Admins can view all referral applications
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all referral applications" ON referral_program_applications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referral_program_applications' 
    AND policyname = 'Admins can view all referral applications'
  ) THEN
    CREATE POLICY "Admins can view all referral applications" ON referral_program_applications
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policies for referrals
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referrals' 
    AND policyname = 'Users can view their own referrals'
  ) THEN
    CREATE POLICY "Users can view their own referrals" ON referrals
      FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "System can create referrals" ON referrals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referrals' 
    AND policyname = 'System can create referrals'
  ) THEN
    CREATE POLICY "System can create referrals" ON referrals
      FOR INSERT WITH CHECK (true); -- System creates via API with service role
  END IF;
END $$;

-- Admins can view all referrals
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all referrals" ON referrals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referrals' 
    AND policyname = 'Admins can view all referrals'
  ) THEN
    CREATE POLICY "Admins can view all referrals" ON referrals
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE referral_program_applications IS 'Applications from users wanting to join the referral program';
COMMENT ON TABLE referrals IS 'Tracks successful referrals and earnings';
COMMENT ON COLUMN referrals.amount_earned IS 'Earnings: $5 for scout referrals, $2 for player referrals';
