# Stripe Test Mode Setup for Development

This is a quick guide to get Stripe test mode working in your local development environment.

## Step 1: Get Your Test Keys from Stripe

1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **Test mode** (toggle in top right should say "Test mode")
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - click "Reveal test key"

## Step 2: Add to Your Local `.env.local` File

Create or update `.env.local` in your project root:

```env
# Stripe Test Mode (for development)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER  # We'll get this from Stripe CLI
```

## Step 3: Set Up Stripe CLI for Local Webhook Testing

### Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Login:
```bash
stripe login
```
This will open your browser to authorize the CLI.

### Forward Webhooks (in a separate terminal):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output something like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Copy that `whsec_...` secret** and update your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Keep this terminal running** while you test!

## Step 4: Start Your Dev Server

```bash
npm run dev
```

## Step 5: Test a Payment

1. **Sign in as a player** in your app
2. **Browse to a scout's profile**
3. **Click "Purchase Evaluation"**
4. **Click the payment button** - you'll be redirected to Stripe Checkout
5. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
6. **Complete payment**
7. **Check:**
   - You should be redirected to purchase confirmation page
   - Check your terminal running `stripe listen` - you should see webhook events
   - Check your dev server terminal - you should see logs about payment success
   - Check your database - evaluation should have status "pending"

## Troubleshooting

### "Stripe failed to load"
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly in `.env.local`
- Restart your dev server after changing `.env.local`
- Make sure the key starts with `pk_test_`

### "Webhook signature verification failed"
- Make sure `stripe listen` is running in a separate terminal
- Copy the `whsec_...` secret from `stripe listen` output
- Update `.env.local` with the correct secret
- Restart your dev server

### Payment succeeds but evaluation doesn't update
- Check that `stripe listen` is running
- Check your dev server logs for webhook processing
- Verify the webhook secret matches what `stripe listen` shows

## Test Cards Reference

| Card Number | Result |
|------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

## Next Steps

Once you've tested locally and everything works:
1. ✅ Test all the scenarios in `STRIPE_TESTING_GUIDE.md`
2. ✅ Switch to live keys when ready for production
3. ✅ Set up production webhook in Stripe Dashboard

## Important Notes

- **Test mode is completely safe** - no real money is charged
- All test payments are visible in Stripe Dashboard → Payments (make sure you're in Test mode)
- You can create test customers, refunds, etc. in test mode
- When you switch to live mode, you'll use different keys (`pk_live_` and `sk_live_`)

Good luck testing! 🚀

