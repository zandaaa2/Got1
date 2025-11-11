# Redirect URL Configuration Explained

## Supabase Dashboard

**In Supabase → Authentication → URL Configuration:**

1. **Site URL:**
   - Should be: `http://localhost:3001` (or `3000` if you use that port)
   - This is your app's base URL

2. **Redirect URLs:**
   - You CAN have multiple redirect URLs
   - **Must include:** `http://localhost:3001/auth/callback`
   - Can also include: `http://localhost:3000/auth/callback` (if you use both ports)
   - Can include: `http://localhost:3001/api/auth/callback` (for email magic links)
   - The key is: The `redirectTo` in your code must match ONE of these URLs

**Important:** The redirect URL in your code (`window.location.origin + '/auth/callback'`) must EXACTLY match one of the URLs in this list (including port number).

## Google Cloud Console

**In Google Cloud Console → APIs & Services → Credentials:**

1. **Authorized redirect URIs:**
   - This should include: `https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback`
   - This is Supabase's callback URL (NOT your app's URL)
   - Supabase handles the OAuth flow with Google, then redirects to YOUR app
   - You can have other URLs too, but this one is required

**Important:** Your app's URL (`http://localhost:3001/auth/callback`) does NOT need to be in Google Cloud Console. Only Supabase's callback URL needs to be there.

## Summary

- **Supabase:** Can have multiple redirect URLs, but must include `http://localhost:3001/auth/callback`
- **Google Cloud:** Only needs Supabase's callback URL (`https://[project].supabase.co/auth/v1/callback`)
- **Your Code:** The `redirectTo` must match exactly (including port) one of Supabase's redirect URLs






