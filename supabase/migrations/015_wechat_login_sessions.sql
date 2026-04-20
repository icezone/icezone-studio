-- Create wechat_login_sessions table
create table if not exists public.wechat_login_sessions (
  id uuid primary key,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired', 'failed')),
  user_id uuid references auth.users(id) on delete set null,
  access_token text,
  refresh_token text,
  error_message text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- Enable RLS
alter table public.wechat_login_sessions enable row level security;

-- Anyone can insert a pending session (anonymous web users create these)
create policy "Anyone can create pending session"
  on public.wechat_login_sessions for insert
  with check (status = 'pending');

-- Anyone can read session by id (for Realtime subscription)
create policy "Anyone can read session by id"
  on public.wechat_login_sessions for select
  using (true);

-- No client-side update allowed (Edge Function uses service_role)

-- Enable Realtime for this table
alter publication supabase_realtime add table public.wechat_login_sessions;

-- Index for cleanup query
create index idx_wechat_login_sessions_created_at on public.wechat_login_sessions(created_at);

-- Hourly cleanup via pg_cron (delete sessions older than 1 hour)
-- Note: pg_cron must be enabled in Supabase dashboard first
select cron.schedule(
  'cleanup-wechat-login-sessions',
  '0 * * * *',
  $$delete from public.wechat_login_sessions where created_at < now() - interval '1 hour'$$
);
