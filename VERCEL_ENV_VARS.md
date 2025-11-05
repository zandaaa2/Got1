# Vercel Environment Variables

Copy these into Vercel → Your Project → Settings → Environment Variables

## Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://qupfurmytqopxlxhdkcv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cGZ1cm15dHFvcHhseGhka2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTIyODUsImV4cCI6MjA3Nzc2ODI4NX0.dCK8Py-8hjzGlyfb5BO1GhOX7I6EmYnNJz7vkKw-uQ0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cGZ1cm15dHFvcHhseGhka2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE5MjI4NSwiZXhwIjoyMDc3NzY4Mjg1fQ.e9H5aTV2knkrdxuO7vIjH_I6luNChdwFshpC8VNfiKk
```

## Email Configuration (Resend)

```
RESEND_API_KEY=re_XMYnjNXi_8ahrQnuG1mPjzDd3AeyxJmec
RESEND_FROM_EMAIL=noreply@resend.dev
```

**Note:** Update `RESEND_FROM_EMAIL` to `noreply@got1.app` after you verify your domain in Resend.

## App URL (Temporary - will update after domain setup)

```
NEXT_PUBLIC_APP_URL=https://got1-xxxxx.vercel.app
```

**Note:** Update this to `https://got1.app` after connecting your domain.

## Admin Configuration

Add one of these (update with your actual admin email/user ID):

```
ADMIN_EMAILS=your-email@example.com
```

OR

```
ADMIN_USER_IDS=your-user-id-here
```

## Stripe (Add Later When Ready)

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Instructions

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add each variable above
3. Select **Production**, **Preview**, and **Development** for each
4. Click "Save"
5. Redeploy your project

