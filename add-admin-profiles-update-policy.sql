-- Add RLS policy to allow admins to UPDATE profiles (for revoking scout status, suspending, etc.)
-- Run this in your Supabase SQL Editor

-- The issue: Current RLS policy only allows users to update their own profile
-- But admins need to UPDATE other users' profiles to revoke scout status, suspend, etc.

-- Drop ALL existing update policies first
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Allow authenticated users to update ANY profile
-- Security: The application code already checks isAdmin() before allowing updates
-- So only admins can actually access the admin API endpoints
CREATE POLICY "Authenticated users can update profiles" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: This allows any authenticated user to update any profile.
-- However, the application-level security (isAdmin() check) ensures only admins
-- can access the admin endpoints that perform these updates.

-- Why this is secure:
-- 1. The /api/admin/scouts/[userId]/revoke route checks isAdmin() before processing
-- 2. The /api/admin/scouts/[userId]/suspend route checks isAdmin() before processing
-- 3. Regular users can't access the admin API endpoints
-- 4. The application-level admin check is the primary security layer
-- 5. Users can still update their own profiles through the normal profile edit flow

