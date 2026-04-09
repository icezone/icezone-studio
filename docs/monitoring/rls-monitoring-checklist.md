# RLS Deployment Monitoring Checklist

## Monitoring Period: 24 Hours Post-Deployment

**Deployment Date:** Check git log for migration deployment timestamp  
**Monitoring End:** 24 hours after deployment

---

## ✅ Automated Checks Completed

- [x] Plans table has RLS enabled
- [x] Public read access works for plans
- [x] Write protection works on plans
- [x] User-owned tables require authentication
- [x] Workflow templates (mixed access) works correctly

**Verification Tool:** `node scripts/verify-rls-deployment.js`

---

## 📊 What to Monitor (Next 24 Hours)

### 1. Application Logs

**Check for these error patterns:**

```
❌ "permission denied for table"
❌ "new row violates row-level security"
❌ "policy violation"
```

**Where to check:**
- Application server logs
- Browser console (F12)
- Supabase Dashboard → Logs → Postgres Logs

### 2. User-Facing Features

Test these critical flows:

- [ ] **Pricing page loads** (uses plans table)
- [ ] **User can create projects** (INSERT with user_id)
- [ ] **User can view own projects** (SELECT with RLS filter)
- [ ] **User can edit own projects** (UPDATE with RLS)
- [ ] **User can delete own projects** (DELETE with RLS)
- [ ] **User can upload assets** (project_assets table)
- [ ] **User can view workflow templates** (public + own)
- [ ] **User can create AI jobs** (ai_jobs table)
- [ ] **User can view credit balance** (credit_ledger)
- [ ] **Anonymous users see public templates** (workflow_templates)

### 3. Supabase Dashboard Checks

**Go to: https://supabase.com/dashboard/project/xucmespxytzbyvfzpdoc**

1. **Database → Logs:**
   - Filter: "Postgres Logs"
   - Look for: RLS denials, policy violations
   - Expected: No unexpected denials

2. **Database → Replication:**
   - Check: No unusual spike in queries
   - Expected: Normal query patterns

3. **Auth → Users:**
   - Check: Users can still sign in
   - Expected: Authentication works normally

### 4. Performance Check

**Run after 24 hours:**

```sql
-- Check slow queries
SELECT 
    queryid,
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
WHERE query LIKE '%public.projects%' OR query LIKE '%public.plans%'
ORDER BY mean_time DESC
LIMIT 10;
```

**Expected:** Mean times similar to pre-deployment (RLS adds minimal overhead)

---

## 🚨 Red Flags (Immediate Action Required)

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Users can't access own projects | Policy too restrictive | Review policy, may need to adjust USING clause |
| Anonymous users can't see pricing | Plans policy missing | Re-apply migration 013 |
| Service role operations fail | Unexpected - service role bypasses RLS | Check service role key is correct |
| Massive spike in "permission denied" | Policy misconfiguration | Review all policies, check for typos |
| Users see other users' data | RLS not enabled or policy too permissive | **CRITICAL** - Disable table access immediately, fix policy |

---

## ✅ Success Criteria (After 24 Hours)

- [ ] No unexpected "permission denied" errors in logs
- [ ] All user-facing features work normally
- [ ] No user complaints about access issues
- [ ] No performance degradation
- [ ] No security incidents (users accessing wrong data)

---

## 📝 Post-Monitoring Actions

Once 24-hour monitoring is complete and all checks pass:

1. **Mark task 6.4 complete** in `openspec/changes/enable-rls-security/tasks.md`
2. **Archive the change:**
   ```bash
   /opsx:archive
   ```
3. **Update team:** Notify that RLS deployment is stable
4. **Close monitoring:** Remove this checklist or move to archive

---

## 🆘 Emergency Rollback

If critical issues arise:

```sql
-- EMERGENCY ONLY: Disable RLS on plans table
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING:** This reopens the security vulnerability. Only use in emergency. Fix policies and re-enable ASAP.

**Full rollback procedure:** See `docs/deployment/rls-deployment-guide.md` → Rollback Procedure

---

## 📞 Support Resources

- **RLS Documentation:** `docs/standards/database-security.md`
- **Deployment Guide:** `docs/deployment/rls-deployment-guide.md`
- **Verification Script:** `node scripts/verify-rls-deployment.js`
- **Migration Files:** `supabase/migrations/013_enable_rls_plans.sql`, `014_add_user_id_indexes.sql`
