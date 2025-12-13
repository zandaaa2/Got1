-- Add Parent Account Support
-- Run this in Supabase SQL Editor

-- Step 1: Update profiles role constraint to include 'parent'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'scout', 'parent', 'user'));

-- Step 2: Create parent_children junction table
CREATE TABLE IF NOT EXISTS parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, player_id)
);

-- Step 3: Create indexes for parent_children
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_player ON parent_children(player_id);

-- Step 4: Enable RLS on parent_children
ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for parent_children
-- Anyone can view parent-child relationships (for displaying "ran by" on player profiles)
CREATE POLICY "Anyone can view parent relationships" ON parent_children
  FOR SELECT USING (true);

-- Parents can insert their own relationships
CREATE POLICY "Parents can link children" ON parent_children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Parents can view their linked children
CREATE POLICY "Parents can view their children" ON parent_children
  FOR SELECT USING (auth.uid() = parent_id);

-- Step 6: Add purchased_by fields to evaluations table
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS purchased_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS purchased_by_type TEXT CHECK (purchased_by_type IN ('player', 'parent'));

-- Step 7: Update evaluations RLS to allow parents to view evaluations for their children
-- First, drop the existing policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Users can view evaluations they're involved in" ON evaluations;

-- Recreate with parent support
CREATE POLICY "Users can view evaluations they're involved in" ON evaluations
  FOR SELECT USING (
    auth.uid() = scout_id 
    OR auth.uid() = player_id 
    OR auth.uid() = purchased_by
    OR EXISTS (
      SELECT 1 FROM parent_children 
      WHERE parent_children.parent_id = auth.uid() 
      AND parent_children.player_id = evaluations.player_id
    )
  );

-- Step 8: Update evaluations INSERT policy to allow parents to create evaluations for their children
DROP POLICY IF EXISTS "Scouts can create evaluations" ON evaluations;

CREATE POLICY "Scouts can create evaluations" ON evaluations
  FOR INSERT WITH CHECK (
    auth.uid() = scout_id 
    OR EXISTS (
      SELECT 1 FROM parent_children 
      WHERE parent_children.parent_id = auth.uid() 
      AND parent_children.player_id = evaluations.player_id
    )
  );

-- Add comments for documentation
COMMENT ON TABLE parent_children IS 'Links parent accounts to player accounts they manage';
COMMENT ON COLUMN evaluations.purchased_by IS 'User ID of who purchased the evaluation (player or parent)';
COMMENT ON COLUMN evaluations.purchased_by_type IS 'Type of purchaser: player or parent';







