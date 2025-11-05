# Deployment Guide - Got1

This guide will walk you through deploying Got1 to production and connecting your domains.

## Prerequisites

- ✅ Code pushed to GitHub (Done!)
- ✅ GitHub repository: https://github.com/zandaaa2/Got1
- ✅ Domains: got1.app and gotone.app

## Step 1: Deploy to Vercel

Vercel is the recommended platform for Next.js applications.

### 1.1 Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with your GitHub account (zandaaa2)
3. Authorize Vercel to access your repositories

### 1.2 Import Your Project

1. Click "Add New Project"
2. Import the `Got1` repository
3. Vercel will auto-detect Next.js settings
4. **Don't deploy yet** - we need to set environment variables first

## Step 2: Configure Environment Variables

Before deploying, add these environment variables in Vercel:

### Required Variables

Go to your project settings → Environment Variables and add:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (for later, but good to add now)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_XMYnjNXi_8ahrQnuG1mPjzDd3AeyxJmec
RESEND_FROM_EMAIL=noreply@got1.app
ADMIN_EMAIL=your-admin-email@example.com

# App URL (will update after domain setup)
NEXT_PUBLIC_APP_URL=https://got1.app

# Admin Access
ADMIN_USER_IDS=your-user-id-here
# OR
ADMIN_EMAILS=your-email@example.com
```

**Important:**
- Add these for **Production**, **Preview**, and **Development** environments
- Use your **production** Supabase keys (not test keys)
- Use your **live** Stripe keys (not test keys) when ready
- The `RESEND_FROM_EMAIL` should use your domain once verified

## Step 3: Deploy

1. After adding environment variables, click "Deploy"
2. Wait for the build to complete
3. You'll get a URL like: `got1-xxxxx.vercel.app`

## Step 4: Connect Your Domains

### 4.1 Add Domains in Vercel

1. Go to your project → Settings → Domains
2. Add `got1.app`
3. Add `gotone.app`
4. Vercel will provide DNS records to add

### 4.2 Configure DNS

Go to your domain registrar (where you bought got1.app and gotone.app) and add:

**For got1.app:**
- Type: `A` or `CNAME`
- Name: `@` (or root)
- Value: Vercel will provide this (usually points to Vercel's servers)

**For gotone.app:**
- Same as above

**Alternative (if using subdomains):**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

### 4.3 Wait for DNS Propagation

- DNS changes can take 24-48 hours, but usually work within minutes
- Check status in Vercel dashboard

### 4.4 Update Environment Variables

Once domains are connected:
1. Update `NEXT_PUBLIC_APP_URL` to `https://got1.app`
2. Redeploy the application

## Step 5: Configure Supabase for Production

### 5.1 Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **Redirect URLs**:
   - `https://got1.app/api/auth/callback`
   - `https://gotone.app/api/auth/callback`
   - `https://got1-xxxxx.vercel.app/api/auth/callback` (Vercel preview URL)

### 5.2 Update Google OAuth Redirect URI

1. Go to Google Cloud Console → Your Project → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   - `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
   - (This should already be there, but verify)

## Step 6: Set Up Email (Resend)

### 6.1 Verify Your Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain: `got1.app`
3. Add the DNS records Resend provides to your domain registrar
4. Wait for verification (usually quick)

### 6.2 Update Resend From Email

Once domain is verified:
1. Update `RESEND_FROM_EMAIL` in Vercel to: `noreply@got1.app`
2. Redeploy

## Step 7: Configure Stripe Webhook (Later)

When ready for payments:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://got1.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in Vercel
5. Redeploy

## Step 8: Test Everything

1. ✅ Visit https://got1.app
2. ✅ Test sign up / sign in
3. ✅ Test email notifications
4. ✅ Test profile creation
5. ✅ Test evaluation flow
6. ✅ Test scout application

## Troubleshooting

### Domain not connecting
- Check DNS records are correct
- Wait longer for propagation (up to 48 hours)
- Verify in Vercel dashboard

### Email not sending
- Check Resend API key is correct
- Verify domain in Resend
- Check `RESEND_FROM_EMAIL` matches verified domain
- Check Vercel logs for errors

### Authentication issues
- Verify Supabase redirect URLs include your domains
- Check environment variables are set correctly
- Clear browser cookies and try again

## Next Steps

After deployment:
1. ✅ Test all functionality
2. ✅ Set up email monitoring
3. ✅ Configure Stripe (when ready)
4. ✅ Set up error tracking (Sentry, etc.)
5. ✅ Set up analytics (if desired)

