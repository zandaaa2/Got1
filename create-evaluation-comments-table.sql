-- Create table for evaluation comments
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS evaluation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evaluation_comments_evaluation_id ON evaluation_comments(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_comments_user_id ON evaluation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_comments_created_at ON evaluation_comments(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE evaluation_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-deleted comments on evaluations they can access
CREATE POLICY "Users can view evaluation comments" ON evaluation_comments
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_comments.evaluation_id
      AND (
        evaluations.scout_id = auth.uid()
        OR evaluations.player_id = auth.uid()
        OR evaluations.purchased_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM parent_children
          WHERE parent_children.parent_id = auth.uid()
          AND parent_children.player_id = evaluations.player_id
        )
      )
    )
  );

-- Authenticated users can comment on evaluations they can access
CREATE POLICY "Authenticated users can comment on evaluations" ON evaluation_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_comments.evaluation_id
      AND (
        evaluations.scout_id = auth.uid()
        OR evaluations.player_id = auth.uid()
        OR evaluations.purchased_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM parent_children
          WHERE parent_children.parent_id = auth.uid()
          AND parent_children.player_id = evaluations.player_id
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON evaluation_comments
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can delete their own comments (soft delete)
CREATE POLICY "Users can delete their own comments" ON evaluation_comments
  FOR UPDATE USING (auth.uid() = user_id);

