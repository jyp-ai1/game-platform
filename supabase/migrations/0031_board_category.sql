-- Sprint 15.3 Preview B: Board Pack category (referenced by game seeds but never inserted).

insert into public.categories (name, slug, sort_order, description)
values (
  'Board',
  'board',
  8,
  '보드게임 감성의 전략·클래식 게임 모음.'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;

update public.games
set category_id = (select id from public.categories where slug = 'board')
where (
  tags @> array['board']::text[]
  or slug in (
    'connect4',
    'reversi',
    'gomoku',
    'chess',
    'checkers',
    'mancala',
    'domino',
    'chess960'
  )
)
and category_id is distinct from (select id from public.categories where slug = 'board');
