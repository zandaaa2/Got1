-- Add table to track pending high school admin invites
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS high_school_admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  high_school_id UUID NOT NULL REFERENCES high_schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- If user exists on platform
  invite_token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_high_school_admin_invites_school ON high_school_admin_invites(high_school_id);
CREATE INDEX IF NOT EXISTS idx_high_school_admin_invites_email ON high_school_admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_high_school_admin_invites_token ON high_school_admin_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_high_school_admin_invites_status ON high_school_admin_invites(status) WHERE status = 'pending';

-- Partial unique index to ensure only one pending invite per school/email combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_high_school_admin_invites_unique_pending 
ON high_school_admin_invites(high_school_id, email) 
WHERE status = 'pending';

