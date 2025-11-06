# Stripe Integration Testing Guide

This guide will help you thoroughly test the Stripe payment integration before going live on Friday.

## Prerequisites

Before testing, ensure you have:
- [ ] Stripe account (sign up at https://stripe.com)
- [ ] Test API keys from Stripe Dashboard
- [ ] Webhook endpoint configured (for local testing, use Stripe CLI)
- [ ] Environment variables set up correctly

## Step 1: Set Up Stripe Test Mode

1. **Get Your Test Keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)

2. **Add to Environment Variables:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # We'll set this up next
   ```

## Step 2: Set Up Webhook Testing (Local Development)

For local testing, you'll use Stripe CLI to forward webhooks to your local server.

### Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Login to Stripe CLI:
```bash
stripe login
```

### Forward Webhooks to Local Server:
```bash
# Forward webhooks to your local Next.js server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output a webhook signing secret that looks like `whsec_...`. **Copy this** and add it to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 3: Test the Payment Flow

### Test Scenario 1: Successful Payment

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook forwarding** (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Test the flow:**
   - Sign in as a player
   - Browse to a scout's profile
   - Click "Purchase Evaluation"
   - Click the payment button
   - You'll be redirected to Stripe Checkout

4. **Use Stripe Test Card:**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

5. **Complete the payment:**
   - Fill in the test card details
   - Click "Pay"
   - You should be redirected to `/evaluations/[id]/purchase-confirmation`

6. **Verify:**
   - Check that the evaluation status is "pending" in the database
   - Check Stripe Dashboard → Payments → You should see the test payment
   - Check your terminal/webhook logs for success messages

### Test Scenario 2: Payment Cancellation

1. Go through the same flow
2. When redirected to Stripe Checkout, click "Cancel" or close the window
3. You should be redirected back to `/profile/[id]/purchase`
4. Verify no evaluation was created (or status remains as before)

### Test Scenario 3: Duplicate Purchase Prevention

1. Create a pending evaluation with a scout
2. Try to purchase another evaluation from the same scout
3. You should see an error: "You already have a pending evaluation with this scout"
4. Verify you're redirected to the existing evaluation

### Test Scenario 4: Payment Failure

1. Use a declined test card:
   - Card Number: `4000 0000 0000 0002` (Generic decline)
   - Or: `4000 0000 0000 9995` (Insufficient funds)

2. Try to complete payment
3. Stripe Checkout should show an error
4. Verify no evaluation was created

## Step 4: Test Webhook Handling

### Test Webhook Events:

In your Stripe CLI terminal, you can trigger test events:

```bash
# Trigger a checkout.session.completed event
stripe trigger checkout.session.completed
```

Or manually in Stripe Dashboard:
1. Go to Developers → Webhooks
2. Find your endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Send the event

### Verify Webhook Processing:

1. Check your server logs for:
   - `✅ Payment successful for evaluation [id], session [session_id]`
   - No error messages

2. Check the database:
   - Evaluation status should be updated to 'pending'
   - `updated_at` should be recent

## Step 5: Test Edge Cases

### Test 1: Invalid Scout ID
- Try to purchase with a non-existent scout ID
- Should return error: "Invalid scout"

### Test 2: Unauthenticated User
- Try to access purchase page without logging in
- Should redirect to sign-in

### Test 3: Player Trying to Purchase from Another Player
- Create a player profile
- Try to purchase from another player (not scout)
- Should return error or redirect

### Test 4: Price Changes
- Change scout's price in database
- Try to purchase
- Verify the current price is used (not cached price)

## Step 6: Production Checklist

Before switching to live mode:

### 1. Get Live Keys:
- Go to https://dashboard.stripe.com/apikeys
- Switch to "Live mode" (toggle in top right)
- Copy your **live** Publishable key (`pk_live_...`)
- Copy your **live** Secret key (`sk_live_...`)

### 2. Set Up Production Webhook:
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter: `https://got1.app/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
5. Copy the webhook signing secret (`whsec_...`)

### 3. Update Environment Variables in Vercel:
```env
STRIPE_SECRET_KEY=sk_live_...  # ⚠️ LIVE KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # ⚠️ LIVE KEY
STRIPE_WEBHOOK_SECRET=whsec_...  # Production webhook secret
```

### 4. Test with Real Card (Small Amount):
- Use a real card with a small amount ($1-5)
- Verify the payment goes through
- Check Stripe Dashboard to confirm
- **IMPORTANT:** You can refund test payments in Stripe Dashboard

### 5. Verify Webhook in Production:
- Make a test purchase
- Check Stripe Dashboard → Webhooks → Recent events
- Verify the webhook was delivered successfully
- Check your Vercel logs for webhook processing

## Common Issues & Solutions

### Issue: "Stripe failed to load"
**Solution:** Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly and starts with `pk_`

### Issue: "Webhook signature verification failed"
**Solution:** 
- Verify `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint secret
- For local testing, use the secret from `stripe listen` command
- For production, use the secret from Stripe Dashboard → Webhooks

### Issue: "Payment succeeded but evaluation status not updated"
**Solution:**
- Check webhook logs in Stripe Dashboard
- Verify webhook endpoint is accessible (not blocked by firewall)
- Check server logs for webhook processing errors
- Verify `STRIPE_WEBHOOK_SECRET` is correct

### Issue: "Redirect to checkout fails"
**Solution:**
- Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is accessible in client
- Check that Stripe.js loaded correctly

### Issue: "Duplicate evaluation created"
**Solution:**
- The duplicate check should prevent this
- If it happens, check that the database query is working correctly
- Verify RLS policies allow the query

## Stripe Test Cards Reference

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 3220` | Requires authentication (3D Secure) |

For more test cards: https://stripe.com/docs/testing

## Security Checklist

- [ ] Webhook signature verification is enabled
- [ ] Environment variables are not exposed in client code
- [ ] Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public (not secret key)
- [ ] RLS policies prevent unauthorized access to evaluations
- [ ] Payment amounts are validated server-side
- [ ] Duplicate purchase prevention is working

## Monitoring in Production

### Set Up Stripe Dashboard Alerts:
1. Go to https://dashboard.stripe.com/settings/alerts
2. Set up alerts for:
   - Failed payments
   - Webhook failures
   - High-value transactions

### Monitor Webhooks:
- Check Stripe Dashboard → Webhooks → Recent events regularly
- Look for failed deliveries (red status)
- Check response codes (should be 200)

### Monitor Your Application:
- Check Vercel logs for webhook processing
- Monitor database for evaluation status updates
- Set up error tracking (Sentry, etc.)

## Next Steps After Testing

1. ✅ Test all scenarios above
2. ✅ Verify webhook handling works correctly
3. ✅ Test edge cases
4. ✅ Switch to live keys in Vercel
5. ✅ Set up production webhook
6. ✅ Do one final test with live mode (small amount)
7. ✅ Monitor first few real transactions closely

## Support

If you encounter issues:
1. Check Stripe Dashboard → Logs for errors
2. Check your server/Vercel logs
3. Review Stripe documentation: https://stripe.com/docs
4. Test webhook delivery in Stripe Dashboard

Good luck with your launch! 🚀

