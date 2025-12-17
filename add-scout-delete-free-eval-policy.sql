-- Add RLS policy to allow scouts to delete free in_progress evaluations
-- Run this in your Supabase SQL Editor

-- Allow scouts to delete evaluations where they are the scout, price is 0, and status is 'in_progress'
-- This allows scouts to cancel free evaluations they're working on
CREATE POLICY "Scouts can delete free in_progress evaluations" ON evaluations
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = scout_id 
    AND price = 0
    AND status = 'in_progress'
  );

-- Security Notes:
-- 1. Scouts can only delete evaluations where they are the scout (scout_id = auth.uid())
-- 2. Only allows deletion when price is 0 (free evaluations)
-- 3. Only allows deletion when status is 'in_progress'
-- 4. This prevents scouts from deleting paid evaluations or evaluations in other statuses
