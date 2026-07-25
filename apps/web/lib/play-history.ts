/**
 * Play history timeline — session log for Journey (GuestID-scoped).
 */
import type { Game } from "@game-platform/shared";
import { getDailyStreak, getGamePlayCounts, getTotalPlayCount } from "@game-platform/game-sdk";

import { getGameBalanceMeta } from "@/lib/game-balance";
import { ensureJourneyProfile } from "@/lib/journey-profile";

const HISTORY_KEY = "play29:play-history";
const HISTORY_LIMIT = 500;

export type PlayHistoryPeriod = "today" | "week" | "month" | "all";

export interface PlayHistoryEntry {
  id: string;
  slug: string;
  categorySlug: string | null;
  startedAt: string;
  /** Estimated session length (clearTimeSec from balance at record time). */
  durationSec: number;
  guestId: string;
}

export interface JourneyStats {
  totalPlays: number;
  totalTimeSec: number;
  totalTimeLabel: string;
  currentStreak: number;
  mostPlayedSlug: string | null;
  mostPlayedTitle: string | null;
  recentSlugs: string[];
}

type Listener = () => void;

let cache: PlayHistoryEntry[] = readHistory();
const listeners = new Set<Listener>();

function readHistory(): PlayHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as PlayHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: PlayHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function notify(): void {
  for (const l of listeners) l();
}

export function getPlayHistorySnapshot(): PlayHistoryEntry[] {
  return cache;
}

const EMPTY_HISTORY: PlayHistoryEntry[] = [];

export function getServerPlayHistorySnapshot(): PlayHistoryEntry[] {
  return EMPTY_HISTORY;
}

export function subscribePlayHistory(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordPlayHistorySession(
  slug: string,
  categorySlug: string | null,
  difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"
): void {
  const profile = ensureJourneyProfile();
  const balance = getGameBalanceMeta(slug, difficulty);

  const entry: PlayHistoryEntry = {
    id: `${Date.now()}-${slug}`,
    slug,
    categorySlug,
    startedAt: new Date().toISOString(),
    durationSec: balance.clearTimeSec,
    guestId: profile.guestId,
  };

  cache = [entry, ...cache].slice(0, HISTORY_LIMIT);
  writeHistory(cache);
  notify();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function filterPlayHistory(
  entries: PlayHistoryEntry[],
  period: PlayHistoryPeriod
): PlayHistoryEntry[] {
  if (period === "all") return entries;

  const now = new Date();
  let cutoff: Date;

  switch (period) {
    case "today":
      cutoff = startOfDay(now);
      break;
    case "week":
      cutoff = startOfWeek(now);
      break;
    case "month":
      cutoff = startOfMonth(now);
      break;
  }

  return entries.filter((e) => new Date(e.startedAt) >= cutoff);
}

export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}초`;
  const mins = Math.round(totalSec / 60);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}시간 ${rem}분` : `${hours}시간`;
}

export function computeJourneyStats(
  entries: PlayHistoryEntry[],
  games: Game[]
): JourneyStats {
  const totalPlays = getTotalPlayCount();
  const playCounts = getGamePlayCounts();
  const streak = getDailyStreak();

  const totalTimeSec = entries.reduce((s, e) => s + e.durationSec, 0);

  const countEntries = Object.entries(playCounts);
  const mostPlayedSlug =
    countEntries.length === 0
      ? null
      : countEntries.reduce((max, e) => (e[1] > max[1] ? e : max))[0];

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const recentSlugs = [...new Set(entries.map((e) => e.slug))].slice(0, 5);

  return {
    totalPlays,
    totalTimeSec,
    totalTimeLabel: formatDuration(totalTimeSec),
    currentStreak: streak.currentStreak,
    mostPlayedSlug,
    mostPlayedTitle: mostPlayedSlug ? (bySlug.get(mostPlayedSlug)?.title ?? mostPlayedSlug) : null,
    recentSlugs,
  };
}

export function groupHistoryByDay(
  entries: PlayHistoryEntry[]
): { date: string; label: string; entries: PlayHistoryEntry[] }[] {
  const groups = new Map<string, PlayHistoryEntry[]>();

  for (const entry of entries) {
    const d = new Date(entry.startedAt);
    const key = d.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayEntries]) => ({
      date,
      label: formatDayLabel(date),
      entries: dayEntries,
    }));
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}
