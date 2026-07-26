/** Snake telemetry — playtest validation data */

import { POST_DEATH_ACTION_MS } from "./snake-playtest-tuning";

export type PlaytestExitPoint = "death" | "spectator" | "rematch" | "end" | "home" | "unknown";

export type PostDeathAction = "exit" | "replay" | "spectator" | "invite" | "idle";

export interface PostDeathRecord {
  action: PostDeathAction;
  msAfterDeath: number;
}

export interface SnakeTelemetrySession {
  roomCode: string;
  startedAt: number;
  deaths: { x: number; y: number; cause: string }[];
  boostTicks: number;
  eventParticipation: Record<string, number>;
  bossKills: number;
  survivalMs: number;
  rematch: boolean;
  spectatorRejoin: boolean;
  isGlobalWorld?: boolean;
  peakPopulation?: number;
  avgAiRatio?: number;
  quickPlay?: boolean;
  /** Playtest Sprint */
  environment?: string;
  joinIndex?: number;
  firstFunMs?: number;
  firstMoveMs?: number;
  exitPoint?: PlaytestExitPoint;
  killFeedEvents?: number;
  crowdSamples?: { x: number; y: number; tick: number }[];
  eventSamples?: { x: number; y: number; kind: string }[];
  foodShortageTicks?: number;
  turingPromptBot?: string;
  /** 죽은 후 3초 안 첫 행동 — Replay core KPI */
  postDeathActions?: PostDeathRecord[];
}

const KEY = "play29:snake-telemetry";
const JOIN_KEY = "play29:snake-join-count";
const sessions = new Map<string, SnakeTelemetrySession>();
const gwSamples = new Map<string, { humans: number; bots: number; population: number }[]>();
const pendingDeath = new Map<string, { at: number; timer: ReturnType<typeof setTimeout> }>();

function detectEnvironment(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "other";
}

function env(): string {
  return detectEnvironment();
}

export function startSnakeTelemetry(roomCode: string, opts?: { isGlobalWorld?: boolean; quickPlay?: boolean }): void {
  let joinIndex = 0;
  if (typeof window !== "undefined") {
    joinIndex = Number(localStorage.getItem(JOIN_KEY) ?? "0") + 1;
    localStorage.setItem(JOIN_KEY, String(joinIndex));
  }
  sessions.set(roomCode, {
    roomCode,
    startedAt: Date.now(),
    deaths: [],
    boostTicks: 0,
    eventParticipation: {},
    bossKills: 0,
    survivalMs: 0,
    rematch: false,
    spectatorRejoin: false,
    isGlobalWorld: opts?.isGlobalWorld,
    quickPlay: opts?.quickPlay,
    peakPopulation: 0,
    avgAiRatio: 0,
    environment: env(),
    joinIndex,
    killFeedEvents: 0,
    crowdSamples: [],
    eventSamples: [],
    foodShortageTicks: 0,
    postDeathActions: [],
  });
  gwSamples.set(roomCode, []);
}

export function recordGlobalWorldTick(
  roomCode: string,
  sample: { humans: number; bots: number; population: number }
): void {
  const s = sessions.get(roomCode);
  const samples = gwSamples.get(roomCode) ?? [];
  samples.push(sample);
  if (samples.length > 200) samples.shift();
  gwSamples.set(roomCode, samples);
  if (s) {
    s.peakPopulation = Math.max(s.peakPopulation ?? 0, sample.population);
    const avgBot = samples.reduce((a, x) => a + x.bots, 0) / samples.length;
    const avgPop = samples.reduce((a, x) => a + x.population, 0) / samples.length;
    s.avgAiRatio = avgPop > 0 ? avgBot / avgPop : 0;
  }
}

export function recordSnakeDeath(roomCode: string, x: number, y: number, cause: string): void {
  const s = sessions.get(roomCode);
  if (!s) return;
  s.deaths.push({ x, y, cause });
}

export function recordSnakeBoost(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) s.boostTicks += 1;
}

export function recordSnakeEvent(roomCode: string, kind: string): void {
  const s = sessions.get(roomCode);
  if (s) s.eventParticipation[kind] = (s.eventParticipation[kind] ?? 0) + 1;
}

export function recordSnakeEventLocation(roomCode: string, x: number, y: number, kind: string): void {
  const s = sessions.get(roomCode);
  if (!s) return;
  s.eventSamples = [...(s.eventSamples ?? []), { x, y, kind }].slice(-40);
  recordSnakeEvent(roomCode, kind);
}

export function recordSnakeBossKill(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) s.bossKills += 1;
}

export function recordSnakeRematch(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) {
    s.rematch = true;
    s.exitPoint = "rematch";
  }
}

export function recordSpectatorRejoin(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) {
    s.spectatorRejoin = true;
    if (!s.exitPoint) s.exitPoint = "spectator";
  }
}

export function recordPlaytestExit(roomCode: string, point: PlaytestExitPoint): void {
  const s = sessions.get(roomCode);
  if (s) s.exitPoint = point;
}

export function recordKillFeedEvent(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) s.killFeedEvents = (s.killFeedEvents ?? 0) + 1;
}

export function recordCrowdSample(roomCode: string, positions: { x: number; y: number }[], tick: number): void {
  const s = sessions.get(roomCode);
  if (!s || positions.length === 0) return;
  const sample = positions.slice(0, 8).map((p) => ({ ...p, tick }));
  s.crowdSamples = [...(s.crowdSamples ?? []), ...sample].slice(-120);
}

export function recordFoodShortageTick(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s) s.foodShortageTicks = (s.foodShortageTicks ?? 0) + 1;
}

export function markFirstFun(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s && s.firstFunMs == null) {
    s.firstFunMs = Date.now() - s.startedAt;
  }
}

export function setTuringPromptBot(roomCode: string, botName: string): void {
  const s = sessions.get(roomCode);
  if (s) s.turingPromptBot = botName;
}

export function markFirstMove(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (s && s.firstMoveMs == null) {
    s.firstMoveMs = Date.now() - s.startedAt;
  }
}

export function markPlayerDeath(roomCode: string): void {
  const s = sessions.get(roomCode);
  if (!s) return;

  const prev = pendingDeath.get(roomCode);
  if (prev) clearTimeout(prev.timer);

  const at = Date.now();
  const timer = setTimeout(() => {
    const sess = sessions.get(roomCode);
    if (sess) {
      sess.postDeathActions = [
        ...(sess.postDeathActions ?? []),
        { action: "idle", msAfterDeath: POST_DEATH_ACTION_MS },
      ];
    }
    pendingDeath.delete(roomCode);
  }, POST_DEATH_ACTION_MS);
  pendingDeath.set(roomCode, { at, timer });
}

export function tryRecordPostDeathAction(roomCode: string, action: PostDeathAction): void {
  const pending = pendingDeath.get(roomCode);
  const s = sessions.get(roomCode);
  if (!pending || !s) return;
  clearTimeout(pending.timer);
  pendingDeath.delete(roomCode);
  const ms = Date.now() - pending.at;
  s.postDeathActions = [...(s.postDeathActions ?? []), { action, msAfterDeath: ms }];
}

export function flushSnakeTelemetry(roomCode: string): SnakeTelemetrySession | null {
  const s = sessions.get(roomCode);
  if (!s) return null;
  const pending = pendingDeath.get(roomCode);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDeath.delete(roomCode);
  }
  s.survivalMs = Date.now() - s.startedAt;
  if (!s.exitPoint) s.exitPoint = "end";
  persist(s);
  sessions.delete(roomCode);
  gwSamples.delete(roomCode);
  return s;
}

function persist(session: SnakeTelemetrySession): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: SnakeTelemetrySession[] = raw ? JSON.parse(raw) : [];
    list.unshift(session);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  } catch { /* ignore */ }
}

export function getSnakeTelemetryHistory(): SnakeTelemetrySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SnakeTelemetrySession[]) : [];
  } catch {
    return [];
  }
}

export function getPostDeathActionSummary(): {
  exit: number;
  replay: number;
  spectator: number;
  invite: number;
  idle: number;
  sampleSize: number;
  formatted: string;
} {
  const actions = getSnakeTelemetryHistory().flatMap((s) => s.postDeathActions ?? []);
  const n = actions.length;
  if (n === 0) {
    return { exit: 0, replay: 0, spectator: 0, invite: 0, idle: 0, sampleSize: 0, formatted: "데이터 없음" };
  }
  const count = (a: PostDeathAction) => actions.filter((x) => x.action === a).length / n;
  const exit = count("exit");
  const replay = count("replay");
  const spectator = count("spectator");
  const invite = count("invite");
  const idle = count("idle");
  const formatted = [
    `Exit ${(exit * 100).toFixed(0)}%`,
    `Replay ${(replay * 100).toFixed(0)}%`,
    `Spectator ${(spectator * 100).toFixed(0)}%`,
    `Invite ${(invite * 100).toFixed(0)}%`,
    idle > 0 ? `Idle ${(idle * 100).toFixed(0)}%` : null,
    `(n=${n})`,
  ]
    .filter(Boolean)
    .join("\n");
  return { exit, replay, spectator, invite, idle, sampleSize: n, formatted };
}

export function getGlobalWorldTelemetrySummary(): {
  avgPlayMin: number;
  avgAiRatio: number;
  rematchRate: number;
  spectatorRejoinRate: number;
  quickPlayRate: number;
  avgFirstFunSec: number;
  joinCount: number;
} {
  const sessions = getSnakeTelemetryHistory().filter((s) => s.isGlobalWorld);
  if (sessions.length === 0) {
    return {
      avgPlayMin: 0,
      avgAiRatio: 0,
      rematchRate: 0,
      spectatorRejoinRate: 0,
      quickPlayRate: 0,
      avgFirstFunSec: 0,
      joinCount: 0,
    };
  }
  const n = sessions.length;
  const funSessions = sessions.filter((s) => s.firstFunMs != null);
  return {
    avgPlayMin: sessions.reduce((a, s) => a + s.survivalMs, 0) / n / 60_000,
    avgAiRatio: sessions.reduce((a, s) => a + (s.avgAiRatio ?? 0), 0) / n,
    rematchRate: sessions.filter((s) => s.rematch).length / n,
    spectatorRejoinRate: sessions.filter((s) => s.spectatorRejoin).length / n,
    quickPlayRate: sessions.filter((s) => s.quickPlay).length / n,
    avgFirstFunSec: funSessions.length
      ? funSessions.reduce((a, s) => a + (s.firstFunMs ?? 0), 0) / funSessions.length / 1000
      : 0,
    joinCount: Number(typeof window !== "undefined" ? localStorage.getItem(JOIN_KEY) ?? "0" : "0"),
  };
}

export { detectEnvironment };
