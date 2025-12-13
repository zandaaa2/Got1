-- Verify and fix RLS policies for parent_children table
-- Run this in Supabase SQL Editor

-- Step 1: Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'parent_children';

-- Step 2: Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'parent_children';

-- Step 3: Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Anyone can view parent relationships" ON parent_children;
DROP POLICY IF EXISTS "Parents can link children" ON parent_children;
DROP POLICY IF EXISTS "Parents can view their children" ON parent_children;
DROP POLICY IF EXISTS "Parents can unlink children" ON parent_children;

-- Step 4: Recreate all policies
-- Anyone can view parent-child relationships (for displaying "ran by" on player profiles)
CREATE POLICY "Anyone can view parent relationships" ON parent_children
  FOR SELECT USING (true);

-- Parents can insert their own relationships
CREATE POLICY "Parents can link children" ON parent_children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Parents can view their linked children
CREATE POLICY "Parents can view their children" ON parent_children
  FOR SELECT USING (auth.uid() = parent_id);

-- Parents can delete their own relationships (unlink players)
CREATE POLICY "Parents can unlink children" ON parent_children
  FOR DELETE USING (auth.uid() = parent_id);

-- Step 5: Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'parent_children';

-- If rowsecurity is false, enable it:
-- ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify policies were created
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'View'
    WHEN cmd = 'INSERT' THEN 'Link'
    WHEN cmd = 'DELETE' THEN 'Unlink'
    ELSE cmd::text
  END as action
FROM pg_policies
WHERE tablename = 'parent_children'
ORDER BY cmd;







