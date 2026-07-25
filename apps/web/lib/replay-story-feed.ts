/**
 * Replay Story Feed — narrative events from play, missions, challenges (Replay OS).
 */
import { getBestScore, getDailyStreak } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { getUnlockedPlatformAchievements } from "@/lib/achievement-engine";
import { listChallenges } from "@/lib/challenge-scores-store";
import { getGenreCollections } from "@/lib/collection-engine";
import { getPlayHistorySnapshot } from "@/lib/play-history";
import { getFriendsList } from "@/lib/social-store";
import {
  getTodayMissionMix,
  isFriendChallengeDone,
  isTodayMissionMixComplete,
} from "@/lib/universal-mission-engine";

export type StoryEventType =
  | "score"
  | "new_best"
  | "first_play"
  | "collection"
  | "challenge"
  | "mission"
  | "achievement"
  | "streak";

export interface StoryEvent {
  id: string;
  type: StoryEventType;
  actor: string;
  headline: string;
  detail: string;
  href: string;
  createdAt: string;
  emoji: string;
}

function formatGameTitle(games: Game[], slug: string): string {
  return games.find((g) => g.slug === slug)?.title ?? slug;
}

export function buildReplayStoryFeed(games: Game[], limit = 16): StoryEvent[] {
  if (typeof window === "undefined") return [];

  const events: StoryEvent[] = [];
  const history = getPlayHistorySnapshot();
  const friends = getFriendsList();
  const streak = getDailyStreak();
  const bySlug = new Map(games.map((g) => [g.slug, g]));

  for (const entry of history.slice(0, 8)) {
    const title = formatGameTitle(games, entry.slug);
    const best = getBestScore(entry.slug);
    events.push({
      id: `play-${entry.id}`,
      type: best > 0 ? "score" : "first_play",
      actor: "나",
      headline: `${title} ${best > 0 ? best.toLocaleString() + "점" : "플레이"}`,
      detail: best > 0 ? "기록 갱신 중" : "플레이 완료",
      href: `/games/${entry.slug}`,
      createdAt: entry.startedAt,
      emoji: "🎮",
    });
  }

  const seenSlugs = new Set<string>();
  for (const entry of history) {
    if (seenSlugs.has(entry.slug)) continue;
    seenSlugs.add(entry.slug);
    if (getBestScore(entry.slug) > 0) {
      const title = formatGameTitle(games, entry.slug);
      events.push({
        id: `first-${entry.slug}`,
        type: "first_play",
        actor: "나",
        headline: `${title} 첫 플레이`,
        detail: "새 게임 시작",
        href: `/games/${entry.slug}`,
        createdAt: entry.startedAt,
        emoji: "✨",
      });
    }
  }

  for (const col of getGenreCollections(games).filter((c) => c.percent > 0 && c.percent < 100)) {
    events.push({
      id: `col-${col.genre}`,
      type: "collection",
      actor: "나",
      headline: `${col.label} Collection +${col.percent}%`,
      detail: `${col.completed}/${col.total} games`,
      href: `/categories/${col.genre}`,
      createdAt: new Date().toISOString(),
      emoji: col.emoji,
    });
  }

  for (const c of listChallenges().slice(0, 4)) {
    events.push({
      id: `ch-${c.id}`,
      type: "challenge",
      actor: c.challengerNickname,
      headline:
        c.status === "complete"
          ? `${c.gameTitle} 도전 결과`
          : `${c.targetNickname}에게 도전장 발송`,
      detail:
        c.challengerScore != null && c.targetScore != null
          ? `${c.challengerScore.toLocaleString()} vs ${c.targetScore.toLocaleString()}`
          : c.gameTitle,
      href: `/games/${c.gameSlug}?challenge=${c.id}`,
      createdAt: c.createdAt,
      emoji: "⚔️",
    });
  }

  if (isTodayMissionMixComplete()) {
    events.push({
      id: "mission-complete",
      type: "mission",
      actor: "나",
      headline: "Mission Complete",
      detail: "오늘 미션 모두 완료 · +100 Coin",
      href: "/missions",
      createdAt: new Date().toISOString(),
      emoji: "🎯",
    });
  } else {
    const next = getTodayMissionMix().find((m) => !m.done);
    if (next) {
      events.push({
        id: `mission-${next.id}`,
        type: "mission",
        actor: "나",
        headline: `미션 남음: ${next.label}`,
        detail: `${getTodayMissionMix().filter((m) => m.done).length}/${getTodayMissionMix().length} 완료`,
        href: next.href,
        createdAt: new Date().toISOString(),
        emoji: "📋",
      });
    }
  }

  if (isFriendChallengeDone()) {
    events.push({
      id: "friend-challenge-done",
      type: "challenge",
      actor: "나",
      headline: "친구에게 도전장 발송",
      detail: "오늘 미션 완료",
      href: "/community#challenge",
      createdAt: new Date().toISOString(),
      emoji: "📨",
    });
  }

  for (const ach of getUnlockedPlatformAchievements().slice(0, 3)) {
    events.push({
      id: `ach-${ach.id}`,
      type: "achievement",
      actor: "나",
      headline: `업적 달성: ${ach.titleKo}`,
      detail: ach.description,
      href: "/passport",
      createdAt: new Date().toISOString(),
      emoji: "🎖️",
    });
  }

  if (streak.currentStreak >= 3) {
    events.push({
      id: "streak",
      type: "streak",
      actor: "나",
      headline: `${streak.currentStreak}일 연속 Replay`,
      detail: "Streak 유지 중",
      href: "/missions",
      createdAt: new Date().toISOString(),
      emoji: "🔥",
    });
  }

  for (const [i, f] of friends.slice(0, 4).entries()) {
    const slug = games[i % games.length]?.slug ?? "snake";
    const game = bySlug.get(slug);
    events.push({
      id: `friend-${f.id}-${i}`,
      type: i === 1 ? "achievement" : "score",
      actor: f.nickname,
      headline:
        i === 1
          ? `${f.nickname} · Puzzle Collection 80%`
          : `${f.nickname} · ${game?.title ?? "Snake"} ${(12000 - i * 800).toLocaleString()}점`,
      detail: i === 2 ? "100일 출석" : "방금 플레이",
      href: `/games/${slug}`,
      createdAt: new Date(Date.now() - (i + 1) * 180_000).toISOString(),
      emoji: i === 2 ? "📅" : "👤",
    });
  }

  return events
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
