-- Check what columns actually exist in the profiles table
-- Run this in Supabase SQL Editor

-- Check the actual structure of the profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if the table has a primary key
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check all columns in the table
SELECT * FROM profiles LIMIT 1;










