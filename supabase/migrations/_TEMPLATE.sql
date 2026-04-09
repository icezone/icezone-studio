-- NNN_description: Brief description of what this migration does
--
-- [Context about why this change is needed]

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Example: User-owned table (has user_id column)
CREATE TABLE public.example_user_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (REQUIRED for all tables in public schema)
ALTER TABLE public.example_user_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can manage own data"
  ON public.example_user_table FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Alternative: Separate policies per operation
-- CREATE POLICY "Users can read own data"
--   ON public.example_user_table FOR SELECT
--   USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can insert own data"
--   ON public.example_user_table FOR INSERT
--   WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update own data"
--   ON public.example_user_table FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can delete own data"
--   ON public.example_user_table FOR DELETE
--   USING (auth.uid() = user_id);

-- ============================================================================
-- PUBLIC READ TABLE (no user_id, anyone can read)
-- ============================================================================

-- Example: Public reference data (pricing, categories, etc.)
CREATE TABLE public.example_public_table (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.example_public_table ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read (even anonymous users)
CREATE POLICY "Public read access"
  ON public.example_public_table FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE/DELETE restricted to service role (bypasses RLS)
-- No additional write policies needed

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- ALWAYS add index on user_id for user-owned tables
CREATE INDEX IF NOT EXISTS idx_example_user_table_user_id
  ON public.example_user_table(user_id);

-- Add other indexes as needed for query performance
CREATE INDEX IF NOT EXISTS idx_example_user_table_created_at
  ON public.example_user_table(created_at DESC);

-- ============================================================================
-- TRIGGERS (if needed)
-- ============================================================================

-- Example: Auto-update updated_at timestamp
CREATE TRIGGER set_example_user_table_updated_at
  BEFORE UPDATE ON public.example_user_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
-- (assumes update_updated_at() function exists from previous migrations)

-- ============================================================================
-- REALTIME (if needed)
-- ============================================================================

-- Enable realtime for this table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.example_user_table;

-- ============================================================================
-- RLS POLICY PATTERNS REFERENCE
-- ============================================================================
--
-- Pattern 1: Owner-only access (user_id = auth.uid())
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id)
--
-- Pattern 2: Public read, owner write
--   FOR SELECT: USING (true)
--   FOR INSERT/UPDATE/DELETE: USING (auth.uid() = user_id)
--
-- Pattern 3: Shared access via junction table
--   USING (
--     auth.uid() = user_id OR
--     EXISTS (
--       SELECT 1 FROM public.shares
--       WHERE shares.resource_id = id AND shares.shared_with = auth.uid()
--     )
--   )
--
-- Pattern 4: Authenticated users only (no specific user ownership)
--   USING (auth.uid() IS NOT NULL)
--
-- Pattern 5: Public read, authenticated write
--   FOR SELECT: USING (true)
--   FOR INSERT/UPDATE/DELETE: USING (auth.uid() IS NOT NULL)
--
-- Service role: Automatically bypasses all RLS policies (has bypassrls privilege)
--               Use for admin operations, background jobs, server-side logic
--
-- ============================================================================
