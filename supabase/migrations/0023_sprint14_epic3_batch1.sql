-- Sprint 14 Epic 3 Batch 1: chess, checkers, jigsaw (P1 playable)
-- Operator: run in Supabase SQL Editor after content-factory merge to release/*

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'chess',
    'Chess',
    '클래식 체스 — CPU와 대국하는 전략 보드 게임.',
    '/images/games/chess.png',
    'MEDIUM',
    'ACTIVE',
    36,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'strategy', 'classic'],
    '말을 선택해 이동하세요. 상대 킹을 체크메이트하면 승리합니다.'
  ),
  (
    'checkers',
    'Checkers',
    '체커(드aughts) — CPU와 대각선 전략 대결.',
    '/images/games/checkers.png',
    'EASY',
    'ACTIVE',
    37,
    (select id from public.categories where slug = 'board'),
    false,
    array['board', 'classic'],
    '말을 선택하고 이동하세요. 점프로 상대 말을 제거하고 킹으로 승급하세요.'
  ),
  (
    'jigsaw',
    'Jigsaw',
    '색 조각을 맞춰 그림을 완성하는 3×3 직소 퍼즐.',
    '/images/games/jigsaw.png',
    'EASY',
    'ACTIVE',
    38,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'casual'],
    '조각을 탭해 빈 칸과 맞바꾸세요. 모든 조각을 올바른 순서로 배치하면 클리어입니다.'
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

update public.games
set released_at = coalesce(released_at, now())
where slug in ('chess', 'checkers', 'jigsaw');

insert into public.cms_game_visibility (game_slug, visibility)
select slug, 'visible'
from public.games
where slug in ('chess', 'checkers', 'jigsaw')
on conflict (game_slug) do update set visibility = excluded.visibility;

insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
select 'new_games', slug, sort_order, true
from public.games
where slug in ('chess', 'checkers', 'jigsaw')
on conflict (slot, game_slug) do update set sort_order = excluded.sort_order, is_active = true;
