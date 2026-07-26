/**
 * Network Engine — friends at the center (Replay OS v4).
 */
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { buildReplayStoryFeed } from "@/lib/replay-story-feed";
import { listSocialFeedEvents } from "@/lib/social-reactions-store";
import { getFriendsList } from "@/lib/social-store";

export interface NetworkState {
  waitingFriends: number;
  pendingChallenges: number;
  onlineFriends: number;
  headline: string;
  subline: string;
}

export function buildNetworkState(): NetworkState {
  const friends = getFriendsList();
  const pending = listChallenges().filter((c) => c.status !== "complete");
  const online = friends.filter((f) => f.online).length;
  const waiting = pending.length + Math.min(online, 2);

  let headline = "친구와 Replay를 나눠보세요";
  let subline = `${friends.length}명의 친구`;

  if (pending.length > 0) {
    headline = `친구 ${pending.length}명이 기다리고 있습니다`;
    subline = pending[0] ? `${pending[0].challengerNickname}의 도전장` : "도전장 확인";
  } else if (online > 0) {
    headline = `친구 ${online}명이 지금 플레이 중`;
    subline = "함께 경쟁해보세요";
  }

  return {
    waitingFriends: waiting,
    pendingChallenges: pending.length,
    onlineFriends: online,
    headline,
    subline,
  };
}

export function buildReplayFeedItems(games: Game[], limit = 12) {
  const friends = getFriendsList();
  const socialEvents = listSocialFeedEvents(limit);
  const feed = buildReplayStoryFeed(games, limit);

  for (const ev of socialEvents) {
    feed.unshift({
      id: ev.id,
      type: "score",
      actor: ev.actor,
      headline: ev.headline,
      detail: ev.detail,
      href: ev.gameSlug ? `/games/${ev.gameSlug}` : "/community",
      createdAt: ev.createdAt,
      emoji: "🏆",
    });
  }

  const friendSamples = [
    { nickname: "민수", headline: "Top10 진입", detail: "Snake 14,200점", emoji: "🏆" },
    { nickname: "철수", headline: "신규 업적", detail: "Snake Master", emoji: "🎖️" },
    { nickname: "영희", headline: "100일 출석", detail: "Streak 달성", emoji: "📅" },
  ];

  for (const [i, sample] of friendSamples.entries()) {
    if (feed.some((f) => f.actor === sample.nickname)) continue;
    feed.push({
      id: `sample-friend-${i}`,
      type: i === 0 ? "score" : i === 1 ? "achievement" : "streak",
      actor: sample.nickname,
      headline: sample.headline,
      detail: sample.detail,
      href: "/community",
      createdAt: new Date(Date.now() - (i + 1) * 300_000).toISOString(),
      emoji: sample.emoji,
    });
  }

  return feed
    .map((item) => {
      const friend = friends.find((f) => f.nickname === item.actor);
      if (friend && item.type === "score" && !item.headline.includes("Top10")) {
        return { ...item, headline: `${friend.nickname} ${item.detail.split("·")[0]?.trim() ?? "플레이"}` };
      }
      return item;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
