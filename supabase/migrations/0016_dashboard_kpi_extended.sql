-- Sprint 11-5 T6: Extended operational dashboard KPIs.
-- Includes _period_since + get_dashboard_kpis so this file runs without 0013.
-- (0013 still recommended for funnel / cohort / heatmap RPCs.)

create or replace function public._period_since(p_period text)
returns timestamptz
language sql
immutable
as $$
  select case p_period
    when 'today' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else '1970-01-01'::timestamptz
  end;
$$;

create or replace function public.get_dashboard_kpis(p_period text default 'today')
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (select public._period_since(p_period) as t)
  select json_build_object(
    'dau', (
      select count(distinct device_id)
      from public.analytics_events, since
      where device_id is not null
        and created_at >= date_trunc('day', now())
    ),
    'wau', (
      select count(distinct device_id)
      from public.analytics_events
      where device_id is not null
        and created_at >= date_trunc('week', now())
    ),
    'mau', (
      select count(distinct device_id)
      from public.analytics_events
      where device_id is not null
        and created_at >= date_trunc('month', now())
    ),
    'session_starts', (
      select count(*)
      from public.analytics_events, since
      where event_type = 'session_start'
        and created_at >= since.t
    ),
    'game_starts', (
      select count(*)
      from public.analytics_events, since
      where event_type = 'game_start'
        and created_at >= since.t
    ),
    'ranking_submits', (
      select count(*)
      from public.analytics_events, since
      where event_type = 'ranking_submit'
        and created_at >= since.t
    ),
    'errors', (
      select count(*)
      from public.analytics_events, since
      where event_type = 'error'
        and created_at >= since.t
    ),
    'new_users', (
      select count(*)
      from public.players, since
      where first_seen >= since.t
    ),
    'returning_users', (
      select count(distinct ae.device_id)
      from since
      cross join public.analytics_events ae
      inner join public.players p on p.device_id = ae.device_id
      where ae.created_at >= since.t
        and ae.device_id is not null
        and p.first_seen < since.t
    )
  )
  from since;
$$;

create or replace function public.get_dashboard_kpis_extended(p_period text default 'today')
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (select public._period_since(p_period) as t),
  base as (
    select public.get_dashboard_kpis(p_period) as j
  ),
  saves as (
    select
      count(*) filter (where event_type = 'save_created') as save_count,
      count(*) filter (where event_type = 'save_resumed') as resume_count
    from public.analytics_events, since
    where created_at >= since.t
  ),
  game_ends as (
    select
      count(*) as game_end_count,
      avg(nullif((metadata->>'duration_ms')::numeric, 0)) as avg_duration_ms,
      avg(nullif((metadata->>'score')::numeric, 0)) as avg_score
    from public.analytics_events, since
    where event_type = 'game_end'
      and created_at >= since.t
  )
  select (base.j)::jsonb
    || jsonb_build_object(
      'stickiness', case
        when (base.j->>'mau')::int > 0
        then round(((base.j->>'dau')::numeric / (base.j->>'mau')::numeric) * 100, 1)
        else 0
      end,
      'avg_session_events', case
        when (base.j->>'session_starts')::int > 0
        then round(
          ((select count(*) from public.analytics_events ae, since
            where ae.created_at >= since.t)::numeric
          ) / (base.j->>'session_starts')::numeric,
          1
        )
        else 0
      end,
      'avg_play_time_sec', coalesce(round((select avg_duration_ms from game_ends) / 1000, 0), 0),
      'avg_score', coalesce(round((select avg_score from game_ends), 0), 0),
      'game_completions', (select game_end_count from game_ends),
      'save_count', (select save_count from saves),
      'resume_count', (select resume_count from saves),
      'resume_rate', case
        when (select save_count from saves) > 0
        then round(
          ((select resume_count from saves)::numeric / (select save_count from saves)::numeric) * 100,
          1
        )
        else 0
      end
    )
  from base;
$$;
