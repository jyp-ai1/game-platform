-- Sprint 11 T3: Executive Dashboard RPCs (service role only).

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

-- DAU / WAU / MAU + period KPIs + new vs returning users.
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
      from public.analytics_events ae, since
      join public.players p on p.device_id = ae.device_id
      where ae.created_at >= since.t
        and ae.device_id is not null
        and p.first_seen < since.t
    )
  )
  from since;
$$;

-- Player funnel: unique devices per step in period.
create or replace function public.get_player_funnel(p_period text default 'today')
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (select public._period_since(p_period) as t)
  select json_build_object(
    'session', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'session_start'
        and device_id is not null
        and created_at >= since.t
    ),
    'game_start', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'game_start'
        and device_id is not null
        and created_at >= since.t
    ),
    'game_end', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'game_end'
        and device_id is not null
        and created_at >= since.t
    ),
    'score_submit', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'score_submit'
        and device_id is not null
        and created_at >= since.t
    ),
    'ranking_submit', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'ranking_submit'
        and device_id is not null
        and created_at >= since.t
    ),
    'favorite', (
      select count(distinct device_id)
      from public.analytics_events, since
      where event_type = 'favorite'
        and device_id is not null
        and created_at >= since.t
    )
  )
  from since;
$$;

-- Cohort retention: last 14 cohort days, D1/D7/D30 rates (%).
create or replace function public.get_cohort_retention(p_days integer default 14)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(c) order by c.cohort_date desc), '[]'::json)
  from (
    select
      p.cohort_date,
      p.cohort_size,
      case when p.cohort_size = 0 then 0
        else round(100.0 * p.d1 / p.cohort_size)::integer end as d1_pct,
      case when p.cohort_size = 0 then 0
        else round(100.0 * p.d7 / p.cohort_size)::integer end as d7_pct,
      case when p.cohort_size = 0 then 0
        else round(100.0 * p.d30 / p.cohort_size)::integer end as d30_pct
    from (
      select
        (pl.first_seen at time zone 'utc')::date as cohort_date,
        count(*)::integer as cohort_size,
        count(*) filter (
          where exists (
            select 1 from public.analytics_events ae
            where ae.device_id = pl.device_id
              and (ae.created_at at time zone 'utc')::date
                = (pl.first_seen at time zone 'utc')::date + 1
          )
        )::integer as d1,
        count(*) filter (
          where exists (
            select 1 from public.analytics_events ae
            where ae.device_id = pl.device_id
              and (ae.created_at at time zone 'utc')::date
                = (pl.first_seen at time zone 'utc')::date + 7
          )
        )::integer as d7,
        count(*) filter (
          where exists (
            select 1 from public.analytics_events ae
            where ae.device_id = pl.device_id
              and (ae.created_at at time zone 'utc')::date
                = (pl.first_seen at time zone 'utc')::date + 30
          )
        )::integer as d30
      from public.players pl
      where pl.first_seen >= now() - (p_days || ' days')::interval
      group by 1
    ) p
  ) c;
$$;

-- Activity heatmap: session_start counts by day-of-week (0=Sun) and hour, last 30 days.
create or replace function public.get_activity_heatmap(p_days integer default 30)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(h)), '[]'::json)
  from (
    select
      extract(dow from created_at)::integer as dow,
      extract(hour from created_at)::integer as hour,
      count(*)::integer as count
    from public.analytics_events
    where event_type = 'session_start'
      and created_at >= now() - (p_days || ' days')::interval
    group by 1, 2
  ) h;
$$;

-- Top games by analytics game_start in period (falls back to play_count if no events).
create or replace function public.get_top_games_analytics(
  p_period text default 'today',
  p_limit integer default 10
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (select public._period_since(p_period) as t),
  counts as (
    select
      ae.game_slug,
      count(*)::integer as plays
    from public.analytics_events ae, since
    where ae.event_type in ('session_start', 'game_start')
      and ae.game_slug is not null
      and ae.created_at >= since.t
    group by ae.game_slug
  )
  select coalesce(json_agg(row_to_json(r) order by r.plays desc), '[]'::json)
  from (
    select
      g.slug,
      g.title,
      coalesce(c.plays, g.play_count, 0)::integer as plays
    from public.games g
    left join counts c on c.game_slug = g.slug
    where g.status = 'ACTIVE'
    order by coalesce(c.plays, g.play_count, 0) desc
    limit p_limit
  ) r;
$$;
