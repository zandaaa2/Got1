# Email Setup Guide

This guide explains how to configure email notifications for Got1.

## Overview

Got1 uses [Resend](https://resend.com) for sending transactional emails. The following email notifications are implemented:

1. **Welcome Email** - Sent when a new user creates their profile
2. **Evaluation Request Email** - Sent to scouts when a player requests an evaluation
3. **Evaluation Complete Email** - Sent to players when their evaluation is completed
4. **Scout Application Email** - Sent to admin when a new scout application is submitted
5. **Application Approved Email** - Sent to users when their scout application is approved
6. **Application Denied Email** - Sent to users when their scout application is denied

## Setup Steps

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Got1 Production")
4. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev  # For testing, or use your verified domain
ADMIN_EMAIL=your-admin-email@example.com  # Email to receive scout application notifications
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your app URL (update for production)

# Supabase Service Role Key (for email lookup)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Get Supabase Service Role Key

The service role key is needed to look up user emails for notifications:

1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Find "service_role" key (starts with `eyJ...`)
4. Copy it to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

⚠️ **Important**: Never expose the service role key in client-side code. It has admin privileges.

### 5. Verify Your Domain (Optional, for Production)

For production, you should verify your domain in Resend:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Follow the DNS verification steps
4. Update `RESEND_FROM_EMAIL` to use your verified domain (e.g., `noreply@yourdomain.com`)

For testing, you can use `onboarding@resend.dev` which doesn't require verification.

## Testing

### Test Email Functionality

1. Start your development server: `npm run dev`
2. Create a new user account
3. Check your email for the welcome email
4. Request an evaluation as a player - scout should receive email
5. Complete an evaluation as a scout - player should receive email
6. Submit a scout application - admin should receive email

### Console Logging

If email service is not configured, all emails will be logged to the console instead. This allows you to develop and test without email setup.

Look for these console messages:
- `✅ Email sent successfully to [email]`
- `⚠️  Could not send email - [reason]`
- `=== EMAIL (No service configured) ===`

## Email Templates

All email templates are defined in `/lib/email.ts`. You can customize the HTML and styling there.

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Verify `RESEND_API_KEY` is set correctly in `.env.local`
2. **Check Service Role Key**: Verify `SUPABASE_SERVICE_ROLE_KEY` is set for user email lookup
3. **Check Console**: Look for error messages in your terminal
4. **Check Resend Dashboard**: Go to [Resend Logs](https://resend.com/emails) to see delivery status

### Service Role Key Not Working

If you see `SUPABASE_SERVICE_ROLE_KEY may not be configured`:
1. Make sure you're using the `service_role` key, not the `anon` key
2. The service role key should start with `eyJ` (it's a JWT)
3. Restart your dev server after adding the key

### Email Goes to Spam

- Verify your domain in Resend
- Use a proper "from" email address
- Ensure SPF/DKIM records are set up correctly
- For production, consider using a custom domain

## Email Flow Summary

```
User Signs Up
  ↓
Welcome Email (if profile created)

Player Requests Evaluation
  ↓
Evaluation Request Email → Scout

Scout Completes Evaluation
  ↓
Evaluation Complete Email → Player

User Submits Scout Application
  ↓
Application Email → Admin

Admin Approves/Denies Application
  ↓
Approval/Denial Email → User
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Your Resend API key |
| `RESEND_FROM_EMAIL` | Yes | Email address to send from (use `onboarding@resend.dev` for testing) |
| `ADMIN_EMAIL` | Yes | Admin email for scout application notifications |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key for user email lookup |
| `NEXT_PUBLIC_APP_URL` | Yes | Your application URL (used in email links) |

