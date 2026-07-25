/**
 * Rule-engine Game DNA badges (no AI). Epic5 will expand; Profile uses lite set.
 */
export type GameDnaBadge =
  | "Explorer"
  | "Collector"
  | "Competitor"
  | "Puzzle Lover"
  | "Arcade Fan"
  | "Retro Soul";

const BADGE_LABELS: Record<GameDnaBadge, string> = {
  Explorer: "Explorer",
  Collector: "Collector",
  Competitor: "Competitor",
  "Puzzle Lover": "Puzzle Lover",
  "Arcade Fan": "Arcade Fan",
  "Retro Soul": "Retro Soul",
};

export function getBadgeLabel(badge: GameDnaBadge): string {
  return BADGE_LABELS[badge];
}

export function computeGameDnaBadges(input: {
  totalPlays: number;
  favoriteCount: number;
  categoryPlayCounts: Record<string, number>;
  distinctGamesPlayed: number;
}): GameDnaBadge[] {
  const { totalPlays, favoriteCount, categoryPlayCounts, distinctGamesPlayed } = input;

  if (totalPlays === 0) {
    return ["Explorer"];
  }

  const badges: GameDnaBadge[] = [];
  const entries = Object.entries(categoryPlayCounts);
  const topCategory =
    entries.length > 0
      ? entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : null;

  if (distinctGamesPlayed >= 8) badges.push("Explorer");
  if (favoriteCount >= 3) badges.push("Collector");
  if (totalPlays >= 20) badges.push("Competitor");

  if (topCategory === "puzzle" || topCategory === "brain") {
    badges.push("Puzzle Lover");
  } else if (topCategory === "arcade") {
    badges.push("Arcade Fan");
  } else if (topCategory === "retro") {
    badges.push("Retro Soul");
  }

  if (badges.length === 0) badges.push("Explorer");

  return [...new Set(badges)].slice(0, 4);
}
