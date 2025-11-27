# URL Protocol Mismatch Fix

## The Problem
If you're accessing your site via `https://localhost:3001` but Supabase redirect URLs are set to `http://localhost:3001`, the code_verifier won't be found because the URLs don't match exactly.

## Solution

### Option 1: Use HTTP (Recommended for localhost)
Most local development uses HTTP, not HTTPS. 

1. **Access your site via HTTP:**
   - Use: `http://localhost:3001` (not `https://`)
   - Next.js dev server runs on HTTP by default

2. **Update Supabase Dashboard:**
   - Authentication → URL Configuration
   - Site URL: `http://localhost:3001`
   - Redirect URLs: `http://localhost:3001/auth/callback`

### Option 2: Use HTTPS (If you have SSL set up)
If you're using HTTPS with a custom certificate:

1. **Update Supabase Dashboard:**
   - Site URL: `https://localhost:3001`
   - Redirect URLs: `https://localhost:3001/auth/callback`

2. **Make sure your code uses HTTPS:**
   - The `window.location.origin` will automatically use the protocol you're accessing from

## Check Your Current Setup

1. Look at your browser address bar - is it `http://` or `https://`?
2. Make sure Supabase redirect URLs match EXACTLY (including protocol)
3. Clear browser data and try again

The protocol mismatch is likely why the code_verifier isn't being found!










