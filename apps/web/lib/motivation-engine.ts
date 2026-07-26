/**
 * Motivation Engine — every hook → game start (DAU / Replay OS v5).
 */
import { getBestScore, getDailyStreak, getTodayPlayCount } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getGenreCollections } from "@/lib/collection-engine";
import { buildHabitState } from "@/lib/habit-engine";
import { buildReplayIdentityProfile, getFriendBeatGap } from "@/lib/replay-identity";
import { getTodayMissionMix, getTodayMissionProgress } from "@/lib/universal-mission-engine";

export interface PlayMotivation {
  id: string;
  emoji: string;
  headline: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
  urgency: number;
}

function topGameSlug(games: Game[], identity: ReturnType<typeof buildReplayIdentityProfile>): string {
  return identity.topGameSlug ?? games.find((g) => g.status === "ACTIVE")?.slug ?? "snake";
}

export function buildPlayMotivations(games: Game[]): PlayMotivation[] {
  if (typeof window === "undefined") return [];

  const identity = buildReplayIdentityProfile(games);
  const habit = buildHabitState(games);
  const slug = topGameSlug(games, identity);
  const best = getBestScore(slug);
  const friend = getFriendBeatGap(slug, best);
  const items: PlayMotivation[] = [];

  const top10Gap = Math.max(250, Math.round(identity.replayScore * 0.08));
  if (!habit.todayPlayed || top10Gap > 0) {
    items.push({
      id: "top10",
      emoji: "🏆",
      headline: `Top10까지 ${top10Gap.toLocaleString()}점`,
      detail: "한 판이면 충분할 수 있어요",
      ctaLabel: "Replay 시작",
      ctaHref: `/games/${slug}`,
      urgency: 9,
    });
  }

  if (getTodayPlayCount() === 0) {
    items.push({
      id: "double-coin",
      emoji: "🪙",
      headline: "오늘만 2배 Coin",
      detail: "첫 판 보너스 · 놓치면 사라져요",
      ctaLabel: "첫 판 시작",
      ctaHref: `/games/${slug}`,
      urgency: 10,
    });
  }

  const pending = listChallenges().filter((c) => c.status !== "complete");
  for (const c of pending.slice(0, 2)) {
    items.push({
      id: `challenge-${c.id}`,
      emoji: "⚔️",
      headline: `${c.challengerNickname}이 도전장을 보냈습니다`,
      detail: `${c.gameTitle} · 지금 받아보세요`,
      ctaLabel: "재도전",
      ctaHref: `/games/${c.gameSlug}?challenge=${c.id}`,
      urgency: 11,
    });
  }

  if (friend.gap > 0) {
    items.push({
      id: "friend-beat",
      emoji: "👥",
      headline: `친구 ${friend.nickname} · ${friend.friendScore.toLocaleString()}점`,
      detail: `${friend.gap.toLocaleString()}점만 더 하면 이깁니다`,
      ctaLabel: "점수 깨기",
      ctaHref: `/games/${slug}`,
      urgency: 8,
    });
  }

  const mission = getTodayMissionProgress();
  if (mission.done < mission.total) {
    const next = getTodayMissionMix().find((m) => !m.done);
    items.push({
      id: "mission",
      emoji: "🎯",
      headline: `오늘 미션 ${mission.done}/${mission.total}`,
      detail: next?.label ?? "미션 완료하고 +Coin",
      ctaLabel: "미션 플레이",
      ctaHref: next?.href ?? `/games/${slug}`,
      urgency: 7,
    });
  }

  const streak = getDailyStreak();
  if (habit.streakAtRisk && streak.currentStreak > 0) {
    items.push({
      id: "streak",
      emoji: "🔥",
      headline: `Replay를 안 하면 ${streak.currentStreak}일 streak 종료`,
      detail: "오늘 자정 전에 한 판만",
      ctaLabel: "Streak 지키기",
      ctaHref: `/games/${slug}`,
      urgency: 12,
    });
  }

  const col = getGenreCollections(games).find((c) => c.percent >= 70 && c.percent < 100);
  if (col) {
    items.push({
      id: `col-${col.genre}`,
      emoji: col.emoji,
      headline: `${col.label} Collection ${col.percent}%`,
      detail: `${col.total - col.completed}게임만 남음`,
      ctaLabel: "마지막 조각 찾기",
      ctaHref: `/categories/${col.genre}`,
      urgency: 6,
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency).slice(0, 5);
}

export function getPrimaryPlayHref(games: Game[]): string {
  const motivations = buildPlayMotivations(games);
  return motivations[0]?.ctaHref ?? `/games/${games[0]?.slug ?? "snake"}`;
}
