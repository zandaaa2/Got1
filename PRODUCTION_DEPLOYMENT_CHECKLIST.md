# Production Deployment Checklist - Got1

Complete checklist to deploy Got1 to production and go live.

## ✅ Pre-Deployment Checklist

### 1. Database Migrations (Run in Production Supabase)

**CRITICAL:** Run these SQL migrations in your production Supabase SQL Editor:

1. **`migrate-payment-flow.sql`** - Adds payment flow fields and statuses
   - Run this FIRST - it's the most important migration
   - Updates evaluations table with payment tracking fields
   - Adds Stripe Connect account field to profiles

2. **`add-evaluations-delete-policy.sql`** - Allows players to delete requested evaluations
   - Run this for the cancellation feature to work

3. **Verify all migrations are applied:**
   ```sql
   -- Check evaluations table has all new columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'evaluations' 
   AND column_name IN ('payment_intent_id', 'payment_status', 'stripe_account_id', 'transfer_id', 'platform_fee', 'scout_payout', 'confirmed_at', 'denied_at');
   ```

### 2. Environment Variables (Vercel Production)

Go to **Vercel → Your Project → Settings → Environment Variables**

#### Required Variables (Update for Production):

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://qupfurmytqopxlxhdkcv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Stripe (LIVE Keys - NOT Test Keys!)
STRIPE_SECRET_KEY=sk_live_...  # ⚠️ Switch from sk_test_ to sk_live_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # ⚠️ Switch from pk_test_ to pk_live_
STRIPE_WEBHOOK_SECRET=whsec_...  # ⚠️ Get from production webhook endpoint

# Email (Resend - Domain Verified)
RESEND_API_KEY=re_XMYnjNXi_8ahrQnuG1mPjzDd3AeyxJmec
RESEND_FROM_EMAIL=noreply@got1.app  # ✅ You've verified this domain

# App URL (Production Domain)
NEXT_PUBLIC_APP_URL=https://got1.app

# Admin Access
ADMIN_USER_IDS=your-user-id-here
# OR
ADMIN_EMAILS=your-email@example.com
```

**Important:**
- ✅ Select **Production**, **Preview**, and **Development** for each variable
- ⚠️ **CRITICAL:** Switch Stripe keys from `test` to `live` mode
- ✅ Verify `RESEND_FROM_EMAIL` uses your verified domain (`noreply@got1.app`)

### 3. Stripe Configuration (Production)

#### A. Switch to Live Mode
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle from **Test mode** to **Live mode** (top right)
3. Get your **live** API keys:
   - Secret Key: `sk_live_...`
   - Publishable Key: `pk_live_...`

#### B. Set Up Production Webhook
1. In Stripe Dashboard (Live mode) → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://got1.app/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to Vercel as `STRIPE_WEBHOOK_SECRET`

#### C. Stripe Connect Setup
- Stripe Connect accounts will be created automatically when scouts are approved
- No additional setup needed - the code handles it

### 4. Supabase Configuration (Production)

#### A. Redirect URLs
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** `https://got1.app`
3. **Redirect URLs** - Ensure these are added:
   ```
   https://got1.app/api/auth/callback
   https://got1.app/auth/callback
   https://gotone.app/api/auth/callback
   https://gotone.app/auth/callback
   http://localhost:3000/api/auth/callback
   http://localhost:3000/auth/callback
   ```

#### B. Email Settings
1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. **Email Auth** section:
   - Enable email confirmations: **ON** (recommended for security)
   - Email templates: Customize if needed

### 5. Resend Email Configuration

✅ **Already Done:** You've verified `got1.app` domain in Resend

Verify:
1. Go to [Resend Domains](https://resend.com/domains)
2. Confirm `got1.app` shows as **Verified**
3. Confirm `RESEND_FROM_EMAIL=noreply@got1.app` in Vercel

### 6. Domain Configuration (Vercel)

1. Go to Vercel → Your Project → **Settings** → **Domains**
2. Add your domains:
   - `got1.app`
   - `gotone.app` (if using)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (usually 5-15 minutes)

### 7. Code Deployment

#### A. Commit and Push Changes
```bash
git add .
git commit -m "Ready for production: Payment flow, Stripe Connect, email notifications"
git push origin main
```

#### B. Deploy to Vercel
1. Vercel will auto-deploy on push to `main` branch
2. Or manually trigger: Vercel Dashboard → **Deployments** → **Redeploy**

#### C. Verify Deployment
- Check build logs for errors
- Verify all environment variables are loaded
- Test the production URL

## 🧪 Testing Checklist (After Deployment)

### Critical Path Tests

#### 1. Authentication
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Google OAuth sign in
- [ ] Email confirmation flow works

#### 2. Payment Flow (Use REAL Money - Be Careful!)
- [ ] Player requests evaluation (no payment)
- [ ] Player can cancel request before scout confirms
- [ ] Scout confirms evaluation → Player receives email with payment link
- [ ] Player completes payment → Money goes to escrow
- [ ] Scout completes evaluation → Payout processed (90% to scout, 10% platform)
- [ ] Emails sent correctly (player, scout, admin)

#### 3. Stripe Connect
- [ ] New scout approved → Stripe Connect account created automatically
- [ ] Scout can access onboarding via profile page
- [ ] Scout completes onboarding
- [ ] Money Dashboard appears after onboarding
- [ ] "View my Stripe Connect account" button works

#### 4. Email Notifications
- [ ] Evaluation request email to scout
- [ ] Confirmation email to player (with payment link)
- [ ] Denial email to player
- [ ] Completion email to player
- [ ] All emails from `noreply@got1.app`

#### 5. Admin Features
- [ ] Admin can view scout applications
- [ ] Admin can approve/deny applications
- [ ] Stripe Connect account created on approval

## ⚠️ Important Notes

### Stripe Live Mode
- **BE CAREFUL:** Live mode uses REAL MONEY
- Test thoroughly in test mode first
- Start with small test transactions
- Monitor Stripe Dashboard for any issues

### Database Backups
- **Before running migrations:** Export your production database
- Supabase Dashboard → **Database** → **Backups** → Create backup

### Monitoring
- Set up error monitoring (Sentry, LogRocket, etc.)
- Monitor Stripe Dashboard for failed payments
- Monitor Resend Dashboard for email delivery issues
- Set up alerts for critical errors

## 🚀 Deployment Steps Summary

1. ✅ **Run database migrations** in production Supabase
2. ✅ **Update Vercel environment variables** (especially Stripe live keys)
3. ✅ **Set up Stripe production webhook** and get signing secret
4. ✅ **Verify Resend domain** and email configuration
5. ✅ **Update Supabase redirect URLs** for production domain
6. ✅ **Configure Vercel domains** (got1.app)
7. ✅ **Deploy code** to Vercel
8. ✅ **Run testing checklist** above
9. ✅ **Monitor** for issues in first 24 hours

## 📞 Support Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Resend Dashboard:** https://resend.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard

---

**Ready to deploy?** Follow this checklist step by step, and you'll be live! 🎉

