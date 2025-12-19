-- Storage policies for intro-videos bucket
-- Run this after creating the 'intro-videos' bucket in Supabase Storage
-- Make sure the bucket is set to PUBLIC in Storage settings

-- First, drop any existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload intro videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update intro videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete intro videos" ON storage.objects;
DROP POLICY IF EXISTS "Public intro video access" ON storage.objects;

-- Allow authenticated users to upload intro videos
-- Files are named with user ID prefix, so they can only upload their own
CREATE POLICY "Users can upload intro videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'intro-videos'
);

-- Allow authenticated users to update intro videos
CREATE POLICY "Users can update intro videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'intro-videos')
WITH CHECK (bucket_id = 'intro-videos');

-- Allow authenticated users to delete intro videos
CREATE POLICY "Users can delete intro videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'intro-videos');

-- Allow public read access to intro videos (so videos can be displayed)
CREATE POLICY "Public intro video access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'intro-videos');
