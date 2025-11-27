# Referral Program Verification Checklist

## 📋 Database Setup

### ✅ SQL Migrations
- [ ] Run `add-referral-onboarding-tracking.sql` in Supabase SQL Editor
  - This adds:
    - `calendly_meeting_completed` and `calendly_meeting_date` to `referral_program_applications`
    - `payment_status`, `payment_amount`, `x_followers_count` to `referrals`
    - Onboarding tracking fields to `profiles` table
  - **Verify:** Check that columns exist in Supabase Table Editor

### ✅ Database Tables
- [ ] `referral_program_applications` table exists
- [ ] `referrals` table exists
- [ ] All required columns are present (check schema)

---

## 🔐 Admin Access

### ✅ Admin Setup
- [ ] Your user account is marked as admin in Supabase
- [ ] You can access `/admin/referrals` page
- [ ] You can access `/admin/referrals/pending-payments` page

---

## 👤 User Flows

### ✅ Scout Application Flow
1. [ ] **As a scout, apply to referral program:**
   - Go to `/make-money` (or "Referral Program" in sidebar)
   - Click "Apply to Referral Program"
   - Fill out application form
   - Submit application
   - **Verify:** Application appears in `/admin/referrals`

2. [ ] **Admin reviews application:**
   - Go to `/admin/referrals`
   - See pending application
   - **Verify:** Can see Calendly meeting status
   - **Verify:** "Mark Meeting Completed" button works
   - **Verify:** Warning shows if trying to approve without meeting

3. [ ] **Admin approves application:**
   - Mark Calendly meeting as completed
   - Click "Approve"
   - **Verify:** Application status changes to "approved"
   - **Verify:** User can now see referral program dashboard

### ✅ New Scout Referrer Selection Flow
1. [ ] **Newly approved scout selects referrer:**
   - After approval, scout is redirected to `/profile/select-referrer`
   - **Verify:** Page shows list of approved referrers
   - **Verify:** Can select a referrer
   - **Verify:** Selection creates referral record

2. [ ] **Referral is created:**
   - **Verify:** Referral appears with `payment_status = 'pending_admin_review'`
   - **Verify:** No automatic payment is triggered

### ✅ Payment Processing Flow
1. [ ] **Admin processes payment:**
   - Go to `/admin/referrals/pending-payments`
   - See pending referral
   - **Verify:** Can see referred scout's information
   - **Verify:** Can input X follower count
   - **Verify:** Payment buttons ($45, $65, $125) are visible

2. [ ] **Admin triggers payment:**
   - Enter X follower count
   - Click appropriate payment button ($45, $65, or $125)
   - **Verify:** Payment is processed via Stripe
   - **Verify:** Referral status updates to "paid"
   - **Verify:** Money is transferred to referrer's Stripe Connect account

---

## 💰 Payment Tiers

### ✅ Payment Amount Logic
- [ ] **$45 payment:** For scouts with < 1,000 X followers
- [ ] **$65 payment:** For scouts with 1,000-4,999 X followers
- [ ] **$125 payment:** For scouts with 5,000+ X followers
- [ ] **Verify:** Admin can manually select payment amount regardless of follower count

---

## 🎨 UI/UX Verification

### ✅ Sidebar Navigation
- [ ] "Referral Program" link appears in sidebar (not "Make Money")
- [ ] Link is positioned at bottom section (above "Book a 15 min call")
- [ ] Link is styled in green color
- [ ] Link works and navigates to `/make-money`

### ✅ Referral Program Page (`/make-money`)
- [ ] Page loads without errors
- [ ] Shows "Referral Program" as title (not "Make Money")
- [ ] Shows "Limited Time" banner with "Valid through Jan 31, 2026"
- [ ] "How It Works" section explains:
  - Manual admin verification process
  - Payment tiers ($45, $65, $125)
  - Calendly meeting requirement
- [ ] **No "Share Your Referral Link" section** (removed)
- [ ] Application section mentions Calendly meeting requirement
- [ ] Leaderboard shows earnings correctly
- [ ] Earnings calculations use `payment_amount` and `payment_status`

### ✅ Admin Pages
- [ ] `/admin/referrals` page loads
  - Shows list of applications
  - Shows Calendly meeting status
  - "Mark Meeting Completed" button works
  - Approval/denial buttons work
  - Warning shows if approving without meeting

- [ ] `/admin/referrals/pending-payments` page loads
  - Shows referrals with `payment_status = 'pending_admin_review'`
  - Shows referred scout information
  - Shows referrer information
  - Input field for X follower count
  - Payment buttons ($45, $65, $125) work

---

## 🔌 API Endpoints

### ✅ User Endpoints
- [ ] `POST /api/referrals/apply` - Submit referral application
- [ ] `POST /api/referrals/select-referrer` - Select referrer (newly approved scouts)
- [ ] `GET /api/referrals/...` - Any GET endpoints for fetching data

### ✅ Admin Endpoints
- [ ] `POST /api/admin/referrals/[id]/approve` - Approve application
- [ ] `POST /api/admin/referrals/[id]/decision` - Approve/deny application
- [ ] `POST /api/admin/referrals/[id]/mark-meeting` - Mark Calendly meeting completed
- [ ] `POST /api/admin/referrals/[id]/process-payment` - Process referral payment
- [ ] `POST /api/admin/referrals/user/[userId]/revoke` - Revoke referrer status

### ✅ API Testing
- [ ] All endpoints return correct status codes
- [ ] Error handling works properly
- [ ] Admin-only endpoints require admin access
- [ ] Payment processing creates Stripe transfers correctly

---

## 💳 Stripe Integration

### ✅ Stripe Connect
- [ ] Referrers have Stripe Connect accounts
- [ ] Platform has sufficient balance for transfers
- [ ] Transfers are created correctly
- [ ] Transfer amounts match payment tiers ($45, $65, $125)

### ✅ Payment Flow
- [ ] Payment is created as transfer (not charge)
- [ ] Transfer goes to referrer's Stripe Connect account
- [ ] Payment status is updated in database
- [ ] Errors are handled gracefully

---

## 📊 Data Verification

### ✅ Database Queries
Run these in Supabase SQL Editor to verify data:

```sql
-- Check referral applications
SELECT * FROM referral_program_applications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check referrals
SELECT * FROM referrals 
ORDER BY created_at DESC 
LIMIT 10;

-- Check pending payments
SELECT * FROM referrals 
WHERE payment_status = 'pending_admin_review';

-- Check paid referrals
SELECT * FROM referrals 
WHERE payment_status = 'paid';
```

### ✅ Data Integrity
- [ ] Referrals are created when scout selects referrer
- [ ] Payment status is set to `pending_admin_review` initially
- [ ] Payment amounts are stored correctly
- [ ] X follower counts are stored when admin processes payment

---

## 🐛 Error Handling

### ✅ Error Scenarios
- [ ] Application page handles errors gracefully
- [ ] Payment processing shows errors if Stripe fails
- [ ] Missing data doesn't crash pages
- [ ] Admin pages show helpful error messages

---

## 📝 Content & Copy

### ✅ Text Verification
- [ ] "Referral Program" (not "Make Money") appears in:
  - Sidebar
  - Page title
  - Page content
- [ ] "Limited Time - Valid through Jan 31, 2026" is visible
- [ ] Payment tiers are explained correctly ($45, $65, $125)
- [ ] Calendly meeting requirement is mentioned
- [ ] No "Share Your Referral Link" section exists

---

## 🚀 Deployment Checklist

### ✅ Before Going Live
- [ ] All SQL migrations have been run
- [ ] Test with a real application flow
- [ ] Test payment processing with test Stripe account
- [ ] Verify admin access works
- [ ] Check that all pages load without errors
- [ ] Verify redirects work (newly approved scouts → select referrer)

---

## 🔍 Quick Test Scenarios

### Scenario 1: Full Flow Test
1. Create test scout account
2. Apply to referral program
3. As admin, mark meeting completed
4. As admin, approve application
5. As scout, select referrer
6. As admin, process payment
7. **Verify:** All steps complete successfully

### Scenario 2: Payment Tier Test
1. Create referral with different follower counts
2. Process payments at each tier ($45, $65, $125)
3. **Verify:** Correct amounts are transferred

### Scenario 3: Error Handling Test
1. Try to approve without meeting
2. Try to process payment without follower count
3. **Verify:** Appropriate errors/warnings show

---

## 📞 Support & Troubleshooting

### Common Issues
- **"Internal Server Error" on referral page:** Run SQL migration
- **Payments not processing:** Check Stripe Connect setup
- **Applications not showing:** Check admin access
- **Names not showing:** Check profile sync (separate issue)

---

## ✅ Final Sign-Off

- [ ] All database migrations complete
- [ ] All user flows tested
- [ ] All admin functions tested
- [ ] Payment processing verified
- [ ] UI/UX matches requirements
- [ ] No console errors
- [ ] Ready for production

