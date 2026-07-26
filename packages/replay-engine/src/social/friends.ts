/** Universal Friends Engine — relationship types auto-computed from co-play. */
import { getDeviceId } from "@game-platform/game-sdk";
import type { FriendProfile, FriendRelationKind } from "@game-platform/shared";

const STORAGE_KEY = "play29:friends";

function defaultPassport(): FriendProfile["passport"] {
  return { level: 1, hoursPlayed7d: 0, badges: [], topPercentiles: {} };
}

interface FriendStore {
  [deviceId: string]: FriendProfile;
}

function loadStore(): FriendStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FriendStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: FriendStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function computeRelation(profile: FriendProfile): FriendRelationKind {
  if (profile.favorite) return "favorite";
  if (profile.coPlayCount >= 10) return "frequent";
  if (profile.winsAgainst >= 3 && profile.lossesAgainst >= 3) return "rival";
  if (profile.coPlayCount <= 2) return "new";
  if (profile.lossesAgainst > profile.winsAgainst + 2) return "mentor";
  return "friend";
}

function enrich(profile: FriendProfile): FriendProfile {
  if (!profile.passport) profile.passport = defaultPassport();
  profile.passport.level = Math.floor(profile.coPlayCount / 3) + 1;
  profile.passport.hoursPlayed7d = Math.round(profile.coPlayCount * 0.5 * 10) / 10;
  if (profile.coPlayCount >= 10) profile.passport.title = "Puzzle Master";
  if (profile.relation === "rival") profile.passport.title = "Rival";
  if (profile.recentGames.includes("snake") && profile.coPlayCount >= 5) {
    profile.passport.topPercentiles.snake = 5;
    profile.passport.badges = [...new Set([...profile.passport.badges, "Snake Top5%"])];
  }
  if (profile.recentGames.includes("mini-golf")) {
    profile.passport.badges = [...new Set([...profile.passport.badges, "Golf Master"])];
  }
  return { ...profile, relation: computeRelation(profile) };
}

/** Record a co-play session with another player. */
export function recordCoPlay(
  friendDeviceId: string,
  friendNickname: string,
  gameSlug: string,
  outcome?: "win" | "loss" | "draw"
): FriendProfile {
  const store = loadStore();
  const existing = store[friendDeviceId] ?? {
    deviceId: friendDeviceId,
    nickname: friendNickname,
    coPlayCount: 0,
    winsAgainst: 0,
    lossesAgainst: 0,
    relation: "new" as FriendRelationKind,
    favorite: false,
    recentGames: [],
    passport: defaultPassport(),
  };
  existing.nickname = friendNickname;
  existing.coPlayCount += 1;
  existing.lastCoPlayAt = new Date().toISOString();
  if (outcome === "win") existing.winsAgainst += 1;
  if (outcome === "loss") existing.lossesAgainst += 1;
  existing.recentGames = [gameSlug, ...existing.recentGames.filter((g) => g !== gameSlug)].slice(0, 5);
  existing.relation = computeRelation(existing);
  store[friendDeviceId] = existing;
  saveStore(store);
  return enrich(existing);
}

/** All friends sorted by co-play frequency. */
export function getFriends(): FriendProfile[] {
  return Object.values(loadStore())
    .map(enrich)
    .filter((f) => f.deviceId !== getDeviceId())
    .sort((a, b) => b.coPlayCount - a.coPlayCount);
}

/** Recently played together. */
export function getRecentCoPlay(limit = 5): FriendProfile[] {
  return getFriends()
    .filter((f) => f.lastCoPlayAt)
    .sort((a, b) => (b.lastCoPlayAt ?? "").localeCompare(a.lastCoPlayAt ?? ""))
    .slice(0, limit);
}

/** Favorites only. */
export function getFavorites(): FriendProfile[] {
  return getFriends().filter((f) => f.favorite || f.relation === "favorite");
}

/** Toggle favorite. */
export function setFavorite(deviceId: string, favorite: boolean): FriendProfile | null {
  const store = loadStore();
  const profile = store[deviceId];
  if (!profile) return null;
  profile.favorite = favorite;
  profile.relation = computeRelation(profile);
  saveStore(store);
  return enrich(profile);
}

/** Manual relation override. */
export function setRelation(deviceId: string, relation: FriendRelationKind): FriendProfile | null {
  const store = loadStore();
  const profile = store[deviceId];
  if (!profile) return null;
  profile.relation = relation;
  if (relation === "favorite") profile.favorite = true;
  saveStore(store);
  return enrich(profile);
}

/** Recompute all relations. */
export function computeAllRelations(): FriendProfile[] {
  const store = loadStore();
  for (const id of Object.keys(store)) {
    store[id]!.relation = computeRelation(store[id]!);
  }
  saveStore(store);
  return getFriends();
}

/** AI-recommended friends — co-play + recency heuristic (MVP). */
export function recommendFriends(limit = 3): FriendProfile[] {
  const friends = getFriends();
  const scored = friends.map((f) => {
    let score = f.coPlayCount * 2;
    if (f.lastCoPlayAt) {
      const days = (Date.now() - new Date(f.lastCoPlayAt).getTime()) / 86_400_000;
      score += Math.max(0, 10 - days);
    }
    if (f.relation === "rival") score += 5;
    if (f.relation === "frequent") score += 3;
    return { f, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.f);
}

export const RELATION_LABELS: Record<FriendRelationKind, string> = {
  friend: "친구",
  frequent: "단골",
  rival: "라이벌",
  mentor: "멘토",
  new: "신규",
  favorite: "즐겨찾기",
};

export const FriendsEngine = {
  record: recordCoPlay,
  list: getFriends,
  recent: getRecentCoPlay,
  favorites: getFavorites,
  favorite: setFavorite,
  relation: setRelation,
  compute: computeAllRelations,
  recommend: recommendFriends,
  labels: RELATION_LABELS,
};
