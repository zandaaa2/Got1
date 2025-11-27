-- Allow anyone to view approved referral program applications
-- This is needed so users can see who they can select as a referrer

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view approved referral applications" ON referral_program_applications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'referral_program_applications' 
    AND policyname = 'Anyone can view approved referral applications'
  ) THEN
    CREATE POLICY "Anyone can view approved referral applications" ON referral_program_applications
      FOR SELECT USING (status = 'approved');
  END IF;
END $$;

-- Pre-approve the two referrers: zander@got1.app and douyonchasity@gmail.com
-- This inserts or updates their referral program applications to 'approved' status
INSERT INTO referral_program_applications (user_id, status, reviewed_at)
SELECT 
  u.id as user_id,
  'approved' as status,
  NOW() as reviewed_at
FROM auth.users u
WHERE u.email IN ('zander@got1.app', 'douyonchasity@gmail.com')
ON CONFLICT (user_id) 
DO UPDATE SET 
  status = 'approved',
  reviewed_at = NOW();

