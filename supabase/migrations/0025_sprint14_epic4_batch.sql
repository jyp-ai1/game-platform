-- Sprint 14 Epic 4 Batch: basketball, table-tennis, shuffleboard, domino, chess960,
-- crossword, kakuro, nonogram, word-search (P2 playable)

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'basketball',
    'Basketball',
    '타이밍 파워 바로 슛 — 10번의 프리 스로우로 점수를 모으세요.',
    '/images/games/basketball.png',
    'EASY',
    'ACTIVE',
    42,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'timing'],
    '파워 바가 sweet spot에 올 때 Shoot! 버튼을 눌러 골대에 넣으세요. 10슛 종료 후 점수가 기록됩니다.'
  ),
  (
    'table-tennis',
    'Table Tennis',
    'CPU와 맞붙는 미니 탁구 — 먼저 5점을 따는 쪽이 승리.',
    '/images/games/table-tennis.png',
    'EASY',
    'ACTIVE',
    43,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'arcade'],
    '코트를 드래그해 패들을 움직이세요. 공을 상대 코트로 넘겨 먼저 5점을 얻으세요.'
  ),
  (
    'shuffleboard',
    'Shuffleboard',
    '디스크를 밀어 점수 구역에 정확히 멈추는 셔플보드.',
    '/images/games/shuffleboard.png',
    'EASY',
    'ACTIVE',
    44,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'timing'],
    '파워를 맞춰 Slide! 디스크가 1~4점 구역에 멈추도록 하세요. 8라운드 합산 점수.'
  ),
  (
    'domino',
    'Domino',
    '드로우 & 매치 도미노 — CPU와 번호를 맞춰 체인을 이어가세요.',
    '/images/games/domino.png',
    'EASY',
    'ACTIVE',
    45,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'casual'],
    '손패 타일을 탭해 체인 양 끝 숫자와 맞추세요. 둘 다 없으면 Draw tile.'
  ),
  (
    'chess960',
    'Chess960',
    'Fischer Random 체스 — 매 게임 랜덤 백랭크로 CPU와 대국.',
    '/images/games/chess960.png',
    'MEDIUM',
    'ACTIVE',
    46,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy', 'chess'],
    '말을 선택해 이동하세요. Chess960 규칙으로 CPU를 이기면 승리.'
  ),
  (
    'crossword',
    'Crossword',
    '미니 5×5 크로스워드 — 3개 단서로 격자를 채우세요.',
    '/images/games/crossword.png',
    'EASY',
    'ACTIVE',
    47,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'word'],
    '단서를 보고 칸을 탭한 뒤 알파벳 버튼으로 답을 입력하세요.'
  ),
  (
    'kakuro',
    'Kakuro',
    '미니 4×4 카쿠로 — 합계 힌트에 맞는 숫자를 채우세요.',
    '/images/games/kakuro.png',
    'MEDIUM',
    'ACTIVE',
    48,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'logic', 'numbers'],
    '흰 칸을 탭하고 1~9 숫자로 합계 단서를 만족시키세요.'
  ),
  (
    'nonogram',
    'Nonogram',
    '5×5 픽ross — 행·열 힌트로 그림을 완성하세요.',
    '/images/games/nonogram.png',
    'EASY',
    'ACTIVE',
    49,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'logic'],
    '칸을 탭해 채우고, 우클릭으로 빈 칸(×)을 표시하세요. 힌트와 일치하면 완성.'
  ),
  (
    'word-search',
    'Word Search',
    '8×8 워드서치 — 4개 단어를 직선으로 찾아 선택하세요.',
    '/images/games/word-search.png',
    'EASY',
    'ACTIVE',
    50,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'word'],
    '시작 칸과 끝 칸을 탭해 단어를 직선으로 선택하세요. 4개 모두 찾으면 클리어.'
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
where slug in (
  'basketball', 'table-tennis', 'shuffleboard', 'domino', 'chess960',
  'crossword', 'kakuro', 'nonogram', 'word-search'
);

insert into public.cms_game_visibility (game_slug, visibility)
select slug, 'visible' from public.games
where slug in (
  'basketball', 'table-tennis', 'shuffleboard', 'domino', 'chess960',
  'crossword', 'kakuro', 'nonogram', 'word-search'
)
on conflict (game_slug) do update set visibility = excluded.visibility;

insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
select 'new_games', slug, sort_order, true from public.games
where slug in (
  'basketball', 'table-tennis', 'shuffleboard', 'domino', 'chess960',
  'crossword', 'kakuro', 'nonogram', 'word-search'
)
on conflict (slot, game_slug) do update set sort_order = excluded.sort_order, is_active = true;
