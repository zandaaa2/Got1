# Fix: Evaluations Not Showing After Payment (Localhost)

## Problem
After successful payment, evaluations don't appear in the "In Progress" tab because Stripe webhooks don't automatically reach localhost.

## Quick Fix (Already Implemented)
The payment success page now automatically creates the evaluation if the webhook hasn't fired. This works on localhost without any setup.

## Proper Solution (For Development)

### Option 1: Use Stripe CLI (Recommended)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook secret (starts with `whsec_`) to your `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
5. Restart your dev server

### Option 2: Use Manual Fallback (Already Working)
The payment success page now automatically creates the evaluation if it's not found after retries. This works without any setup but is less "realistic" than actual webhooks.

## Production
In production (Vercel), webhooks will work automatically once configured in Stripe Dashboard:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://got1.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret to Vercel environment variables

## Testing
1. Make a payment
2. Check browser console for logs
3. The evaluation should appear either:
   - Via webhook (if Stripe CLI is running)
   - Via manual fallback (if webhook didn't fire)

