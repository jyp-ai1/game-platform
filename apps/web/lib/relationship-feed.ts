/**
 * Relationship Feed — people-centric social (Replay OS v6).
 */
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { getBestScore } from "@game-platform/game-sdk";
import { buildReplayIdentityProfile, getFriendBeatGap } from "@/lib/replay-identity";
import { listSocialFeedEvents } from "@/lib/social-reactions-store";
import { getFriendsList } from "@/lib/social-store";

export type RelationType = "overtake" | "achievement" | "challenge" | "cheer" | "streak";

export interface RelationshipEvent {
  id: string;
  friendName: string;
  relation: RelationType;
  headline: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
  emoji: string;
  createdAt: string;
  score: number;
}

const RIVALS = [
  { name: "민수", score: 14200, relation: "overtake" as const },
  { name: "철수", score: 12000, relation: "challenge" as const },
  { name: "영희", score: 0, relation: "achievement" as const, achievement: "Puzzle Collection 80%" },
];

export function buildRelationshipFeed(games: Game[], limit = 12): RelationshipEvent[] {
  if (typeof window === "undefined") return [];

  const events: RelationshipEvent[] = [];
  const identity = buildReplayIdentityProfile(games);
  const slug = identity.topGameSlug ?? games[0]?.slug ?? "snake";
  const best = getBestScore(slug);
  const friend = getFriendBeatGap(slug, best);

  if (friend.gap > 0) {
    events.push({
      id: "rel-overtake-live",
      friendName: friend.nickname,
      relation: "overtake",
      headline: "당신을 추월했습니다",
      detail: `${friend.friendScore.toLocaleString()}점 · ${friend.gap.toLocaleString()}점 앞`,
      ctaLabel: "재도전",
      ctaHref: `/games/${slug}`,
      emoji: "😤",
      createdAt: new Date().toISOString(),
      score: 100,
    });
  }

  for (const c of listChallenges().slice(0, 3)) {
    events.push({
      id: `rel-ch-${c.id}`,
      friendName: c.challengerNickname,
      relation: "challenge",
      headline: "도전장을 보냈습니다",
      detail: c.gameTitle,
      ctaLabel: "받기",
      ctaHref: `/games/${c.gameSlug}?challenge=${c.id}`,
      emoji: "⚔️",
      createdAt: c.createdAt,
      score: 98,
    });
  }

  for (const [i, r] of RIVALS.entries()) {
    if (r.relation === "overtake") {
      events.push({
        id: `rival-${r.name}`,
        friendName: r.name,
        relation: "overtake",
        headline: "당신을 추월했습니다",
        detail: `Snake ${r.score.toLocaleString()}점`,
        ctaLabel: "재도전",
        ctaHref: `/games/snake`,
        emoji: "😤",
        createdAt: new Date(Date.now() - (i + 1) * 600_000).toISOString(),
        score: 95 - i,
      });
    } else if (r.relation === "achievement") {
      events.push({
        id: `rival-ach-${r.name}`,
        friendName: r.name,
        relation: "achievement",
        headline: "업적 획득",
        detail: r.achievement ?? "신규 업적",
        ctaLabel: "축하",
        ctaHref: "/community",
        emoji: "🎖️",
        createdAt: new Date(Date.now() - (i + 2) * 600_000).toISOString(),
        score: 80,
      });
    } else {
      events.push({
        id: `rival-ch-${r.name}`,
        friendName: r.name,
        relation: "challenge",
        headline: "도전장",
        detail: "Snake · 승부 기록 1승 2패",
        ctaLabel: "받기",
        ctaHref: `/games/snake?from=feed`,
        emoji: "⚔️",
        createdAt: new Date(Date.now() - (i + 3) * 600_000).toISOString(),
        score: 90,
      });
    }
  }

  for (const ev of listSocialFeedEvents(5)) {
    events.push({
      id: ev.id,
      friendName: ev.actor,
      relation: "cheer",
      headline: ev.headline,
      detail: ev.detail,
      ctaLabel: "축하",
      ctaHref: ev.gameSlug ? `/games/${ev.gameSlug}` : "/community",
      emoji: "🏆",
      createdAt: ev.createdAt,
      score: 75,
    });
  }

  const friends = getFriendsList();
  for (const f of friends.filter((x) => x.online).slice(0, 2)) {
    if (events.some((e) => e.friendName === f.nickname)) continue;
    events.push({
      id: `online-${f.id}`,
      friendName: f.nickname,
      relation: "cheer",
      headline: "지금 플레이 중",
      detail: "함께 경쟁해보세요",
      ctaLabel: "도전",
      ctaHref: `/games/${slug}`,
      emoji: "👤",
      createdAt: new Date().toISOString(),
      score: 70,
    });
  }

  return events.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Convert to StoryEvent shape for legacy feed components. */
export function relationshipToStoryEvents(feed: RelationshipEvent[]) {
  return feed.map((r) => ({
    id: r.id,
    type: r.relation === "achievement" ? ("achievement" as const) : r.relation === "challenge" ? ("challenge" as const) : ("score" as const),
    actor: r.friendName,
    headline: r.headline,
    detail: r.detail,
    href: r.ctaHref,
    createdAt: r.createdAt,
    emoji: r.emoji,
    ctaLabel: r.ctaLabel,
  }));
}
