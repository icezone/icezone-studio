# RLS Security Fix - Deployment Guide

## Summary

This deployment applies critical security fixes for Row-Level Security (RLS) on the Supabase database.

**Changes:**
- Enables RLS on `plans` table (currently missing RLS - **CRITICAL VULNERABILITY**)
- Adds performance indexes on `user_id` columns for RLS policy evaluation
- All other tables already have RLS enabled

**Migrations:**
- `013_enable_rls_plans.sql` - Enable RLS on plans table with public read policy
- `014_add_user_id_indexes.sql` - Performance indexes for RLS

## Pre-Deployment Checklist

- [ ] Backup current production database
- [ ] Review migration files:
  - `supabase/migrations/013_enable_rls_plans.sql`
  - `supabase/migrations/014_add_user_id_indexes.sql`
- [ ] Confirm Supabase project URL and credentials
- [ ] Schedule deployment during low-traffic window (if possible)
- [ ] Notify team of deployment

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended for Staging)

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration 013**
   - Copy contents of `supabase/migrations/013_enable_rls_plans.sql`
   - Paste into SQL editor
   - Click "Run"
   - Verify: "Success. No rows returned" (or similar)

4. **Run Migration 014**
   - Copy contents of `supabase/migrations/014_add_user_id_indexes.sql`
   - Paste into SQL editor
   - Click "Run"
   - Verify: "Success. No rows returned"

5. **Verify RLS Enabled**
   ```sql
   -- Run this query to check RLS status
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   - All tables should have `rowsecurity = true`

6. **Verify Policies Created**
   ```sql
   -- Check policies on plans table
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'plans';
   ```
   - Should show "Anyone can read pricing plans" policy

### Option 2: Via Supabase CLI (Recommended for Production)

1. **Link to Supabase Project**
   ```bash
   # If not already linked
   npx supabase link --project-ref <your-project-ref>
   ```

2. **Check Migration Status**
   ```bash
   npx supabase migration list
   ```
   - Note which migrations are already applied

3. **Push Migrations**
   ```bash
   npx supabase db push
   ```
   - This applies all pending migrations
   - Review output carefully

4. **Verify Deployment**
   ```bash
   # Check RLS status
   npx supabase db remote query "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
   
   # Check plans table policies
   npx supabase db remote query "SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans';"
   ```

## Post-Deployment Verification

### 1. Check RLS Status in Dashboard

**Via Supabase Dashboard:**
1. Go to "Database" → "Tables"
2. Select `plans` table
3. Check "RLS is enabled" badge appears
4. Click "Policies" tab
5. Verify "Anyone can read pricing plans" policy exists

### 2. Test Public Read Access

```javascript
// Test from browser console or Node.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);

// Should succeed - public read
const { data, error } = await supabase
  .from('plans')
  .select('*');

console.log('Plans:', data);
console.log('Error:', error); // Should be null
```

### 3. Test Write Protection

```javascript
// Should FAIL - no write policy for anon users
const { error } = await supabase
  .from('plans')
  .insert({ id: 'test', name: 'Test', credits_per_month: 100 });

console.log('Expected error:', error);
// Should get permission denied error
```

### 4. Test User Access to Own Data

```javascript
// Test authenticated user can access own projects
const supabase = createClient(url, anonKey);

// Login first
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
});

// Should succeed - user can see own projects
const { data } = await supabase
  .from('projects')
  .select('*');

console.log('User projects:', data);
```

### 5. Monitor for Errors

**Check Application Logs:**
- Monitor for any "permission denied" errors
- Check API endpoints that query database
- Watch for failed requests in browser console

**Supabase Dashboard Logs:**
1. Go to "Logs" in Supabase Dashboard
2. Filter by "Postgres Logs"
3. Look for "permission denied" or RLS-related errors

### 6. Performance Check

**Check Query Performance:**
```sql
-- Plans table should still be fast (no user_id filter needed)
EXPLAIN ANALYZE SELECT * FROM public.plans;

-- User-owned tables should use indexes
EXPLAIN ANALYZE 
SELECT * FROM public.projects 
WHERE user_id = 'some-uuid';
-- Should show "Index Scan using idx_projects_user_id"
```

## Rollback Procedure

If critical issues are detected:

### Rollback Step 1: Disable RLS on Plans Table

```sql
-- Emergency: Disable RLS on plans table
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** This reopens the security vulnerability. Only use in emergency.

### Rollback Step 2: Investigate and Fix

1. Check error logs to identify issue
2. Fix policies if needed
3. Test fix in staging
4. Re-enable RLS with corrected policies

### Rollback Step 3: Remove Indexes (if causing issues)

```sql
-- Only if indexes cause performance problems (unlikely)
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_project_assets_user_id;
DROP INDEX IF EXISTS idx_ai_jobs_user_id;
DROP INDEX IF EXISTS idx_credit_ledger_user_id;
DROP INDEX IF EXISTS idx_payments_user_id;
```

## Expected Impact

### Positive Impact

✅ **Security:** Closes critical vulnerability where `plans` table was publicly writable  
✅ **Performance:** Indexes improve RLS policy evaluation speed  
✅ **Compliance:** All tables now follow security best practices

### Potential Issues (Low Risk)

⚠️ **Plans table writes fail from client:** Expected behavior - use service role for admin writes  
⚠️ **Existing queries to plans:** Should work unchanged (RLS allows public read)

## Monitoring Post-Deployment

**First 24 Hours:**
- Monitor error rates in application logs
- Check Supabase dashboard for policy violations
- Watch user-facing features (pricing page, project access)

**First Week:**
- Review slow query log for performance impact
- Monitor user support tickets for access issues

## Deployment Timeline Recommendation

1. **Staging:** Deploy immediately, test all critical flows
2. **Production:** Deploy during next low-traffic window (evening/weekend)
3. **Duration:** 5-10 minutes (migrations are fast, mostly DDL)

## Support Contacts

If issues arise:
- Check `docs/standards/database-security.md` for RLS troubleshooting
- Review `supabase/migrations/_TEMPLATE.sql` for correct policy patterns
- Rollback using procedure above if critical

## Success Criteria

✅ All tables show `rowsecurity = true` in pg_tables  
✅ Plans table has public read policy  
✅ No permission denied errors in application logs  
✅ Users can still access own data normally  
✅ Public features (pricing, templates) work unchanged  
✅ Admin operations via service role continue working
