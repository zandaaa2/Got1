# Intro Video Setup Guide

## Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create bucket"**
4. Name it exactly: `intro-videos`
5. **Important**: Set it to **Public** (toggle the "Public bucket" option)
6. Click **"Create bucket"**

## Step 2: Configure CORS Settings

1. In the Storage section, click on the **"intro-videos"** bucket
2. Click **"Edit bucket"** or go to bucket settings
3. Look for **CORS** or **Allowed Origins** settings
4. Add your domain(s):
   - For local development: `http://localhost:3000`
   - For production: Your production domain (e.g., `https://yourdomain.com`)
5. Save the CORS settings

**Important**: If CORS settings aren't available in the UI, Supabase public buckets should allow CORS by default. If you're still getting CORS errors, you may need to configure this at the project level.

## Step 3: Set Up Storage Policies

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open the file `setup-intro-videos-storage.sql`
3. Copy and paste the entire SQL into the editor
4. Click **"Run"** to execute the policies

This will allow:
- Authenticated users to upload their own intro videos
- Public access to view intro videos
- Users to update and delete their own videos

## Step 4: Add Database Column (if not done already)

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open the file `add-intro-video-field.sql`
3. Copy and paste the SQL into the editor
4. Click **"Run"** to add the `intro_video_url` column

## Verification

After completing these steps:
- The `intro-videos` bucket should appear in Storage
- Users should be able to upload videos up to 1 minute long
- Videos will be saved at: `intro-videos/{user_id}/{timestamp}.{extension}`
