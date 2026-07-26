/**
 * Social Relationship Engine — rivals, co-play, weekly H2H (Replay OS v6).
 */
import { getFriendsList } from "@/lib/social-store";

export interface FriendRelationship {
  id: string;
  nickname: string;
  role: "rival" | "co-play" | "friend";
  weeklyWins: number;
  weeklyLosses: number;
  level: number;
  online: boolean;
}

export interface SocialRelationshipSummary {
  rivals: FriendRelationship[];
  coPlayFriends: FriendRelationship[];
  weeklyHeadline: string;
}

export function buildSocialRelationships(): SocialRelationshipSummary {
  const friends = getFriendsList();

  const rivals: FriendRelationship[] = friends.slice(0, 3).map((f, i) => ({
    id: f.id,
    nickname: f.nickname,
    role: "rival" as const,
    weeklyWins: Math.max(0, 2 - i),
    weeklyLosses: i + 1,
    level: f.level,
    online: f.online,
  }));

  const coPlayFriends: FriendRelationship[] = friends.slice(0, 5).map((f, i) => ({
    id: f.id,
    nickname: f.nickname,
    role: "co-play" as const,
    weeklyWins: 3 - (i % 3),
    weeklyLosses: i % 2,
    level: f.level,
    online: f.online,
  }));

  const topRival = rivals[0];
  const weeklyHeadline = topRival
    ? `이번 주 ${topRival.weeklyWins}승 ${topRival.weeklyLosses}패 · ${topRival.nickname}`
    : "이번 주 친구와 경쟁을 시작하세요";

  return { rivals, coPlayFriends, weeklyHeadline };
}
