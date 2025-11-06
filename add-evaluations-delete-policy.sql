-- Add RLS policy to allow players to delete their own evaluation requests
-- Run this in your Supabase SQL Editor

-- Allow players to delete evaluations where they are the player and status is 'requested'
-- This allows cancellation before scout confirms
CREATE POLICY "Players can delete requested evaluations" ON evaluations
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = player_id 
    AND status = 'requested'
  );

-- Security Notes:
-- 1. Players can only delete evaluations where they are the player (player_id = auth.uid())
-- 2. Only allows deletion when status is 'requested' (before scout confirms)
-- 3. Once scout confirms, status changes and deletion is no longer allowed
-- 4. This prevents players from deleting evaluations after payment is charged

