-- Sprint 12 — Operations Platform 2.0
-- Player CRM, Feature Flags, Real-time Ops RPCs, extended monitoring event types.
-- Run after 0017. Safe to re-run where noted.

-- ---------------------------------------------------------------------------
-- 1. Player CRM columns
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended')),
  add column if not exists admin_memo text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

create index if not exists players_status_last_seen_idx
  on public.players (status, last_seen desc);

-- ---------------------------------------------------------------------------
-- 2. Feature flags (runtime toggles, no deploy)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  label text not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

create policy "Public can read feature flags"
  on public.feature_flags for select
  using (true);

insert into public.feature_flags (key, enabled, label, description) values
  ('weekly_mission', true, 'Weekly Mission', '주간 미션 시스템'),
  ('ranking', true, 'Ranking', '랭킹 제출 및 리더보드'),
  ('save', true, 'Save / Resume', '게임 저장 및 이어하기'),
  ('cms', true, 'CMS', '홈 CMS 배너·공지·이벤트'),
  ('beta_games', false, 'Beta Games', '베타 게임 노출')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Extended monitoring event types
-- ---------------------------------------------------------------------------
alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'session_start',
    'game_start',
    'game_end',
    'game_pause',
    'game_resume',
    'game_over',
    'score_submit',
    'ranking_submit',
    'achievement_unlock',
    'mission_complete',
    'weekly_mission_complete',
    'daily_reward',
    'daily_reward_claim',
    'save_created',
    'resume',
    'favorite',
    'profile_open',
    'error',
    'js_error',
    'api_error',
    'page_404',
    'perf_metric',
    'share',
    'invite',
    'purchase',
    'ad_view'
  ));

-- Keep players.last_seen fresh on tracked events.
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

  if p_device_id is not null then
    insert into public.players (device_id, first_seen, last_seen)
    values (p_device_id, now(), now())
    on conflict (device_id) do update set
      last_seen = now(),
      updated_at = now();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Real-time ops snapshot
-- ---------------------------------------------------------------------------
create or replace function public.get_ops_realtime_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      now() - interval '5 minutes' as online_since,
      now() - interval '1 hour' as hour_since,
      date_trunc('day', now()) as today_start
  )
  select json_build_object(
    'online_users', (
      select count(distinct device_id)
      from public.analytics_events, bounds
      where device_id is not null
        and created_at >= bounds.online_since
    ),
    'playing_now', (
      select count(distinct device_id)
      from public.analytics_events, bounds
      where event_type in ('session_start', 'game_start')
        and game_slug is not null
        and created_at >= bounds.online_since
    ),
    'today_plays', (
      select count(*)
      from public.analytics_events, bounds
      where event_type = 'session_start'
        and created_at >= bounds.today_start
    ),
    'today_scores', (
      select count(*)
      from public.analytics_events, bounds
      where event_type in ('score_submit', 'ranking_submit')
        and created_at >= bounds.today_start
    ),
    'errors_1h', (
      select count(*)
      from public.analytics_events, bounds
      where event_type in ('error', 'js_error', 'api_error', 'page_404')
        and created_at >= bounds.hour_since
    ),
    'errors_today', (
      select count(*)
      from public.analytics_events, bounds
      where event_type in ('error', 'js_error', 'api_error', 'page_404')
        and created_at >= bounds.today_start
    ),
    'active_games', (
      select coalesce(json_agg(row_to_json(g)), '[]'::json)
      from (
        select game_slug, count(*) as plays
        from public.analytics_events, bounds
        where event_type = 'session_start'
          and game_slug is not null
          and created_at >= bounds.online_since
        group by game_slug
        order by plays desc
        limit 8
      ) g
    ),
    'recent_errors', (
      select coalesce(json_agg(row_to_json(e)), '[]'::json)
      from (
        select
          event_type,
          game_slug,
          metadata,
          extract(epoch from (now() - created_at))::integer as seconds_ago
        from public.analytics_events
        where event_type in ('error', 'js_error', 'api_error', 'page_404')
        order by created_at desc
        limit 10
      ) e
    ),
    'checked_at', now()
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Error center summary
-- ---------------------------------------------------------------------------
create or replace function public.get_ops_error_summary(p_hours integer default 24)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (
    select now() - (p_hours || ' hours')::interval as t
  ),
  base as (
    select ae.*
    from public.analytics_events ae, since
    where ae.event_type in ('error', 'js_error', 'api_error', 'page_404')
      and ae.created_at >= since.t
  )
  select json_build_object(
    'total', (select count(*) from base),
    'by_type', (
      select coalesce(json_object_agg(event_type, cnt), '{}'::json)
      from (
        select event_type, count(*)::bigint as cnt
        from base
        group by event_type
      ) t
    ),
    'by_game', (
      select coalesce(json_agg(row_to_json(g)), '[]'::json)
      from (
        select coalesce(game_slug, '(site)') as game_slug, count(*)::bigint as cnt
        from base
        group by 1
        order by cnt desc
        limit 15
      ) g
    ),
    'recent', (
      select coalesce(json_agg(row_to_json(r)), '[]'::json)
      from (
        select
          id,
          event_type,
          game_slug,
          device_id,
          metadata,
          created_at
        from base
        order by created_at desc
        limit 50
      ) r
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Player CRM search & detail
-- ---------------------------------------------------------------------------
create or replace function public.search_players_crm(
  p_query text default '',
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select
      p.device_id,
      p.nickname,
      p.status,
      p.first_seen,
      p.last_seen,
      p.total_plays,
      p.admin_memo,
      p.suspended_at
    from public.players p
    where (
      p_query = ''
      or p.device_id ilike '%' || p_query || '%'
      or coalesce(p.nickname, '') ilike '%' || p_query || '%'
    )
    and (p_status is null or p.status = p_status)
    order by p.last_seen desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  )
  select json_build_object(
    'rows', coalesce(json_agg(row_to_json(filtered)), '[]'::json),
    'total', (
      select count(*)
      from public.players p
      where (
        p_query = ''
        or p.device_id ilike '%' || p_query || '%'
        or coalesce(p.nickname, '') ilike '%' || p_query || '%'
      )
      and (p_status is null or p.status = p_status)
    )
  )
  from filtered;
$$;

create or replace function public.get_player_crm_detail(p_device_id text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'player', (
      select row_to_json(p)
      from public.players p
      where p.device_id = p_device_id
    ),
    'scores', (
      select coalesce(json_agg(row_to_json(s) order by s.score desc), '[]'::json)
      from (
        select game_slug, nickname, score, updated_at
        from public.scores
        where device_id = p_device_id
        order by score desc
        limit 20
      ) s
    ),
    'recent_sessions', (
      select coalesce(json_agg(row_to_json(gs)), '[]'::json)
      from (
        select game_slug, started_at, ended_at, score, completed
        from public.game_sessions
        where device_id = p_device_id
        order by started_at desc
        limit 25
      ) gs
    ),
    'activity', (
      select coalesce(json_agg(row_to_json(a)), '[]'::json)
      from (
        select event_type, game_slug, metadata, created_at
        from public.analytics_events
        where device_id = p_device_id
        order by created_at desc
        limit 40
      ) a
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. Monthly ops report (Report Center)
-- ---------------------------------------------------------------------------
create or replace function public.get_monthly_ops_report(p_month date default date_trunc('month', now())::date)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      p_month::timestamptz as start_at,
      (p_month + interval '1 month')::timestamptz as end_at
  )
  select json_build_object(
    'month', p_month,
    'dau_avg', (
      select coalesce(round(avg(dau)), 0)
      from (
        select (created_at at time zone 'utc')::date as day,
               count(distinct device_id) as dau
        from public.analytics_events, bounds
        where created_at >= bounds.start_at
          and created_at < bounds.end_at
          and device_id is not null
        group by 1
      ) d
    ),
    'total_plays', (
      select count(*)
      from public.analytics_events, bounds
      where event_type = 'session_start'
        and created_at >= bounds.start_at
        and created_at < bounds.end_at
    ),
    'total_scores', (
      select count(*)
      from public.analytics_events, bounds
      where event_type in ('score_submit', 'ranking_submit')
        and created_at >= bounds.start_at
        and created_at < bounds.end_at
    ),
    'new_players', (
      select count(*)
      from public.players, bounds
      where first_seen >= bounds.start_at
        and first_seen < bounds.end_at
    ),
    'top_games', (
      select coalesce(json_agg(row_to_json(g)), '[]'::json)
      from (
        select game_slug, count(*) as plays
        from public.analytics_events, bounds
        where event_type = 'session_start'
          and game_slug is not null
          and created_at >= bounds.start_at
          and created_at < bounds.end_at
        group by game_slug
        order by plays desc
        limit 10
      ) g
    ),
    'errors', (
      select count(*)
      from public.analytics_events, bounds
      where event_type in ('error', 'js_error', 'api_error', 'page_404')
        and created_at >= bounds.start_at
        and created_at < bounds.end_at
    )
  );
$$;

-- Public read of enabled flags for client runtime checks.
create or replace function public.get_public_feature_flags()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    json_object_agg(key, enabled),
    '{}'::json
  )
  from public.feature_flags;
$$;

grant execute on function public.get_ops_realtime_stats() to authenticated, anon;
grant execute on function public.get_ops_error_summary(integer) to authenticated, anon;
grant execute on function public.search_players_crm(text, text, integer, integer) to authenticated, anon;
grant execute on function public.get_player_crm_detail(text) to authenticated, anon;
grant execute on function public.get_monthly_ops_report(date) to authenticated, anon;
grant execute on function public.get_public_feature_flags() to authenticated, anon;
