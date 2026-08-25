/**
 * FIX-SNAKE-UX-002 — movement telemetry behind ?debug=snake-move
 * Human vs Bot samples · frozen suspects · no gameplay mutation.
 */

import { isBotSnake } from "./snake-ai-fill";
import type { SnakeEntity } from "./snake-io-engine";

const SAMPLE_MS = 12_000;
const MAX_SAMPLES = 240;
const FROZEN_POS_EPS = 0.02;
const FROZEN_TICKS = 12;

export interface MoveSample {
  t: number;
  kind: "human" | "bot";
  id: string;
  physDx: number;
  rendDx: number;
  alpha: number;
  tickIntervalMs: number;
  frameIntervalMs: number;
}

export interface FrozenSuspect {
  id: string;
  type: "human" | "bot";
  alive: boolean;
  lastPositionChange: number;
  lastSync: number;
  lastInput: number | null;
  lastAIAction: number | null;
  awaitingInput: boolean | undefined;
  head: { x: number; y: number } | null;
}

interface Tracker {
  enabled: boolean;
  startedAt: number;
  samples: MoveSample[];
  lastFrameAt: number;
  lastTickAt: number;
  tickIntervals: number[];
  frameIntervals: number[];
  lastPhys: Record<string, { x: number; y: number; t: number }>;
  lastRend: Record<string, { x: number; y: number; t: number }>;
  lastAI: Record<string, number>;
  lastInputAt: number;
  frozen: FrozenSuspect[];
  interpAppliedLocal: number;
  interpAppliedRemote: number;
  interpSkipped: number;
  done: boolean;
}

const tr: Tracker = {
  enabled: false,
  startedAt: 0,
  samples: [],
  lastFrameAt: 0,
  lastTickAt: 0,
  tickIntervals: [],
  frameIntervals: [],
  lastPhys: {},
  lastRend: {},
  lastAI: {},
  lastInputAt: 0,
  frozen: [],
  interpAppliedLocal: 0,
  interpAppliedRemote: 0,
  interpSkipped: 0,
  done: false,
};

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pct(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * (s.length - 1)))]!;
}

export function isSnakeMoveDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "snake-move";
}

export function initSnakeMoveDebug(): void {
  if (!isSnakeMoveDebugEnabled()) return;
  tr.enabled = true;
  tr.startedAt = performance.now();
  tr.samples = [];
  tr.tickIntervals = [];
  tr.frameIntervals = [];
  tr.frozen = [];
  tr.done = false;
  console.info("[SNAKE-MOVE] debug ON — sampling ~12s (human vs bot)");
}

export function noteSnakeMoveInput(): void {
  if (!tr.enabled) return;
  tr.lastInputAt = performance.now();
}

export function noteSnakeMoveAI(id: string): void {
  if (!tr.enabled) return;
  tr.lastAI[id] = performance.now();
}

export function noteSnakeMoveTick(): void {
  if (!tr.enabled || tr.done) return;
  const now = performance.now();
  if (tr.lastTickAt > 0) tr.tickIntervals.push(now - tr.lastTickAt);
  tr.lastTickAt = now;
}

export function noteSnakeMoveFrame(opts: {
  alpha: number;
  tickMs: number;
  localId: string;
  snakes: SnakeEntity[];
  renderHeadById: Record<string, { x: number; y: number } | null>;
  interpUsedById: Record<string, boolean>;
}): void {
  if (!tr.enabled || tr.done) return;
  const now = performance.now();
  if (tr.lastFrameAt > 0) tr.frameIntervals.push(now - tr.lastFrameAt);
  tr.lastFrameAt = now;

  let humanSampled = false;
  let botSampled = false;

  for (const s of opts.snakes) {
    if (!s.alive || s.spectating) continue;
    const head = s.headX != null && s.headY != null ? { x: s.headX, y: s.headY } : s.segments[0];
    if (!head) continue;
    const isBot = isBotSnake(s);
    const kind: "human" | "bot" = isBot ? "bot" : "human";
    if (kind === "human" && humanSampled && s.deviceId !== opts.localId) continue;
    if (kind === "bot" && botSampled) continue;

    const prevP = tr.lastPhys[s.deviceId];
    const physDx = prevP ? Math.hypot(head.x - prevP.x, head.y - prevP.y) : 0;
    if (!prevP || physDx > FROZEN_POS_EPS) {
      tr.lastPhys[s.deviceId] = { x: head.x, y: head.y, t: now };
    }

    const rend = opts.renderHeadById[s.deviceId];
    let rendDx = 0;
    if (rend) {
      const prevR = tr.lastRend[s.deviceId];
      rendDx = prevR ? Math.hypot(rend.x - prevR.x, rend.y - prevR.y) : 0;
      tr.lastRend[s.deviceId] = { x: rend.x, y: rend.y, t: now };
    }

    if (opts.interpUsedById[s.deviceId]) {
      if (s.deviceId === opts.localId) tr.interpAppliedLocal += 1;
      else tr.interpAppliedRemote += 1;
    } else {
      tr.interpSkipped += 1;
    }

    if (tr.samples.length < MAX_SAMPLES && (physDx > 0 || rendDx > 0 || s.deviceId === opts.localId)) {
      tr.samples.push({
        t: now - tr.startedAt,
        kind,
        id: s.deviceId,
        physDx,
        rendDx,
        alpha: opts.alpha,
        tickIntervalMs: opts.tickMs,
        frameIntervalMs: tr.frameIntervals[tr.frameIntervals.length - 1] ?? 0,
      });
    }

    if (kind === "human") humanSampled = true;
    if (kind === "bot") botSampled = true;

    const lastChange = tr.lastPhys[s.deviceId]?.t ?? now;
    if (now - lastChange > opts.tickMs * FROZEN_TICKS) {
      if (!tr.frozen.some((f) => f.id === s.deviceId)) {
        tr.frozen.push({
          id: s.deviceId,
          type: kind,
          alive: s.alive,
          lastPositionChange: lastChange - tr.startedAt,
          lastSync: now - tr.startedAt,
          lastInput: kind === "human" ? tr.lastInputAt - tr.startedAt : null,
          lastAIAction: tr.lastAI[s.deviceId] != null ? tr.lastAI[s.deviceId]! - tr.startedAt : null,
          awaitingInput: s.awaitingInput,
          head: { x: head.x, y: head.y },
        });
      }
    }
  }

  if (now - tr.startedAt >= SAMPLE_MS) {
    tr.done = true;
    const report = buildSnakeMoveReport();
    try {
      localStorage.setItem("play29:snake-move-debug", JSON.stringify(report));
    } catch {
      /* ignore */
    }
    console.info("[SNAKE-MOVE] report", report);
    if (typeof window !== "undefined") {
      (window as Window & { SnakeMoveDebug?: { report: typeof report } }).SnakeMoveDebug = {
        report,
      };
    }
  }
}

export function noteFullscreenDebug(phase: string, detail: Record<string, unknown>): void {
  if (!isSnakeMoveDebugEnabled()) return;
  console.info(`[SNAKE-MOVE][FS] ${phase}`, detail);
}

export function buildSnakeMoveReport() {
  const human = tr.samples.filter((s) => s.kind === "human");
  const bot = tr.samples.filter((s) => s.kind === "bot");
  const fps = tr.frameIntervals.length ? 1000 / mean(tr.frameIntervals) : 0;
  const tickMs = tr.tickIntervals.length ? mean(tr.tickIntervals) : 0;

  const summarize = (xs: MoveSample[]) => {
    const phys = xs.map((s) => s.physDx).filter((d) => d > 0);
    const rend = xs.map((s) => s.rendDx).filter((d) => d > 0);
    return {
      n: xs.length,
      physDeltaMean: mean(phys),
      physDeltaP95: pct(phys, 95),
      rendDeltaMean: mean(rend),
      rendDeltaP95: pct(rend, 95),
      alphaMean: mean(xs.map((s) => s.alpha)),
      posChangeMsApprox: tickMs,
    };
  };

  return {
    task: "FIX-SNAKE-UX-002",
    sampleMs: SAMPLE_MS,
    physicsTickMsMean: +tickMs.toFixed(2),
    physicsTickMsP50: +pct(tr.tickIntervals, 50).toFixed(2),
    renderFpsMean: +fps.toFixed(1),
    frameIntervalMsMean: +mean(tr.frameIntervals).toFixed(2),
    human: summarize(human),
    bot: summarize(bot),
    interpolateSnakeRender: {
      appliedLocalFrames: tr.interpAppliedLocal,
      appliedRemoteOrBotFrames: tr.interpAppliedRemote,
      skippedNoSnap: tr.interpSkipped,
      appliedToOnScreenDraw: tr.interpAppliedLocal + tr.interpAppliedRemote > 0,
    },
    frozenSuspects: tr.frozen.slice(0, 12),
    frozenRootCauseHint:
      tr.frozen.length === 0
        ? "none_in_sample"
        : tr.frozen.some((f) => f.awaitingInput)
          ? "alive_but_awaitingInput_stall"
          : tr.frozen.some((f) => f.type === "bot" && f.lastAIAction == null)
            ? "alive_ai_not_observed"
            : "alive_position_unchanged_check_ai_or_render",
  };
}
