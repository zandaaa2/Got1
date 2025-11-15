# Notification Testing Guide

This guide explains how to test all notification types in the system.

## Prerequisites

### 1. Database Migration
**CRITICAL:** Before testing, you must run the database migration to add support for the new notification types.

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `add-new-notification-types.sql`
4. Run the migration

This adds the following 6 new notification types:
- `user_signed_up`
- `user_signed_in`
- `user_converted_to_player`
- `user_converted_to_basic`
- `stripe_account_issue`
- `scout_ready_to_earn`

### 2. Verify Tables Exist
Make sure both tables exist:
- `notifications` table (from `create-notifications-table.sql`)
- Updated constraint with all 15 notification types

## Testing Methods

### Method 1: Test Page (Recommended)
The easiest way to test all notifications:

1. **Navigate to test page:**
   - Go to: `http://localhost:3000/test-notifications` (or your production URL)
   - Must be signed in

2. **Click "Create All Test Notifications":**
   - This creates one notification of each type
   - You'll be redirected to `/notifications` page automatically
   - Check that all 15 types appear (or 13 for non-scout users)

3. **Verify each notification:**
   - Check icons are correct
   - Verify links work
   - Confirm unread/read functionality
   - Test that notifications are sorted (unread first)

### Method 2: API Endpoint
Test via API directly:

```bash
# GET request to create all notifications
curl -X GET http://localhost:3000/api/test/notifications/all \
  -H "Cookie: your-session-cookie"
```

Response includes:
- `success`: boolean
- `total`: number of notification types
- `successful`: number created successfully
- `failed`: number that failed
- `results`: array with details for each type

### Method 3: View All Notifications (API)
Check all existing notifications:

```bash
# GET request to view all notifications
curl -X GET http://localhost:3000/api/test/notifications \
  -H "Cookie: your-session-cookie"
```

## Manual Testing Checklist

### Evaluation Notifications (5 types)
- [ ] `evaluation_requested` - Triggered when player requests evaluation
- [ ] `evaluation_confirmed` - Triggered when scout confirms request
- [ ] `evaluation_denied` - Triggered when scout denies request
- [ ] `evaluation_completed` - Triggered when scout completes evaluation
- [ ] `evaluation_cancelled` - Triggered when player cancels request

**How to test:**
1. As a player, request an evaluation from a scout
2. As a scout, confirm/deny a request
3. As a scout, complete an evaluation
4. As a player, cancel a pending evaluation

### Scout Application Notifications (2 types)
- [ ] `scout_application_approved` - Triggered when admin approves application
- [ ] `scout_application_denied` - Triggered when admin denies application

**How to test:**
1. Submit a scout application
2. As an admin, approve or deny the application

### Payment Notifications (2 types)
- [ ] `payment_received` - Triggered when payment succeeds
- [ ] `payment_failed` - Triggered when payment fails

**How to test:**
1. Request an evaluation and complete payment
2. Use Stripe test card: `4242 4242 4242 4242`
3. For failed payment, use: `4000 0000 0000 0002`

### User Account Notifications (4 types)
- [ ] `user_signed_up` - Triggered on first sign up
- [ ] `user_signed_in` - Triggered on subsequent sign ins
- [ ] `user_converted_to_player` - Triggered when converting to player
- [ ] `user_converted_to_basic` - Triggered when converting back to basic

**How to test:**
1. Sign up a new account → should get `user_signed_up`
2. Sign in existing account → should get `user_signed_in`
3. Go to profile, convert role to "Player" → should get `user_converted_to_player`
4. Convert role back to "Basic User" → should get `user_converted_to_basic`

### Stripe/Account Notifications (2 types - Scout only)
- [ ] `stripe_account_issue` - Triggered when Stripe account has requirements
- [ ] `scout_ready_to_earn` - Triggered when Stripe setup is complete

**How to test:**
1. As a scout, set up Stripe Connect
2. If Stripe has pending requirements → should get `stripe_account_issue`
3. Complete Stripe onboarding → should get `scout_ready_to_earn` when fully enabled

## Verification Points

For each notification, verify:

1. **Icon Display:**
   - Correct icon appears for each type
   - Icons are color-coded appropriately
   - Icons match the notification type

2. **Content:**
   - Title is clear and descriptive
   - Message explains what happened
   - Link is correct (if applicable)

3. **Functionality:**
   - Clicking notification marks it as read
   - Clicking notification navigates to correct page
   - Unread notifications appear above read ones
   - Notifications are sorted by date within each group

4. **Real-time Updates:**
   - New notifications appear without page refresh
   - Notification count updates automatically
   - Read status updates in real-time

5. **Edge Cases:**
   - Missing profile data doesn't break notifications
   - Invalid links don't crash the app
   - Very long messages display correctly
   - Special characters in titles/messages work

## Troubleshooting

### Notifications not appearing?
1. Check database migration was run
2. Verify user is authenticated
3. Check browser console for errors
4. Verify RLS policies allow notification access

### Some notification types missing?
- Scout-only notifications (`stripe_account_issue`, `scout_ready_to_earn`) only appear for users with `role = 'scout'`
- Verify user role in `profiles` table

### Notifications not updating in real-time?
- Check Supabase Realtime is enabled
- Verify WebSocket connection in browser DevTools
- Check Supabase project settings for Realtime enabled on `notifications` table

### Migration errors?
- Ensure `create-notifications-table.sql` was run first
- Check for existing constraint conflicts
- Verify Supabase connection and permissions

## Clean Up Test Data

To remove all test notifications:

```sql
-- Delete all notifications for a specific user
DELETE FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND metadata->>'test' = 'true';
```

Or delete all notifications:
```sql
DELETE FROM notifications WHERE metadata->>'test' = 'true';
```

## Notification Types Summary

| Category | Count | Types |
|----------|-------|-------|
| Evaluation | 5 | requested, confirmed, denied, completed, cancelled |
| Scout Application | 2 | approved, denied |
| Payment | 2 | received, failed |
| User Account | 4 | signed_up, signed_in, converted_to_player, converted_to_basic |
| Stripe/Account | 2 | account_issue, ready_to_earn |
| **Total** | **15** | |

Note: Scout-only notifications (Stripe/Account) only appear for users with scout role.

