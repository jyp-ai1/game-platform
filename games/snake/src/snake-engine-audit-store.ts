/** Engine State Audit — read-only instrumentation (?debug=1). No gameplay changes. */
import type { GamePhase } from "./snake-game-state";
import { getLoopDiagSnapshot } from "./snake-engine-diag";

export type AuditStatus = "ok" | "fail" | "warn" | "pending";

export interface EngineAuditSnapshot {
  updatedAt: number;
  room: {
    status: AuditStatus;
    code: string;
    players: number;
    connected: boolean;
    shouldTickWorld: boolean;
    isGlobalWorld: boolean;
    isHost: boolean;
  };
  localPlayer: {
    status: AuditStatus;
    deviceId: string;
    registeredInRoom: boolean;
    inWorldState: boolean;
    inWorldRef: boolean;
    registryGap: boolean;
    gamePhase: GamePhase;
    spawnTrace: string | null;
  };
  localSnake: {
    status: AuditStatus;
    exists: boolean;
    alive: boolean;
    segments: number;
    head: string | null;
    tail: string | null;
  };
  input: {
    status: AuditStatus;
    lastDirection: string | null;
    boost: boolean;
    count: number;
    blockedReason: string | null;
  };
  tick: {
    status: AuditStatus;
    hz: number;
    running: boolean;
    mounted: boolean;
    blockedReason: string | null;
    lastWorldTick: number;
    worldTickAdvancing: boolean;
    errors: number;
    lastError: string | null;
    simCount: number;
  };
  render: {
    status: AuditStatus;
    snakesAlive: number;
    snakesTotal: number;
    foods: number;
    aiAlive: number;
    localWouldRender: boolean;
  };
}

const EMPTY: EngineAuditSnapshot = {
  updatedAt: 0,
  room: {
    status: "pending",
    code: "",
    players: 0,
    connected: false,
    shouldTickWorld: false,
    isGlobalWorld: false,
    isHost: false,
  },
  localPlayer: {
    status: "pending",
    deviceId: "",
    registeredInRoom: false,
    inWorldState: false,
    inWorldRef: false,
    registryGap: false,
    gamePhase: "INIT",
    spawnTrace: null,
  },
  localSnake: {
    status: "pending",
    exists: false,
    alive: false,
    segments: 0,
    head: null,
    tail: null,
  },
  input: {
    status: "pending",
    lastDirection: null,
    boost: false,
    count: 0,
    blockedReason: null,
  },
  tick: {
    status: "pending",
    hz: 20,
    running: false,
    mounted: false,
    blockedReason: null,
    lastWorldTick: 0,
    worldTickAdvancing: false,
    errors: 0,
    lastError: null,
    simCount: 0,
  },
  render: {
    status: "pending",
    snakesAlive: 0,
    snakesTotal: 0,
    foods: 0,
    aiAlive: 0,
    localWouldRender: false,
  },
};

let snapshot: EngineAuditSnapshot = { ...EMPTY };
const listeners = new Set<() => void>();

export function isEngineAuditEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribeEngineAudit(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEngineAuditSnapshot(): EngineAuditSnapshot {
  return snapshot;
}

export function recordSpawnAudit(line: string, ok: boolean): void {
  if (!isEngineAuditEnabled()) return;
  snapshot = {
    ...snapshot,
    updatedAt: Date.now(),
    localPlayer: {
      ...snapshot.localPlayer,
      spawnTrace: `${ok ? "OK" : "FAIL"} — ${line}`,
    },
  };
  emit();
}

export interface EngineAuditInput {
  roomCode: string;
  players: number;
  connected: boolean;
  shouldTickWorld: boolean;
  isGlobalWorld: boolean;
  isHost: boolean;
  deviceId: string;
  registeredInRoom: boolean;
  inWorldState: boolean;
  inWorldRef: boolean;
  gamePhase: GamePhase;
  snakeExists: boolean;
  snakeAlive: boolean;
  snakeSegments: number;
  snakeHead: { x: number; y: number } | null;
  snakeTail: { x: number; y: number } | null;
  boost: boolean;
  inputBlockedReason: string | null;
  tickHz: number;
  worldTick: number;
  worldTickAdvancing: boolean;
  snakesAlive: number;
  snakesTotal: number;
  foods: number;
  aiAlive: number;
}

function fmtVec(v: { x: number; y: number } | null): string | null {
  if (!v) return null;
  return `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
}

function roomStatus(input: EngineAuditInput): AuditStatus {
  if (!input.connected || !input.roomCode) return "fail";
  if (input.players <= 0) return "warn";
  return "ok";
}

function localPlayerStatus(input: EngineAuditInput): AuditStatus {
  if (!input.registeredInRoom) return "fail";
  return "ok";
}

function localSnakeStatus(input: EngineAuditInput): AuditStatus {
  if (input.registeredInRoom && !input.inWorldState) return "fail";
  if (!input.snakeExists) return input.registeredInRoom ? "fail" : "warn";
  if (!input.snakeAlive) return "warn";
  return "ok";
}

function inputStatus(loopInput: number, blocked: string | null): AuditStatus {
  if (blocked) return "fail";
  if (loopInput > 0) return "ok";
  return "pending";
}

function tickStatus(
  loop: ReturnType<typeof getLoopDiagSnapshot>,
  advancing: boolean,
  shouldRun: boolean
): AuditStatus {
  if (loop.tickErrors > 0) return "fail";
  if (shouldRun && !loop.tickMounted) return "fail";
  if (loop.tickBlockedReason) return "fail";
  if (loop.tickMounted && shouldRun && !advancing && loop.tick > 5) return "fail";
  if (loop.tickMounted && shouldRun) return "ok";
  if (!shouldRun) return "warn";
  return "pending";
}

function renderStatus(input: EngineAuditInput): AuditStatus {
  if (input.snakesTotal === 0 && input.foods === 0) return "fail";
  if (input.registeredInRoom && input.snakeExists && input.snakeSegments === 0) return "fail";
  if (input.registeredInRoom && !input.snakeExists) return "fail";
  return "ok";
}

export function updateEngineAudit(input: EngineAuditInput): void {
  if (!isEngineAuditEnabled()) return;
  const loop = getLoopDiagSnapshot();
  const registryGap = input.registeredInRoom && !input.inWorldState;

  snapshot = {
    updatedAt: Date.now(),
    room: {
      status: roomStatus(input),
      code: input.roomCode,
      players: input.players,
      connected: input.connected,
      shouldTickWorld: input.shouldTickWorld,
      isGlobalWorld: input.isGlobalWorld,
      isHost: input.isHost,
    },
    localPlayer: {
      status: localPlayerStatus(input),
      deviceId: input.deviceId,
      registeredInRoom: input.registeredInRoom,
      inWorldState: input.inWorldState,
      inWorldRef: input.inWorldRef,
      registryGap,
      gamePhase: input.gamePhase,
      spawnTrace: snapshot.localPlayer.spawnTrace,
    },
    localSnake: {
      status: localSnakeStatus(input),
      exists: input.snakeExists,
      alive: input.snakeAlive,
      segments: input.snakeSegments,
      head: fmtVec(input.snakeHead),
      tail: fmtVec(input.snakeTail),
    },
    input: {
      status: inputStatus(loop.input, input.inputBlockedReason),
      lastDirection: loop.lastInput,
      boost: input.boost,
      count: loop.input,
      blockedReason: input.inputBlockedReason,
    },
    tick: {
      status: tickStatus(loop, input.worldTickAdvancing, input.shouldTickWorld),
      hz: input.tickHz,
      running: loop.tickMounted && input.worldTickAdvancing,
      mounted: loop.tickMounted,
      blockedReason: loop.tickBlockedReason,
      lastWorldTick: input.worldTick,
      worldTickAdvancing: input.worldTickAdvancing,
      errors: loop.tickErrors,
      lastError: loop.lastTickError,
      simCount: loop.simulation,
    },
    render: {
      status: renderStatus(input),
      snakesAlive: input.snakesAlive,
      snakesTotal: input.snakesTotal,
      foods: input.foods,
      aiAlive: input.aiAlive,
      localWouldRender: input.snakeExists && input.snakeSegments > 0,
    },
  };
  emit();

  if (typeof window !== "undefined") {
    (window as Window & { __SNAKE_ENGINE_AUDIT__?: EngineAuditSnapshot }).__SNAKE_ENGINE_AUDIT__ = snapshot;
  }
}

export function resetEngineAudit(): void {
  snapshot = { ...EMPTY };
  emit();
}
