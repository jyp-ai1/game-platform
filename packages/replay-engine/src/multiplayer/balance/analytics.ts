/** Match Analytics — auto-track balance signals. */
import type { DeathEvent, MatchAnalyticsSnapshot } from "@game-platform/shared";

const STORAGE_KEY = "play29:mp-analytics";

interface SessionState {
  roomCode: string;
  gameSlug: string;
  playerCount: number;
  startedAt: number;
  deaths: DeathEvent[];
  respawnCount: number;
  foodShortageTicks: number;
  killDistribution: Record<string, number>;
  churnCount: number;
}

const sessions = new Map<string, SessionState>();

export function startMatchAnalytics(roomCode: string, gameSlug: string, playerCount: number): void {
  sessions.set(roomCode, {
    roomCode,
    gameSlug,
    playerCount,
    startedAt: Date.now(),
    deaths: [],
    respawnCount: 0,
    foodShortageTicks: 0,
    killDistribution: {},
    churnCount: 0,
  });
}

export function recordDeath(roomCode: string, event: DeathEvent): void {
  const s = sessions.get(roomCode);
  if (!s) return;
  s.deaths.push(event);
}

export function recordKill(roomCode: string, killerId: string): void {
  const s = sessions.get(roomCode);
  if (!s) return;
  s.killDistribution[killerId] = (s.killDistribution[killerId] ?? 0) + 1;
}

export function recordRespawn(roomCode: string): void {
  sessions.get(roomCode)!.respawnCount += 1;
}

export function recordFoodShortage(roomCode: string): void {
  sessions.get(roomCode)!.foodShortageTicks += 1;
}

export function recordChurn(roomCode: string): void {
  sessions.get(roomCode)!.churnCount += 1;
}

export function computeCongestion(deathCount: number, worldSize: number, playerCount: number): number {
  const area = worldSize * worldSize;
  return Math.min(100, Math.round((deathCount / Math.max(1, playerCount)) * (10000 / area) * 100));
}

export function flushMatchAnalytics(roomCode: string, worldSize: number): MatchAnalyticsSnapshot | null {
  const s = sessions.get(roomCode);
  if (!s) return null;
  const snapshot: MatchAnalyticsSnapshot = {
    roomCode: s.roomCode,
    gameSlug: s.gameSlug,
    playerCount: s.playerCount,
    avgPlayTimeMs: Date.now() - s.startedAt,
    deaths: [...s.deaths],
    respawnCount: s.respawnCount,
    foodShortageTicks: s.foodShortageTicks,
    congestionScore: computeCongestion(s.deaths.length, worldSize, s.playerCount),
    killDistribution: { ...s.killDistribution },
    churnCount: s.churnCount,
    recordedAt: new Date().toISOString(),
  };
  persistSnapshot(snapshot);
  sessions.delete(roomCode);
  return snapshot;
}

function persistSnapshot(snapshot: MatchAnalyticsSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: MatchAnalyticsSnapshot[] = raw ? JSON.parse(raw) : [];
    list.unshift(snapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch { /* ignore */ }
}

export function getMatchAnalyticsHistory(): MatchAnalyticsSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchAnalyticsSnapshot[]) : [];
  } catch {
    return [];
  }
}
