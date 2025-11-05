-- Fix RLS policies for evaluations table
-- Run this in your Supabase SQL Editor

-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'evaluations';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view evaluations they're involved in" ON evaluations;
DROP POLICY IF EXISTS "Scouts can create evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update evaluations they own" ON evaluations;

-- Recreate policies with explicit roles
CREATE POLICY "Users can view evaluations they're involved in" ON evaluations
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = scout_id OR auth.uid() = player_id);

CREATE POLICY "Scouts can create evaluations" ON evaluations
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = scout_id);

CREATE POLICY "Users can update evaluations they own" ON evaluations
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = scout_id OR auth.uid() = player_id);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'evaluations';

