-- Test query to verify RLS policy works
-- Run this in Supabase SQL Editor

-- Test 1: Try to select all profiles (should work with RLS)
SELECT * FROM profiles;

-- Test 2: Try to select profiles with role filter
SELECT * FROM profiles WHERE role = 'scout';

-- Test 3: Check if RLS is actually enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Test 4: List all policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';





