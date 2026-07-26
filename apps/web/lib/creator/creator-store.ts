/** Creator Platform — localStorage-backed creator identity & games. */

import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";

const CREATOR_KEY = "play29:creator-profile";
const GAMES_KEY = "play29:creator-games";
const SUBMISSIONS_KEY = "play29:creator-submissions";

export type GameSubmissionStatus = "draft" | "qa" | "review" | "published" | "rejected";

export interface CreatorProfile {
  id: string;
  displayName: string;
  level: number;
  publishedCount: number;
  totalPlays: number;
  totalLikes: number;
  followers: number;
  bio: string;
  joinedAt: string;
}

export interface CreatorGame {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  tags: string[];
  plays: number;
  likes: number;
  status: GameSubmissionStatus;
  createdAt: string;
  templateId?: string;
}

export interface GameSubmission {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  thumbnailUrl: string | null;
  screenshots: string[];
  status: GameSubmissionStatus;
  qaScore: number | null;
  qaIssues: number;
  createdAt: string;
  updatedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getMyCreatorProfile(): CreatorProfile {
  const existing = readJson<CreatorProfile | null>(CREATOR_KEY, null);
  if (existing) return existing;
  const profile: CreatorProfile = {
    id: getDeviceId(),
    displayName: getLastNickname() || "Creator",
    level: 1,
    publishedCount: 0,
    totalPlays: 0,
    totalLikes: 0,
    followers: 0,
    bio: "Re:Play Creator",
    joinedAt: new Date().toISOString(),
  };
  writeJson(CREATOR_KEY, profile);
  return profile;
}

export function updateCreatorProfile(patch: Partial<CreatorProfile>): CreatorProfile {
  const profile = { ...getMyCreatorProfile(), ...patch };
  writeJson(CREATOR_KEY, profile);
  return profile;
}

export function getMyCreatorGames(): CreatorGame[] {
  return readJson<CreatorGame[]>(GAMES_KEY, []);
}

export function addCreatorGame(game: Omit<CreatorGame, "id" | "createdAt">): CreatorGame {
  const games = getMyCreatorGames();
  const entry: CreatorGame = {
    ...game,
    id: `cg-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  games.unshift(entry);
  writeJson(GAMES_KEY, games);
  if (game.status === "published") {
    const p = getMyCreatorProfile();
    updateCreatorProfile({
      publishedCount: p.publishedCount + 1,
      level: Math.min(99, p.level + 1),
    });
  }
  return entry;
}

export function getSubmissions(): GameSubmission[] {
  return readJson<GameSubmission[]>(SUBMISSIONS_KEY, []);
}

export function saveSubmission(sub: Omit<GameSubmission, "id" | "createdAt" | "updatedAt"> & { id?: string }): GameSubmission {
  const subs = getSubmissions();
  const now = new Date().toISOString();
  if (sub.id) {
    const idx = subs.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      subs[idx] = { ...subs[idx]!, ...sub, updatedAt: now };
      writeJson(SUBMISSIONS_KEY, subs);
      return subs[idx]!;
    }
  }
  const entry: GameSubmission = {
    id: `sub-${Date.now()}`,
    title: sub.title,
    slug: sub.slug,
    description: sub.description,
    tags: sub.tags,
    thumbnailUrl: sub.thumbnailUrl,
    screenshots: sub.screenshots,
    status: sub.status,
    qaScore: sub.qaScore,
    qaIssues: sub.qaIssues,
    createdAt: now,
    updatedAt: now,
  };
  subs.unshift(entry);
  writeJson(SUBMISSIONS_KEY, subs);
  return entry;
}

/** Mock featured creators for hub. */
export const FEATURED_CREATORS: CreatorProfile[] = [
  { id: "c1", displayName: "홍길동", level: 12, publishedCount: 18, totalPlays: 120_000, totalLikes: 2400, followers: 321, bio: "Arcade specialist", joinedAt: "2025-01-01" },
  { id: "c2", displayName: "PixelLab", level: 8, publishedCount: 9, totalPlays: 45_000, totalLikes: 890, followers: 156, bio: "Puzzle games", joinedAt: "2025-03-15" },
  { id: "c3", displayName: "SnakeMaster", level: 15, publishedCount: 24, totalPlays: 280_000, totalLikes: 5100, followers: 892, bio: ".io games", joinedAt: "2024-11-20" },
];

export function getCreatorById(id: string): CreatorProfile | null {
  if (id === getDeviceId() || id === "me") return getMyCreatorProfile();
  return FEATURED_CREATORS.find((c) => c.id === id) ?? null;
}

export function getCreatorPublishedGames(creatorId: string): CreatorGame[] {
  if (creatorId === getDeviceId() || creatorId === "me") return getMyCreatorGames();
  const mock: Record<string, CreatorGame[]> = {
    c1: [
      { id: "g1", slug: "snake-plus", title: "Snake++", thumbnailUrl: null, tags: ["arcade"], plays: 42_000, likes: 890, status: "published", createdAt: "2025-06-01" },
      { id: "g2", slug: "memory-deluxe", title: "Memory Deluxe", thumbnailUrl: null, tags: ["puzzle"], plays: 28_000, likes: 620, status: "published", createdAt: "2025-05-15" },
      { id: "g3", slug: "typing-hero", title: "Typing Hero", thumbnailUrl: null, tags: ["typing"], plays: 15_000, likes: 340, status: "published", createdAt: "2025-04-20" },
      { id: "g4", slug: "pixel-golf", title: "Pixel Golf", thumbnailUrl: null, tags: ["sports"], plays: 35_000, likes: 550, status: "published", createdAt: "2025-03-10" },
    ],
  };
  return mock[creatorId] ?? [];
}
