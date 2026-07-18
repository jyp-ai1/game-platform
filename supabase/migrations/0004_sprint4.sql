-- Sprint 4: search (tags) + richer game detail (how_to_play), plus the
-- 4 new games and their category assignments.
alter table public.games
  add column if not exists tags text[] not null default '{}';

alter table public.games
  add column if not exists how_to_play text;

insert into public.categories (name, slug, sort_order)
values
  ('Arcade', 'arcade', 1),
  ('Brain', 'brain', 2),
  ('Classic', 'classic', 3)
on conflict (slug) do nothing;

update public.games
set
  thumbnail_url = '/images/games/2048.png',
  tags = array['puzzle', 'numbers', 'merge'],
  how_to_play = '방향키(또는 스와이프)로 타일을 밀어서 같은 숫자를 합치세요. 2048 타일을 만들면 승리합니다.'
where slug = '2048';

update public.games
set
  tags = array['puzzle', 'coming-soon'],
  how_to_play = null
where slug = 'brick-puzzle';

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'snake',
    'Snake',
    '먹이를 먹고 몸을 늘려가며 벽과 자기 몸을 피하는 클래식 아케이드 게임.',
    '/images/games/snake.png',
    'EASY',
    'ACTIVE',
    2,
    (select id from public.categories where slug = 'classic'),
    true,
    array['arcade', 'classic', 'reflex'],
    '방향키(또는 스와이프)로 뱀의 방향을 조종하세요. 먹이를 먹으면 길어지고 점수가 오릅니다. 벽이나 자기 몸에 부딪히면 게임이 끝납니다.'
  ),
  (
    'breakout',
    'Breakout',
    '패들로 공을 튕겨 벽돌을 모두 깨는 아케이드 게임.',
    '/images/games/breakout.png',
    'MEDIUM',
    'ACTIVE',
    3,
    (select id from public.categories where slug = 'arcade'),
    true,
    array['arcade', 'reflex'],
    '방향키 또는 드래그로 패들을 움직여 공을 받아치세요. 공으로 벽돌을 모두 깨면 승리, 공을 놓치면 라이프가 줄어듭니다.'
  ),
  (
    'memory',
    'Memory',
    '카드를 뒤집어 같은 그림을 맞추는 두뇌 게임.',
    '/images/games/memory.png',
    'EASY',
    'ACTIVE',
    4,
    (select id from public.categories where slug = 'brain'),
    false,
    array['brain', 'memory', 'cards'],
    '카드를 두 장씩 뒤집어 같은 그림을 찾으세요. 모든 카드를 짝지으면 완료됩니다. 적은 시도로 끝낼수록 점수가 높습니다.'
  ),
  (
    'minesweeper',
    'Minesweeper',
    '숫자 힌트를 보고 지뢰를 피해 모든 칸을 여는 퍼즐 게임.',
    '/images/games/minesweeper.png',
    'HARD',
    'ACTIVE',
    5,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'logic'],
    '칸을 클릭해 열고, 지뢰로 의심되는 칸은 깃발 모드로 표시하세요. 지뢰가 아닌 모든 칸을 열면 승리, 지뢰를 클릭하면 게임이 끝납니다.'
  )
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url;
