import { recordEntryCrash } from "@game-platform/multiplayer-sdk";

/** Golden Path entry tracing + crash persistence. */
export type EntryStep =
  | "CLICK"
  | "ROUTE"
  | "PLAY_MOUNTED"
  | "PROVIDER_READY"
  | "ENGINE_READY"
  | "CONNECTING"
  | "CONNECTED"
  | "JOINED"
  | "SPAWNED"
  | "CANVAS_READY"
  | "GAME_READY"
  | "INPUT"
  | "GAME_START"
  | "PRACTICE_FALLBACK";

export type EntryFailStep =
  | "CONNECT"
  | "JOIN"
  | "SPAWN"
  | "RENDER"
  | "CANVAS"
  | "TIMEOUT";

export function entryLog(step: EntryStep, detail?: string): void {
  if (typeof window === "undefined") return;
  const msg = detail ? `[ENTRY] ${step} — ${detail}` : `[ENTRY] ${step}`;
  console.info(msg);
}

export function entryLogFail(
  step: EntryFailStep,
  reason: string,
  ctx?: { room?: string }
): void {
  console.error(`[ENTRY][FAIL] step: ${step} reason: ${reason}`);
  recordEntryCrash(step, reason, ctx);
}
