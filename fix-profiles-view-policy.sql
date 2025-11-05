-- Fix RLS policy to allow unauthenticated users to view profiles
-- This allows the browse page to work for everyone (logged in or not)

-- Drop existing view policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Recreate policy that allows both authenticated and anonymous users
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'profiles';

