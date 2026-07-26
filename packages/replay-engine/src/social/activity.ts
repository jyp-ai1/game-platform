/** Friends Activity Feed — SNS-style friend actions (P3). */
import { getDeviceId } from "@game-platform/game-sdk";
import type { FriendProfile } from "@game-platform/shared";

export interface FriendActivity {
  id: string;
  deviceId: string;
  nickname: string;
  kind: "top10" | "kill" | "score" | "party" | "challenge";
  title: string;
  gameSlug: string;
  score?: number;
  at: string;
  likes: number;
  liked: boolean;
}

const KEY = "play29:friend-activity";

function load(): FriendActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FriendActivity[]) : [];
  } catch {
    return [];
  }
}

function save(items: FriendActivity[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(-100)));
}

export function recordFriendActivity(
  deviceId: string,
  nickname: string,
  kind: FriendActivity["kind"],
  title: string,
  gameSlug: string,
  score?: number
): FriendActivity {
  const item: FriendActivity = {
    id: `${Date.now()}-${deviceId}`,
    deviceId,
    nickname,
    kind,
    title,
    gameSlug,
    score,
    at: new Date().toISOString(),
    likes: 0,
    liked: false,
  };
  save([...load(), item]);
  return item;
}

export function getActivityFeed(limit = 20): FriendActivity[] {
  return load()
    .filter((a) => a.deviceId !== getDeviceId())
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

export function likeActivity(id: string): void {
  const items = load();
  const item = items.find((a) => a.id === id);
  if (item && !item.liked) {
    item.likes += 1;
    item.liked = true;
    save(items);
  }
}

/** Revenge loop — friend beat your score? */
export function getRevengeTarget(friends: FriendProfile[], myBest: number, gameSlug: string): FriendActivity | null {
  return getActivityFeed(50).find(
    (a) => a.gameSlug === gameSlug && (a.score ?? 0) > myBest && friends.some((f) => f.deviceId === a.deviceId)
  ) ?? null;
}

export const ActivityEngine = {
  record: recordFriendActivity,
  feed: getActivityFeed,
  like: likeActivity,
  revenge: getRevengeTarget,
};
