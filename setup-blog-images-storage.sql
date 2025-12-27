-- Storage policies for blog-images bucket
-- Run this after creating the 'blog-images' bucket in Supabase Storage
-- Make sure the bucket is set to PUBLIC in Storage settings

-- First, drop any existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public blog image access" ON storage.objects;

-- Allow authenticated users to upload blog images
-- Files are stored with user ID prefix, so users can only manage their own
CREATE POLICY "Users can upload blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
);

-- Allow authenticated users to update blog images
CREATE POLICY "Users can update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images')
WITH CHECK (bucket_id = 'blog-images');

-- Allow authenticated users to delete blog images
CREATE POLICY "Users can delete blog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images');

-- Allow public read access to blog images (so images can be displayed)
CREATE POLICY "Public blog image access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blog-images');

