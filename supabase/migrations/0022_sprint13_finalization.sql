-- Sprint 13 Finalization: released_at, CMS visibility/events, per-game KPI RPC
-- Operator: run after 0020 + 0021

alter table public.games
  add column if not exists released_at timestamptz;

update public.games
set released_at = coalesce(released_at, created_at, now())
where slug in (
  'stack-tower', 'ball-sort', 'color-sort', 'penalty-shootout', 'darts',
  'bubble-shooter', 'merge-blocks', 'connect4', 'reversi', 'gomoku',
  'bowling', 'archery', 'sliding-puzzle', 'whack-a-mole'
);

-- CMS visibility for Sprint 13 batch
insert into public.cms_game_visibility (game_slug, visibility)
select slug, 'visible'
from public.games
where slug in (
  'stack-tower', 'ball-sort', 'color-sort', 'penalty-shootout', 'darts',
  'bubble-shooter', 'merge-blocks', 'connect4', 'reversi', 'gomoku',
  'bowling', 'archery', 'sliding-puzzle', 'whack-a-mole'
)
on conflict (game_slug) do update set visibility = excluded.visibility;

-- Launch events (7-day window, NEW badge period)
insert into public.cms_events (title, description, link_url, starts_at, ends_at, is_active)
select
  g.title || ' 출시!',
  '신규 게임 ' || g.title || ' — 지금 플레이하고 첫 판 XP 보너스를 받아보세요.',
  '/games/' || g.slug,
  coalesce(g.released_at, now()),
  coalesce(g.released_at, now()) + interval '7 days',
  true
from public.games g
where g.slug in (
  'stack-tower', 'ball-sort', 'color-sort', 'penalty-shootout', 'darts',
  'bubble-shooter', 'merge-blocks', 'connect4', 'reversi', 'gomoku',
  'bowling', 'archery', 'sliding-puzzle', 'whack-a-mole'
)
and not exists (
  select 1 from public.cms_events e
  where e.link_url = '/games/' || g.slug
    and e.starts_at >= coalesce(g.released_at, now()) - interval '1 day'
);

-- Featured: new_games slot (sort_order by batch)
insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
select 'new_games', g.slug, g.sort_order, true
from public.games g
where g.slug in (
  'stack-tower', 'ball-sort', 'color-sort', 'penalty-shootout', 'darts',
  'bubble-shooter', 'merge-blocks', 'connect4', 'reversi', 'gomoku',
  'bowling', 'archery', 'sliding-puzzle', 'whack-a-mole'
)
on conflict (slot, game_slug) do update set is_active = true, sort_order = excluded.sort_order;

-- Per-game KPI batch for Admin Sprint 13 panel
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
      coalesce(sc.ranking_submits, 0)::integer as ranking_submits,
      coalesce(sc.avg_score, 0)::integer as avg_score,
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
    left join scores sc on sc.game_slug = g.slug
    group by g.slug, g.title, sc.ranking_submits, sc.avg_score
  ) r;
$$;

grant execute on function public.get_game_kpis_batch(text, text[]) to authenticated, anon;
