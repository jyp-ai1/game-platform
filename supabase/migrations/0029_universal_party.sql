-- Universal Party System — persistent party above rooms (P0 Viral Platform)

create table if not exists public.mp_parties (
  id text primary key,
  leader_id text not null,
  members jsonb not null default '[]'::jsonb,
  chat jsonb not null default '[]'::jsonb,
  current_game_slug text,
  current_room_code text,
  queue jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mp_parties_updated_at_idx on public.mp_parties (updated_at desc);

alter table public.mp_parties enable row level security;
create policy "mp_parties_anon_all" on public.mp_parties for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.mp_parties;
