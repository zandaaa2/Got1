-- Add share_token to evaluations table
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Generate share_token for existing evaluations that don't have one
UPDATE evaluations 
SET share_token = gen_random_uuid() 
WHERE share_token IS NULL;

-- Add index for fast lookup by token
CREATE INDEX IF NOT EXISTS idx_evaluations_share_token ON evaluations(share_token);

-- Create evaluation_shares table for analytics
CREATE TABLE IF NOT EXISTS evaluation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous shares
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'copy_link', 'direct')),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Store additional data like referrer, user agent, etc.
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_evaluation_id ON evaluation_shares(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_shared_at ON evaluation_shares(shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_platform ON evaluation_shares(platform);

-- Row Level Security (RLS) Policies for evaluation_shares
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;

-- Allow public viewing of shares for analytics (shares are not sensitive data)
CREATE POLICY "Public can view shares" ON evaluation_shares
  FOR SELECT USING (true);

-- Service role can insert (for API tracking)
-- No user-insertable policy needed since API will use admin client

