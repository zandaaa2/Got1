-- Fix the profiles table to match the expected schema
-- Run this in Supabase SQL Editor

-- First, check what columns exist
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- If the table doesn't have an 'id' column, we need to add it
-- Option 1: If the table is empty or you can drop it, recreate it properly
-- Option 2: If the table has data, add the missing column

-- Check if table has any data first
SELECT COUNT(*) FROM profiles;

-- If table is empty or you're okay recreating it:
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Then run the full schema from supabase-schema.sql

-- OR if table has data and you need to preserve it:
-- Add the id column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- If id column already exists but as a different type, you might need to:
-- ALTER TABLE profiles ALTER COLUMN id TYPE UUID;




