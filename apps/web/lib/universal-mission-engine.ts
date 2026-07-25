/**
 * Universal Mission Engine — daily mix across all games (Replay OS).
 */
import {
  getDailyMission,
  getMissionDefinition,
  isDailyChallengeComplete,
  subscribeMissions,
} from "@game-platform/game-sdk";

const FRIEND_CHALLENGE_KEY = "play29:daily-friend-challenge";

export interface MissionMixItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export function recordFriendChallengeSent(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toLocaleDateString("en-CA");
  window.localStorage.setItem(FRIEND_CHALLENGE_KEY, today);
}

export function isFriendChallengeDone(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toLocaleDateString("en-CA");
  return window.localStorage.getItem(FRIEND_CHALLENGE_KEY) === today;
}

export function getTodayMissionMix(): MissionMixItem[] {
  const mission = getDailyMission();
  const sdkItems: MissionMixItem[] = mission.missionIds
    .filter(Boolean)
    .map((id) => {
      const def = getMissionDefinition(id);
      return {
        id,
        label: def?.title ?? id,
        done: mission.completed.includes(id),
        href: def?.linkHref ?? "/missions",
      };
    });

  return [
    ...sdkItems,
    {
      id: "friend-challenge",
      label: "친구 1명 도전",
      done: isFriendChallengeDone(),
      href: "/community#challenge",
    },
  ];
}

export function isTodayMissionMixComplete(): boolean {
  const mix = getTodayMissionMix();
  return mix.every((m) => m.done);
}

export function getTodayMissionProgress(): { done: number; total: number; pct: number } {
  const mix = getTodayMissionMix();
  const done = mix.filter((m) => m.done).length;
  const total = mix.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export { subscribeMissions, isDailyChallengeComplete };
export { getDailyMission } from "@game-platform/game-sdk";
