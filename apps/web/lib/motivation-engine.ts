/**
 * Motivation Priority Engine — loss > social > gain (Replay OS v6).
 */
import { getBestScore, getDailyStreak, getTodayPlayCount } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getGenreCollections } from "@/lib/collection-engine";
import { buildHabitState } from "@/lib/habit-engine";
import { buildReplayIdentityProfile, getFriendBeatGap } from "@/lib/replay-identity";
import { SNAKE_QUICK_PLAY_MARKER } from "@/lib/snake-entry";
import { getTodayMissionMix, getTodayMissionProgress } from "@/lib/universal-mission-engine";

export const MOTIVATION_SCORES = {
  friend_overtake: 100,
  challenge_invite: 98,
  streak_loss: 95,
  top10: 90,
  mission: 70,
  double_coin: 45,
  collection: 50,
} as const;

export type MotivationKind = keyof typeof MOTIVATION_SCORES;

export interface PlayMotivation {
  id: string;
  kind: MotivationKind;
  emoji: string;
  headline: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
  score: number;
  isLoss: boolean;
}

const SNAKE_QUICK_PLAY = SNAKE_QUICK_PLAY_MARKER;

function playHrefForSlug(slug: string): string {
  return slug === "snake" ? SNAKE_QUICK_PLAY : `/games/${slug}`;
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

  if (friend.gap > 0) {
    items.push({
      id: "friend-overtake",
      kind: "friend_overtake",
      emoji: "😤",
      headline: `${friend.nickname}가 당신을 추월했습니다`,
      detail: `${friend.friendScore.toLocaleString()}점 · ${friend.gap.toLocaleString()}점 차`,
      ctaLabel: "재도전",
      ctaHref: playHrefForSlug(slug),
      score: MOTIVATION_SCORES.friend_overtake,
      isLoss: true,
    });
  }

  const pending = listChallenges().filter((c) => c.status !== "complete");
  for (const c of pending.slice(0, 2)) {
    items.push({
      id: `challenge-${c.id}`,
      kind: "challenge_invite",
      emoji: "⚔️",
      headline: `${c.challengerNickname} — 도전장`,
      detail: `${c.gameTitle} · 받고 바로 플레이`,
      ctaLabel: "받기",
      ctaHref:
        c.gameSlug === "snake"
          ? `${SNAKE_QUICK_PLAY}?challenge=${c.id}`
          : `/games/${c.gameSlug}?challenge=${c.id}`,
      score: MOTIVATION_SCORES.challenge_invite,
      isLoss: false,
    });
  }

  const streak = getDailyStreak();
  if (habit.streakAtRisk && streak.currentStreak > 0) {
    items.push({
      id: "streak",
      kind: "streak_loss",
      emoji: "🔥",
      headline: `오늘 안 하면 ${streak.currentStreak}일 streak 종료`,
      detail: "자정 전 한 판 · 잃기 전에 지키세요",
      ctaLabel: "Streak 지키기",
      ctaHref: playHrefForSlug(slug),
      score: MOTIVATION_SCORES.streak_loss,
      isLoss: true,
    });
  }

  const top10Gap = Math.max(250, Math.round(identity.replayScore * 0.08));
  if (top10Gap > 0) {
    items.push({
      id: "top10",
      kind: "top10",
      emoji: "🏆",
      headline: `Top10까지 ${top10Gap.toLocaleString()}점`,
      detail: "한 판이면 될 수 있어요",
      ctaLabel: "Replay 시작",
      ctaHref: playHrefForSlug(slug),
      score: MOTIVATION_SCORES.top10,
      isLoss: false,
    });
  }

  const mission = getTodayMissionProgress();
  if (mission.done < mission.total) {
    const next = getTodayMissionMix().find((m) => !m.done);
    items.push({
      id: "mission",
      kind: "mission",
      emoji: "🎯",
      headline: `오늘 미션 ${mission.done}/${mission.total}`,
      detail: next?.label ?? "",
      ctaLabel: "미션 플레이",
      ctaHref: next?.href ?? playHrefForSlug(slug),
      score: MOTIVATION_SCORES.mission,
      isLoss: false,
    });
  }

  const col = getGenreCollections(games).find((c) => c.percent >= 70 && c.percent < 100);
  if (col) {
    items.push({
      id: `col-${col.genre}`,
      kind: "collection",
      emoji: col.emoji,
      headline: `${col.label} Collection ${col.percent}%`,
      detail: `${col.total - col.completed}게임 남음`,
      ctaLabel: "마지막 조각",
      ctaHref: `/categories/${col.genre}`,
      score: MOTIVATION_SCORES.collection,
      isLoss: false,
    });
  }

  if (getTodayPlayCount() === 0 && !habit.streakAtRisk) {
    items.push({
      id: "double-coin",
      kind: "double_coin",
      emoji: "🪙",
      headline: "오늘만 2배 Coin",
      detail: "첫 판 보너스",
      ctaLabel: "첫 판 시작",
      ctaHref: playHrefForSlug(slug),
      score: MOTIVATION_SCORES.double_coin,
      isLoss: false,
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

export function getTopMotivation(games: Game[]): PlayMotivation | null {
  return buildPlayMotivations(games)[0] ?? null;
}

export function getSecondaryMotivations(games: Game[], limit = 3): PlayMotivation[] {
  return buildPlayMotivations(games).slice(1, 1 + limit);
}

export function getPrimaryPlayHref(games: Game[]): string {
  return getTopMotivation(games)?.ctaHref ?? playHrefForSlug(games[0]?.slug ?? "snake");
}
