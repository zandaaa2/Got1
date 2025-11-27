-- Clean up duplicate referrals for user: 344e17b4-03e2-4954-8010-d9ef826e9aeb
-- Keep the first (oldest) referral, delete the duplicate

-- First, see all referrals for this user
SELECT 
  r.*,
  au_referred.email as referred_email,
  au_referrer.email as referrer_email
FROM referrals r
JOIN auth.users au_referred ON r.referred_id = au_referred.id
LEFT JOIN auth.users au_referrer ON r.referrer_id = au_referrer.id
WHERE r.referred_id = '344e17b4-03e2-4954-8010-d9ef826e9aeb'
ORDER BY r.created_at ASC;

-- Delete duplicates, keeping only the first (oldest) one
DELETE FROM referrals
WHERE referred_id = '344e17b4-03e2-4954-8010-d9ef826e9aeb'
AND id NOT IN (
  SELECT id 
  FROM referrals 
  WHERE referred_id = '344e17b4-03e2-4954-8010-d9ef826e9aeb'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Verify only one referral remains
SELECT 
  r.*,
  au_referred.email as referred_email,
  au_referrer.email as referrer_email
FROM referrals r
JOIN auth.users au_referred ON r.referred_id = au_referred.id
LEFT JOIN auth.users au_referrer ON r.referrer_id = au_referrer.id
WHERE r.referred_id = '344e17b4-03e2-4954-8010-d9ef826e9aeb';

