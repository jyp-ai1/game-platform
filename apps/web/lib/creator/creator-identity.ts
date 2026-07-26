/** Creator Identity — dual player + creator persona. */

import { getLevelProgress } from "@game-platform/game-sdk";

import { getMyCreatorProfile } from "./creator-store";

export interface CreatorIdentity {
  creatorLevel: number;
  creatorTitle: string;
  publishedCount: number;
  totalPlays: number;
  totalLikes: number;
  followers: number;
  playerLevel: number;
  playerTitle: string;
}

const CREATOR_TITLES: { min: number; title: string }[] = [
  { min: 20, title: "Master Creator" },
  { min: 10, title: "Pro Developer" },
  { min: 5, title: "Rising Creator" },
  { min: 1, title: "Indie Maker" },
  { min: 0, title: "New Creator" },
];

export function getCreatorTitle(level: number): string {
  return CREATOR_TITLES.find((t) => level >= t.min)?.title ?? "New Creator";
}

export function getCreatorIdentity(): CreatorIdentity {
  const creator = getMyCreatorProfile();
  const player = getLevelProgress();
  return {
    creatorLevel: creator.level,
    creatorTitle: getCreatorTitle(creator.level),
    publishedCount: creator.publishedCount,
    totalPlays: creator.totalPlays,
    totalLikes: creator.totalLikes,
    followers: creator.followers,
    playerLevel: player.level,
    playerTitle: `Lv.${player.level}`,
  };
}

export function formatCreatorStats(identity: CreatorIdentity): string {
  return `Creator Lv${identity.creatorLevel} · Published ${identity.publishedCount} · ${formatPlays(identity.totalPlays)} Plays`;
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
