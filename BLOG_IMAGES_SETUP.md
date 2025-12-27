# Blog Images Storage Setup Guide

## Step 1: Create the Storage Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create bucket"**
4. Name it exactly: `blog-images`
5. **Important**: Set it to **Public** (toggle the "Public bucket" option ON)
6. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open the file `setup-blog-images-storage.sql`
3. Copy and paste the entire SQL into the editor
4. Click **"Run"** to execute the policies

This will allow:
- Authenticated users to upload their own blog images
- Public access to view blog images
- Users to update and delete their own images

## Step 3: Verify Setup

After completing these steps:
- The `blog-images` bucket should appear in Storage
- Users should be able to upload images when creating blog posts
- Images will be saved at: `blog-images/{user_id}/{timestamp}.{extension}`

## Troubleshooting

If you still see the error after creating the bucket:
1. Make sure the bucket name is exactly `blog-images` (case-sensitive)
2. Ensure the bucket is set to **Public**
3. Run the SQL script from `setup-blog-images-storage.sql`
4. Refresh your browser and try again

