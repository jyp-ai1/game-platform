// Slugs that have real, playable game code registered in games/*. Kept in a
// plain (non-"use client") module so Server Components can check "is this
// slug playable?" without pulling in next/dynamic's client-only loader
// (see components/game-player.tsx).
export const PLAYABLE_SLUGS = ["2048"] as const;

export type PlayableSlug = (typeof PLAYABLE_SLUGS)[number];

export function isPlayableSlug(slug: string): slug is PlayableSlug {
  return (PLAYABLE_SLUGS as readonly string[]).includes(slug);
}
