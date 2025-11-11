# Clear Authentication Data

The `sb-placeholder-auth-token-code-verifier` cookie is leftover from a previous failed authentication attempt. This needs to be cleared.

## Steps to Clear:

1. **Open Browser Developer Tools** (F12)

2. **Go to Application tab** → **Cookies** → `http://localhost:3000`

3. **Delete these cookies** if they exist:
   - `sb-placeholder-auth-token-code-verifier`
   - Any cookies starting with `sb-`

4. **Go to Application tab** → **Local Storage** → `http://localhost:3000`

5. **Delete all keys** that start with `sb-` or contain `code-verifier`

6. **Refresh the page**

## Or use Browser Settings:

1. Open browser settings
2. Clear browsing data for localhost:3000
3. Or use incognito/private window for a clean test

The "placeholder" name suggests the PKCE verifier wasn't stored correctly. This is likely causing the authentication failures.






