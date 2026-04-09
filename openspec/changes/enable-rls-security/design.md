## Context

Currently, all tables in the Supabase public schema have Row-Level Security (RLS) disabled, which means:
- Any client with the project URL can access the database directly
- No authentication or authorization checks are enforced at the database level
- The anon key provides unrestricted access to all data

This violates fundamental security principles and creates critical vulnerabilities. Supabase's security model relies on RLS policies to enforce access control at the database layer, independent of application logic.

**Current Architecture:**
- Next.js frontend using Supabase client
- Supabase PostgreSQL database with public schema
- Authentication via Supabase Auth (user sessions)
- Service role key used for admin/backend operations

## Goals / Non-Goals

**Goals:**
- Enable RLS on all tables in public schema
- Implement policies for authenticated user access (own data)
- Implement policies for service role bypass (admin operations)
- Add validation to prevent future tables without RLS
- Document RLS patterns for developers

**Non-Goals:**
- Changing application authentication flow (Supabase Auth remains unchanged)
- Implementing fine-grained RBAC or role-based policies (out of scope for this fix)
- Retroactive audit of data access (focus is forward security)
- Performance optimization beyond basic indexing on user_id columns

## Decisions

### Decision 1: Enable RLS on all tables immediately

**Choice:** Enable RLS on all existing tables via migration, even if some policies are permissive initially.

**Rationale:** Security-first approach. Better to have RLS enabled with broad policies that can be tightened than to leave tables completely open. We can iterate on policy refinement after the critical vulnerability is closed.

**Alternatives considered:**
- Gradual rollout per table: Rejected due to extended vulnerability window
- Wait for perfect policies: Rejected as security cannot wait for perfection

### Decision 2: Use user_id based policies for authenticated access

**Choice:** Implement policies that check `auth.uid() = user_id` for user-owned data.

**Rationale:** Standard Supabase pattern. Tables with user ownership should have a `user_id` column (UUID referencing auth.users). This leverages Supabase's built-in auth context (`auth.uid()`) which is automatically set for authenticated requests.

**Alternatives considered:**
- Session-based checks: Rejected as less performant and harder to audit
- Application-layer only checks: Rejected as it doesn't protect against direct database access

### Decision 3: Service role bypasses RLS via connection context

**Choice:** Service role connections automatically bypass RLS (PostgreSQL default for bypassrls role attribute). No explicit policies needed.

**Rationale:** Supabase service role already has bypassrls privilege. Backend operations that need cross-user access (analytics, admin features) should use service role client.

**Alternatives considered:**
- Create explicit "admin" policies: Rejected as redundant and harder to maintain

### Decision 4: Implement migration validation hook

**Choice:** Add a pre-migration check script that validates:
- New tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- At least one policy is defined per table
- user_id columns exist for user-owned tables

**Rationale:** Prevents regression. Developers must consciously declare RLS policies when creating tables. Validation runs before migration applies.

**Alternatives considered:**
- Post-migration audit: Rejected as it allows vulnerability window
- Manual code review only: Rejected as error-prone

### Decision 5: Public read tables use explicit USING (true) policy

**Choice:** Tables that should be publicly readable (e.g., public templates) get a policy like:
```sql
CREATE POLICY "public_read" ON public.templates
FOR SELECT USING (true);
```

**Rationale:** Makes public access explicit and auditable. Clearer than leaving RLS disabled.

**Alternatives considered:**
- Keep RLS disabled on public tables: Rejected as inconsistent and risky
- Require authentication for everything: Rejected as breaks legitimate public features

## Risks / Trade-offs

**Risk:** Existing API calls fail if policies are too restrictive  
→ **Mitigation:** Test all critical user flows in staging with RLS enabled before production deployment. Start with permissive policies and tighten incrementally.

**Risk:** Service role key exposure in codebase  
→ **Mitigation:** Service role key must remain in environment variables only, never committed. Add pre-commit hook to scan for exposed keys.

**Risk:** Performance impact on queries with complex policies  
→ **Mitigation:** Add indexes on user_id columns. Monitor query performance in production. RLS evaluation is efficient for simple equality checks.

**Risk:** Developer confusion about when to use service role vs user client  
→ **Mitigation:** Document clear rules: Use service role only for admin/backend operations. Use user client (with RLS) for all user-facing operations.

**Trade-off:** More verbose migrations (every table needs RLS statements)  
→ **Acceptable:** Security overhead is worth the verbosity. Can create migration templates to reduce boilerplate.

## Migration Plan

### Phase 1: Enable RLS (immediate)
1. Generate migration to enable RLS on all existing tables
2. Create basic policies for each table (permissive where needed)
3. Test in local environment
4. Deploy to staging and run integration tests
5. Deploy to production during low-traffic window

### Phase 2: Add validation (same release)
1. Create migration validation script
2. Add to CI/CD pipeline
3. Document for developers

### Phase 3: Policy refinement (follow-up)
1. Audit each table's policies for least privilege
2. Tighten policies incrementally
3. Monitor for access errors

### Rollback Strategy
If RLS breaks critical functionality in production:
1. Disable RLS on affected tables: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`
2. Investigate and fix policies in staging
3. Re-enable with corrected policies

**Note:** Rollback is straightforward but should be avoided. Thorough staging testing is critical.

## Open Questions

**Q1:** Do any tables need shared access between users (collaboration features)?  
→ **Resolution needed:** Audit codebase for collaboration patterns. May need junction table policies.

**Q2:** Are there any tables that legitimately need no RLS (system tables)?  
→ **Resolution needed:** Review all tables. System metadata tables may stay in separate schema.

**Q3:** Should we implement row-level audit logging for policy violations?  
→ **Defer:** Not critical for initial fix. Can add in follow-up if needed for security monitoring.
