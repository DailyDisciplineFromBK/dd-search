# Supabase Security Hardening Migration

This migration addresses all warnings from the Supabase Security Advisor.

## What This Fixes

### 1. Function Search Path Mutable ✅
- Adds `SET search_path = public, pg_temp` to all functions
- Prevents search path hijacking attacks
- Functions fixed:
  - `public.ivfflat_search_query`
  - `public.search_posts`
  - `public.upsert_post`

### 2. RLS Disabled in Public ✅
- Enables Row Level Security (RLS) on tables
- Creates policies for service_role, authenticated, and anon users
- Tables secured:
  - `public.posts` - read-only for public, full access for service_role
  - `public.search_queries` - users can only see their own queries

### 3. Security Definer View ✅
- Recreates views with `security_invoker = true`
- Views fixed:
  - `public.search_analytics_daily`
  - `public.popular_searches`
  - `public.recent_searches`

### 4. Extension in Public ⚠️
- **NOT FIXED** - `public.vector` extension left in place
- Moving pgvector after installation can break existing columns/indexes
- This is standard practice and low risk for single-app databases
- Comment in SQL file explains how to move it if absolutely needed

## How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **"New Query"**
4. Copy the entire contents of `supabase-security-fixes.sql`
5. Paste into the SQL editor
6. Click **"Run"** to execute
7. Check for any errors in the output

### Option 2: Supabase CLI

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push --include-all

# Or run the SQL file directly
psql $DATABASE_URL -f supabase-security-fixes.sql
```

## Verification

After applying the migration, run these queries in the SQL Editor to verify:

### Verify RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'search_queries');
```

Expected: Both tables should show `rowsecurity = true`

### Verify policies exist
```sql
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: Should show 5 policies total (3 for posts, 2 for search_queries)

### Verify function search_path
```sql
SELECT
  routine_name,
  routine_definition LIKE '%search_path%' as has_search_path
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('ivfflat_search_query', 'search_posts', 'upsert_post');
```

Expected: All 3 functions should show `has_search_path = true`

### Re-run Security Advisor

1. Go to **Security Advisor** in Supabase Dashboard
2. Click **"Refresh"** or **"Run Check"**
3. Verify warnings are resolved:
   - ✅ Function Search Path warnings should be gone
   - ✅ RLS warnings should be gone
   - ✅ Security Definer View warnings should be gone
   - ⚠️ Extension in Public warning will remain (expected, safe to ignore)

## Impact on Application

### No Breaking Changes ✅

This migration **will not break** your application because:
- Service role (used by your API) has full access to everything
- RLS policies allow service_role to read/write all data
- Functions maintain the same signatures and behavior
- Search functionality will work exactly the same

### What Changes

**For API (service_role):** No impact - full access maintained

**For future features:**
- If you add authenticated user access, they'll only see their own search queries
- If you add public/anon access, they can read posts but not search queries
- Better security foundation for multi-tenant features

## Rollback (If Needed)

If something goes wrong, you can rollback by:

```sql
-- Disable RLS
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Service role has full access to posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can read posts" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can read posts" ON public.posts;
DROP POLICY IF EXISTS "Service role has full access to search_queries" ON public.search_queries;
DROP POLICY IF EXISTS "Users can read their own search queries" ON public.search_queries;

-- Recreate views without security_invoker
-- (Views will revert to default SECURITY DEFINER behavior)
```

However, **rollback is not recommended** - the security improvements are beneficial and don't break anything.

## Questions?

If you encounter any issues or have questions about this migration, let me know!
