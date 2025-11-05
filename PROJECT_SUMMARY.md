# Got1 - Project Summary

## Overview

Got1 is a marketplace platform connecting high school football players with college scouts for film evaluations. Players can purchase professional evaluations from experienced scouts.

## Features Implemented

### ✅ Core Features

1. **Authentication**
   - Google OAuth integration via Supabase
   - Role-based authentication (Player/Scout)
   - Profile setup for new users

2. **Browse & Discovery**
   - Browse scouts marketplace
   - Search functionality
   - Profile viewing (Player and Scout views)

3. **Evaluation System**
   - Purchase evaluations with Stripe
   - Evaluation workflow (pending → in progress → completed)
   - Notes app-style evaluation editor
   - Evaluation tracking (My Evals)

4. **Scout Application System**
   - Application form with work history
   - Admin approval workflow
   - Email notifications (Resend integration)
   - Admin dashboard for reviewing applications

5. **Profile Management**
   - Profile setup for new users
   - Profile editing
   - Custom pricing for scouts ($99 default)
   - Hudl link integration for players

6. **Payment Processing**
   - Stripe Checkout integration
   - Webhook handling for payment confirmation
   - Secure payment flow

7. **Admin Features**
   - Admin dashboard for scout applications
   - Application review and approval
   - Admin authentication system

8. **Sharing**
   - Share button on all pages
   - Web Share API on mobile
   - Copy-to-clipboard fallback

## Pages Created

### Public Pages
- `/` - Landing page
- `/browse` - Browse scouts marketplace
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/profile/[id]` - View profile (Player or Scout)

### Authenticated Pages
- `/profile` - User's own profile
- `/profile/edit` - Edit profile
- `/profile/setup` - Initial profile setup
- `/profile/scout-application` - Apply to become scout
- `/profile/[id]/purchase` - Purchase evaluation
- `/my-evals` - My evaluations (Player and Scout views)
- `/evaluations/[id]` - Evaluation detail page
- `/evaluations/[id]/confirmation` - Evaluation submission confirmation
- `/evaluations/[id]/purchase-confirmation` - Purchase confirmation

### Admin Pages
- `/admin/scout-applications` - List all applications
- `/admin/scout-applications/[id]` - Review individual application

## API Routes

- `/api/auth/callback` - OAuth callback handler
- `/api/auth/signout` - Sign out handler
- `/api/stripe/create-checkout` - Create Stripe checkout session
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/scout-application/submit` - Submit scout application
- `/api/scout-application/[id]/decision` - Approve/deny application

## Database Schema

### Tables
1. **profiles** - User profiles (players and scouts)
2. **evaluations** - Evaluation records
3. **scout_applications** - Scout application submissions

See `supabase-schema.sql` for complete schema.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Google OAuth
- **Payments:** Stripe
- **Email:** Resend (optional)

## Environment Variables

See `.env.local.example` for all required variables.

## Key Files

- `supabase-schema.sql` - Database schema
- `SETUP.md` - Detailed setup instructions
- `README.md` - Project overview
- `.env.local.example` - Environment variable template

## Next Steps

1. Run `npm install`
2. Set up Supabase database
3. Configure environment variables
4. Test the application
5. Deploy to production

## Notes

- Default scout price is $99 (customizable per scout)
- Email notifications require Resend API key (or logs to console)
- Admin access configured via environment variables
- All pages match Figma designs
- Responsive design with clean, minimalist UI

