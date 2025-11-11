# Verify Supabase Configuration

Since the redirect URL is already set, let's verify the complete configuration:

## 1. Check Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
- Make sure `http://localhost:3000/auth/callback` is listed
- Make sure `http://localhost:3001/auth/callback` is also listed (if you use port 3001)
- **Remove** any URLs containing `/api/auth/callback`
- Make sure there are NO duplicate entries

## 2. Check Site URL
In the same section:
- Site URL should be: `http://localhost:3000` (or `http://localhost:3001`)
- This must match your actual dev server port

## 3. Check Google OAuth Provider
In Supabase Dashboard → Authentication → Providers → Google:
- Make sure Google provider is enabled
- Check the Authorized redirect URIs in Google Cloud Console match Supabase's redirect URL

## 4. Test the Flow
After verifying, try signing in and check:
- Browser console: What URL does it redirect to after Google auth?
- Look for: `http://localhost:3000/auth/callback?code=...` (should be `/auth/callback`, NOT `/api/auth/callback`)

If Supabase is still redirecting to `/api/auth/callback`, there might be:
- A cached redirect URL
- Multiple redirect URLs (one correct, one wrong)
- Site URL mismatch causing Supabase to use a different redirect






