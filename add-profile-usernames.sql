-- Add username column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Fill missing usernames using slugified full_name or fallback to id prefix
UPDATE profiles
SET username =
  CASE
    WHEN username IS NOT NULL AND username <> '' THEN username
    WHEN full_name IS NOT NULL AND full_name <> ''
      THEN lower(regexp_replace(full_name, '[^a-z0-9]+', '-', 'g'))
    ELSE lower(substring(id::text, 1, 8))
  END
WHERE username IS NULL OR username = '';

-- Ensure uniqueness by appending short id when duplicates exist
WITH duplicates AS (
  SELECT id,
         username,
         row_number() OVER (PARTITION BY username ORDER BY id) AS rn
  FROM profiles
)
UPDATE profiles p
SET username = p.username || '-' || substring(p.id::text, 1, 4)
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Enforce constraints
UPDATE profiles
SET username = lower(username);

ALTER TABLE profiles
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles (username);
