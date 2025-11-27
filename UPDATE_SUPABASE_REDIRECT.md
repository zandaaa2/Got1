# Critical: Update Supabase Redirect URL

The PKCE error is happening because Supabase is redirecting to `/api/auth/callback` first, which breaks the PKCE flow.

## Fix Steps:

1. **Go to Supabase Dashboard** → **Authentication** → **URL Configuration**

2. **Find "Redirect URLs" section**

3. **Remove or update** the redirect URL from:
   - ❌ `http://localhost:3001/api/auth/callback`
   - ❌ `http://localhost:3000/api/auth/callback`

4. **Add these redirect URLs instead:**
   - ✅ `http://localhost:3001/auth/callback`
   - ✅ `http://localhost:3000/auth/callback` (if you use port 3000)

5. **Also check "Site URL"** - make sure it's set to:
   - `http://localhost:3001` (or `http://localhost:3000`)

6. **Save the changes**

7. **Clear your browser cookies/localStorage** for localhost (to clear any stale PKCE verifiers)

8. **Try signing in again**

The key is that Supabase must redirect **directly** to `/auth/callback` (client-side), not `/api/auth/callback` (server-side), for the PKCE flow to work correctly.










