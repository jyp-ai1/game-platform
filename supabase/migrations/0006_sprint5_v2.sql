-- Sprint 5 v2: brand experience — real popularity signal (play_count),
-- nostalgia-note copy schema, and the Air Hockey game.

alter table public.games
  add column if not exists play_count integer not null default 0;

alter table public.games
  add column if not exists nostalgia_note text;

-- Called once per page-view of a playable game (see
-- apps/web/components/recently-played-recorder.tsx), mirroring the
-- security-definer RPC pattern already used by submit_score.
create or replace function public.increment_play_count(p_game_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set play_count = play_count + 1
  where slug = p_game_slug;
end;
$$;

grant execute on function public.increment_play_count(text) to authenticated, anon;

-- New game: Air Hockey (original two-paddle real-time puck game, no copied IP).
insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values (
  'air-hockey',
  'Air Hockey',
  '퍽을 쳐내며 상대보다 먼저 득점하는 실시간 에어하키.',
  '/images/games/air-hockey.png',
  'MEDIUM',
  'ACTIVE',
  16,
  (select id from public.categories where slug = 'casual'),
  true,
  array['casual', 'arcade-classic', 'quick-play'],
  '드래그(또는 방향키)로 패들을 움직여 퍽을 쳐내세요. 자신의 골대(하단)에 퍽이 들어가면 실점하고, 상대 골대(상단)에 넣으면 득점합니다. 7점을 먼저 획득하면 승리합니다.'
)
on conflict (slug) do update set
  status = excluded.status,
  is_featured = excluded.is_featured,
  category_id = excluded.category_id,
  tags = excluded.tags,
  how_to_play = excluded.how_to_play,
  thumbnail_url = excluded.thumbnail_url,
  description = excluded.description;

-- Nostalgia notes (representative subset — remaining games' copy follows in
-- a later migration once fully drafted).
update public.games set nostalgia_note = '1990년대 피처폰 첫 화면을 켜면 늘 이 게임이 있었죠. 배터리가 닳는 줄도 모르고 몰입했던 그 시절의 추억.' where slug = 'snake';
update public.games set nostalgia_note = '동전 하나로 오후 내내 벽돌을 부수던 오락실의 풍경. 단순한 규칙 속에 숨은 손맛은 지금도 그대로입니다.' where slug = 'breakout';
update public.games set nostalgia_note = '2010년대 스마트폰을 순식간에 점령했던 숫자 퍼즐. 손끝으로 밀어 넣던 그 중독적인 손맛을 다시 느껴보세요.' where slug = '2048';
update public.games set nostalgia_note = '종이 한 장, 연필 한 자루만 있으면 되던 가장 오래된 놀이. 누구나 규칙을 알던 그 시절의 단순한 즐거움.' where slug = 'tic-tac-toe';
update public.games set nostalgia_note = '교실 뒤편 칠판에 그려지던 단어 맞추기 게임. 친구들과 머리를 맞대던 그 순간을 다시 만나보세요.' where slug = 'hangman';
update public.games set nostalgia_note = '오락실 한켠, 동전을 걸고 친구와 실력을 겨루던 그 승부욕을 다시 느껴보세요.' where slug = 'air-hockey';
