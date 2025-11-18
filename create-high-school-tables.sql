-- High School Feature Database Schema
-- Run this migration in Supabase SQL Editor

-- 1. High Schools table
CREATE TABLE IF NOT EXISTS high_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  profile_image_url TEXT,
  referral_school_id UUID REFERENCES high_schools(id),
  donation_link TEXT,
  stripe_account_id TEXT,
  admin_status TEXT DEFAULT 'pending' CHECK (admin_status IN ('pending', 'approved', 'denied')),
  admin_reviewed_at TIMESTAMPTZ,
  admin_reviewed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. High School Admins (junction table for 2 admins per school)
CREATE TABLE IF NOT EXISTS high_school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  high_school_id UUID NOT NULL REFERENCES high_schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(high_school_id, user_id)
);

-- 3. High School Players (roster)
CREATE TABLE IF NOT EXISTS high_school_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  high_school_id UUID NOT NULL REFERENCES high_schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Null if not signed up yet
  name TEXT NOT NULL,
  positions TEXT[] DEFAULT '{}', -- Array of positions (max 2 enforced at app level)
  email TEXT NOT NULL,
  username TEXT, -- If user exists on platform
  invite_sent_at TIMESTAMPTZ,
  invite_token TEXT UNIQUE, -- For email invite tracking
  joined_at TIMESTAMPTZ, -- When user_id was set (player joined)
  released_at TIMESTAMPTZ, -- When player was released
  release_requested_at TIMESTAMPTZ, -- When player requested release
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. High School Evaluations (tracks which evals belong to school)
CREATE TABLE IF NOT EXISTS high_school_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  high_school_id UUID NOT NULL REFERENCES high_schools(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  paid_by TEXT NOT NULL CHECK (paid_by IN ('school', 'player')),
  shared_by_player BOOLEAN DEFAULT false,
  school_cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(high_school_id, evaluation_id)
);

-- 5. School Referrals (for $20 referral bonuses)
CREATE TABLE IF NOT EXISTS school_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_school_id UUID NOT NULL REFERENCES high_schools(id),
  referred_school_id UUID NOT NULL REFERENCES high_schools(id),
  bonus_amount NUMERIC(10, 2) DEFAULT 20.00,
  bonus_status TEXT DEFAULT 'pending' CHECK (bonus_status IN ('pending', 'paid', 'failed')),
  bonus_paid_at TIMESTAMPTZ,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referring_school_id, referred_school_id)
);

-- 6. Add high_school_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS high_school_id UUID REFERENCES high_schools(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_high_schools_username ON high_schools(username);
CREATE INDEX IF NOT EXISTS idx_high_schools_admin_status ON high_schools(admin_status);
CREATE INDEX IF NOT EXISTS idx_high_schools_created_by ON high_schools(created_by);
CREATE INDEX IF NOT EXISTS idx_high_school_admins_school ON high_school_admins(high_school_id);
CREATE INDEX IF NOT EXISTS idx_high_school_admins_user ON high_school_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_high_school_players_school ON high_school_players(high_school_id);
CREATE INDEX IF NOT EXISTS idx_high_school_players_user ON high_school_players(user_id);
CREATE INDEX IF NOT EXISTS idx_high_school_players_email ON high_school_players(email);
CREATE INDEX IF NOT EXISTS idx_high_school_players_released ON high_school_players(high_school_id, released_at) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_high_school_evaluations_school ON high_school_evaluations(high_school_id);
CREATE INDEX IF NOT EXISTS idx_high_school_evaluations_eval ON high_school_evaluations(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_school_referrals_referring ON school_referrals(referring_school_id);
CREATE INDEX IF NOT EXISTS idx_school_referrals_referred ON school_referrals(referred_school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_high_school_id ON profiles(high_school_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_high_schools_updated_at
  BEFORE UPDATE ON high_schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_high_school_players_updated_at
  BEFORE UPDATE ON high_school_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


