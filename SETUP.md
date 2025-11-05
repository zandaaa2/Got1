# Got1 Setup Guide

Complete setup instructions to get your Got1 platform running.

## Quick Start Checklist

- [ ] Run `npm install`
- [ ] Set up Supabase database (run `supabase-schema.sql`)
- [ ] Configure environment variables (`.env.local`)
- [ ] Set up Google OAuth in Supabase
- [ ] Configure Stripe webhook
- [ ] Set up Resend for emails (optional)
- [ ] Configure admin access
- [ ] Test the application

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd ~/Desktop/got12
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Access (choose one)
ADMIN_USER_IDS=your-user-id-here
# OR
ADMIN_EMAILS=your-email@example.com

# Email Service (optional - for scout application notifications)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Set Up Supabase Database

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script

This creates:
- `profiles` table
- `evaluations` table
- `scout_applications` table
- All necessary indexes and RLS policies

### 4. Configure Google OAuth in Supabase

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. Set Up Stripe

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local development:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 6. Set Up Email Service (Optional but Recommended)

1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Add to `.env.local`:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (must be verified domain)

If not configured, application notifications will be logged to console.

### 7. Configure Admin Access

Choose one method:

**Option A: By User ID**
```env
ADMIN_USER_IDS=uuid-1,uuid-2
```

**Option B: By Email**
```env
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

Get your user ID from Supabase Dashboard > Authentication > Users after signing up.

### 8. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the Application

### Test User Flows

1. **Player Sign Up:**
   - Go to `/auth/signup`
   - Select "Player"
   - Sign in with Google
   - Complete profile setup
   - Add Hudl link

2. **Scout Application:**
   - As a player, go to `/profile`
   - Click "Apply" in Scout Status section
   - Fill out application form
   - Submit (check email or console for notification)

3. **Admin Approval:**
   - Go to `/admin/scout-applications`
   - Review pending applications
   - Click on application to review
   - Approve or deny

4. **Purchase Evaluation:**
   - As a player, browse scouts at `/browse`
   - Click on a scout profile
   - Click "Purchase Evaluation"
   - Complete Stripe checkout

5. **Complete Evaluation:**
   - As a scout, go to `/my-evals`
   - Click on an evaluation
   - Write evaluation notes
   - Submit evaluation

## Troubleshooting

### Database Errors
- Make sure you ran `supabase-schema.sql`
- Check RLS policies are enabled
- Verify foreign key relationships

### Authentication Issues
- Check Google OAuth credentials in Supabase
- Verify redirect URLs are correct
- Check Supabase project URL and anon key

### Stripe Issues
- Verify webhook endpoint is accessible
- Check webhook secret is correct
- Test with Stripe test cards

### Email Not Sending
- Check Resend API key is valid
- Verify `RESEND_FROM_EMAIL` domain is verified
- Check console logs for errors

## Production Deployment

Before deploying to production:

1. Update all environment variables with production values
2. Use Stripe live keys (not test keys)
3. Set up production domain in Supabase
4. Configure production email service
5. Update `NEXT_PUBLIC_APP_URL` to production URL
6. Set up proper admin access

## Next Steps

- [ ] Test all user flows
- [ ] Add profile picture upload functionality
- [ ] Implement Terms of Service and Privacy Policy pages
- [ ] Add Stripe billing management page
- [ ] Set up production environment
- [ ] Deploy to Vercel/Netlify

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify all environment variables are set
3. Check Supabase logs
4. Review Stripe webhook logs

