import type { EntryFailStep, EntryStep } from "./snake-entry-log";

export type TraceStepId =
  | "CLICK"
  | "ROUTE"
  | "SDK"
  | "ENGINE"
  | "JOIN"
  | "CONNECT"
  | "SPAWN"
  | "GAME_READY";

export type TraceStepStatus = "pending" | "running" | "ok" | "fail";

export interface TraceStep {
  id: TraceStepId;
  status: TraceStepStatus;
  detail?: string;
  ms?: number;
}

export interface JoinRoomDebug {
  roomCode: string;
  returned: boolean;
  playerId?: string;
  playerCount?: number;
  hostId?: string;
  transport?: string;
  error?: string;
  at: string;
}

export interface EntryStatusSnapshot {
  steps: TraceStep[];
  headline: string;
  joinDebug: JoinRoomDebug | null;
  lastError: string | null;
  failedStep: TraceStepId | EntryFailStep | null;
  gameReady: boolean;
}

const TRACE_ORDER: TraceStepId[] = [
  "CLICK",
  "ROUTE",
  "SDK",
  "ENGINE",
  "JOIN",
  "CONNECT",
  "SPAWN",
  "GAME_READY",
];

const STEP_MAP: Partial<Record<EntryStep | EntryFailStep, TraceStepId>> = {
  CLICK: "CLICK",
  ROUTE: "ROUTE",
  PROVIDER_READY: "SDK",
  PLAY_MOUNTED: "SDK",
  ENGINE_READY: "ENGINE",
  CONNECT: "CONNECT",
  CONNECTING: "CONNECT",
  CONNECTED: "CONNECT",
  JOIN: "JOIN",
  JOINED: "JOIN",
  SPAWN: "SPAWN",
  SPAWNED: "SPAWN",
  CANVAS: "SPAWN",
  CANVAS_READY: "SPAWN",
  GAME_READY: "GAME_READY",
  GAME_START: "GAME_READY",
};

function defaultSteps(): TraceStep[] {
  return TRACE_ORDER.map((id) => ({ id, status: "pending" }));
}

let snapshot: EntryStatusSnapshot = {
  steps: defaultSteps(),
  headline: "Connecting…",
  joinDebug: null,
  lastError: null,
  failedStep: null,
  gameReady: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribeEntryStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntryStatusSnapshot(): EntryStatusSnapshot {
  return snapshot;
}

export function resetEntryStatus(): void {
  snapshot = {
    steps: defaultSteps(),
    headline: "Connecting…",
    joinDebug: null,
    lastError: null,
    failedStep: null,
    gameReady: false,
  };
  emit();
}

function setStep(id: TraceStepId, status: TraceStepStatus, detail?: string, ms?: number): void {
  snapshot = {
    ...snapshot,
    steps: snapshot.steps.map((s) =>
      s.id === id ? { ...s, status, detail: detail ?? s.detail, ms: ms ?? s.ms } : s
    ),
  };
}

export function recordEntryTrace(
  step: EntryStep | EntryFailStep,
  status: "PASS" | "FAIL" | "START",
  detail?: string,
  ms?: number
): void {
  const mapped = STEP_MAP[step];
  if (!mapped) return;

  if (status === "START") {
    setStep(mapped, "running", detail);
    snapshot = { ...snapshot, headline: `${mapped}…` };
    emit();
    return;
  }

  if (status === "PASS") {
    setStep(mapped, "ok", detail, ms);
    if (mapped === "GAME_READY") {
      snapshot = { ...snapshot, gameReady: true, headline: "GAME_READY" };
    } else {
      snapshot = { ...snapshot, headline: `${mapped} OK` };
    }
    emit();
    return;
  }

  setStep(mapped, "fail", detail, ms);
  snapshot = {
    ...snapshot,
    headline: `${mapped} FAIL`,
    lastError: detail ?? `${mapped} failed`,
    failedStep: mapped,
  };
  emit();
}

export function recordJoinRoomDebug(debug: Omit<JoinRoomDebug, "at">): void {
  snapshot = {
    ...snapshot,
    joinDebug: { ...debug, at: new Date().toISOString() },
  };
  emit();
}

export function recordEntryFailure(
  step: EntryFailStep,
  reason: string
): void {
  const mapped = STEP_MAP[step] ?? (step as TraceStepId);
  if (mapped) setStep(mapped, "fail", reason);
  snapshot = {
    ...snapshot,
    headline: `${mapped ?? step} FAIL`,
    lastError: reason,
    failedStep: mapped ?? step,
  };
  emit();
}
