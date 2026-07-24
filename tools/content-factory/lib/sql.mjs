import { sqlLiteral, sqlTextArray } from "./manifest.mjs";

/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 */
export function generateMigrationSql(m) {
  const thumb = `/images/games/${m.slug}.png`;
  return `-- Content Factory: games row for ${m.slug}
-- Operator: run in Supabase SQL Editor (review before apply)

insert into public.games (
  slug, title, description, thumbnail_url, difficulty, status, sort_order,
  category_id, is_featured, tags, how_to_play
)
values (
  ${sqlLiteral(m.slug)},
  ${sqlLiteral(m.title)},
  ${sqlLiteral(m.description)},
  ${sqlLiteral(thumb)},
  ${sqlLiteral(m.difficulty)},
  'ACTIVE',
  ${m.sortOrder},
  (select id from public.categories where slug = ${sqlLiteral(m.category)}),
  false,
  ${sqlTextArray(m.tags)},
  ${sqlLiteral(m.howToPlay)}
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
set released_at = coalesce(released_at, ${sqlLiteral(m.releasedAt)}::timestamptz)
where slug = ${sqlLiteral(m.slug)};
`;
}

/**
 * @param {GameManifest} m
 */
export function generateCmsSql(m) {
  const slug = sqlLiteral(m.slug);
  const title = sqlLiteral(m.title);
  return `-- Content Factory: CMS bundle for ${m.slug}

insert into public.cms_game_visibility (game_slug, visibility)
values (${slug}, 'visible')
on conflict (game_slug) do update set visibility = excluded.visibility;

insert into public.cms_events (title, description, game_slug, reward_text, starts_at, ends_at, is_active)
select
  ${title} || ' 출시!',
  '신규 게임 ' || ${title} || ' — 지금 플레이하고 첫 판 XP 보너스를 받아보세요.',
  ${slug},
  '첫 플레이 XP 2× (7일)',
  coalesce(g.released_at, now()),
  coalesce(g.released_at, now()) + interval '7 days',
  true
from public.games g
where g.slug = ${slug}
  and not exists (
    select 1 from public.cms_events e
    where e.game_slug = ${slug}
      and e.starts_at >= coalesce(g.released_at, now()) - interval '1 day'
  );

insert into public.cms_featured_games (slot, game_slug, sort_order, is_active)
values ('new_games', ${slug}, ${m.sortOrder}, true)
on conflict (slot, game_slug) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
`;
}
