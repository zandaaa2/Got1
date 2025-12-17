-- Migration: Set price_per_eval to NULL for all non-scout profiles
-- Only scouts should have a price_per_eval value

-- Step 1: Update all existing non-scout profiles to have NULL price_per_eval
UPDATE profiles
SET price_per_eval = NULL
WHERE role != 'scout' AND price_per_eval IS NOT NULL;

-- Step 2: Remove the default value of 99.00 so new profiles don't get a default price
ALTER TABLE profiles
  ALTER COLUMN price_per_eval DROP DEFAULT;

-- Step 3: Add a check constraint to ensure only scouts can have a price_per_eval value
-- This will prevent non-scouts from having a price set in the future
-- Note: Scouts can have NULL (they can set it later), but non-scouts must be NULL
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_price_per_eval_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_price_per_eval_check
  CHECK (
    (role = 'scout') OR
    (role != 'scout' AND price_per_eval IS NULL)
  );

-- Step 4: Create a trigger function to enforce this constraint on INSERT and UPDATE
CREATE OR REPLACE FUNCTION enforce_price_per_eval_constraint()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is not 'scout', ensure price_per_eval is NULL
  IF NEW.role != 'scout' AND NEW.price_per_eval IS NOT NULL THEN
    NEW.price_per_eval := NULL;
  END IF;
  
  -- If role is 'scout' and price_per_eval is NULL, allow it (scout can set it later)
  -- The check constraint will handle validation
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_enforce_price_per_eval_constraint ON profiles;

-- Create the trigger
CREATE TRIGGER trigger_enforce_price_per_eval_constraint
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_price_per_eval_constraint();

-- Step 5: Verify the changes
-- This query should return 0 rows (no non-scouts with price_per_eval set)
SELECT 
  id,
  full_name,
  role,
  price_per_eval
FROM profiles
WHERE role != 'scout' AND price_per_eval IS NOT NULL;

-- This query should show all scouts and their prices (or NULL if they haven't set one yet)
SELECT 
  id,
  full_name,
  role,
  price_per_eval
FROM profiles
WHERE role = 'scout'
ORDER BY full_name;
