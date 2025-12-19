# Fix Zanderplayer Role via API

Since manually updating the role in the database isn't working (likely due to a trigger or RLS), use the admin API endpoint instead:

## Option 1: Use the Admin API Endpoint

Make a POST request to:
```
POST /api/admin/fix-player-role
Content-Type: application/json

{
  "full_name": "Zander Huff"
}
```

Or use curl:
```bash
curl -X POST http://localhost:3000/api/admin/fix-player-role \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Zander Huff"}'
```

This endpoint uses `adminSupabase` which bypasses RLS and should successfully update the role.

## Option 2: Use SQL with Service Role (in Supabase SQL Editor)

If you have access to the service role key, you can run:

```sql
-- Temporarily disable RLS (if needed)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Update the role
UPDATE profiles 
SET role = 'player', updated_at = NOW()
WHERE username = 'zanderplayer';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT id, username, full_name, role 
FROM profiles 
WHERE username = 'zanderplayer';
```

## Option 3: Check for Triggers

If the role keeps getting reset, there might be a trigger. Run this to check:

```sql
-- Check for triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Check for triggers on auth.users that might affect profiles
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND (action_statement ILIKE '%profiles%' OR action_statement ILIKE '%role%');
```

If you find a trigger that's resetting the role, you may need to modify or disable it.










