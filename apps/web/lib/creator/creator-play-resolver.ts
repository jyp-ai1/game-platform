/**
 * Sprint 23 — resolve creator slug → template engine for GamePlayer.
 */
import type { PlayableSlug } from "@/lib/playable-games";
import { isPlayableSlug } from "@/lib/playable-games";

import { creatorRecordForSlug, isCreatorMultiplayerSlug } from "@/lib/creator/creator-game-catalog";
import { isCreatorGameSlug } from "@/lib/creator/creator-game-registry";

export function resolveCreatorTemplateSlug(slug: string): PlayableSlug | null {
  if (!isCreatorGameSlug(slug)) return null;
  const record = creatorRecordForSlug(slug);
  if (!record) return null;
  return record.templateSlug;
}

/** True when slug is a creator game that can enter /games/{slug}/play. */
export function isCreatorPlayableSlug(slug: string): boolean {
  if (!isCreatorGameSlug(slug)) return false;
  const record = creatorRecordForSlug(slug);
  if (!record) return false;
  return record.status === "published" || record.status === "preview" || record.status === "review";
}

export function resolvePlaySlug(slug: string): PlayableSlug | null {
  if (isPlayableSlug(slug)) return slug;
  const template = resolveCreatorTemplateSlug(slug);
  if (template && isPlayableSlug(template)) return template;
  return null;
}

export { isCreatorMultiplayerSlug, isCreatorGameSlug };
