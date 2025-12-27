-- Storage policies for posts bucket
-- IMPORTANT: First create the 'posts' bucket in Supabase Dashboard > Storage
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name it: "posts"
-- 4. Make it PUBLIC (so images/videos are accessible)
-- 5. File size limit: 50MB (for videos up to 1 minute)
-- 6. Then run this SQL file to set up the policies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload posts media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update posts media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete posts media" ON storage.objects;
DROP POLICY IF EXISTS "Public posts media access" ON storage.objects;

-- Allow authenticated users to upload posts media (images and videos)
CREATE POLICY "Users can upload posts media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

-- Allow authenticated users to update posts media
CREATE POLICY "Users can update posts media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'posts')
WITH CHECK (bucket_id = 'posts');

-- Allow authenticated users to delete posts media
CREATE POLICY "Users can delete posts media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'posts');

-- Allow public read access to posts media (so images/videos can be displayed)
CREATE POLICY "Public posts media access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');
