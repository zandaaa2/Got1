# Verify Google Cloud Console Settings

The PKCE error is often caused by mismatched URLs. Check these:

## 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one Supabase uses)
5. Check **Authorized redirect URIs**:
   - Should include: `https://qupfurmytqopxlxhdkcv.supabase.co/auth/v1/callback`
   - This is Supabase's callback URL, not your app's URL
   - Supabase handles the redirect to your app

## 2. Supabase Dashboard
1. **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3001` (or `3000`)
   - Redirect URLs: `http://localhost:3001/auth/callback` (and `3000` if needed)

## 3. Your Code
- The `redirectTo` in `signInWithOAuth` must match Supabase's redirect URL EXACTLY
- Currently: `${window.location.origin}/auth/callback`
- This should match what's in Supabase dashboard

## Key Point:
The redirect flow is: Google → Supabase → Your App
- Google redirects to Supabase's callback
- Supabase then redirects to YOUR callback URL
- The `redirectTo` parameter tells Supabase where to redirect after auth








