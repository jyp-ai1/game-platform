-- Replay Multiplayer — cross-device rooms + presence (L2 Engine P0)

create table if not exists public.mp_rooms (
  code text primary key,
  game_slug text not null,
  host_id text not null,
  max_players int not null default 8 check (max_players between 2 and 20),
  players jsonb not null default '[]'::jsonb,
  spectators jsonb not null default '[]'::jsonb,
  status text not null default 'waiting' check (status in ('waiting','ready','playing','finished','spectating')),
  countdown int not null default 3,
  match_mode text not null default 'private' check (match_mode in ('quick','private','friends','public')),
  game_state jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists mp_rooms_status_idx on public.mp_rooms (status);
create index if not exists mp_rooms_game_slug_idx on public.mp_rooms (game_slug);
create index if not exists mp_rooms_updated_at_idx on public.mp_rooms (updated_at desc);

create table if not exists public.mp_presence (
  device_id text primary key,
  nickname text not null,
  status text not null default 'online' check (status in ('online','lobby','playing','spectating')),
  game_slug text,
  room_code text,
  since timestamptz not null default now(),
  spectatable boolean not null default false,
  last_heartbeat timestamptz not null default now(),
  latency_ms int default 0,
  region text default 'auto'
);

create index if not exists mp_presence_status_idx on public.mp_presence (status);
create index if not exists mp_presence_heartbeat_idx on public.mp_presence (last_heartbeat desc);

alter table public.mp_rooms enable row level security;
alter table public.mp_presence enable row level security;

create policy "mp_rooms_anon_all" on public.mp_rooms for all to anon, authenticated using (true) with check (true);
create policy "mp_presence_anon_all" on public.mp_presence for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.mp_rooms;
alter publication supabase_realtime add table public.mp_presence;

-- Admin stats RPC for Realtime Dashboard
create or replace function public.get_mp_realtime_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'online', (select count(*) from mp_presence where last_heartbeat > now() - interval '90 seconds'),
    'rooms', (select count(*) from mp_rooms where status in ('waiting','ready','playing')),
    'players', (select coalesce(sum(jsonb_array_length(players)), 0) from mp_rooms where status in ('waiting','ready','playing')),
    'playing', (select count(*) from mp_presence where status = 'playing' and last_heartbeat > now() - interval '90 seconds'),
    'avg_latency_ms', (select coalesce(round(avg(latency_ms)), 0) from mp_presence where last_heartbeat > now() - interval '90 seconds'),
    'disconnects_1h', (select count(*) from mp_presence where last_heartbeat < now() - interval '90 seconds' and last_heartbeat > now() - interval '1 hour'),
    'top_games', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select game_slug, count(*) as rooms
        from mp_rooms
        where status in ('waiting','ready','playing')
        group by game_slug
        order by rooms desc
        limit 5
      ) t
    ),
    'checked_at', now()
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_mp_realtime_stats() to anon, authenticated;
