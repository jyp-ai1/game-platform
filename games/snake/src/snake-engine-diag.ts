/** Engine loop diagnostics — ?debug=1 only. No gameplay changes. */
import { appendLifecycle } from "./entry-status-store";
import { getGamePhase, type GamePhase } from "./snake-game-state";

export interface LoopDiagSnapshot {
  enabled: boolean;
  frame: number;
  tick: number;
  tickErrors: number;
  lastTickError: string | null;
  input: number;
  simulation: number;
  renderSnakes: number;
  worldSnakeCount: number;
  localPlayerPresent: boolean;
  phase: GamePhase;
  tickMounted: boolean;
  tickBlockedReason: string | null;
  lastInput: string | null;
  startedAt: number;
}

const diag: LoopDiagSnapshot = {
  enabled: false,
  frame: 0,
  tick: 0,
  tickErrors: 0,
  lastTickError: null,
  input: 0,
  simulation: 0,
  renderSnakes: 0,
  worldSnakeCount: 0,
  localPlayerPresent: false,
  phase: "INIT",
  tickMounted: false,
  tickBlockedReason: null,
  lastInput: null,
  startedAt: Date.now(),
};

let lastReportMs = 0;
let reportTimer: ReturnType<typeof setInterval> | undefined;

export function isLoopDiagEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

export function initLoopDiag(): void {
  if (!isLoopDiagEnabled()) return;
  diag.enabled = true;
  diag.startedAt = Date.now();
  if (reportTimer) clearInterval(reportTimer);
  reportTimer = setInterval(reportLoopDiag, 2000);
  console.info("[LOOP] diagnostics ON — FRAME/TICK/INPUT/SIM/RENDER every 2s");
}

export function shutdownLoopDiag(): void {
  if (reportTimer) clearInterval(reportTimer);
  reportTimer = undefined;
}

export function diagFrame(): void {
  if (!diag.enabled) return;
  diag.frame += 1;
  diag.phase = getGamePhase();
}

export function diagTickMounted(tickMs: number): void {
  if (!diag.enabled) return;
  diag.tickMounted = true;
  diag.tickBlockedReason = null;
  console.info(`[LOOP] TICK mounted interval=${tickMs}ms`);
}

export function diagTickBlocked(reason: string): void {
  if (!diag.enabled) return;
  diag.tickMounted = false;
  diag.tickBlockedReason = reason;
  console.warn(`[LOOP] TICK blocked: ${reason}`);
  appendLifecycle(`LOOP TICK blocked: ${reason}`);
}

export function diagTick(): void {
  if (!diag.enabled) return;
  diag.tick += 1;
}

export function diagTickError(err: unknown): void {
  if (!diag.enabled) return;
  diag.tickErrors += 1;
  diag.lastTickError = err instanceof Error ? err.message : String(err);
  console.error("[LOOP] TICK error — interval may stop", err);
  appendLifecycle(`LOOP TICK ERROR: ${diag.lastTickError ?? "unknown"}`);
}

export function diagInput(direction: string): void {
  if (!diag.enabled) return;
  diag.input += 1;
  diag.lastInput = direction;
  console.info(`[LOOP] INPUT ${direction.toUpperCase()} (#${diag.input})`);
}

export function diagSimulation(): void {
  if (!diag.enabled) return;
  diag.simulation += 1;
}

export function diagRender(snakeCount: number, localPresent: boolean): void {
  if (!diag.enabled) return;
  diag.renderSnakes = snakeCount;
  diag.localPlayerPresent = localPresent;
}

export function diagWorldSnakes(count: number, localPresent: boolean): void {
  if (!diag.enabled) return;
  diag.worldSnakeCount = count;
  diag.localPlayerPresent = localPresent;
}

export function getLoopDiagSnapshot(): LoopDiagSnapshot {
  return { ...diag, phase: getGamePhase() };
}

function reportLoopDiag(): void {
  if (!diag.enabled) return;
  const s = getLoopDiagSnapshot();
  const line =
    `[LOOP] FRAME=${s.frame} TICK=${s.tick}${s.tickMounted ? "" : " (NOT MOUNTED)"}` +
    `${s.tickBlockedReason ? ` blocked=${s.tickBlockedReason}` : ""}` +
    ` INPUT=${s.input} SIM=${s.simulation} RENDER=${s.renderSnakes}` +
    ` worldSnakes=${s.worldSnakeCount} me=${s.localPlayerPresent ? "YES" : "NO"}` +
    ` PHASE=${s.phase}` +
    `${s.tickErrors ? ` tickErrors=${s.tickErrors}` : ""}` +
    `${s.lastTickError ? ` lastErr=${s.lastTickError}` : ""}`;
  console.info(line);
  appendLifecycle(line.replace("[LOOP] ", "LOOP "));
  lastReportMs = Date.now();
  if (typeof window !== "undefined") {
    (window as Window & { __SNAKE_LOOP_DIAG__?: LoopDiagSnapshot }).__SNAKE_LOOP_DIAG__ = s;
  }
}
