-- Create a test scout profile for viewing
-- Run this in your Supabase SQL Editor

-- Insert a test scout profile with a fake user_id
-- Note: This won't allow signing in, but you can view the profile
INSERT INTO profiles (
  id,
  user_id,
  role,
  full_name,
  organization,
  position,
  price_per_eval,
  turnaround_time,
  work_history,
  additional_info,
  bio,
  social_link,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  gen_random_uuid(), -- Fake user_id (won't match any real auth user)
  'scout',
  'John Smith',
  'Auburn University',
  'Player Personnel Assistant',
  149.00,
  '48 hrs',
  '5 years of experience in college football recruiting. Previously worked at SMU and currently at Auburn University. Specialized in evaluating defensive backs and wide receivers.',
  'Available for film review and evaluation services. Quick turnaround time and detailed analysis provided.',
  'Experienced scout with a passion for helping players reach their potential.',
  'https://x.com/johnsmith_scout',
  NOW(),
  NOW()
)
RETURNING id, full_name, organization;

-- After running this, note the returned 'id' value
-- Navigate to: /profile/[id] (replace [id] with the UUID returned above)

