# Google Auth Quick Checklist

## ✅ Code Fixed
- All components now use `/api/auth/callback` consistently

## 🔧 Required Configurations (5 minutes)

### 1. Supabase Dashboard
Go to: **Authentication → URL Configuration**
- **Site URL**: `http://localhost:3000` (or your dev port)
- **Redirect URLs**: Add `http://localhost:3000/api/auth/callback`

Go to: **Authentication → Providers → Google**
- ✅ Enable Google
- Enter **Client ID** and **Client Secret** from Google Cloud Console
- Click **Save**

### 2. Google Cloud Console
Go to: [Google Cloud Console](https://console.cloud.google.com/) → Your Project → **APIs & Services → Credentials**

Find your OAuth 2.0 Client ID → **Authorized redirect URIs**
- Must include: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
- Replace `YOUR-PROJECT-ID` with your Supabase project ID (from your Supabase URL)

### 3. Environment Variables
Check `.env.local` exists and has:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Restart dev server** after any env changes: `npm run dev`

## 🧪 Test
1. Click "Continue with Google"
2. Should redirect to Google sign-in
3. After authorizing, should redirect back and sign you in
4. Check browser console for any errors

## 🐛 Common Issues

**"Invalid redirect URI"**
- Check Google Cloud Console redirect URI matches exactly: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`

**"PKCE error" or "code_verifier not found"**
- Check Supabase redirect URL includes `/api/auth/callback`
- Clear browser cookies and try again

**Session not persisting**
- Check middleware is running (should see logs in terminal)
- Verify cookies are being set (check browser DevTools → Application → Cookies)

