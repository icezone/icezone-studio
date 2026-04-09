-- 013_enable_rls_plans: Enable Row-Level Security on plans table
--
-- Security Fix: The plans table was missing RLS, exposing pricing data
-- to unauthorized modifications. This migration:
-- 1. Enables RLS on public.plans
-- 2. Adds public read policy (anyone can view pricing)
-- 3. Write operations restricted to service role only

-- Enable RLS on plans table
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pricing plans (public information)
CREATE POLICY "Anyone can read pricing plans"
  ON public.plans FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE/DELETE operations on plans table
-- should only be performed via service role (bypasses RLS).
-- No additional policies needed for write operations.
