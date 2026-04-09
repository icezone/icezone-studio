# Database Security - Row-Level Security (RLS)

## Overview

All tables in the Supabase public schema **MUST** have Row-Level Security (RLS) enabled. RLS enforces access control at the database layer, providing defense-in-depth security independent of application logic.

## Core Principles

1. **Enable RLS on all tables** in the public schema
2. **Define explicit policies** for every access pattern
3. **Use service role for admin operations** (bypasses RLS)
4. **Index user_id columns** for RLS policy performance
5. **Test policies** before deploying to production

## RLS Policy Patterns

### Pattern 1: Owner-Only Access

**Use case:** User can only access their own data (projects, drafts, API keys)

```sql
CREATE TABLE public.user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Single policy for all operations
CREATE POLICY "Users can manage own projects"
  ON public.user_projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance index (REQUIRED)
CREATE INDEX idx_user_projects_user_id ON public.user_projects(user_id);
```

**Key points:**
- `USING` clause controls SELECT/UPDATE/DELETE
- `WITH CHECK` clause controls INSERT/UPDATE
- Always index `user_id` column
- Use `FOR ALL` for uniform access, or separate `FOR SELECT`, `FOR INSERT`, etc. for granular control

### Pattern 2: Public Read, Owner Write

**Use case:** Anyone can view public data, only owner can modify (public projects, shared templates)

```sql
CREATE TABLE public.shared_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read public templates
CREATE POLICY "Public read access"
  ON public.shared_templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Only owner can modify
CREATE POLICY "Owner can manage templates"
  ON public.shared_templates FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_shared_templates_user_id ON public.shared_templates(user_id);
CREATE INDEX idx_shared_templates_public ON public.shared_templates(is_public) WHERE is_public = true;
```

### Pattern 3: Fully Public (Read-Only for Users)

**Use case:** Reference data that anyone can read, only service role can write (pricing plans, categories)

```sql
CREATE TABLE public.pricing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read, including anonymous users
CREATE POLICY "Public read pricing"
  ON public.pricing_plans FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies
-- Service role (bypasses RLS) handles all writes
```

**Important:** `USING (true)` allows **all** users, including unauthenticated. Use when data is truly public.

### Pattern 4: Authenticated Users Only

**Use case:** Data accessible to any authenticated user, not tied to specific ownership

```sql
CREATE TABLE public.shared_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can access
CREATE POLICY "Authenticated users can access"
  ON public.shared_resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Optional: authenticated users can contribute
CREATE POLICY "Authenticated users can create"
  ON public.shared_resources FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Pattern 5: Relational Access (via Foreign Key)

**Use case:** Access derived from parent relationship (project_drafts via projects)

```sql
CREATE TABLE public.project_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_drafts ENABLE ROW LEVEL SECURITY;

-- Access granted if user owns parent project
CREATE POLICY "Access via project ownership"
  ON public.project_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX idx_project_drafts_project_id ON public.project_drafts(project_id);
```

### Pattern 6: Shared Access (Junction Table)

**Use case:** Resources shared with multiple users (collaborators, team members)

```sql
-- Main resource table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sharing junction table
CREATE TABLE public.document_shares (
  document_id uuid REFERENCES public.documents ON DELETE CASCADE,
  shared_with uuid REFERENCES auth.users,
  permission text DEFAULT 'read', -- 'read' | 'write' | 'admin'
  PRIMARY KEY (document_id, shared_with)
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Access if owner or shared with user
CREATE POLICY "Owner and shared users can access"
  ON public.documents FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.document_shares
      WHERE document_shares.document_id = id
        AND document_shares.shared_with = auth.uid()
    )
  );

-- Shares table: only owner can manage shares
CREATE POLICY "Owner manages shares"
  ON public.document_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_id
        AND documents.owner_id = auth.uid()
    )
  );
```

## Service Role vs User Client

### User Client (Supabase Client with User Session)

**Use for:**
- All user-facing operations
- Reading user's own data
- Writing data owned by current user
- Enforces RLS automatically

**Example:**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// User client - RLS enforced
const supabase = createClientComponentClient();

// Only returns current user's projects (RLS policy filters)
const { data } = await supabase
  .from('projects')
  .select('*');
```

### Service Role (Admin Client)

**Use for:**
- Server-side operations (API routes, cron jobs)
- Admin operations (cross-user queries, analytics)
- Background processing
- Data migrations
- **Bypasses all RLS policies** (has `bypassrls` privilege)

**Example:**
```typescript
import { createClient } from '@supabase/supabase-js';

// Service role - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Secret! Never expose to client
  { auth: { persistSession: false } }
);

// Returns ALL projects across all users
const { data } = await supabaseAdmin
  .from('projects')
  .select('*');
```

**⚠️ Security Warning:**
- **NEVER expose service role key to client**
- Store in environment variables only
- Use only in server-side code (API routes, server components)
- Add pre-commit hook to scan for exposed keys

## Testing RLS Policies

### Manual Testing

```sql
-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM public.projects; -- Should only see own projects

-- Test as anonymous
RESET request.jwt.claim.sub;
SELECT * FROM public.projects; -- Should see only public projects or nothing

-- Test write operations
SET request.jwt.claim.sub = 'user-uuid-here';
INSERT INTO public.projects (user_id, name) VALUES ('different-uuid', 'Test');
-- Should fail if policy enforces auth.uid() = user_id
```

### Automated Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  it('users can only see own projects', async () => {
    const user1Client = createClient(url, anonKey, {
      auth: { session: user1Session }
    });

    const { data } = await user1Client
      .from('projects')
      .select('*');

    // All returned projects should belong to user1
    expect(data?.every(p => p.user_id === user1.id)).toBe(true);
  });

  it('users cannot modify other users projects', async () => {
    const user1Client = createClient(url, anonKey, {
      auth: { session: user1Session }
    });

    const { error } = await user1Client
      .from('projects')
      .update({ name: 'Hacked' })
      .eq('id', user2ProjectId);

    expect(error).toBeTruthy(); // Should be denied by RLS
  });
});
```

## Migration Checklist

When creating a new table:

- [ ] Enable RLS: `ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;`
- [ ] Define at least one policy (or explicitly use `USING (true)` for public access)
- [ ] Add index on `user_id` if user-owned: `CREATE INDEX idx_my_table_user_id ON public.my_table(user_id);`
- [ ] Test policy with user client
- [ ] Test policy denies unauthorized access
- [ ] Run validation script: `node scripts/validate-rls-migration.js migrations/NNN_my_table.sql`

## Performance Considerations

1. **Always index user_id columns**
   ```sql
   CREATE INDEX idx_table_user_id ON public.table(user_id);
   ```

2. **Index boolean flags used in policies**
   ```sql
   CREATE INDEX idx_table_public ON public.table(is_public) WHERE is_public = true;
   ```

3. **Avoid complex subqueries in policies when possible**
   - Use foreign key relationships
   - Denormalize if necessary for performance

4. **Monitor slow queries**
   - RLS policies add WHERE clauses to every query
   - Use `EXPLAIN ANALYZE` to check query plans

## Common Pitfalls

❌ **Forgetting to enable RLS**
```sql
CREATE TABLE public.sensitive_data (...);
-- MISSING: ALTER TABLE public.sensitive_data ENABLE ROW LEVEL SECURITY;
-- Result: Table is wide open!
```

❌ **No policies defined**
```sql
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
-- MISSING: CREATE POLICY ...
-- Result: Nobody can access the table (blocks everything)
```

❌ **Using user client for admin operations**
```typescript
// ❌ Wrong: User client can't see other users' data
const supabase = createClientComponentClient();
const { data } = await supabase.from('users').select('*'); // Only returns current user
```

❌ **Exposing service role key**
```typescript
// ❌ NEVER DO THIS
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
// If this runs on client, key is exposed!
```

## See Also

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Testing Guide](./testing.md)
- [Development Workflow](./development-workflow.md)
- Migration template: `supabase/migrations/_TEMPLATE.sql`
