# Authentication Setup Guide

This guide explains how to set up authentication for Got1 with Supabase.

## Authentication Methods

Got1 supports two authentication methods:
1. **Email Authentication** - Magic link (sign in) and email confirmation (sign up)
2. **Google OAuth** - Sign in/sign up with Google account

## Supabase Configuration

### 1. Enable Email Authentication

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Enable **Email** provider
4. Configure email settings:
   - **Enable Email Signup**: ✅ Enabled
   - **Enable Email Confirmations**: ✅ Enabled (recommended for production)
   - **Enable Magic Link**: ✅ Enabled (for passwordless sign in)

### 2. Configure Email Templates

1. Go to **Authentication > Email Templates**
2. Customize templates if needed:
   - **Confirm signup** - Sent when user signs up
   - **Magic Link** - Sent when user requests sign in link

### 3. Set Up Site URL

1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://yourdomain.com`)
3. Add **Redirect URLs**:
   - `http://localhost:3000/api/auth/callback` (for local development)
   - `https://yourdomain.com/api/auth/callback` (for production)

### 4. Enable Google OAuth

1. Go to **Authentication > Providers**
2. Enable **Google** provider
3. Get credentials from Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to **Credentials > Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-project-id.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** to Supabase

## How Authentication Works

### Email Sign Up Flow

1. User enters email in sign up modal
2. Supabase sends confirmation email with magic link
3. User clicks link in email
4. Redirected to `/api/auth/callback` with token
5. Callback verifies token and creates session
6. If new user (no profile), redirected to `/profile/setup`
7. If existing user, redirected to `/browse`

### Email Sign In Flow

1. User enters email in sign in modal
2. Supabase sends magic link email
3. User clicks link in email
4. Redirected to `/api/auth/callback` with token
5. Callback verifies token and creates session
6. Redirected to `/browse`

### Google OAuth Flow

1. User clicks "Continue with Google"
2. Redirected to Google OAuth consent screen
3. User authorizes the app
4. Google redirects back to Supabase
5. Supabase redirects to `/api/auth/callback` with code
6. Callback exchanges code for session
7. If new user (no profile), redirected to `/profile/setup`
8. If existing user, redirected to `/browse`

## Profile Creation

- **New users** are automatically redirected to `/profile/setup` to complete their profile
- Users choose their role (Player or Scout) during profile setup
- Profile data is stored in the `profiles` table

## Testing Locally

1. Make sure your `.env.local` has correct Supabase credentials
2. Set Site URL in Supabase to `http://localhost:3000`
3. Add redirect URL: `http://localhost:3000/api/auth/callback`
4. Test email auth (check your email for magic links)
5. Test Google OAuth (will open in browser)

## Troubleshooting

### Email not received
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs for email sending errors
- Verify email templates are configured

### OAuth redirect errors
- Verify redirect URLs are correctly configured in Supabase
- Check Google Cloud Console redirect URI matches Supabase
- Ensure Site URL is set correctly

### Profile not created
- Check Supabase logs for errors
- Verify database schema is set up correctly
- Check RLS policies allow profile creation

## Security Notes

- Always use HTTPS in production
- Keep Supabase keys secure (never commit to git)
- Enable email confirmations in production
- Use environment variables for all secrets






