-- Sprint 14 Epic 3 Batch 2: mancala, mini-golf, billiards (P2 playable)

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'mancala',
    'Mancala',
    '만칼라 — 구슬을 옮겨 상대보다 많은 구슬을 모으세요.',
    '/images/games/mancala.png',
    'EASY',
    'ACTIVE',
    39,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy'],
    '아래 구덩이를 탭해 구슬을 분배하세요. 상대 구덩이의 구슬을 포획할 수 있습니다.'
  ),
  (
    'mini-golf',
    'Mini Golf',
    '미니 골프 — 파워와 각도를 맞춰 홀인원을 노리세요.',
    '/images/games/mini-golf.png',
    'EASY',
    'ACTIVE',
    40,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'casual', 'timing'],
    'Putt! 버튼으로 파워가 맞을 때 공을 치세요. 최소 타수로 홀에 넣으세요.'
  ),
  (
    'billiards',
    'Billiards',
    '심플 3구 — 큐볼로 색 공을 포켓에 넣으세요.',
    '/images/games/billiards.png',
    'EASY',
    'ACTIVE',
    41,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'arcade'],
    '각도와 파워를 맞춰 Shoot! 공을 pocket 근처로 보내 점수를 얻으세요.'
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play;

update public.games set released_at = coalesce(released_at, now())
where slug in ('mancala', 'mini-golf', 'billiards');

insert into public.cms_game_visibility (game_slug, visibility)
select slug, 'visible' from public.games
where slug in ('mancala', 'mini-golf', 'billiards')
on conflict (game_slug) do update set visibility = excluded.visibility;

insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
select 'new_games', slug, sort_order, true from public.games
where slug in ('mancala', 'mini-golf', 'billiards')
on conflict (slot, game_slug) do update set sort_order = excluded.sort_order, is_active = true;
