-- Sprint 3: no-login scoreboard. Identity is a client-generated device_id
-- (localStorage), not a Supabase Auth session — Play29's core loop is
-- "play instantly, no signup wall". Real login is deferred to Sprint 6-7.
--
-- One row per (device_id, game_slug) holds that device's best score.
-- updated_at only changes when the score actually improves, which makes
-- "today's ranking" a simple filter on updated_at instead of needing a
-- separate log table.
create table if not exists public.scores (
  device_id text not null,
  game_slug text not null references public.games(slug) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (device_id, game_slug)
);

alter table public.scores enable row level security;

create policy "Public can read scores"
  on public.scores for select
  using (true);

-- No insert/update policy: all writes go through submit_score() below, so a
-- client can never overwrite its own higher score with a lower one (or
-- forge another device_id's row without going through the same guard).
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
end;
$$;

grant execute on function public.submit_score(text, text, text, integer) to authenticated, anon;

-- Returns the top p_limit scores for a game, optionally restricted to rows
-- updated since p_since (used for the "today" leaderboard tab; pass null
-- for all-time).
create or replace function public.get_leaderboard(
  p_game_slug text,
  p_since timestamptz default null,
  p_limit integer default 100
)
returns table (nickname text, score integer)
language sql
stable
as $$
  select nickname, score
  from public.scores
  where game_slug = p_game_slug
    and (p_since is null or updated_at >= p_since)
  order by score desc
  limit p_limit;
$$;

grant execute on function public.get_leaderboard(text, timestamptz, integer) to authenticated, anon;
