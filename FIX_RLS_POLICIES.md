# Fix RLS Policies in Supabase

The 400 error suggests the RLS policies might not be set up correctly. Follow these steps:

## Step 1: Check Current Policies

1. Go to Supabase Dashboard
2. Go to **Database** → **Policies** (or **Authentication** → **Policies**)
3. Click on the **profiles** table
4. Check if you see these policies:
   - "Users can view all profiles" (SELECT policy with `USING (true)`)
   - "Users can update their own profile" (UPDATE policy)
   - "Users can insert their own profile" (INSERT policy)

## Step 2: If Policies Don't Exist or Are Wrong

1. Go to **SQL Editor** in Supabase
2. Run this SQL to fix the policies:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Recreate correct policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Step 3: Verify RLS is Enabled

Run this to check:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

Should show `rowsecurity = true`

## Step 4: Test Again

After fixing policies, refresh your browser and try again.







