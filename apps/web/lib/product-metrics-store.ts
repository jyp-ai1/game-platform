/**
 * Product OS metrics — local KPI store feeding ops dashboard.
 * Supabase analytics is source of truth when online; this is the client mirror + offline fallback.
 */
import { getDeviceId } from "@game-platform/game-sdk";

const METRICS_KEY = "play29:product-metrics";
const FIRST_VISIT_KEY = "play29:first-visit";

export type ProductMetricEvent =
  | "signup"
  | "session_start"
  | "game_end"
  | "share"
  | "invite"
  | "challenge"
  | "ranking_submit"
  | "bug_report"
  | "ai_fix"
  | "deploy"
  | "error";

export interface DayMetrics {
  date: string;
  signups: number;
  sessions: number;
  gameEnds: number;
  uniqueGames: string[];
  shares: number;
  invites: number;
  challenges: number;
  rankings: number;
  bugs: number;
  aiFixes: number;
  deploys: number;
  errors: number;
  sessionSec: number;
  devices: string[];
}

export interface CoreKpis {
  dau: number;
  d1Retention: number;
  avgSessionMin: number;
  gamesPerUser: number;
  shareRate: number;
}

type Store = Record<string, DayMetrics>;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(METRICS_KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METRICS_KEY, JSON.stringify(store));
}

function emptyDay(date: string): DayMetrics {
  return {
    date,
    signups: 0,
    sessions: 0,
    gameEnds: 0,
    uniqueGames: [],
    shares: 0,
    invites: 0,
    challenges: 0,
    rankings: 0,
    bugs: 0,
    aiFixes: 0,
    deploys: 0,
    errors: 0,
    sessionSec: 0,
    devices: [],
  };
}

function ensureToday(): DayMetrics {
  const store = readStore();
  const key = todayKey();
  if (!store[key]) store[key] = emptyDay(key);
  return store[key];
}

export function recordFirstVisit(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(FIRST_VISIT_KEY)) return;
  window.localStorage.setItem(FIRST_VISIT_KEY, todayKey());
  recordProductMetric("signup");
}

export function recordProductMetric(
  event: ProductMetricEvent,
  meta?: { gameSlug?: string; sessionSec?: number }
): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const key = todayKey();
  const day = store[key] ?? emptyDay(key);
  const deviceId = getDeviceId();

  if (!day.devices.includes(deviceId)) day.devices.push(deviceId);

  switch (event) {
    case "signup":
      day.signups += 1;
      break;
    case "session_start":
      day.sessions += 1;
      break;
    case "game_end":
      day.gameEnds += 1;
      if (meta?.gameSlug && !day.uniqueGames.includes(meta.gameSlug)) {
        day.uniqueGames.push(meta.gameSlug);
      }
      if (meta?.sessionSec) day.sessionSec += meta.sessionSec;
      break;
    case "share":
      day.shares += 1;
      break;
    case "invite":
      day.invites += 1;
      break;
    case "challenge":
      day.challenges += 1;
      break;
    case "ranking_submit":
      day.rankings += 1;
      break;
    case "bug_report":
      day.bugs += 1;
      break;
    case "ai_fix":
      day.aiFixes += 1;
      break;
    case "deploy":
      day.deploys += 1;
      break;
    case "error":
      day.errors += 1;
      break;
  }

  store[key] = day;
  writeStore(store);
}

export function getTodayMetrics(): DayMetrics {
  const key = todayKey();
  return readStore()[key] ?? emptyDay(key);
}

export function getYesterdayMetrics(): DayMetrics {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  return readStore()[yKey] ?? emptyDay(yKey);
}

export function getMetricsForDate(dateKey: string): DayMetrics {
  return readStore()[dateKey] ?? emptyDay(dateKey);
}

/** Percent change helper — returns null if baseline is 0 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function getCoreKpis(): CoreKpis {
  const store = readStore();
  const today = todayKey();
  const todayData = store[today] ?? emptyDay(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const yData = store[yKey];
  const deviceId = typeof window !== "undefined" ? getDeviceId() : "";

  const dau = todayData.devices.length;
  const returned =
    yData && deviceId ? yData.devices.includes(deviceId) && todayData.devices.includes(deviceId) : false;
  const d1Retention = yData && yData.devices.length > 0
    ? Math.round(
        (todayData.devices.filter((d) => yData.devices.includes(d)).length / yData.devices.length) * 100
      )
    : returned
      ? 100
      : 0;

  const avgSessionMin =
    todayData.sessions > 0 ? Math.round(todayData.sessionSec / todayData.sessions / 60) : 0;
  const gamesPerUser =
    todayData.devices.length > 0
      ? Math.round((todayData.uniqueGames.length / todayData.devices.length) * 10) / 10
      : todayData.uniqueGames.length;
  const shareRate =
    todayData.sessions > 0
      ? Math.round(((todayData.shares + todayData.invites) / todayData.sessions) * 100)
      : 0;

  return { dau, d1Retention, avgSessionMin, gamesPerUser, shareRate };
}

export function getFailureRate(): number {
  const m = getTodayMetrics();
  const attempts = m.gameEnds + m.errors;
  return attempts > 0 ? Math.round((m.errors / attempts) * 100) : 0;
}
