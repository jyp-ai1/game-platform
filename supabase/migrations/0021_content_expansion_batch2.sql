-- Sprint 13 Epic 2: Content Expansion Batch #2 — 7 games (28→35)
-- connect4, reversi, gomoku, bowling, archery, sliding-puzzle, whack-a-mole

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'connect4',
    'Connect 4',
    '열에 디스크를 떨어뜨려 4개를 먼저 연결하는 보드 클래식.',
    '/images/games/connect4.png',
    'EASY',
    'ACTIVE',
    32,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy', 'cpu'],
    '열 상단 ▼ 버튼을 탭해 디스크를 떨어뜨리세요. 가로·세로·대각선으로 4개를 먼저 연결하면 승리!'
  ),
  (
    'reversi',
    'Reversi',
    '돌을 놓아 상대 색을 뒤집는 오셀로 퍼즐.',
    '/images/games/reversi.png',
    'MEDIUM',
    'ACTIVE',
    33,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy', 'reversi'],
    '흑(당신)으로 빈 칸을 탭해 돌을 놓으세요. 상대 돌을 양쪽에서 감싸면 뒤집힙니다. 더 많은 돌을 가진 쪽이 승리.'
  ),
  (
    'gomoku',
    'Gomoku',
    '9×9 바둑판에서 5목을 먼저 완성하는 전략 보드.',
    '/images/games/gomoku.png',
    'MEDIUM',
    'ACTIVE',
    34,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy', 'five-in-a-row'],
    '교차점을 탭해 돌을 놓으세요. 가로·세로·대각선으로 5개를 먼저 연결하면 승리!'
  ),
  (
    'bowling',
    'Bowling',
    '파워 게이지 타이밍에 맞춰 핀을 쓰러뜨리는 스포츠.',
    '/images/games/bowling.png',
    'EASY',
    'ACTIVE',
    35,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'timing', 'casual'],
    '움직이는 파워 바가 최적 구간일 때 Roll! 버튼을 탭하세요. 5프레임 동안 최대 점수를 노리세요.'
  ),
  (
    'archery',
    'Archery',
    '과녁을 조준해 8발로 점수를 모으는 양궁.',
    '/images/games/archery.png',
    'EASY',
    'ACTIVE',
    36,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'aiming', 'archery'],
    '과녁을 탭해 화살을 쏘세요. 중심에 가까울수록 높은 점수, 8발 합계가 기록됩니다.'
  ),
  (
    'sliding-puzzle',
    'Sliding Puzzle',
    '4×4 타일을 밀어 숫자 순서를 맞추는 클래식 퍼즐.',
    '/images/games/sliding-puzzle.png',
    'MEDIUM',
    'ACTIVE',
    37,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'logic', 'sliding'],
    '빈 칸과 인접한 타일을 탭해 이동하세요. 1부터 15까지 순서대로 배열하면 클리어!'
  ),
  (
    'whack-a-mole',
    'Whack-a-Mole',
    '30초 동안 튀어나오는 두더지를 빠르게 탭하는 아케이드.',
    '/images/games/whack-a-mole.png',
    'EASY',
    'ACTIVE',
    38,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'reaction', 'casual'],
    '갈색으로 튀어나온 구멍을 빠르게 탭하세요. 30초 안에 최대한 많은 점수를 모으세요!'
  )
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url,
  description = excluded.description,
  title = excluded.title,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order;
