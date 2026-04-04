-- 011_api_keys_multi: Support multiple API keys per provider with rotation
-- Adds key_index for sequencing, status for rotation state, error tracking fields

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS key_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;

-- Remove old unique constraint (one key per provider) to allow multiple keys
DROP INDEX IF EXISTS user_api_keys_user_id_provider_key;
ALTER TABLE public.user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_provider_key;

-- Create new unique constraint: user + provider + key_index
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_keys_multi
  ON public.user_api_keys(user_id, provider, key_index);

-- Add check constraint for valid status values
ALTER TABLE public.user_api_keys
  ADD CONSTRAINT chk_api_key_status
  CHECK (status IN ('active', 'exhausted', 'invalid', 'rate_limited'));
