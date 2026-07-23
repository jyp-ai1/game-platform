-- Sprint 11: Platform tables — players, sessions, game_sessions, leaderboards, matches.
-- Re:Play uses device_id (localStorage UUID), not Supabase Auth. These tables formalize
-- data that was previously split across scores (best scores) and analytics_events (events).
--
-- Run after 0001~0010. Safe to re-run: CREATE IF NOT EXISTS + INSERT ... ON CONFLICT.

-- ---------------------------------------------------------------------------
-- 1. players — one row per device (anonymous player identity)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  device_id text primary key,
  nickname text check (nickname is null or char_length(nickname) between 1 and 20),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  total_plays integer not null default 0 check (total_plays >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Public can read players"
  on public.players for select
  using (true);

-- Backfill from existing scores (best nickname + activity timestamps per device).
insert into public.players (device_id, nickname, first_seen, last_seen, total_plays)
select
  s.device_id,
  (
    select sc.nickname
    from public.scores sc
    where sc.device_id = s.device_id
    order by sc.updated_at desc
    limit 1
  ) as nickname,
  min(s.updated_at) as first_seen,
  max(s.updated_at) as last_seen,
  0 as total_plays
from public.scores s
group by s.device_id
on conflict (device_id) do update set
  nickname = coalesce(excluded.nickname, public.players.nickname),
  first_seen = least(public.players.first_seen, excluded.first_seen),
  last_seen = greatest(public.players.last_seen, excluded.last_seen),
  updated_at = now();

-- Also register devices seen only in analytics_events (played but never submitted score).
insert into public.players (device_id, first_seen, last_seen)
select
  ae.device_id,
  min(ae.created_at),
  max(ae.created_at)
from public.analytics_events ae
where ae.device_id is not null
group by ae.device_id
on conflict (device_id) do update set
  last_seen = greatest(public.players.last_seen, excluded.last_seen),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. sessions — site visit sessions (browser tab / return visit)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.players(device_id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  source text not null default 'web' check (source in ('web', 'pwa'))
);

create index if not exists sessions_device_id_idx
  on public.sessions (device_id, started_at desc);

alter table public.sessions enable row level security;

-- Backfill: one session per device per UTC day from analytics session_start events.
insert into public.sessions (device_id, started_at, ended_at)
select d.device_id, d.started_at, d.ended_at
from (
  select
    ae.device_id,
    min(ae.created_at) as started_at,
    max(ae.created_at) as ended_at,
    (min(ae.created_at) at time zone 'utc')::date as day
  from public.analytics_events ae
  where ae.event_type = 'session_start'
    and ae.device_id is not null
  group by ae.device_id, (ae.created_at at time zone 'utc')::date
) d
where not exists (
  select 1
  from public.sessions s
  where s.device_id = d.device_id
    and (s.started_at at time zone 'utc')::date = d.day
);

-- ---------------------------------------------------------------------------
-- 3. game_sessions — individual game play sessions
-- ---------------------------------------------------------------------------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.players(device_id) on delete cascade,
  game_slug text not null references public.games(slug) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score integer check (score is null or score >= 0),
  completed boolean not null default false
);

create index if not exists game_sessions_device_game_idx
  on public.game_sessions (device_id, game_slug, started_at desc);

create index if not exists game_sessions_game_slug_idx
  on public.game_sessions (game_slug, started_at desc);

alter table public.game_sessions enable row level security;

-- Backfill from analytics session_start events.
insert into public.game_sessions (device_id, game_slug, started_at)
select ae.device_id, ae.game_slug, ae.created_at
from public.analytics_events ae
where ae.event_type = 'session_start'
  and ae.device_id is not null
  and ae.game_slug is not null
  and not exists (
    select 1
    from public.game_sessions gs
    where gs.device_id = ae.device_id
      and gs.game_slug = ae.game_slug
      and gs.started_at = ae.created_at
  );

-- Backfill scores into matching game_sessions where score_submit exists same day/game/device.
update public.game_sessions gs
set
  score = sub.score,
  completed = true,
  ended_at = sub.submitted_at
from (
  select
    ae.device_id,
    ae.game_slug,
    (ae.metadata->>'score')::integer as score,
    ae.created_at as submitted_at
  from public.analytics_events ae
  where ae.event_type = 'score_submit'
    and ae.metadata ? 'score'
) sub
where gs.device_id = sub.device_id
  and gs.game_slug = sub.game_slug
  and gs.score is null
  and gs.started_at::date = sub.submitted_at::date;

-- Refresh player total_plays from game_sessions count.
update public.players p
set
  total_plays = c.cnt,
  updated_at = now()
from (
  select device_id, count(*)::integer as cnt
  from public.game_sessions
  group by device_id
) c
where p.device_id = c.device_id;

-- ---------------------------------------------------------------------------
-- 4. leaderboards — ranked snapshot per game & period (denormalized for fast reads)
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null references public.games(slug) on delete cascade,
  period text not null default 'all' check (period in ('all', 'today', 'weekly')),
  rank integer not null check (rank > 0),
  device_id text not null,
  nickname text not null,
  score integer not null check (score >= 0),
  snapshot_at timestamptz not null default now(),
  unique (game_slug, period, rank, snapshot_at)
);

create index if not exists leaderboards_game_period_idx
  on public.leaderboards (game_slug, period, rank);

alter table public.leaderboards enable row level security;

create policy "Public can read leaderboards"
  on public.leaderboards for select
  using (true);

-- Seed all-time leaderboard from current scores (top 100 per game).
insert into public.leaderboards (game_slug, period, rank, device_id, nickname, score, snapshot_at)
select
  ranked.game_slug,
  'all',
  ranked.rank,
  ranked.device_id,
  ranked.nickname,
  ranked.score,
  now()
from (
  select
    s.game_slug,
    s.device_id,
    s.nickname,
    s.score,
    row_number() over (
      partition by s.game_slug
      order by s.score desc, s.updated_at asc
    )::integer as rank
  from public.scores s
) ranked
where ranked.rank <= 100
on conflict do nothing;

-- Seed today's leaderboard (scores updated today).
insert into public.leaderboards (game_slug, period, rank, device_id, nickname, score, snapshot_at)
select
  ranked.game_slug,
  'today',
  ranked.rank,
  ranked.device_id,
  ranked.nickname,
  ranked.score,
  now()
from (
  select
    s.game_slug,
    s.device_id,
    s.nickname,
    s.score,
    row_number() over (
      partition by s.game_slug
      order by s.score desc, s.updated_at asc
    )::integer as rank
  from public.scores s
  where s.updated_at >= date_trunc('day', now())
) ranked
where ranked.rank <= 100
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. matches — challenge matches (Sprint 11+ Replay & Challenge foundation)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null references public.games(slug) on delete cascade,
  host_device_id text not null references public.players(device_id) on delete cascade,
  challenger_device_id text references public.players(device_id) on delete set null,
  target_score integer not null check (target_score >= 0),
  host_score integer check (host_score is null or host_score >= 0),
  challenger_score integer check (challenger_score is null or challenger_score >= 0),
  status text not null default 'open'
    check (status in ('open', 'completed', 'expired', 'cancelled')),
  challenge_code text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists matches_game_slug_idx
  on public.matches (game_slug, status, created_at desc);

create index if not exists matches_challenge_code_idx
  on public.matches (challenge_code)
  where challenge_code is not null;

alter table public.matches enable row level security;

create policy "Public can read open matches"
  on public.matches for select
  using (status in ('open', 'completed'));

-- No seed rows for matches — created by app when Challenge feature ships.
-- Example (commented out):
-- insert into public.matches (game_slug, host_device_id, target_score, challenge_code)
-- select '2048', device_id, score, 'DEMO-' || left(device_id, 8)
-- from public.scores where game_slug = '2048' order by score desc limit 1;

-- ---------------------------------------------------------------------------
-- Helper: refresh leaderboards from scores (run periodically or after score submit).
-- ---------------------------------------------------------------------------
create or replace function public.refresh_leaderboards(p_period text default 'all')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if p_period = 'today' then
    v_since := date_trunc('day', now());
  elsif p_period = 'weekly' then
    v_since := date_trunc('week', now());
  else
    v_since := null;
  end if;

  delete from public.leaderboards
  where period = p_period
    and snapshot_at >= date_trunc('day', now());

  insert into public.leaderboards (game_slug, period, rank, device_id, nickname, score, snapshot_at)
  select
    ranked.game_slug,
    p_period,
    ranked.rank,
    ranked.device_id,
    ranked.nickname,
    ranked.score,
    now()
  from (
    select
      s.game_slug,
      s.device_id,
      s.nickname,
      s.score,
      row_number() over (
        partition by s.game_slug
        order by s.score desc, s.updated_at asc
      )::integer as rank
    from public.scores s
    where v_since is null or s.updated_at >= v_since
  ) ranked
  where ranked.rank <= 100;
end;
$$;

-- Upsert player row whenever a score is submitted (keeps players in sync going forward).
create or replace function public.submit_score(
  p_game_slug text,
  p_device_id text,
  p_nickname text,
  p_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (device_id, nickname, first_seen, last_seen)
  values (p_device_id, p_nickname, now(), now())
  on conflict (device_id) do update set
    nickname = excluded.nickname,
    last_seen = now(),
    updated_at = now();

  insert into public.scores (device_id, game_slug, nickname, score, updated_at)
  values (p_device_id, p_game_slug, p_nickname, p_score, now())
  on conflict (device_id, game_slug)
  do update set
    score = greatest(public.scores.score, excluded.score),
    nickname = excluded.nickname,
    updated_at = case
      when excluded.score > public.scores.score then now()
      else public.scores.updated_at
    end;

  perform public.refresh_leaderboards('all');
end;
$$;

grant execute on function public.refresh_leaderboards(text) to authenticated, anon;

grant execute on function public.submit_score(text, text, text, integer) to authenticated, anon;
