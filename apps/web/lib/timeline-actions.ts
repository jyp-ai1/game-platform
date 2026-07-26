/**
 * Timeline actions — every beat has a CTA (Replay OS v5).
 */
import { getBestScore } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getGenreCollections } from "@/lib/collection-engine";
import { getFriendBeatGap, buildReplayIdentityProfile } from "@/lib/replay-identity";
import { buildReplayStoryFeed } from "@/lib/replay-story-feed";
import { getTodayMissionMix, getTodayMissionProgress, isTodayMissionMixComplete } from "@/lib/universal-mission-engine";

export interface TimelineBeat {
  id: string;
  emoji: string;
  text: string;
  sub: string;
  href: string;
  ctaLabel: string;
}

function ctaForType(type: string, href: string): string {
  if (href.includes("challenge")) return "재도전";
  if (type === "collection") return "마지막 조각 찾기";
  if (type === "achievement") return "축하하기";
  if (type === "mission") return "미션 완료";
  if (type === "challenge") return "도전장 확인";
  return "다시 도전";
}

export function buildActionTimeline(games: Game[], limit = 5): TimelineBeat[] {
  if (typeof window === "undefined") return [];

  const beats: TimelineBeat[] = [];
  const identity = buildReplayIdentityProfile(games);
  const slug = identity.topGameSlug ?? games[0]?.slug ?? "snake";
  const best = getBestScore(slug);
  const friend = getFriendBeatGap(slug, best);

  if (best > 0) {
    beats.push({
      id: "best",
      emoji: "🏆",
      text: `${identity.topGameTitle ?? slug} 최고기록 ${best.toLocaleString()}점`,
      sub: "오늘",
      href: `/games/${slug}`,
      ctaLabel: "다시 도전",
    });
  }

  if (friend.gap > 0) {
    beats.push({
      id: "friend",
      emoji: "👥",
      text: `친구 ${friend.nickname} · ${friend.friendScore.toLocaleString()}점`,
      sub: `${friend.gap.toLocaleString()}점 차`,
      href: `/games/${slug}`,
      ctaLabel: "점수 깨기",
    });
  }

  const col = getGenreCollections(games).find((c) => c.percent >= 50);
  if (col) {
    beats.push({
      id: `col-${col.genre}`,
      emoji: col.emoji,
      text: `${col.label} Collection ${col.percent}%`,
      sub: col.percent >= 90 ? "거의 완성!" : "수집 중",
      href: `/categories/${col.genre}`,
      ctaLabel: col.percent >= 90 ? "마지막 조각 찾기" : "더 모으기",
    });
  }

  for (const c of listChallenges().slice(0, 1)) {
    beats.push({
      id: `ch-${c.id}`,
      emoji: "⚔️",
      text: `${c.challengerNickname} vs ${c.targetNickname}`,
      sub: c.gameTitle,
      href: `/games/${c.gameSlug}?challenge=${c.id}`,
      ctaLabel: "재도전",
    });
  }

  const feed = buildReplayStoryFeed(games, 3);
  for (const e of feed.filter((x) => x.type === "achievement" || x.type === "new_best")) {
    beats.push({
      id: e.id,
      emoji: e.emoji,
      text: e.headline,
      sub: e.detail,
      href: e.href,
      ctaLabel: ctaForType(e.type, e.href),
    });
  }

  if (!isTodayMissionMixComplete()) {
    const m = getTodayMissionProgress();
    const next = getTodayMissionMix().find((x) => !x.done);
    beats.push({
      id: "mission",
      emoji: "🎯",
      text: `오늘 미션 ${m.done}/${m.total}`,
      sub: next?.label ?? "",
      href: next?.href ?? "/missions",
      ctaLabel: "미션 플레이",
    });
  }

  return beats.slice(0, limit);
}
