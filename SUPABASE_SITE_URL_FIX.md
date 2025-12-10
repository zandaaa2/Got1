# Fix: Update Supabase Site URL to HTTPS

## Problem
Your Supabase Site URL is configured as `http://got1.app` but should be `https://got1.app` (HTTPS).

## Solution

1. **Go to Supabase Dashboard** → **Authentication** → **URL Configuration**

2. **In the "Site URL" section:**
   - Change from: `http://got1.app`
   - Change to: `https://got1.app`
   - Click **"Save changes"** (green button)

3. **Verify Redirect URLs** (these look correct already):
   - ✅ `http://localhost:3000/auth/callback`
   - ✅ `http://localhost:3000/api/auth/callback`
   - ✅ `https://got1.app/api/auth/callback`
   - ✅ `https://got1.app/auth/callback`

## Why This Fixes It

When Supabase processes OAuth redirects, if there's any issue matching redirect URLs or if it needs to fall back to the Site URL, it uses the Site URL. Since your production site uses HTTPS (`https://got1.app`), having an HTTP Site URL causes a protocol mismatch that prevents proper redirects.

After updating to HTTPS, Google OAuth should properly redirect to `/auth/callback` and authentication should work.
