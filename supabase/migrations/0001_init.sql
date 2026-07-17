-- Sprint 1: games, categories, settings tables.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  thumbnail_url text,
  difficulty text not null default 'EASY'
    check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  status text not null default 'COMING_SOON'
    check (status in ('ACTIVE', 'COMING_SOON', 'HIDDEN')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null
);

alter table public.games enable row level security;
alter table public.categories enable row level security;
alter table public.settings enable row level security;

-- Public (anon) clients may only ever see non-hidden games, regardless of
-- what the application query asks for.
create policy "Public can read visible games"
  on public.games for select
  to anon
  using (status <> 'HIDDEN');

create policy "Public can read categories"
  on public.categories for select
  to anon
  using (true);

-- settings has no public policy: server-only, read via the secret key.

insert into public.games (slug, title, description, thumbnail_url, difficulty, status, sort_order)
values (
  'brick-puzzle',
  'Brick Puzzle',
  '클래식 블록 퍼즐 게임. 곧 만나보실 수 있습니다.',
  null,
  'EASY',
  'COMING_SOON',
  0
)
on conflict (slug) do nothing;
