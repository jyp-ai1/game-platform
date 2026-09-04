/**
 * Sprint 23 — merge published creator games into catalog Game[].
 */
import type { Game } from "@game-platform/shared";
import { setCreatorMultiplayerSlugs } from "@game-platform/game-sdk/src/game-metadata";

import type { CreatorGameRecord } from "@/lib/creator/creator-game-registry";
import { listPublishedCreatorGames, listServerCreatorGames } from "@/lib/creator/creator-game-server";
import { mergeLocalMvpGames } from "@/lib/local-mvp-games";
import { filterProductCatalogGames } from "@/lib/product-catalog-sync";

export function creatorRecordToGame(record: CreatorGameRecord): Game {
  const mp = record.gameType === "multiplayer";
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    thumbnailUrl: record.thumbnailUrl ?? "/images/games/2048.png",
    difficulty: "MEDIUM",
    status: record.status === "published" ? "ACTIVE" : "COMING_SOON",
    sortOrder: 850,
    categoryId: null,
    category: { name: "Creator", slug: "creator" },
    isFeatured: false,
    tags: ["creator", mp ? "multiplayer" : "solo"],
    howToPlay: "Arrow keys · platform contract entry",
    playCount: record.playCount,
    nostalgiaNote: null,
    playUrl: null,
    sourceType: "native",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/** Preview/review games resolve for direct links (not in public catalog lists). */
export function creatorRecordForSlug(slug: string): CreatorGameRecord | null {
  return listServerCreatorGames().find((g) => g.slug === slug) ?? null;
}

export function isCreatorMultiplayerSlug(slug: string): boolean {
  const record = creatorRecordForSlug(slug);
  return record?.gameType === "multiplayer";
}

export function creatorDisplayName(slug: string): string | null {
  return creatorRecordForSlug(slug)?.creatorName ?? null;
}

function refreshMpSlugs(): void {
  const mpSlugs = listServerCreatorGames()
    .filter((g) => g.gameType === "multiplayer" && g.status === "published")
    .map((g) => g.slug);
  setCreatorMultiplayerSlugs(mpSlugs);
}

/** Merge published creator rows into an existing games list. */
export function mergeCreatorPublishedGames(games: Game[]): Game[] {
  refreshMpSlugs();
  const published = listPublishedCreatorGames().map(creatorRecordToGame);
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  for (const g of published) {
    bySlug.set(g.slug, g);
  }
  return [...bySlug.values()];
}

/** Catalog merge: local MVP + creator published; deprecated slugs excluded. */
export function mergeCatalogGames(games: Game[]): Game[] {
  return filterProductCatalogGames(mergeCreatorPublishedGames(mergeLocalMvpGames(games)));
}

export function getCreatorGameOrNull(slug: string): Game | null {
  const record = creatorRecordForSlug(slug);
  if (!record) return null;
  if (record.status !== "published" && record.status !== "preview" && record.status !== "review") {
    return null;
  }
  return creatorRecordToGame(record);
}
