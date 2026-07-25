/**
 * Steam Library — shelves, wishlist, completed. Project Phoenix Epic3.
 */
import { getAchievements, getGamePlayCounts } from "@game-platform/game-sdk";

import { getFavoritesSnapshot, getRecentlyPlayedSnapshot } from "@/lib/local-storage";
import { getPlayHistorySnapshot } from "@/lib/play-history";

const WISHLIST_KEY = "play29:wishlist";
const COMPLETED_KEY = "play29:completed-games";
const MASTERED_KEY = "play29:mastered-games";

export type LibraryShelf =
  | "recent"
  | "favorites"
  | "completed"
  | "mastered"
  | "achievements"
  | "wishlist"
  | "collections"
  | "history";

export interface LibraryShelfData {
  id: LibraryShelf;
  label: string;
  emoji: string;
  slugs: string[];
}

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeList(key: string, slugs: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(slugs.slice(0, 100)));
}

export function getWishlist(): string[] {
  return readList(WISHLIST_KEY);
}

export function toggleWishlist(slug: string): string[] {
  const list = getWishlist();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list];
  writeList(WISHLIST_KEY, next);
  return next;
}

export function getCompleted(): string[] {
  const stored = readList(COMPLETED_KEY);
  if (stored.length > 0) return stored;
  const counts = getGamePlayCounts();
  return Object.entries(counts)
    .filter(([, n]) => n >= 5)
    .map(([slug]) => slug);
}

export function markCompleted(slug: string): void {
  const list = getCompleted();
  if (!list.includes(slug)) writeList(COMPLETED_KEY, [slug, ...list]);
}

export function getMastered(): string[] {
  return readList(MASTERED_KEY);
}

export function markMastered(slug: string): void {
  const list = getMastered();
  if (!list.includes(slug)) writeList(MASTERED_KEY, [slug, ...list]);
}

export type LibraryBadge = "Played" | "Completed" | "Mastered" | "Perfect";

export function getGameLibraryBadge(slug: string, score: number, best: number): LibraryBadge {
  if (getMastered().includes(slug)) return "Mastered";
  if (getCompleted().includes(slug)) return "Completed";
  if (best > 0 && score >= best) return "Perfect";
  const counts = getGamePlayCounts();
  if ((counts[slug] ?? 0) > 0) return "Played";
  return "Played";
}

export function getLibraryShelves(): LibraryShelfData[] {
  const recent = getRecentlyPlayedSnapshot();
  const favorites = getFavoritesSnapshot();
  const wishlist = getWishlist();
  const completed = getCompleted();
  const mastered = getMastered();
  const history = [...new Set(getPlayHistorySnapshot().map((e) => e.slug))];
  const achievements = Object.keys(getAchievements()).length > 0
    ? getRecentlyPlayedSnapshot().slice(0, 10)
    : [];

  return [
    { id: "recent", label: "Recently Played", emoji: "▶", slugs: recent },
    { id: "favorites", label: "Favorites", emoji: "❤", slugs: favorites },
    { id: "completed", label: "Completed", emoji: "✓", slugs: completed },
    { id: "mastered", label: "Mastered", emoji: "★", slugs: mastered },
    { id: "wishlist", label: "Wishlist", emoji: "☆", slugs: wishlist },
    { id: "achievements", label: "Achievements", emoji: "🏆", slugs: achievements },
    { id: "history", label: "History", emoji: "🕐", slugs: history },
    { id: "collections", label: "Collections", emoji: "📚", slugs: [] },
  ];
}

export const LIBRARY_COLLECTIONS = [
  { title: "Puzzle Pack", href: "/categories/puzzle", emoji: "🧩" },
  { title: "Sports Pack", href: "/categories/sports", emoji: "🏅" },
  { title: "Board Pack", href: "/categories/board", emoji: "♟" },
  { title: "Brain Pack", href: "/categories/brain", emoji: "🧠" },
  { title: "5-Min Games", href: "/games?preset=quick-play", emoji: "⚡" },
  { title: "Weekend Picks", href: "/games?preset=recommended", emoji: "🌟" },
];
