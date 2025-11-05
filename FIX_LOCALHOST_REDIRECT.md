# Fix: Google Auth Redirecting to Localhost Instead of Production

## The Problem

Google OAuth is redirecting to `localhost:3001` (or `localhost:3000`) instead of your production domain `got1.app`. This happens because Supabase is matching a localhost redirect URL instead of the production one.

## The Solution

### Step 1: Update Supabase Redirect URLs

Go to **Supabase Dashboard → Authentication → URL Configuration**

**Site URL:**
```
https://got1.app
```

**Redirect URLs** - Remove or reorder to prioritize production URLs:
```
https://got1.app/api/auth/callback
https://got1.app/auth/callback
https://gotone.app/api/auth/callback
https://gotone.app/auth/callback
```

**Keep localhost URLs for development (but they shouldn't interfere):**
```
http://localhost:3000/api/auth/callback
http://localhost:3000/auth/callback
```

**Important:** Make sure production URLs are listed. The code uses `window.location.origin` which will be `https://got1.app` when accessed via that domain.

### Step 2: Clear Browser Cache/Cookies

Sometimes browsers cache redirect URLs. Try:
1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear cookies for got1.app
3. Try in incognito/private window

### Step 3: Verify the Redirect Flow

The redirect flow should be:
1. User clicks "Continue with Google" on `https://got1.app`
2. Code uses `window.location.origin` = `https://got1.app`
3. Redirects to: `https://got1.app/auth/callback`
4. Supabase should match this URL from the redirect URLs list

### Step 4: Check Google Cloud Console

Make sure Google Cloud Console has the Supabase callback URL:
```
https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback
```

This is correct - Google redirects to Supabase, then Supabase redirects to your app.

## Why This Happens

Supabase matches the `redirectTo` URL from your code against the redirect URLs list. If:
- Production URLs aren't in the list → It might default to Site URL or first URL
- Localhost URLs are listed first → It might match those instead
- URL doesn't match exactly → Redirect fails

## Quick Test

After updating Supabase redirect URLs:
1. Go to https://got1.app
2. Try "Continue with Google"
3. After authorizing, should redirect back to `https://got1.app/auth/callback`
4. Should NOT redirect to localhost

