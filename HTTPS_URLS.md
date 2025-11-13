# HTTPS URL Configuration

Since you're using HTTPS, here are the exact URLs you need:

## 1. Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
https://localhost:3001
```
(Or `https://localhost:3000` if you're using port 3000)

**Redirect URLs (add these):**
```
https://localhost:3001/auth/callback
```
(And `https://localhost:3000/auth/callback` if you use port 3000)

**Important:** Make sure there are NO HTTP URLs in the redirect list. Remove any `http://localhost:...` entries.

## 2. Google Cloud Console → APIs & Services → Credentials

**Authorized redirect URIs:**
```
https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback
```

**Note:** This is Supabase's callback URL, NOT your app's URL. This should already be there if Google OAuth was set up correctly.

## 3. Your Browser Access URL

**Access your app via:**
```
https://localhost:3001
```
(Or `https://localhost:3000` if that's your port)

## Summary

- **Access URL:** `https://localhost:3001` (or 3000)
- **Supabase Site URL:** `https://localhost:3001` (or 3000)
- **Supabase Redirect URLs:** `https://localhost:3001/auth/callback` (and 3000 if needed)
- **Google Cloud:** `https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback` (Supabase's URL, not yours)

The code automatically uses `window.location.origin`, so it will use HTTPS if you're accessing via HTTPS.







