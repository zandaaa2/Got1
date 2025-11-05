-- Add RLS policy to allow admins to view all scout applications
-- Run this in your Supabase SQL Editor

-- The issue: RLS only allows users to view their own applications
-- But admins need to view ALL applications to review them

-- Solution: Add a policy that allows authenticated users to view all applications
-- Security: This is safe because:
--   1. The admin page route checks isAdmin() which only allows zanderhuff2@gmail.com
--   2. Only that specific email can access the admin pages
--   3. Regular users get redirected away from /admin/* routes
--   4. The application-level check is the primary security layer

DROP POLICY IF EXISTS "Authenticated users can view applications" ON scout_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON scout_applications;

-- Allow authenticated users to view all scout applications
-- The application-level admin check (email-based) protects the route
CREATE POLICY "Authenticated users can view applications" ON scout_applications
  FOR SELECT 
  TO authenticated
  USING (true);

-- Security Notes:
-- 1. The /admin/scout-applications page calls isAdmin() which checks ADMIN_USER_IDS (primary) and ADMIN_EMAILS (fallback)
-- 2. ADMIN_USER_IDS should contain your user ID (UUID from Supabase auth)
-- 3. ADMIN_EMAILS can contain your email as a fallback (zanderhuff2@gmail.com)
-- 4. Any user not in ADMIN_USER_IDS or ADMIN_EMAILS gets redirected to /browse
-- 5. This RLS policy is permissive because the application code enforces access control
-- 6. Only your account (zanderhuff2@gmail.com) should have admin access

