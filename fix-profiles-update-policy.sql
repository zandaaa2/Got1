-- Fix RLS UPDATE policy on profiles table to allow scouts to update their pricing
-- This ensures the UPDATE policy has both USING and WITH CHECK clauses
-- Run this in your Supabase SQL Editor

-- Step 1: Check current policies (for reference)
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'UPDATE';

-- Step 2: Drop ALL existing update policies (both restrictive and permissive ones)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Step 3: Create a proper UPDATE policy with both USING and WITH CHECK clauses
-- This allows users (including scouts) to update their own profiles
-- Both clauses are needed for UPDATE operations to work correctly
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Verify the policy was created correctly
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'UPDATE';

-- This policy allows:
-- - Scouts to update their own profile (including price_per_eval, offer_title, etc.)
-- - Players to update their own profile
-- - Any user to update their own profile based on auth.uid() = user_id

-- If you need admins to update other users' profiles, use the service role client
-- in your admin API routes (which bypasses RLS) rather than relying on RLS policies.
