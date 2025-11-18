-- Fix infinite recursion in high_school_admins RLS policies
-- The issue: Policies on high_school_admins query high_school_admins itself, causing recursion
-- Solution: Use a SECURITY DEFINER function to bypass RLS when checking admin status

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view their own admin records" ON high_school_admins;
DROP POLICY IF EXISTS "Admins can add other admins" ON high_school_admins;
DROP POLICY IF EXISTS "Admins can remove other admins" ON high_school_admins;

-- Create a helper function that bypasses RLS to check if user is admin of a school
CREATE OR REPLACE FUNCTION is_high_school_admin(school_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM high_school_admins
    WHERE high_school_id = school_id
    AND high_school_admins.user_id = is_high_school_admin.user_id
  );
END;
$$;

-- Recreate policies using the helper function (avoids recursion)
CREATE POLICY "Admins can view their own admin records"
  ON high_school_admins
  FOR SELECT
  USING (is_high_school_admin(high_school_id, auth.uid()));

CREATE POLICY "Admins can add other admins"
  ON high_school_admins
  FOR INSERT
  WITH CHECK (is_high_school_admin(high_school_id, auth.uid()));

CREATE POLICY "Admins can remove other admins"
  ON high_school_admins
  FOR DELETE
  USING (is_high_school_admin(high_school_id, auth.uid()));

-- Also fix policies on other tables that query high_school_admins
-- These should use the helper function too to avoid potential issues

DROP POLICY IF EXISTS "Admins can view all players in their school" ON high_school_players;
DROP POLICY IF EXISTS "Admins can add players to roster" ON high_school_players;
DROP POLICY IF EXISTS "Admins can update players in their school" ON high_school_players;

CREATE POLICY "Admins can view all players in their school"
  ON high_school_players
  FOR SELECT
  USING (is_high_school_admin(high_school_id, auth.uid()));

CREATE POLICY "Admins can add players to roster"
  ON high_school_players
  FOR INSERT
  WITH CHECK (is_high_school_admin(high_school_id, auth.uid()));

CREATE POLICY "Admins can update players in their school"
  ON high_school_players
  FOR UPDATE
  USING (is_high_school_admin(high_school_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can view all evaluations in their school" ON high_school_evaluations;
DROP POLICY IF EXISTS "Admins can update evaluations in their school" ON high_school_evaluations;

CREATE POLICY "Admins can view all evaluations in their school"
  ON high_school_evaluations
  FOR SELECT
  USING (is_high_school_admin(high_school_id, auth.uid()));

CREATE POLICY "Admins can update evaluations in their school"
  ON high_school_evaluations
  FOR UPDATE
  USING (is_high_school_admin(high_school_id, auth.uid()));

-- Also fix the "Admins can view their own school" policy on high_schools
DROP POLICY IF EXISTS "Admins can view their own school" ON high_schools;
DROP POLICY IF EXISTS "Admins can update their own school" ON high_schools;
DROP POLICY IF EXISTS "Admins can delete their own school" ON high_schools;

CREATE POLICY "Admins can view their own school"
  ON high_schools
  FOR SELECT
  USING (is_high_school_admin(id, auth.uid()));

CREATE POLICY "Admins can update their own school"
  ON high_schools
  FOR UPDATE
  USING (is_high_school_admin(id, auth.uid()));

CREATE POLICY "Admins can delete their own school"
  ON high_schools
  FOR DELETE
  USING (is_high_school_admin(id, auth.uid()));


