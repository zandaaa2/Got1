# Production Authentication Setup Checklist

## ✅ What Needs to Be Updated for Production

### 1. Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
https://got1.app
```

**Redirect URLs (add ALL of these):**
```
https://got1.app/api/auth/callback
https://got1.app/auth/callback
https://gotone.app/api/auth/callback
https://gotone.app/auth/callback
```

**Important:** Keep your localhost URLs for development too:
```
http://localhost:3000/api/auth/callback
http://localhost:3000/auth/callback
```

### 2. Google Cloud Console → APIs & Services → Credentials

**Authorized redirect URIs:**
```
https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback
```

**Note:** This is Supabase's callback URL, NOT your app's URL. This should already be there. If it's not, add it.

### 3. Verify Code is Using Correct URLs

The code uses `window.location.origin` which will automatically use:
- `http://localhost:3000` in development
- `https://got1.app` in production (when accessed via got1.app)
- `https://gotone.app` in production (when accessed via gotone.app)

**This is correct!** No code changes needed.

### 4. Email Confirmation Redirect

Email signup uses:
```javascript
emailRedirectTo: `${window.location.origin}/api/auth/callback`
```

This will automatically use the correct production URL when accessed via got1.app.

### 5. Google OAuth Redirect

Google OAuth uses:
```javascript
redirectTo: `${window.location.origin}/auth/callback`
```

This will automatically use the correct production URL when accessed via got1.app.

## 🔧 Steps to Fix

1. **Go to Supabase Dashboard:**
   - Authentication → URL Configuration
   - Set Site URL to: `https://got1.app`
   - Add redirect URLs:
     - `https://got1.app/api/auth/callback`
     - `https://got1.app/auth/callback`
     - `https://gotone.app/api/auth/callback`
     - `https://gotone.app/auth/callback`
   - Click Save

2. **Verify Google Cloud Console:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Find your OAuth 2.0 Client ID
   - Verify Authorized redirect URIs includes: `https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback`
   - If not, add it and save

3. **Test:**
   - Go to https://got1.app
   - Try signing in with Google
   - Try signing up with email
   - Both should redirect back to got1.app, not localhost

## ⚠️ Common Issues

**Redirecting to localhost:**
- Supabase redirect URLs don't include production domain
- Fix: Add production URLs to Supabase redirect URLs list

**"Invalid redirect URI" from Google:**
- Google Cloud Console doesn't have Supabase's callback URL
- Fix: Add `https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback` to Google Cloud Console

**Email confirmation not working:**
- Email redirect URL not in Supabase's redirect URLs list
- Fix: Add `https://got1.app/api/auth/callback` to Supabase redirect URLs

