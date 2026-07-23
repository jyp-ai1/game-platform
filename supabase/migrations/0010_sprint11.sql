-- Sprint 11: Operations & SEO — analytics event collection foundation.
-- Inserts only via track_analytics_event() (security definer); no direct anon INSERT.
-- Admin reads use SUPABASE_SECRET_KEY (service role) from Next.js server routes.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'session_start', 'game_over', 'score_submit',
    'save_created', 'resume', 'error', 'share'
  )),
  game_slug text references public.games(slug) on delete set null,
  device_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_game_slug_idx
  on public.analytics_events (game_slug, created_at desc)
  where game_slug is not null;

alter table public.analytics_events enable row level security;

-- No SELECT/INSERT policies for anon — all writes go through the RPC below.

create or replace function public.track_analytics_event(
  p_event_type text,
  p_game_slug text default null,
  p_device_id text default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (event_type, game_slug, device_id, metadata)
  values (p_event_type, p_game_slug, p_device_id, coalesce(p_metadata, '{}'));
end;
$$;

grant execute on function public.track_analytics_event(text, text, text, jsonb)
  to authenticated, anon;

-- Daily aggregates for admin dashboard (callable only with service role).
create or replace function public.get_analytics_daily_stats(p_days integer default 30)
returns table (
  day date,
  dau bigint,
  session_starts bigint,
  score_submits bigint,
  save_created bigint,
  errors bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (created_at at time zone 'utc')::date as day,
    count(distinct device_id) filter (where device_id is not null) as dau,
    count(*) filter (where event_type = 'session_start') as session_starts,
    count(*) filter (where event_type = 'score_submit') as score_submits,
    count(*) filter (where event_type = 'save_created') as save_created,
    count(*) filter (where event_type = 'error') as errors
  from public.analytics_events
  where created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1 desc;
$$;

-- Today snapshot for admin "Today" cards.
create or replace function public.get_analytics_today_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'dau', (
      select count(distinct device_id)
      from public.analytics_events
      where created_at >= date_trunc('day', now())
        and device_id is not null
    ),
    'session_starts', (
      select count(*)
      from public.analytics_events
      where event_type = 'session_start'
        and created_at >= date_trunc('day', now())
    ),
    'score_submits', (
      select count(*)
      from public.analytics_events
      where event_type = 'score_submit'
        and created_at >= date_trunc('day', now())
    ),
    'save_created', (
      select count(*)
      from public.analytics_events
      where event_type = 'save_created'
        and created_at >= date_trunc('day', now())
    ),
    'errors', (
      select count(*)
      from public.analytics_events
      where event_type = 'error'
        and created_at >= date_trunc('day', now())
    ),
    'recent_plays', (
      select coalesce(json_agg(row_to_json(r)), '[]'::json)
      from (
        select
          game_slug,
          device_id,
          extract(epoch from (now() - created_at))::integer as seconds_ago
        from public.analytics_events
        where event_type = 'session_start'
          and game_slug is not null
        order by created_at desc
        limit 10
      ) r
    )
  );
$$;
