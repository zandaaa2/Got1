-- Storage policies for avatars bucket
-- Run this after creating the 'avatars' bucket in Supabase Storage
-- Make sure the bucket is set to PUBLIC in Storage settings

-- First, drop any existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;

-- Allow authenticated users to upload avatars
-- Files are named with user ID prefix, so they can only upload their own
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- Allow authenticated users to update avatars
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read access to avatars (so images can be displayed)
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

