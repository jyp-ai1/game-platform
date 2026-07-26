/**
 * Living Identity — weekly-shifting persona (Replay OS v6).
 */
import { getGamePlayCounts } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { filterPlayHistory, getPlayHistorySnapshot } from "@/lib/play-history";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";

const WEEKLY_TITLES: Record<string, { en: string; ko: string }> = {
  puzzle: { en: "Puzzle Lover", ko: "퍼즐 러버" },
  arcade: { en: "Action Lover", ko: "Action Lover" },
  board: { en: "Board Thinker", ko: "보드 씽커" },
  sports: { en: "Sports Fan", ko: "스포츠 팬" },
  casual: { en: "Casual Explorer", ko: "캐주얼 탐험가" },
  brain: { en: "Brain Trainer", ko: "두뇌 트레이너" },
};

export interface LivingIdentity {
  periodLabel: string;
  title: string;
  titleKo: string;
  subtitle: string;
  isWeekly: boolean;
}

function normalizeGenre(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("puzzle") || lower.includes("퍼즐")) return "puzzle";
  if (lower.includes("arcade") || lower.includes("action")) return "arcade";
  if (lower.includes("board") || lower.includes("보드")) return "board";
  if (lower.includes("sport")) return "sports";
  if (lower.includes("brain") || lower.includes("두뇌")) return "brain";
  return "casual";
}

export function getLivingIdentity(games: Game[]): LivingIdentity {
  const history = getPlayHistorySnapshot();
  const weekEntries = filterPlayHistory(history, "week");
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const genreCounts = new Map<string, number>();

  for (const entry of weekEntries) {
    const game = bySlug.get(entry.slug);
    const genre = normalizeGenre(game?.category?.slug ?? game?.category?.name ?? "casual");
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }

  const topWeek = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  if (topWeek && topWeek[1] >= 2) {
    const titles = WEEKLY_TITLES[topWeek[0]] ?? WEEKLY_TITLES.casual;
    return {
      periodLabel: "이번 주",
      title: titles.en,
      titleKo: titles.ko,
      subtitle: `${topWeek[1]}판 · 주간 정체성`,
      isWeekly: true,
    };
  }

  const allTime = buildReplayIdentityProfile(games);
  const counts = getGamePlayCounts();
  const totalWeekPlays = weekEntries.length;

  if (totalWeekPlays === 0) {
    return {
      periodLabel: "Replay",
      title: allTime.title,
      titleKo: allTime.titleKo,
      subtitle: "첫 판을 시작하면 정체성이 생깁니다",
      isWeekly: false,
    };
  }

  const titles = WEEKLY_TITLES[normalizeGenre(allTime.topGenre)] ?? {
    en: allTime.title,
    ko: allTime.titleKo,
  };

  return {
    periodLabel: "이번 주",
    title: titles.en,
    titleKo: titles.ko,
    subtitle: `${Object.keys(counts).length}게임 · ${totalWeekPlays}판`,
    isWeekly: true,
  };
}

export function getLivingIdentityStatement(games: Game[]): string {
  const living = getLivingIdentity(games);
  if (living.isWeekly) {
    return `${living.periodLabel} ${living.titleKo} — ${living.subtitle}`;
  }
  return `당신은 ${living.titleKo}입니다`;
}
