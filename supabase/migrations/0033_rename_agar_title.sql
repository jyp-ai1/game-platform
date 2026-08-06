-- Rename user-facing Agar.io → Agar (trademark-safe display title).
-- Slug remains `agar`. Safe to re-run on environments that already applied 0032.

update public.games
set
  title = 'Agar',
  description = '세포를 키워 다른 플레이어를 삼키세요. Split · Eject · TOP10.',
  how_to_play = '마우스로 이동합니다. Space = 세포분열(Split). W = 먹이 방출(Eject). 자신보다 작은 세포만 먹을 수 있습니다.'
where slug = 'agar';
