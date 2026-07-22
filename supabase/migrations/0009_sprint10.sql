-- Sprint 10: Season & Competitive Loop. Personal-rank lookup for the
-- Leaderboard's "내 순위" line and the homepage Player Rank card -- everything
-- else this sprint needed (Weekly leaderboard tab, "Top100" limit) already
-- worked via get_leaderboard's existing p_since/p_limit params, no schema
-- change required.

-- Returns this device's 1-based rank within game_slug (optionally cut off at
-- p_since, same convention as get_leaderboard), or null if this device has
-- no score in that game/period -- the client treats null as "unranked".
--
-- Note: "count(*) + 1 where score > (subquery)" alone would NOT return null
-- for an unranked device -- if the subquery yields no row, the comparison
-- evaluates to unknown for every candidate row, so count(*) is 0 and the
-- result is 1 (a false "rank 1"), not null. The `from (my-score subquery) my`
-- join below is what actually makes an empty my-score result propagate to a
-- genuinely empty (i.e. null) function result.
create or replace function public.get_my_rank(
  p_game_slug text,
  p_device_id text,
  p_since timestamptz default null
)
returns integer
language sql
stable
as $$
  select (
    select count(*) + 1
    from public.scores s
    where s.game_slug = p_game_slug
      and (p_since is null or s.updated_at >= p_since)
      and s.score > my.score
  )
  from (
    select score
    from public.scores
    where game_slug = p_game_slug
      and device_id = p_device_id
      and (p_since is null or updated_at >= p_since)
  ) my
$$;

grant execute on function public.get_my_rank(text, text, timestamptz) to authenticated, anon;

-- Epic 6: 2 new games. SameGame (turn-based, click-to-clear -- Puzzle) and
-- Arkanoid DX (Breakout-shaped engine but with multi-stage progression +
-- power-ups -- Arcade, alongside Breakout).
insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'samegame',
    'SameGame',
    '같은 색 타일을 모아 터뜨리는 클릭 한 방 퍼즐.',
    '/images/games/samegame.png',
    'MEDIUM',
    'ACTIVE',
    23,
    (select id from public.categories where slug = 'puzzle'),
    false,
    array['puzzle', 'casual', 'click'],
    '같은 색 타일이 2개 이상 인접하면 클릭해 제거하세요. 큰 그룹을 한 번에 지울수록 점수가 크게 오릅니다. 더 이상 지울 수 있는 그룹이 없으면 게임이 끝납니다.'
  ),
  (
    'arkanoid-dx',
    'Arkanoid DX',
    '패들로 공을 튕겨 벽돌을 깨는 클래식에 스테이지와 파워업을 더한 강화판.',
    '/images/games/arkanoid-dx.png',
    'MEDIUM',
    'ACTIVE',
    24,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'action', 'power-up'],
    '방향키 또는 드래그로 패들을 움직여 공을 받아치세요. 파란 캡슐은 패들을 넓히고, 주황 캡슐은 공을 3개로 늘립니다. 3개 스테이지를 모두 깨면 클리어!'
  )
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url,
  description = excluded.description;

update public.games set nostalgia_note = '컬럼(Columns)류 퍼즐이 유행하던 시절, 쉬는 시간마다 학교 컴퓨터실에서 몰래 즐기던 그 손맛. 큰 무더기를 한 번에 터뜨렸을 때의 쾌감은 지금도 그대로입니다.' where slug = 'samegame';
update public.games set nostalgia_note = '오락실 구석 벽돌깨기 기계에서 파워업 캡슐이 떨어질 때마다 환호하던 그 순간. 패들이 넓어지고 공이 여러 개로 늘어나면 온 오락실이 들썩였죠.' where slug = 'arkanoid-dx';
