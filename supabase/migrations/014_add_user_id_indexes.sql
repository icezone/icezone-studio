-- 014_add_user_id_indexes: Performance indexes for RLS policy evaluation
--
-- Add indexes on user_id columns to optimize RLS policy checks.
-- These indexes improve query performance when filtering by auth.uid() in policies.

-- Projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

-- Project assets table
CREATE INDEX IF NOT EXISTS idx_project_assets_user_id
  ON public.project_assets(user_id);

-- AI jobs table
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id
  ON public.ai_jobs(user_id);

-- Credit ledger table
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id
  ON public.credit_ledger(user_id);

-- Payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON public.payments(user_id);

-- Note: user_api_keys and workflow_templates already have user_id indexes
-- from previous migrations (011 and 011b respectively)
