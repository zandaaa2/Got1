# Fix Google OAuth Consent Screen - Show "Got1" Instead of Supabase Project ID

## The Issue
When users sign in with Google, they see:
- "qupfurmytqopxlxhdkcv is wanting you to sign in"

Instead of:
- "Got1 is wanting you to sign in"

## The Solution

This is configured in **Google Cloud Console OAuth Consent Screen**, not in your code.

### Steps to Fix:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**

3. **Update App Information**
   - **App name**: Change to `Got1`
   - **User support email**: Your email
   - **App logo** (optional): Upload Got1 logo if you have one
   - **App domain** (optional): `got1.app`
   - **Developer contact information**: Your email

4. **Save Changes**
   - Click **"Save and Continue"** through any remaining steps
   - Click **"Back to Dashboard"** when done

5. **Publish (if needed)**
   - If your app is in "Testing" mode, you may need to publish it
   - Go to **OAuth consent screen** → **Publishing status**
   - Click **"Publish App"** if it's in testing mode
   - Note: Publishing may require verification for production use

### Important Notes:

- **App name** is what shows in the consent screen
- Changes take effect immediately after saving
- If you're in "Testing" mode, only test users will see the new name
- For production, you may need to go through Google's verification process

### Testing:

1. Sign out of your Google account (or use incognito)
2. Try signing in with Google on got1.app
3. You should now see "Got1 is wanting you to sign in" instead of the Supabase project ID

