-- MP-CTO-022: external URL games registered by creators
alter table public.games
  add column if not exists play_url text,
  add column if not exists source_type text not null default 'native'
    check (source_type in ('native', 'external'));

create index if not exists games_source_type_idx on public.games (source_type);
