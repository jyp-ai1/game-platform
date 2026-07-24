-- Sprint 15: balance metadata + extended game KPI batch (retries, avg play time)

alter table public.games
  add column if not exists recommended_score integer,
  add column if not exists clear_time_sec integer,
  add column if not exists play_time_label text;

update public.games
set
  recommended_score = case difficulty
    when 'EASY' then 500
    when 'MEDIUM' then 1000
    else 2000
  end,
  clear_time_sec = case difficulty
    when 'EASY' then 180
    when 'MEDIUM' then 600
    else 1200
  end,
  play_time_label = case difficulty
    when 'EASY' then '2–5 min'
    when 'MEDIUM' then '5–15 min'
    else '15–30 min'
  end
where recommended_score is null;

create or replace function public.get_game_kpis_batch(
  p_period text default 'week',
  p_slugs text[] default '{}'
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with since as (select public._period_since(p_period) as t),
  slug_list as (
    select unnest(p_slugs) as slug
  ),
  events as (
    select
      ae.game_slug,
      ae.event_type,
      count(*)::integer as cnt
    from public.analytics_events ae, since
    where ae.game_slug = any(p_slugs)
      and ae.created_at >= since.t
    group by ae.game_slug, ae.event_type
  ),
  retries as (
    select
      ae.game_slug,
      count(*)::integer as cnt
    from public.analytics_events ae, since
    where ae.game_slug = any(p_slugs)
      and ae.created_at >= since.t
      and ae.event_type = 'game_start'
      and coalesce(ae.metadata->>'retry', 'false') = 'true'
    group by ae.game_slug
  ),
  durations as (
    select
      ae.game_slug,
      round(avg(nullif((ae.metadata->>'duration_ms')::numeric, 0)) / 1000)::integer as avg_play_time_sec
    from public.analytics_events ae, since
    where ae.game_slug = any(p_slugs)
      and ae.created_at >= since.t
      and ae.event_type = 'game_end'
    group by ae.game_slug
  ),
  scores as (
    select
      s.game_slug,
      count(*)::integer as ranking_submits,
      round(avg(s.score))::integer as avg_score
    from public.scores s, since
    where s.game_slug = any(p_slugs)
      and s.updated_at >= since.t
    group by s.game_slug
  )
  select coalesce(json_agg(row_to_json(r) order by r.title), '[]'::json)
  from (
    select
      g.slug,
      g.title,
      coalesce(sum(e.cnt) filter (where e.event_type in ('session_start', 'game_start')), 0)::integer as plays,
      coalesce(sum(e.cnt) filter (where e.event_type = 'game_end'), 0)::integer as finishes,
      coalesce(sum(e.cnt) filter (where e.event_type = 'favorite'), 0)::integer as favorites,
      coalesce(sum(e.cnt) filter (where e.event_type in ('resume', 'game_resume')), 0)::integer as resumes,
      coalesce(r.cnt, 0)::integer as retries,
      coalesce(sc.ranking_submits, 0)::integer as ranking_submits,
      coalesce(sc.avg_score, 0)::integer as avg_score,
      coalesce(d.avg_play_time_sec, 0)::integer as avg_play_time_sec,
      case
        when coalesce(sum(e.cnt) filter (where e.event_type in ('session_start', 'game_start')), 0) > 0
        then round(
          100.0 * coalesce(sum(e.cnt) filter (where e.event_type = 'game_end'), 0)
          / nullif(sum(e.cnt) filter (where e.event_type in ('session_start', 'game_start')), 0)
        )::integer
        else 0
      end as finish_rate_pct
    from slug_list sl
    join public.games g on g.slug = sl.slug
    left join events e on e.game_slug = g.slug
    left join retries r on r.game_slug = g.slug
    left join durations d on d.game_slug = g.slug
    left join scores sc on sc.game_slug = g.slug
    group by g.slug, g.title, r.cnt, d.avg_play_time_sec, sc.ranking_submits, sc.avg_score
  ) r;
$$;

grant execute on function public.get_game_kpis_batch(text, text[]) to authenticated, anon;
