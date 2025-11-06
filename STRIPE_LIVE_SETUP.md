# Stripe Live Mode Setup Guide

## Step 1: Switch to Live Mode in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Look for the toggle in the top right corner (says "Test mode" or "Live mode")
3. Click it to switch to **"Live mode"**
4. You may need to activate your account if you haven't already

## Step 2: Get Your Live API Keys

1. In Stripe Dashboard (Live mode) → **Developers** → **API keys**
2. You'll see:
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal test key" or "Reveal live key"
   - **Publishable key** (starts with `pk_live_...`) - Already visible

3. Copy both keys:
   ```
   Secret key: sk_live_...
   Publishable key: pk_live_...
   ```

## Step 3: Set Up Production Webhook

1. In Stripe Dashboard (Live mode) → **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://got1.app/api/stripe/webhook`
   - Replace `got1.app` with your actual production domain
4. **Description:** "Got1 Production Webhook"
5. **Events to send:** Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
6. Click **"Add endpoint"**
7. After creation, click on the endpoint
8. Find **"Signing secret"** - Click **"Reveal"**
9. Copy the signing secret (starts with `whsec_...`)

## Step 4: Update Vercel Environment Variables

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update these variables:

### Update Stripe Keys:
- **Variable:** `STRIPE_SECRET_KEY`
  - **Value:** `sk_live_...` (your live secret key)
  - **Environment:** Production, Preview, Development
  - ⚠️ **IMPORTANT:** Make sure this is the LIVE key, not test!

- **Variable:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - **Value:** `pk_live_...` (your live publishable key)
  - **Environment:** Production, Preview, Development

### Add Webhook Secret:
- **Variable:** `STRIPE_WEBHOOK_SECRET`
  - **Value:** `whsec_...` (the signing secret from Step 3)
  - **Environment:** Production (and Preview if you want)
  - ⚠️ **IMPORTANT:** This is different for each webhook endpoint

3. Click **"Save"** for each variable
4. **Redeploy** your production deployment after updating

## Step 5: Verify Webhook is Working

After deployment:
1. Test a payment in production
2. Go to Stripe Dashboard → **Developers** → **Webhooks**
3. Click on your webhook endpoint
4. Check **"Events"** tab - you should see events coming through
5. Green checkmark = successful delivery
6. Red X = failed delivery (check logs)

## ⚠️ Important Notes

- **Live mode uses REAL MONEY** - Be very careful!
- Test with small amounts first ($1 or $5)
- Monitor Stripe Dashboard for any issues
- Keep your secret keys secure - never commit them to git
- The webhook secret is different for each endpoint (test vs live)

## Testing Checklist

- [ ] Stripe Dashboard switched to Live mode
- [ ] Live API keys copied
- [ ] Production webhook endpoint created
- [ ] Webhook signing secret copied
- [ ] Vercel environment variables updated
- [ ] Production deployment redeployed
- [ ] Test payment processed successfully
- [ ] Webhook events received in Stripe Dashboard

---

**Next Step:** After Stripe is configured, move to Step 3: Update all other Vercel environment variables

