# New Payment Flow Implementation

## Overview
This document describes the new payment flow where:
1. Player requests evaluation (no payment)
2. Scout confirms/denies
3. If confirmed, payment is charged (money in escrow)
4. When completed, scout gets 90%, platform gets 10%

## Database Migration Required

**⚠️ CRITICAL: Run this SQL migration first!**

```sql
-- File: migrate-payment-flow.sql
```

This adds:
- New statuses: `requested`, `confirmed`, `denied`
- Payment tracking fields: `payment_intent_id`, `payment_status`, `stripe_account_id`, `transfer_id`
- Fee fields: `platform_fee`, `scout_payout`
- Timestamp fields: `confirmed_at`, `denied_at`, `denied_reason`

## Implementation Status

### ✅ Completed
1. **Evaluation Creation** - Updated to create 'requested' status (no payment)
2. **PurchaseEvaluation Component** - Updated to call `/api/evaluation/create` instead of Stripe checkout
3. **Cancellation Logic** - Only allows cancellation when status is 'requested' (before scout confirms)
4. **Scout Confirmation Endpoint** - Created `/api/evaluation/confirm` for scout to confirm/deny
5. **Webhook Updates** - Updated to handle scout-confirmed payments and move to 'confirmed' status

### 🚧 In Progress
1. **UI Updates** - Need to:
   - Show 'requested' status in My Evals
   - Add confirm/deny buttons for scouts
   - Show payment status for players
   - Display payment URL when scout confirms

### ⏳ Pending
1. **Payout System** - Transfer 90% to scout when evaluation completed
2. **Stripe Connect Setup** - Create connected accounts for scouts
3. **Email Notifications** - Update for new flow:
   - Scout confirmation email to player (with payment link)
   - Scout denial email to player
   - Completion emails (scout payout, player invoice, admin notification)
4. **Status Filtering** - Update My Evals to show:
   - 'requested' (awaiting scout confirmation)
   - 'confirmed' (payment charged, in escrow)
   - 'in_progress' (scout working on it)
   - 'completed' (done, payout sent)

## Next Steps

1. **Run database migration** - Execute `migrate-payment-flow.sql` in Supabase
2. **Update UI components** - Add scout confirmation/denial UI
3. **Set up Stripe Connect** - Create connected accounts for scouts
4. **Implement payout logic** - Transfer funds when evaluation completes
5. **Update email templates** - Add new email notifications

## Testing Checklist

- [ ] Player can request evaluation (no payment)
- [ ] Player can cancel request before scout confirms
- [ ] Player cannot cancel after scout confirms
- [ ] Scout can confirm request (creates payment session)
- [ ] Scout can deny request (sends email to player)
- [ ] Player completes payment after scout confirms
- [ ] Payment moves to 'confirmed' status (escrow)
- [ ] Scout completes evaluation
- [ ] Payout occurs (90% to scout, 10% platform)
- [ ] All emails are sent correctly

