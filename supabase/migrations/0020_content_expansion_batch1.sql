-- Sprint 13 Epic 1: Content Expansion Batch #1 — 7 Tier C games
-- (stack-tower, ball-sort, color-sort, penalty-shootout, darts,
-- bubble-shooter, merge-blocks). Operator: run in Supabase SQL Editor.

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'stack-tower',
    'Stack Tower',
    '움직이는 블록을 타이밍 맞춰 쌓아 올리는 원터치 스택 게임.',
    '/images/games/stack-tower.png',
    'EASY',
    'ACTIVE',
    25,
    (select id from public.categories where slug = 'casual'),
    false,
    array['casual', 'timing', 'one-touch'],
    '화면을 탭해 움직이는 블록을 정확히 쌓으세요. 삐뚤어지면 잘려 나가고, 블록이 너무 작아지면 게임 오버입니다.'
  ),
  (
    'ball-sort',
    'Ball Sort',
    '같은 색 공을 튜브별로 정리하는 볼 소트 퍼즐.',
    '/images/games/ball-sort.png',
    'EASY',
    'ACTIVE',
    26,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'sort', 'casual'],
    '튜브를 탭해 공을 옮기세요. 같은 색만 위에 쌓을 수 있고, 모든 튜브를 색별로 정리하면 클리어입니다.'
  ),
  (
    'color-sort',
    'Color Sort',
    '액체를 색깔별로 나누는 컬러 소트 퍼즐.',
    '/images/games/color-sort.png',
    'EASY',
    'ACTIVE',
    27,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'sort', 'logic'],
    '튜브를 탭해 위쪽 액체를 옮기세요. 같은 색만 합칠 수 있습니다. 모든 색을 분리하면 승리!'
  ),
  (
    'penalty-shootout',
    'Penalty Shootout',
    '골키퍼를 피해 페널티킥을 넣는 스포츠 미니게임.',
    '/images/games/penalty-shootout.png',
    'EASY',
    'ACTIVE',
    28,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'soccer', 'timing'],
    '골대를 탭해 킥 방향을 정하세요. 5번의 기회 안에 최대한 많은 골을 넣으세요.'
  ),
  (
    'darts',
    'Darts',
    '다트판을 조준해 10번 던지는 스포츠 캐주얼.',
    '/images/games/darts.png',
    'EASY',
    'ACTIVE',
    29,
    (select id from public.categories where slug = 'sports'),
    false,
    array['sports', 'aiming', 'casual'],
    '다트판을 탭해 던질 위치를 고르세요. 중앙에 가까울수록 높은 점수, 10번 던진 합계가 기록됩니다.'
  ),
  (
    'bubble-shooter',
    'Bubble Shooter',
    '열을 골라 버블을 쏘고 3개 이상 연결해 터뜨리는 슈터.',
    '/images/games/bubble-shooter.png',
    'EASY',
    'ACTIVE',
    30,
    (select id from public.categories where slug = 'casual'),
    false,
    array['casual', 'match', 'shooter'],
    '열을 탭해 버블을 쏘세요. 같은 색 3개 이상이 연결되면 터집니다. 바닥까지 내려오면 게임 오버!'
  ),
  (
    'merge-blocks',
    'Merge Blocks',
    '열에 블록을 떨어뜨려 같은 숫자를 합치는 머지 퍼즐.',
    '/images/games/merge-blocks.png',
    'EASY',
    'ACTIVE',
    31,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'merge', '2048'],
    '열을 탭해 블록을 떨어뜨리세요. 같은 숫자가 맞닿으면 합쳐집니다. 칸이 가득 차면 끝!'
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
