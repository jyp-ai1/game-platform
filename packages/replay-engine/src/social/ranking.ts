/** Cross-game ranking — party, friends, global. */
import { getDeviceId } from "@game-platform/game-sdk";
import type { CrossGameRankingEntry, FriendProfile } from "@game-platform/shared";

const RANK_KEY = "play29:cross-rank";

interface RankStore {
  [deviceId: string]: CrossGameRankingEntry;
}

function loadStore(): RankStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RANK_KEY);
    return raw ? (JSON.parse(raw) as RankStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: RankStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RANK_KEY, JSON.stringify(store));
}

export function recordCrossGameScore(
  deviceId: string,
  nickname: string,
  gameSlug: string,
  score: number
): void {
  const store = loadStore();
  const existing = store[deviceId] ?? { deviceId, nickname, totalScore: 0, gamesPlayed: 0 };
  existing.nickname = nickname;
  existing.totalScore += score;
  existing.gamesPlayed += 1;
  store[deviceId] = existing;
  saveStore(store);
}

function sortedEntries(filter?: (id: string) => boolean): CrossGameRankingEntry[] {
  return Object.values(loadStore())
    .filter((e) => !filter || filter(e.deviceId))
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function getGlobalRanking(limit = 10): CrossGameRankingEntry[] {
  return sortedEntries().slice(0, limit);
}

export function getFriendRanking(friends: FriendProfile[], limit = 10): CrossGameRankingEntry[] {
  const ids = new Set(friends.map((f) => f.deviceId));
  ids.add(getDeviceId());
  return sortedEntries((id) => ids.has(id)).slice(0, limit);
}

export function getPartyRanking(memberIds: string[], limit = 10): CrossGameRankingEntry[] {
  const ids = new Set(memberIds);
  return sortedEntries((id) => ids.has(id)).slice(0, limit);
}

export const RankingEngine = {
  record: recordCrossGameScore,
  global: getGlobalRanking,
  friends: getFriendRanking,
  party: getPartyRanking,
};
