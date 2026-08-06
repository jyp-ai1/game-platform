-- Sprint 17 Epic 1: Agar Multiplayer scaffold

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'agar',
    'Agar',
    '세포를 키워 다른 플레이어를 삼키세요. Split · Eject · TOP10.',
    '/images/games/agar.png',
    'EASY',
    'ACTIVE',
    2,
    (select id from public.categories where slug = 'arcade' limit 1),
    true,
    array['arcade', 'multiplayer', 'realtime', 'agar'],
    '마우스로 이동합니다. Space = 세포분열(Split). W = 먹이 방출(Eject). 자신보다 작은 세포만 먹을 수 있습니다.'
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  difficulty = excluded.difficulty,
  status = excluded.status,
  sort_order = excluded.sort_order,
  category_id = excluded.category_id,
  is_featured = excluded.is_featured,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play;

update public.games set released_at = coalesce(released_at, now())
where slug = 'agar';

insert into public.cms_game_visibility (game_slug, visibility)
select slug, 'visible' from public.games
where slug = 'agar'
on conflict (game_slug) do update set visibility = excluded.visibility;

insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
select 'new_games', slug, sort_order, true from public.games
where slug = 'agar'
on conflict (slot, game_slug) do update set sort_order = excluded.sort_order, is_active = true;
