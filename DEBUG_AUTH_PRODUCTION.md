# Debugging Production Authentication Issues

## Quick Checks

### 1. Check Browser Console for Errors
Open https://got1.app and:
- Open browser console (F12 → Console)
- Try signing up/signing in
- Look for any error messages
- Share the exact error messages you see

### 2. Verify Environment Variables in Vercel
Go to Vercel → Your Project → Settings → Environment Variables

**Check these are set:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://qupfurmytqopxlxhdkcv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)

**Important:** Make sure they're set for **Production** environment

### 3. Check Supabase Email Settings
Go to Supabase Dashboard → Authentication → Settings

**Email Auth:**
- Check if "Enable email confirmations" is ON or OFF
- If ON: Users must confirm email before they can sign in
- If OFF: Users can sign in immediately after signup

**For production, you might want to:**
- Turn OFF email confirmations for easier testing
- OR keep it ON but ensure redirect URLs are configured

### 4. Verify Supabase Redirect URLs
Go to Supabase Dashboard → Authentication → URL Configuration

**Site URL:** `https://got1.app`

**Redirect URLs must include:**
- `https://got1.app/api/auth/callback`
- `https://got1.app/auth/callback`
- `https://gotone.app/api/auth/callback`
- `https://gotone.app/auth/callback`

### 5. Check Cookie Settings
The middleware sets cookies with `secure: process.env.NODE_ENV === 'production'`

This means cookies are only sent over HTTPS in production, which is correct.

## Common Issues

### Issue: "Sign up works but sign in doesn't"
**Cause:** Email confirmation is required but user hasn't confirmed
**Fix:** 
- Check Supabase → Authentication → Settings → "Enable email confirmations"
- Turn it OFF for testing, or ensure users click confirmation link

### Issue: "Redirects to localhost"
**Cause:** Supabase redirect URLs don't include production domain
**Fix:** Add production URLs to Supabase redirect URLs list

### Issue: "No error, but nothing happens"
**Cause:** 
- Environment variables not set in Vercel
- Supabase client can't connect
**Fix:** 
- Verify environment variables in Vercel
- Check browser console for connection errors

### Issue: "Session not persisting"
**Cause:** Cookies not being set properly
**Fix:** 
- Check if site is using HTTPS (required for secure cookies)
- Verify middleware is running
- Check browser console for cookie errors

## Test Steps

1. **Test Email Signup:**
   - Go to https://got1.app
   - Click "Sign Up"
   - Enter email and password
   - Check for success message
   - Check email for confirmation link (if email confirmations are ON)
   - Click confirmation link
   - Should redirect back to got1.app

2. **Test Email Signin:**
   - Go to https://got1.app
   - Click "Sign In"
   - Enter email and password
   - Should sign in immediately (if email is confirmed)

3. **Test Google OAuth:**
   - Go to https://got1.app
   - Click "Continue with Google"
   - Should redirect to Google
   - After authorizing, should redirect back to got1.app

## What to Share

When reporting issues, please share:
1. **Exact error messages** from browser console
2. **What happens** when you try to sign up/sign in (nothing? error? redirect?)
3. **Screenshot** of browser console if possible
4. **Whether** you've confirmed your email (if using email signup)

