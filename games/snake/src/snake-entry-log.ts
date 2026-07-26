/** Golden Path entry tracing — dev / preview QA only. */
export type EntryStep =
  | "CLICK"
  | "ROUTE"
  | "PLAY_MOUNTED"
  | "ENGINE_READY"
  | "CONNECTING"
  | "CONNECTED"
  | "JOINED"
  | "SPAWNED"
  | "CANVAS_READY"
  | "GAME_READY"
  | "PRACTICE_FALLBACK";

export type EntryFailStep =
  | "CONNECT"
  | "JOIN"
  | "SPAWN"
  | "RENDER"
  | "CANVAS"
  | "TIMEOUT";

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  return process.env.NODE_ENV !== "production" || window.location.hostname.includes("vercel.app");
}

export function entryLog(step: EntryStep, detail?: string): void {
  if (!enabled()) return;
  const msg = detail ? `[ENTRY] ${step} — ${detail}` : `[ENTRY] ${step}`;
  console.info(msg);
}

export function entryLogFail(step: EntryFailStep, reason: string): void {
  if (!enabled()) return;
  console.error(`[ENTRY][FAIL] step: ${step} reason: ${reason}`);
}
