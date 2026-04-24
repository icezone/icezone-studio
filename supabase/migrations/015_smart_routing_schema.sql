-- 015_smart_routing_schema: 为智能 API 路由系统铺设数据基础
--
-- 变更内容:
-- 1) 扩展 user_api_keys 支持自定义 OpenAI-compat 端点
-- 2) 新增 user_key_capabilities(能力探测缓存)
-- 3) 新增 model_call_history(30 天调用历史,评分数据源)
-- 4) 新增 routing_preferences(三层偏好:模型级 / 场景级)
-- 5) pg_cron 定期清理 30+ 天历史

-- ============================================================================
-- 1. 扩展 user_api_keys
-- ============================================================================

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS base_url text,
  ADD COLUMN IF NOT EXISTS protocol text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

COMMENT ON COLUMN public.user_api_keys.base_url IS
  '自定义端点 URL(仅 protocol=openai-compat 时使用);内置 provider 保持 NULL';
COMMENT ON COLUMN public.user_api_keys.protocol IS
  '协议类型:native(内置 provider 专有协议) | openai-compat';
COMMENT ON COLUMN public.user_api_keys.display_name IS
  '用户自定义显示名;为空时前端使用 provider 名';
COMMENT ON COLUMN public.user_api_keys.last_verified_at IS
  '最近一次连通性测试通过的时间戳';

-- ============================================================================
-- 2. user_key_capabilities(能力探测缓存,key 删除时级联)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_key_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.user_api_keys ON DELETE CASCADE,
  logical_model_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('probed', 'catalog')),
  discovered_at timestamptz DEFAULT now(),
  UNIQUE(key_id, logical_model_id)
);

ALTER TABLE public.user_key_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own key capabilities"
  ON public.user_key_capabilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users insert own key capabilities"
  ON public.user_key_capabilities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users update own key capabilities"
  ON public.user_key_capabilities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users delete own key capabilities"
  ON public.user_key_capabilities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_keys k
      WHERE k.id = user_key_capabilities.key_id AND k.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 3. model_call_history(30 天历史;key 删除时 key_id 置 NULL,保留历史)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  key_id uuid REFERENCES public.user_api_keys ON DELETE SET NULL,
  logical_model_id text NOT NULL,
  scenario text NOT NULL CHECK (scenario IN ('text', 'image', 'video', 'analysis', 'edit')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
  latency_ms integer,
  error_code text,
  cost_estimate_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_user_model_time
  ON public.model_call_history(user_id, logical_model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_user_key_time
  ON public.model_call_history(user_id, key_id, created_at DESC);

ALTER TABLE public.model_call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call history"
  ON public.model_call_history FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 4. routing_preferences(三层:模型级 / 场景级)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.routing_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users,
  level text NOT NULL CHECK (level IN ('model', 'scenario')),
  target text NOT NULL,
  preferred_key_id uuid REFERENCES public.user_api_keys ON DELETE SET NULL,
  fallback_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, level, target)
);

ALTER TABLE public.routing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routing prefs"
  ON public.routing_preferences FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 5. pg_cron 定期清理(30 天保留)
-- ============================================================================
-- 前置:Supabase 已开启 pg_cron extension。
-- 每天凌晨 3 点(UTC)清理超过 30 天的历史。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-model-call-history',
      '0 3 * * *',
      $cron$ DELETE FROM public.model_call_history WHERE created_at < now() - interval '30 days' $cron$
    );
  ELSE
    RAISE WARNING 'pg_cron extension not installed; model_call_history 30-day retention will NOT be enforced';
  END IF;
END $$;
