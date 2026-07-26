-- Party persistence — progress + missions (P0 Viral Loop)

alter table public.mp_parties
  add column if not exists progress jsonb not null default '{"xp":0,"level":1,"streak":0,"collection":[],"partyCoin":0}'::jsonb,
  add column if not exists missions jsonb not null default '[]'::jsonb;
