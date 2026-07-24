# 0017 — CMS Audit log enhancement (IP, User-Agent, before/after)

alter table public.cms_audit_log
  add column if not exists actor_ip text,
  add column if not exists user_agent text,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb;

create index if not exists cms_audit_log_entity_idx
  on public.cms_audit_log (entity_type, entity_id);

-- Optional: system health snapshot table for /admin/system monitoring
create table if not exists public.system_health_checks (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  status text not null check (status in ('ok', 'degraded', 'down')),
  detail text,
  checked_at timestamptz not null default now()
);

alter table public.system_health_checks enable row level security;

create or replace function public.get_system_health_summary()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'supabase', 'ok',
    'analytics_events', (select case when count(*) >= 0 then 'ok' else 'down' end from public.analytics_events limit 1),
    'cms_tables', (select case when to_regclass('public.cms_banners') is not null then 'ok' else 'down' end),
    'seo_settings', (select case when to_regclass('public.seo_settings') is not null then 'ok' else 'down' end),
    'last_deploy_note', coalesce(
      (select detail from public.system_health_checks where service = 'vercel' order by checked_at desc limit 1),
      'manual'
    )
  );
$$;
