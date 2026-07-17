-- Sprint 2: category linking + featured flag + first playable game (2048).
alter table public.games
  add column if not exists category_id uuid references public.categories(id);

alter table public.games
  add column if not exists is_featured boolean not null default false;

insert into public.categories (name, slug, sort_order)
values ('Puzzle', 'puzzle', 0)
on conflict (slug) do nothing;

update public.games
set category_id = (select id from public.categories where slug = 'puzzle')
where slug = 'brick-puzzle';

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured
)
values (
  '2048',
  '2048',
  '숫자를 합쳐 2048을 만드는 클래식 퍼즐 게임.',
  null,
  'MEDIUM',
  'ACTIVE',
  1,
  (select id from public.categories where slug = 'puzzle'),
  true
)
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id;
