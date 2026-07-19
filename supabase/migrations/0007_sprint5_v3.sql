-- Sprint 5 v3: Coming Soon placeholders for the Retro Arcade collection,
-- plus expanded "추억 이야기" (nostalgia note) coverage for playable games
-- that didn't get one in the 0006 migration.

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values
  (
    'circus',
    'Circus',
    '외줄과 트램펄린을 넘나드는 곡예 액션. 다음 시즌에 만나보실 수 있습니다.',
    '/images/games/circus.png',
    'MEDIUM',
    'COMING_SOON',
    17,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'coming-soon'],
    null
  ),
  (
    'olympic',
    'Olympic',
    '달리기, 멀리뛰기, 창던지기로 겨루는 육상 대회. 다음 시즌에 만나보실 수 있습니다.',
    '/images/games/olympic.png',
    'MEDIUM',
    'COMING_SOON',
    18,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'coming-soon'],
    null
  ),
  (
    'prince-of-persia',
    'Prince of Persia',
    '함정을 피해 검을 휘두르며 나아가는 어드벤처 액션. 다음 시즌에 만나보실 수 있습니다.',
    '/images/games/prince-of-persia.png',
    'HARD',
    'COMING_SOON',
    19,
    (select id from public.categories where slug = 'arcade'),
    false,
    array['arcade', 'coming-soon'],
    null
  )
on conflict (slug) do update set
  status = excluded.status, is_featured = excluded.is_featured,
  category_id = excluded.category_id, tags = excluded.tags,
  thumbnail_url = excluded.thumbnail_url, description = excluded.description,
  sort_order = excluded.sort_order;

update public.games set nostalgia_note = '친구들과 둘러앉아 카드를 뒤집으며 누가 더 잘 기억하나 겨루던 놀이. 단순한 규칙 속에 숨은 승부욕이 지금도 짜릿합니다.' where slug = 'memory';
update public.games set nostalgia_note = '회사 컴퓨터에 기본으로 깔려 있던 그 게임, 몰래 하다가 상사가 오면 재빨리 끄곤 했죠. 숫자 하나하나에 심장이 쫄깃했던 추억.' where slug = 'minesweeper';
update public.games set nostalgia_note = '오락실 한 켠에서 동전을 넣고 미로를 누비며 쫓고 쫓기던 그 긴장감. 좁은 통로를 돌 때마다 심장이 두근거렸죠.' where slug = 'maze-runner';
update public.games set nostalgia_note = '친구와 마주 앉아 벽돌을 부수며 서로의 탱크를 조준하던 저녁. 승부가 날 때까지 몇 시간이고 이어지던 대전이었습니다.' where slug = 'tank-battle';
update public.games set nostalgia_note = '동전 하나로 우주선을 조종하며 밀려오는 적기를 막아내던 오락실의 정석. 한 목숨이라도 더 살리려 안간힘을 썼던 기억.' where slug = 'galaxy-defender';
update public.games set nostalgia_note = '일렬로 내려오는 침략자들을 하나씩 격추하던 그 리듬감. 오락실의 시작을 알린 원조 슈팅 게임의 감성을 그대로.' where slug = 'space-defender';
update public.games set nostalgia_note = '같은 색 버블을 맞춰 터뜨리며 시간 가는 줄 몰랐던 캐주얼 게임. 쉬는 시간마다 한 판씩 하던 그 손맛.' where slug = 'bubble-pop';
update public.games set nostalgia_note = '신문 한 켠 퍼즐난을 오려 풀던 그 시절의 두뇌 게임. 빈칸 하나를 채울 때마다 느껴지던 작은 성취감.' where slug = 'sudoku';
update public.games set nostalgia_note = '불빛과 소리를 따라 순서를 외우던 전자완구의 추억. 단계가 올라갈수록 커지던 긴장감이 지금도 생생합니다.' where slug = 'simon';
update public.games set nostalgia_note = '화면에 뜨는 색을 순간적으로 맞추던 반사신경 게임. 친구들과 최고 기록을 겨루며 웃고 떠들던 순간들.' where slug = 'color-match';
