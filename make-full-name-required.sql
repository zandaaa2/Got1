-- Make full_name required in profiles table
-- This migration ensures full_name cannot be NULL or empty

-- Step 1: Update any existing NULL or empty full_name values to a placeholder
-- This ensures we don't break existing data during migration
UPDATE profiles
SET full_name = 'User ' || substring(id::text, 1, 8)
WHERE full_name IS NULL OR trim(full_name) = '';

-- Step 2: Add NOT NULL constraint
ALTER TABLE profiles
ALTER COLUMN full_name SET NOT NULL;

-- Step 3: Add a check constraint to ensure full_name is not empty string
ALTER TABLE profiles
ADD CONSTRAINT profiles_full_name_not_empty 
CHECK (full_name IS NOT NULL AND trim(full_name) != '');

-- Note: After running this migration, you should manually review and update
-- any profiles that were given placeholder names (starting with 'User ')

