# Fix Production Authentication - Step by Step

## Step 1: Verify Environment Variables in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. **CRITICAL:** Make sure these are set for **Production** environment:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qupfurmytqopxlxhdkcv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
3. If they're missing or only set for Preview/Development, add them for Production
4. **Redeploy** after adding/updating

## Step 2: Configure Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. **Site URL:** `https://got1.app`
3. **Redirect URLs** - Add these (keep localhost ones for dev):
   ```
   https://got1.app/api/auth/callback
   https://got1.app/auth/callback
   https://gotone.app/api/auth/callback
   https://gotone.app/auth/callback
   ```
4. Click **Save**

## Step 3: Check Email Confirmation Settings

1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to **Email Auth** section
3. **"Enable email confirmations"** - Check if it's ON or OFF

**If ON (users must confirm email):**
- Signup will send confirmation email
- User must click link in email to activate account
- Signin won't work until email is confirmed

**If OFF (no confirmation needed):**
- Users can sign in immediately after signup
- No confirmation email sent

**For production, I recommend:**
- Keep it ON for security
- But ensure redirect URLs are configured correctly

## Step 4: Test the Flow

### Test Email Signup:
1. Go to https://got1.app
2. Click "Sign Up"
3. Enter email and password
4. Should see success message
5. Check email for confirmation link
6. Click confirmation link
7. Should redirect to got1.app and be logged in

### Test Email Signin:
1. Go to https://got1.app
2. Click "Sign In"
3. Enter email and password
4. Should sign in immediately (if email was confirmed)

### Test Google OAuth:
1. Go to https://got1.app
2. Click "Continue with Google"
3. Should redirect to Google
4. After authorizing, should redirect back to got1.app

## Step 5: Check Browser Console

Open browser console (F12) and look for:
- Connection errors
- Authentication errors
- Cookie errors
- Redirect errors

**Common errors:**
- "Invalid API key" → Environment variables not set
- "Invalid redirect URL" → Redirect URLs not configured
- "Email not confirmed" → Email confirmation required but not done
- Cookie errors → HTTPS/domain issues

## Quick Fix: Disable Email Confirmation (Temporary)

If you want to test without email confirmation:

1. Go to Supabase Dashboard → Authentication → Settings
2. Turn OFF "Enable email confirmations"
3. Save
4. Now users can sign in immediately after signup

**Remember to turn it back ON for production security!**

