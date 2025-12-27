-- Add DELETE policy for parent_children table
-- Run this in Supabase SQL Editor
-- This allows parents to unlink players from their account

-- Parents can delete their own relationships (unlink players)
CREATE POLICY "Parents can unlink children" ON parent_children
  FOR DELETE USING (auth.uid() = parent_id);





















