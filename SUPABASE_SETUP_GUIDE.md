# Supabase Setup Guide - Step by Step

Follow these steps to get your Supabase authentication working.

## Step 1: Create/Log into Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"** (or use an existing project)

## Step 2: Create a New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `got1` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize

## Step 3: Get Your Project Credentials

1. Once project is ready, go to **Settings** (gear icon in left sidebar)
2. Click **API** under Project Settings
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

4. Open your `.env.local` file in the project root
5. Update these values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Set Up Database Schema

1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the contents of that file
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates:
- `profiles` table
- `evaluations` table  
- `scout_applications` table
- All necessary permissions and indexes

## Step 5: Enable Email Authentication

1. Go to **Authentication** (left sidebar)
2. Click **Providers** (under Authentication)
3. Find **Email** in the list
4. Toggle it **ON**
5. Configure settings:
   - ✅ **Enable Email Signup**: ON
   - ✅ **Confirm email**: ON (recommended)
   - ✅ **Enable Magic Link**: ON (for passwordless sign in)
6. Click **"Save"**

## Step 6: Configure Redirect URLs

1. Still in **Authentication** section
2. Click **URL Configuration**
3. Set **Site URL** to: `http://localhost:3000` (for development)
4. Under **Redirect URLs**, click **"Add URL"** and add:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/**`
5. Click **"Save"**

## Step 7: Enable Google OAuth (Optional but Recommended)

### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing:
   - Click **"Select a project"** → **"New Project"**
   - Name it: `Got1` → **"Create"**
3. Enable Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for **"Google+ API"**
   - Click it → **"Enable"**
4. Create OAuth Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - If prompted, configure OAuth consent screen:
     - User Type: **External** → **"Create"**
     - App name: `Got1`
     - User support email: Your email
     - Developer contact: Your email
     - Click **"Save and Continue"** through the steps
   - Back to Credentials:
     - Application type: **Web application**
     - Name: `Got1 Web`
     - **Authorized redirect URIs**: Click **"+ ADD URI"**
     - Add: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
       - Replace `YOUR-PROJECT-ID` with your actual Supabase project ID
       - You can find this in your Supabase URL
     - Click **"Create"**
5. Copy the credentials:
   - **Client ID** (looks like: `123456789-abc...`)
   - **Client Secret** (looks like: `GOCSPX-...`)

### B. Configure in Supabase

1. Go back to Supabase Dashboard
2. **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle it **ON**
5. Paste:
   - **Client ID (for OAuth)**: Your Google Client ID
   - **Client Secret (for OAuth)**: Your Google Client Secret
6. Click **"Save"**

## Step 8: Test Your Setup

1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000`

3. Test Email Sign Up:
   - Click **"Sign Up"**
   - Enter your email
   - Click **"Sign up with email"**
   - Check your email inbox
   - Click the confirmation link
   - Should redirect to profile setup page

4. Test Email Sign In:
   - Click **"Sign In"**
   - Enter your email
   - Click **"Sign in with email"**
   - Check your email for magic link
   - Click the link
   - Should sign you in

5. Test Google OAuth:
   - Click **"Continue with Google"**
   - Should open Google sign in
   - After authorizing, should redirect back

## Troubleshooting

### Email not received?
- Check spam/junk folder
- Wait a few minutes (can take 1-2 minutes)
- Check Supabase Dashboard → **Authentication** → **Users** to see if user was created
- Check **Logs** (left sidebar) for errors

### "Invalid redirect URL" error?
- Make sure redirect URL is exactly: `http://localhost:3000/api/auth/callback`
- Check **URL Configuration** in Supabase Authentication settings
- Make sure Site URL is set to `http://localhost:3000`

### Google OAuth not working?
- Verify redirect URI in Google Cloud Console matches: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
- Check that Google+ API is enabled
- Verify Client ID and Secret are correct in Supabase

### Database errors?
- Make sure you ran the `supabase-schema.sql` file
- Check **Database** → **Tables** to see if tables exist
- Check **Database** → **Policies** to see if RLS policies exist

### Still having issues?
- Check browser console for errors
- Check Supabase Dashboard → **Logs** for server-side errors
- Verify your `.env.local` file has correct values

## Next Steps After Setup

Once authentication is working:
1. Complete your profile setup (choose Player or Scout)
2. Test the full flow
3. For production, update Site URL and redirect URLs to your production domain

## Production Deployment

When deploying:
1. Update **Site URL** in Supabase to your production URL
2. Add production redirect URL: `https://yourdomain.com/api/auth/callback`
3. Update `.env.local` with production values (or use environment variables in your hosting platform)









