-- Add onboarding tracking fields to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS x_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS profile_link_in_bio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS offer_changed_from_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.x_followers_count IS 'X (Twitter) follower count for referral payment calculation';
COMMENT ON COLUMN profiles.profile_link_in_bio IS 'Whether scout has added profile link to X bio';
COMMENT ON COLUMN profiles.offer_changed_from_default IS 'Whether scout changed offer price from default $99';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when all onboarding requirements completed';

-- Update referrals table to support new payment structure
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS x_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2), -- $45, $65, or $125
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending_admin_review' CHECK (payment_status IN ('pending_admin_review', 'paid', 'failed'));

-- Update existing referrals to have pending_admin_review status if they don't have a status
UPDATE referrals 
SET payment_status = 'pending_admin_review' 
WHERE payment_status IS NULL OR (payment_status = 'pending' AND payment_amount IS NULL);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_referrals_payment_status ON referrals(payment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed_at) WHERE onboarding_completed_at IS NOT NULL;

-- Update referral_program_applications to track Calendly meetings
ALTER TABLE referral_program_applications
  ADD COLUMN IF NOT EXISTS calendly_meeting_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calendly_meeting_date TIMESTAMPTZ;

COMMENT ON COLUMN referral_program_applications.calendly_meeting_completed IS 'Whether applicant completed Calendly meeting';
COMMENT ON COLUMN referral_program_applications.calendly_meeting_date IS 'Date when Calendly meeting was completed';

