-- Sprint 11-5 T6: Extended operational dashboard KPIs.

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
