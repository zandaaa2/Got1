# Got1

A marketplace platform connecting high school football players with college scouts for film evaluations.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Then add your Supabase and Stripe credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (starts with `pk_test_` or `pk_live_`)
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (starts with `whsec_`)

3. Set up Stripe Webhook:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed` and `payment_intent.succeeded`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

5. Configure Google OAuth in Supabase:
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials (Client ID and Client Secret)

6. Set up your Supabase database schema:
   - Run the SQL schema file in Supabase SQL Editor:
     ```bash
     # Copy and paste the contents of supabase-schema.sql into Supabase Dashboard > SQL Editor
     ```
   - Or manually create the tables: `profiles`, `evaluations`, and `scout_applications`
   - The schema file includes all necessary tables, indexes, and RLS policies

7. Set up email notifications (optional but recommended):
   - Set `ADMIN_EMAIL` in `.env.local` for scout application notifications
   - For email service integration:
     - Sign up at [Resend](https://resend.com) (recommended)
     - Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env.local`
     - Or integrate with SendGrid, AWS SES, etc.
   - If no email service is configured, notifications will be logged to console

8. Set up admin access:
   - Option 1: Add admin user IDs to `ADMIN_USER_IDS` (comma-separated)
   - Option 2: Add admin emails to `ADMIN_EMAILS` (comma-separated)
   - Or modify the `isAdmin()` function in `/lib/admin.ts` to use your own admin system

9. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Documentation

- **SETUP.md** - Detailed setup instructions
- **PROJECT_SUMMARY.md** - Complete project overview and features
- **supabase-schema.sql** - Database schema to run in Supabase

## Features

- ✅ **Browse Page**: Search and browse scouts with filtering
- ✅ **Profile Pages**: View player and scout profiles with evaluations
- ✅ **Authentication**: Google OAuth integration via Supabase
- ✅ **My Evals**: Track evaluations (Player and Scout views with tabs)
- ✅ **Evaluation System**: Purchase evaluations with Stripe
- ✅ **Scout Applications**: Apply to become a scout with admin approval
- ✅ **Profile Management**: Setup, edit, and customize profiles
- ✅ **Share Functionality**: Share profiles and evaluations
- ✅ **Admin Dashboard**: Review and approve scout applications

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database + Auth)
- Google OAuth
- Stripe (Payments)

