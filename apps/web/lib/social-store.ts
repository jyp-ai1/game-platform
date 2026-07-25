/**
 * Social layer — follow, friends, online. Project Phoenix Epic5.
 */
const FOLLOWING_KEY = "play29:following";
const FOLLOWERS_KEY = "play29:followers";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  notify();
}

export interface SocialProfile {
  id: string;
  nickname: string;
  level: number;
  online: boolean;
}

const MOCK_FRIENDS: SocialProfile[] = [
  { id: "f1", nickname: "PixelPro", level: 12, online: true },
  { id: "f2", nickname: "SnakeMaster", level: 8, online: false },
  { id: "f3", nickname: "PuzzleQueen", level: 15, online: true },
];

export function getFollowing(): string[] {
  return readJson<string[]>(FOLLOWING_KEY, []);
}

export function getFollowers(): string[] {
  return readJson<string[]>(FOLLOWERS_KEY, ["f1", "f2"]);
}

export function toggleFollow(profileId: string): boolean {
  const list = getFollowing();
  const isFollowing = list.includes(profileId);
  const next = isFollowing ? list.filter((id) => id !== profileId) : [...list, profileId];
  writeJson(FOLLOWING_KEY, next);
  return !isFollowing;
}

export function isFollowing(profileId: string): boolean {
  return getFollowing().includes(profileId);
}

export function getFriendsList(): SocialProfile[] {
  return MOCK_FRIENDS;
}

export function getOnlineFriends(): SocialProfile[] {
  return MOCK_FRIENDS.filter((f) => f.online);
}

export function subscribeSocial(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
