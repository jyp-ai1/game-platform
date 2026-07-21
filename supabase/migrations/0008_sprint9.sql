-- Sprint 9: Save & Resume + Retro Expansion. Two new categories (Retro,
-- Sports) alongside the existing 6, three new original games (Tetris, Gold
-- Miner, Space Impact) under Retro, and recategorizing the existing
-- "Olympic" Coming Soon placeholder into Sports (it's literally
-- track-and-field themed, giving the new Sports section real content
-- instead of rendering empty).

insert into public.categories (name, slug, sort_order)
values
  ('Retro', 'retro', 6),
  ('Sports', 'sports', 7)
on conflict (slug) do nothing;

update public.categories set description = '90년대~2000년대 감성을 그대로 담은 레트로 게임 모음.' where slug = 'retro';
update public.categories set description = '스포츠 감성의 캐주얼 게임 모음.' where slug = 'sports';

update public.games
set category_id = (select id from public.categories where slug = 'sports')
where slug = 'olympic';

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'tetris',
    'Tetris',
    '떨어지는 블록을 맞춰 줄을 채우는 클래식 퍼즐의 정석.',
    '/images/games/tetris.png',
    'MEDIUM',
    'ACTIVE',
    20,
    (select id from public.categories where slug = 'retro'),
    true,
    array['retro', 'puzzle', '90s-2000s', 'arcade-classic'],
    '방향키(또는 스와이프)로 블록을 이동, 위쪽 화살표(또는 탭)로 회전, 스페이스바로 즉시 낙하시키세요. 가로 한 줄을 가득 채우면 사라지고 점수를 얻습니다.'
  ),
  (
    'gold-miner',
    'Gold Miner',
    '흔들리는 훅을 발사해 금과 보석을 캐내는 추억의 미니게임.',
    '/images/games/gold-miner.png',
    'EASY',
    'ACTIVE',
    21,
    (select id from public.categories where slug = 'retro'),
    false,
    array['retro', 'casual', '90s-2000s'],
    '스페이스바(또는 탭)로 훅을 발사하세요. 무거운 광물일수록 천천히 끌어올려집니다. 제한 시간 안에 최대한 많은 점수를 모으세요.'
  ),
  (
    'space-impact',
    'Space Impact',
    '피처폰 시절 즐겨하던 옆으로 스크롤되는 슈팅 게임.',
    '/images/games/space-impact.png',
    'MEDIUM',
    'ACTIVE',
    22,
    (select id from public.categories where slug = 'retro'),
    false,
    array['retro', 'shooter', '90s-2000s', 'arcade-classic'],
    '방향키(또는 드래그)로 상하 이동, 스페이스바(또는 탭)로 발사하세요. 적과 부딪히면 목숨을 잃습니다.'
  )
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url,
  description = excluded.description;

update public.games set nostalgia_note = '테트리스 블록이 딱 맞아떨어질 때의 손맛은 그 어떤 게임도 대신할 수 없죠. 줄이 사라지는 그 순간의 짜릿함, 지금도 여전합니다.' where slug = 'tetris';
update public.games set nostalgia_note = '피처폰 게임장에서 훅을 던지며 금덩이를 낚아 올리던 그 긴장감. 다이아몬드가 걸릴 때면 심장이 두근거렸죠.' where slug = 'gold-miner';
update public.games set nostalgia_note = '작은 액정 속 우주선이 좌우로 총알을 피하며 나아가던 그 시절. 노키아 폰 하나로 몇 시간이고 몰입했던 추억.' where slug = 'space-impact';

update public.categories set featured_game_id = (select id from public.games where slug = 'tetris') where slug = 'retro';
