-- RLS Policies for High School Feature
-- Run this migration in Supabase SQL Editor after create-high-school-tables.sql

-- Enable RLS on all tables
ALTER TABLE high_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_school_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_school_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_referrals ENABLE ROW LEVEL SECURITY;

-- High Schools Policies
-- Anyone can view approved schools (for public browsing)
CREATE POLICY "Anyone can view approved high schools"
  ON high_schools
  FOR SELECT
  USING (admin_status = 'approved');

-- School admins can view their own school (even if pending)
CREATE POLICY "Admins can view their own school"
  ON high_schools
  FOR SELECT
  USING (
    id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Anyone can create a school (admin will review)
CREATE POLICY "Anyone can create a high school"
  ON high_schools
  FOR INSERT
  WITH CHECK (true);

-- Only admins can update their own school
CREATE POLICY "Admins can update their own school"
  ON high_schools
  FOR UPDATE
  USING (
    id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete their own school
CREATE POLICY "Admins can delete their own school"
  ON high_schools
  FOR DELETE
  USING (
    id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (for admin approval)
-- This will be handled server-side with admin client

-- High School Admins Policies
-- Anyone can view admins of approved schools
CREATE POLICY "Anyone can view admins of approved schools"
  ON high_school_admins
  FOR SELECT
  USING (
    high_school_id IN (
      SELECT id FROM high_schools WHERE admin_status = 'approved'
    )
  );

-- School admins can view their own admin records
CREATE POLICY "Admins can view their own admin records"
  ON high_school_admins
  FOR SELECT
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- School admins can insert new admins (limit to 2 enforced at app level)
CREATE POLICY "Admins can add other admins"
  ON high_school_admins
  FOR INSERT
  WITH CHECK (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- School admins can delete other admins from their school
CREATE POLICY "Admins can remove other admins"
  ON high_school_admins
  FOR DELETE
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- High School Players Policies
-- Anyone can view active players (not released) of approved schools
CREATE POLICY "Anyone can view active players of approved schools"
  ON high_school_players
  FOR SELECT
  USING (
    released_at IS NULL AND
    high_school_id IN (
      SELECT id FROM high_schools WHERE admin_status = 'approved'
    )
  );

-- School admins can view all players in their school
CREATE POLICY "Admins can view all players in their school"
  ON high_school_players
  FOR SELECT
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Players can view their own roster record
CREATE POLICY "Players can view their own roster record"
  ON high_school_players
  FOR SELECT
  USING (user_id = auth.uid());

-- School admins can insert players
CREATE POLICY "Admins can add players to roster"
  ON high_school_players
  FOR INSERT
  WITH CHECK (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- School admins can update players in their school
CREATE POLICY "Admins can update players in their school"
  ON high_school_players
  FOR UPDATE
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Players can request release (set release_requested_at)
CREATE POLICY "Players can request release"
  ON high_school_players
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- High School Evaluations Policies
-- Anyone can view evaluations of approved schools (where shared or school paid)
CREATE POLICY "Anyone can view school evaluations (approved schools)"
  ON high_school_evaluations
  FOR SELECT
  USING (
    high_school_id IN (
      SELECT id FROM high_schools WHERE admin_status = 'approved'
    )
  );

-- School admins can view all evaluations in their school
CREATE POLICY "Admins can view all evaluations in their school"
  ON high_school_evaluations
  FOR SELECT
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Players can view their own school evaluations
CREATE POLICY "Players can view their own school evaluations"
  ON high_school_evaluations
  FOR SELECT
  USING (player_id = auth.uid());

-- System can insert evaluations (via API routes with proper auth)
-- This will be handled server-side

-- School admins can update evaluations in their school
CREATE POLICY "Admins can update evaluations in their school"
  ON high_school_evaluations
  FOR UPDATE
  USING (
    high_school_id IN (
      SELECT high_school_id FROM high_school_admins WHERE user_id = auth.uid()
    )
  );

-- Players can share/unshare their evaluations
CREATE POLICY "Players can share their evaluations with school"
  ON high_school_evaluations
  FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- School Referrals Policies
-- Anyone can view referrals (for transparency)
CREATE POLICY "Anyone can view school referrals"
  ON school_referrals
  FOR SELECT
  USING (true);

-- Only system can insert/update referrals (via API routes)
-- This will be handled server-side

-- Note: Admin approval of schools will use service role client (server-side only)
-- Admin pages will use admin Supabase client to bypass RLS


