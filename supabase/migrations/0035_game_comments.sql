-- MP-CTO-023: shared game comments (Supabase-backed)
create table if not exists public.game_comments (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists game_comments_slug_created_idx
  on public.game_comments (game_slug, created_at desc);

alter table public.game_comments enable row level security;

create policy "Public can read game comments"
  on public.game_comments for select
  to anon, authenticated
  using (true);
