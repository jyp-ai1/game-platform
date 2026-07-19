-- Sprint 5: Re:Play rebrand — category richness (banner/description/featured
-- game), category renames + 2 new categories, and the Retro Arcade
-- Collection (10 new original games, no copied IP — see engine designs in
-- the Sprint 5 plan for how each is a mechanically-inspired-but-original
-- reimplementation).

alter table public.categories
  add column if not exists banner_url text;

alter table public.categories
  add column if not exists description text;

alter table public.categories
  add column if not exists featured_game_id uuid references public.games(id);

-- Rename existing categories (slugs stable, only display name changes, so
-- existing /categories/[slug] links keep working).
update public.categories set name = 'Retro Arcade' where slug = 'arcade';
update public.categories set name = 'Brain Games' where slug = 'brain';

-- New categories.
insert into public.categories (name, slug, sort_order)
values
  ('Action', 'action', 4),
  ('Casual', 'casual', 5)
on conflict (slug) do nothing;

-- Category descriptions (all 6, for the new category-page banner treatment).
update public.categories set description = '오락실 감성을 그대로 담은 클래식 아케이드 게임 모음.' where slug = 'arcade';
update public.categories set description = '머리를 써야 풀리는 퍼즐 게임 모음.' where slug = 'puzzle';
update public.categories set description = '기억력과 순발력을 겨루는 두뇌 게임 모음.' where slug = 'brain';
update public.categories set description = '세대를 넘어 사랑받은 클래식 게임 모음.' where slug = 'classic';
update public.categories set description = '긴장감 넘치는 액션 게임 모음.' where slug = 'action';
update public.categories set description = '가볍게 즐기는 캐주얼 게임 모음.' where slug = 'casual';

-- 10 new games. tags include the era/curation tags used by the homepage's
-- narrative sections (90s-2000s, arcade-classic, quick-play) alongside
-- normal genre/search tags.
insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'maze-runner',
    'Maze Runner',
    '미로를 누비며 긴장감 넘치는 추격전을 즐겨보세요.',
    '/images/games/maze-runner.png',
    'MEDIUM',
    'ACTIVE',
    6,
    (select id from public.categories where slug = 'arcade'),
    true,
    array['arcade', 'maze', '90s-2000s', 'arcade-classic'],
    '방향키(또는 스와이프)로 이동하며 도트를 모으세요. 파워펠렛을 먹으면 잠시 추격자를 역으로 공격할 수 있습니다. 추격자에게 닿으면 목숨을 잃고, 도트를 모두 모으면 승리합니다.'
  ),
  (
    'tank-battle',
    'Tank Battle',
    '친구와 번갈아 플레이하던 탱크 전투의 재미를 웹에서 다시 만나보세요.',
    '/images/games/tank-battle.png',
    'HARD',
    'ACTIVE',
    7,
    (select id from public.categories where slug = 'action'),
    true,
    array['action', 'shooter', '90s-2000s', 'arcade-classic', 'quick-play'],
    '방향키로 이동, 스페이스바(또는 발사 버튼)로 발사하세요. 벽돌 지형은 파괴할 수 있습니다. 적 탱크 5대를 모두 격파하면 승리합니다.'
  ),
  (
    'galaxy-defender',
    'Galaxy Defender',
    '우주를 지키던 오락실 슈팅 게임의 감성을 현대적으로 재해석했습니다.',
    '/images/games/galaxy-defender.png',
    'MEDIUM',
    'ACTIVE',
    8,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'shooter', '90s-2000s', 'arcade-classic'],
    '좌우로 이동해 적의 다이빙 공격을 피하세요. 우주선은 자동으로 발사되며, 편대를 모두 격파하면 다음 웨이브로 넘어갑니다.'
  ),
  (
    'space-defender',
    'Space Defender',
    '줄지어 다가오는 침략자를 막아내는 클래식 슈팅 게임. 남은 적이 줄어들수록 진격 속도가 빨라집니다.',
    '/images/games/space-defender.png',
    'MEDIUM',
    'ACTIVE',
    9,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'shooter', '90s-2000s', 'arcade-classic'],
    '좌우로 이동한 뒤 스페이스바로 발사해 침략자 그리드를 격파하세요. 방어막 뒤에 숨어 적의 총알을 피할 수 있습니다.'
  ),
  (
    'bubble-pop',
    'Bubble Pop',
    '같은 색 버블을 맞춰 터뜨리는 상쾌한 버블 슈팅 게임.',
    '/images/games/bubble-pop.png',
    'EASY',
    'ACTIVE',
    10,
    (select id from public.categories where slug = 'casual'),
    false,
    array['casual', 'puzzle', 'arcade-classic'],
    '조준한 뒤 클릭이나 스페이스바로 버블을 발사하세요. 같은 색 3개 이상을 모으면 터집니다. 버블이 바닥에 닿으면 게임이 끝나고, 모든 버블을 없애면 승리합니다.'
  ),
  (
    'sudoku',
    'Sudoku',
    '숫자 논리 퍼즐의 정석. 머리를 식히며 즐기는 스도쿠.',
    '/images/games/sudoku.png',
    'MEDIUM',
    'ACTIVE',
    11,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'logic', 'numbers'],
    '빈 칸을 선택하고 숫자를 입력하세요. 같은 행, 열, 3x3 박스 안에 중복된 숫자가 없어야 합니다. 3번 틀리면 게임이 끝납니다.'
  ),
  (
    'tic-tac-toe',
    'Tic Tac Toe',
    '누구나 아는 그 게임, 간단하지만 중독성 있는 틱택토.',
    '/images/games/tic-tac-toe.png',
    'EASY',
    'ACTIVE',
    12,
    (select id from public.categories where slug = 'classic'),
    false,
    array['classic', 'strategy', 'quick-play'],
    '빈 칸을 클릭해 표시하세요. 가로, 세로, 대각선 중 하나로 먼저 3개를 맞추면 승리합니다.'
  ),
  (
    'simon',
    'Simon',
    '점점 길어지는 색상 패턴을 기억하고 따라해보세요.',
    '/images/games/simon.png',
    'EASY',
    'ACTIVE',
    13,
    (select id from public.categories where slug = 'brain'),
    false,
    array['brain', 'memory', 'quick-play'],
    '재생되는 색상 순서를 잘 보고, 같은 순서로 패드를 눌러 따라하세요. 순서를 놓치면 게임이 끝납니다.'
  ),
  (
    'hangman',
    'Hangman',
    '한 글자씩 추측하며 단어를 완성하는 클래식 단어 게임.',
    '/images/games/hangman.png',
    'EASY',
    'ACTIVE',
    14,
    (select id from public.categories where slug = 'brain'),
    false,
    array['brain', 'word', 'quick-play'],
    '화면의 키보드나 실제 키보드로 알파벳을 추측해 단어를 완성하세요. 6번 틀리면 게임이 끝납니다.'
  ),
  (
    'color-match',
    'Color Match',
    '제한시간 안에 정확한 색을 맞추는 반사신경 게임.',
    '/images/games/color-match.png',
    'EASY',
    'ACTIVE',
    15,
    (select id from public.categories where slug = 'casual'),
    false,
    array['casual', 'reflex', 'quick-play'],
    '제한시간 안에 목표 색과 같은 색 버튼을 누르세요. 틀리거나 시간이 초과되면 목숨이 줄어들고, 목숨을 모두 잃으면 게임이 끝납니다.'
  )
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url,
  description = excluded.description;

-- Give the 90s-2000s / arcade-classic era tags to existing games too, so the
-- homepage's narrative curation carousels aren't empty on launch.
update public.games
set tags = array_cat(tags, array['90s-2000s', 'arcade-classic'])
where slug = 'breakout' and not ('arcade-classic' = any(tags));

update public.games
set tags = array_cat(tags, array['90s-2000s'])
where slug in ('snake', 'memory') and not ('90s-2000s' = any(tags));

update public.games
set tags = array_cat(tags, array['quick-play'])
where slug in ('2048', 'minesweeper') and not ('quick-play' = any(tags));

-- Featured/representative game per category (for the new category-page banner).
update public.categories set featured_game_id = (select id from public.games where slug = 'maze-runner') where slug = 'arcade';
update public.categories set featured_game_id = (select id from public.games where slug = '2048') where slug = 'puzzle';
update public.categories set featured_game_id = (select id from public.games where slug = 'memory') where slug = 'brain';
update public.categories set featured_game_id = (select id from public.games where slug = 'snake') where slug = 'classic';
update public.categories set featured_game_id = (select id from public.games where slug = 'tank-battle') where slug = 'action';
update public.categories set featured_game_id = (select id from public.games where slug = 'bubble-pop') where slug = 'casual';
