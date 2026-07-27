import { recordEntryCrash } from "@game-platform/multiplayer-sdk";

import { recordEntryFailure, recordEntryTrace } from "./entry-status-store";

/** Golden Path entry tracing + crash persistence. */
export type EntryStep =
  | "ENTRY"
  | "CLICK"
  | "ROUTE"
  | "PLAY_MOUNTED"
  | "PROVIDER_READY"
  | "ENGINE_READY"
  | "CONNECT"
  | "CONNECTING"
  | "RETRY"
  | "CONNECTED"
  | "JOIN"
  | "JOINED"
  | "SYNC"
  | "SPAWN"
  | "SPAWNED"
  | "CANVAS"
  | "CANVAS_READY"
  | "GAME_READY"
  | "INPUT"
  | "GAME_START"
  | "REPLAY"
  | "EXIT"
  | "PRACTICE_FALLBACK";

export type EntryFailStep =
  | "CONNECT"
  | "JOIN"
  | "SPAWN"
  | "RENDER"
  | "CANVAS"
  | "TIMEOUT";

const stepStartMs = new Map<string, number>();

/** Structured trace: [ENTRY] STEP PASS|FAIL detail TIMEms */
export function entryTrace(
  step: EntryStep | EntryFailStep,
  status: "PASS" | "FAIL" | "START",
  detail?: string,
  elapsedMs?: number
): void {
  if (typeof window === "undefined") return;
  const key = String(step);
  recordEntryTrace(step, status, detail, elapsedMs);

  if (status === "START") {
    stepStartMs.set(key, performance.now());
    const msg = detail ? `[ENTRY] ${step} START ${detail}` : `[ENTRY] ${step} START`;
    console.info(msg);
    return;
  }
  const ms =
    elapsedMs ?? Math.round(performance.now() - (stepStartMs.get(key) ?? performance.now()));
  stepStartMs.delete(key);
  const suffix = detail ? ` ${detail}` : "";
  const line = `[ENTRY] ${step} ${status}${suffix} ${ms}ms`;
  if (status === "FAIL") console.warn(line);
  else console.info(line);
}

export function entryLog(step: EntryStep, detail?: string): void {
  entryTrace(step, "PASS", detail, 0);
}

export function entryLogFail(
  step: EntryFailStep,
  reason: string,
  ctx?: { room?: string; recordCrash?: boolean }
): void {
  entryTrace(step, "FAIL", reason);
  recordEntryFailure(step, reason);
  if (ctx?.recordCrash !== false) {
    recordEntryCrash(step, reason, ctx);
  }
}
