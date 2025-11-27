# Verification Checklist - Supabase Setup

Use this checklist to verify your Supabase configuration is correct.

## ✅ Email Authentication Settings

Go to: **Authentication → Providers → Email**

Check that:
- [ ] Email provider is **TOGGLED ON** (switch should be green/blue)
- [ ] "Enable Email Signup" is **CHECKED** ✅
- [ ] "Confirm email" is **CHECKED** ✅ (recommended)
- [ ] "Enable Magic Link" is **CHECKED** ✅

## ✅ URL Configuration

Go to: **Authentication → URL Configuration**

Check that:
- [ ] **Site URL** is set to: `http://localhost:3000`
- [ ] **Redirect URLs** contains:
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/**` (or wildcard equivalent)

## ✅ Database Tables

Go to: **Database → Tables**

Check that these tables exist:
- [ ] `profiles`
- [ ] `evaluations`
- [ ] `scout_applications`

## ✅ Quick Test

After verifying above, try this:
1. Make sure your dev server is running: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Sign Up"
4. Enter your email
5. Click "Sign up with email"
6. Check your email inbox for a confirmation email from Supabase

If you receive the email ✅, your configuration is correct!

## Common Issues

### Email not received?
- Check spam/junk folder
- Wait 1-2 minutes (can take time)
- Check Authentication → Users to see if user was created
- Check Logs (left sidebar) for errors

### Redirect URL errors?
- Make sure Site URL is exactly: `http://localhost:3000`
- Make sure redirect URL is exactly: `http://localhost:3000/api/auth/callback`
- No trailing slashes!










