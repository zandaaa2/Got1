-- Add RLS policy to allow players to create evaluations
-- Run this in your Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Scouts can create evaluations" ON evaluations;

-- Allow authenticated users to create evaluations where they are the player
-- This allows players to request evaluations from scouts
CREATE POLICY "Players can create evaluations" ON evaluations
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Also allow scouts to create evaluations (for backwards compatibility)
CREATE POLICY "Scouts can create evaluations" ON evaluations
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = scout_id);

-- Security Notes:
-- 1. Players can only create evaluations where they are the player (player_id = auth.uid())
-- 2. Scouts can only create evaluations where they are the scout (scout_id = auth.uid())
-- 3. This prevents users from creating evaluations for other people
-- 4. The application code ensures the correct IDs are set before calling insert

