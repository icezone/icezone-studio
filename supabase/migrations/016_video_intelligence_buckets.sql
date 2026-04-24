-- 018_video_intelligence_buckets.sql
-- Create storage buckets for video intelligence feature.

-- 1. project-videos bucket (7-day TTL; videos can be discarded once keyframes extracted)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-videos',
  'project-videos',
  false,
  524288000, -- 500 MB
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- 2. project-keyframes bucket (30-day TTL; kept for re-analysis window)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-keyframes',
  'project-keyframes',
  false,
  5242880, -- 5 MB per JPEG
  array['image/jpeg']
)
on conflict (id) do nothing;

-- 3. RLS: users may write/read objects whose path starts with a projectId they own.
-- Object name pattern:  {projectId}/...
create policy "video owners can manage project-videos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'project-videos'
    and name not like '/%'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-videos'
    and name not like '/%'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  );

create policy "keyframe owners can manage project-keyframes"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'project-keyframes'
    and name not like '/%'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-keyframes'
    and name not like '/%'
    and (storage.foldername(name))[1] in (
      select id::text from public.projects where user_id = auth.uid()
    )
  );

-- 4. Lifecycle rules (enforced by a scheduled cleanup function rather than
-- Supabase's native lifecycle, which is not universally available).
create or replace function public.cleanup_stale_video_intelligence_objects()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
   where bucket_id = 'project-videos'
     and created_at < now() - interval '7 days';

  delete from storage.objects
   where bucket_id = 'project-keyframes'
     and created_at < now() - interval '30 days';
end;
$$;

-- Revoke public access and grant only to service_role
revoke all on function public.cleanup_stale_video_intelligence_objects() from public;
grant execute on function public.cleanup_stale_video_intelligence_objects() to service_role;

-- Scheduled via pg_cron in a follow-up migration if pg_cron extension exists.
-- For MVP, this function can be invoked from a Vercel cron hitting an admin route.
