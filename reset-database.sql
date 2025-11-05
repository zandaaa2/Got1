-- Reset Got1 Database - Safe version that handles missing tables

-- Drop triggers first (if they exist)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_evaluations_updated_at ON evaluations;

-- Drop policies first (they depend on tables)
DO $$ 
BEGIN
  -- Drop profiles policies
  DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  
  -- Drop evaluations policies
  DROP POLICY IF EXISTS "Users can view evaluations they're involved in" ON evaluations;
  DROP POLICY IF EXISTS "Scouts can create evaluations" ON evaluations;
  DROP POLICY IF EXISTS "Users can update evaluations they own" ON evaluations;
  
  -- Drop scout_applications policies
  DROP POLICY IF EXISTS "Users can view their own applications" ON scout_applications;
  DROP POLICY IF EXISTS "Users can create their own applications" ON scout_applications;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop tables (CASCADE will handle dependencies)
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS scout_applications CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_user_id;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_evaluations_scout_id;
DROP INDEX IF EXISTS idx_evaluations_player_id;
DROP INDEX IF EXISTS idx_evaluations_status;
DROP INDEX IF EXISTS idx_scout_applications_user_id;
DROP INDEX IF EXISTS idx_scout_applications_status;



